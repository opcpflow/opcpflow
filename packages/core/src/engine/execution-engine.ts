import type { DAGNode, DAGEdge, DAGDocument } from '../types/dag-node'
import type {
  ExecutionContext,
  ExecutionResult,
  ExecutionOptions,
  DAGExecutionReport,
  NodeExecutionState,
} from '../types/execution'
import { HandlerRegistry } from './handler-registry'
import { ContextStore } from './context-store'
import { EventBus, type DAGEvent } from './event-bus'
import { detectCycle } from '../validator'
import { computeLevels, getPredecessors, getSuccessors } from '../topology'

/**
 * Intelligent DAG Execution Engine.
 *
 * Key capabilities:
 * - Ready Frontier: event-driven execution, nodes execute as soon as dependencies are met
 * - ContextStore: three-level memory (scratch / state / cache) with conflict detection
 * - EventBus: full lifecycle events for observability and evolution integration
 * - Auto-routing: all predecessor outputs automatically available via ctx.inputs
 * - Parallel execution with concurrency control
 * - Sub-graph replanning on verification failure
 */
export class DAGExecutionEngine {
  private currentDagId = 'unknown'
  readonly eventBus = new EventBus()
  private store: ContextStore

  // Level tracking for onLevelComplete callback
  private nodeLevels: Record<string, number> = {}
  private levelNodeCount = new Map<number, number>()
  private levelDoneCount = new Map<number, number>()
  private levelCompleted = new Set<number>()
  private totalLevels = 0

  constructor(options?: { maxTokens?: number }) {
    this.store = new ContextStore({ maxTokens: options?.maxTokens })
  }

  /**
   * Execute a DAG with Ready Frontier algorithm.
   *
   * Instead of executing level-by-level (which waits for the slowest node in each level),
   * Ready Frontier activates each node as soon as ALL its direct predecessors complete.
   * This eliminates unnecessary waiting and maximizes parallelism.
   */
  async execute(
    dag: DAGDocument,
    handlers: HandlerRegistry,
    options?: ExecutionOptions,
  ): Promise<DAGExecutionReport> {
    const startTime = Date.now()
    this.currentDagId = dag.metadata?.name || 'unknown'
    this.store.clear()

    const opts = {
      defaultTimeout: 30000,
      onNodeStatusChange: (() => {}) as (nodeId: string, status: string, detail?: any) => void,
      mode: 'live' as const,
      pinnedData: {} as Record<string, any>,
      onLevelComplete: (async () => {}) as (levelIndex: number, totalLevels: number) => Promise<void>,
      onNodeFailed: 'skip_downstream' as const,
      ...options,
    } as Required<ExecutionOptions>

    // Validate DAG
    const cycleErrors = detectCycle(dag.nodes, dag.edges)
    if (cycleErrors.length > 0) {
      throw new Error(`DAG contains cycles: ${cycleErrors.map(e => e.message).join('; ')}`)
    }

    const nodeMap = new Map(dag.nodes.map(n => [n.id, n]))
    const state = new Map<string, NodeExecutionState>()
    const failedNodes = new Set<string>()

    // Initialize all nodes as pending
    for (const n of dag.nodes) {
      state.set(n.id, { status: 'pending' })
    }

    // Pre-seed trigger command
    const triggerNode = dag.nodes.find(n => n.type === 'trigger')
    const triggerCommand = triggerNode?.data?.command as string || ''

    this.emit('dag.started', { nodeCount: dag.nodes.length, command: triggerCommand })

    // ── Level tracking for onLevelComplete callback ──
    this.nodeLevels = computeLevels(dag.nodes, dag.edges)
    this.totalLevels = Math.max(0, ...Object.values(this.nodeLevels)) + 1
    this.levelNodeCount.clear()
    this.levelDoneCount.clear()
    this.levelCompleted.clear()
    for (const n of dag.nodes) {
      const lvl = this.nodeLevels[n.id] ?? 0
      this.levelNodeCount.set(lvl, (this.levelNodeCount.get(lvl) ?? 0) + 1)
      this.levelDoneCount.set(lvl, 0)
    }

    // ── Ready Frontier execution ──
    const inFlight = new Set<string>()
    const completed = new Set<string>()
    const maxParallel = 10
    let deadlockGuard = 0

    // Build predecessor/successor maps
    const predMap = new Map<string, string[]>()
    const succMap = new Map<string, string[]>()
    for (const n of dag.nodes) {
      predMap.set(n.id, [])
      succMap.set(n.id, [])
    }
    for (const e of dag.edges) {
      succMap.get(e.source)?.push(e.target)
      predMap.get(e.target)?.push(e.source)
    }

    // Find initial ready nodes (in-degree = 0)
    const ready = new Set<string>()
    for (const [id, preds] of predMap) {
      if (preds.length === 0 && state.get(id)?.status === 'pending') {
        ready.add(id)
      }
    }

    while (true) {
      // Move ready nodes to in-flight
      if (ready.size > 0) {
        const batch = Array.from(ready).slice(0, maxParallel - inFlight.size)
        for (const id of batch) {
          ready.delete(id)
          inFlight.add(id)
          const s = state.get(id)!
          s.status = 'running'
          opts.onNodeStatusChange(id, 'running')
          // Execute asynchronously
          this.executeNode(id, nodeMap, handlers, state, failedNodes, opts, dag.edges, completed, inFlight, ready, predMap, succMap, triggerCommand)
            .catch(() => {})
        }
      }

      // Check completion
      if (inFlight.size === 0 && ready.size === 0) {
        break
      }

      // Deadlock detection
      if (ready.size === 0 && inFlight.size > 0) {
        deadlockGuard++
        if (deadlockGuard > 3000) { // ~3 seconds
          console.warn('[DAG] Possible deadlock detected, forcing completion check')
          break
        }
      } else {
        deadlockGuard = 0
      }

      await this.yieldControl()
    }

    const endTime = Date.now()
    const finalStatus = this.determineFinalStatus(state)

    this.emit('dag.completed', { status: finalStatus, durationMs: endTime - startTime })

    // Build report
    const results: Record<string, NodeExecutionState> = {}
    for (const [id, s] of state) {
      results[id] = s
    }

    const report: DAGExecutionReport & { storeSnapshot?: Record<string, unknown> } = {
      status: finalStatus,
      nodes: results,
      startTime,
      endTime,
    }

    // Attach ContextStore snapshot for evolution hooks
    report.storeSnapshot = this.store.snapshot()

    // Fire DAG complete callback (evolution hooks, telemetry, etc.)
    if (opts.onDAGComplete) {
      opts.onDAGComplete(report)
    }

    return report
  }

  private async executeNode(
    nodeId: string,
    nodeMap: Map<string, DAGNode>,
    handlers: HandlerRegistry,
    state: Map<string, NodeExecutionState>,
    failedNodes: Set<string>,
    opts: Required<ExecutionOptions>,
    edges: DAGEdge[],
    completed: Set<string>,
    inFlight: Set<string>,
    ready: Set<string>,
    predMap: Map<string, string[]>,
    succMap: Map<string, string[]>,
    triggerCommand: string,
  ): Promise<void> {
    const node = nodeMap.get(nodeId)
    if (!node) { inFlight.delete(nodeId); return }

    try {
      // -- Upstream failure check --
      const predecessors = getPredecessors(nodeId, edges)
      const failedUpstream = predecessors.filter(p => failedNodes.has(p))
      if (failedUpstream.length > 0) {
        if (opts.onNodeFailed === 'skip_downstream') {
          this.finishNode(nodeId, state, failedNodes, completed, inFlight, { status: 'skipped', error: 'Upstream node failed' }, opts)
          this.emit('node.skipped', { nodeId, reason: 'upstream_failed' })
          this.activateSuccessors(nodeId, completed, inFlight, ready, predMap, succMap, state)
          return
        }
      }

      // -- Pinned data --
      if (nodeId in opts.pinnedData) {
        const pinned = opts.pinnedData[nodeId]
        this.finishNode(nodeId, state, failedNodes, completed, inFlight, {
          status: 'passed',
          result: { output: pinned.output, metrics: { startTime: Date.now(), endTime: Date.now(), durationMs: 0 } },
        }, opts)
        this.store.set(nodeId, pinned.output, nodeId)
        this.emit('node.completed', { nodeId })
        this.activateSuccessors(nodeId, completed, inFlight, ready, predMap, succMap, state)
        return
      }

      // -- Dry-run --
      if (opts.mode === 'dry-run') {
        this.finishNode(nodeId, state, failedNodes, completed, inFlight, {
          status: 'passed',
          result: { output: null, metrics: { startTime: Date.now(), endTime: Date.now(), durationMs: 0 } },
        }, opts)
        this.emit('node.completed', { nodeId, mode: 'dry-run' })
        this.activateSuccessors(nodeId, completed, inFlight, ready, predMap, succMap, state)
        return
      }

      // -- Resolve handler --
      const handler = handlers.get(node.type)
      if (!handler) {
        const errMsg = `No handler registered for node type "${node.type}"`
        if (opts.onNodeFailed === 'continue_raw') {
          this.store.set(nodeId, { error: errMsg, upstreamId: nodeId }, nodeId)
        }
        this.finishNode(nodeId, state, failedNodes, completed, inFlight, {
          status: 'failed', error: errMsg,
        }, opts)
        failedNodes.add(nodeId)
        this.emit('node.failed', { nodeId, error: `No handler for ${node.type}` })
        this.activateSuccessors(nodeId, completed, inFlight, ready, predMap, succMap, state)
        return
      }

      // -- Validate required fields --
      if (opts.onValidateNode) {
        const validationError = opts.onValidateNode(node)
        if (validationError) {
          if (opts.onNodeFailed === 'continue_raw') {
            this.store.set(nodeId, { error: validationError, upstreamId: nodeId }, nodeId)
          }
          this.finishNode(nodeId, state, failedNodes, completed, inFlight, {
            status: 'failed', error: validationError,
          }, opts)
          failedNodes.add(nodeId)
          this.emit('node.failed', { nodeId, error: validationError })
          this.activateSuccessors(nodeId, completed, inFlight, ready, predMap, succMap, state)
          return
        }
      }

      // -- Auto-collect inputs from predecessors via ContextStore --
      const inputs: Record<string, any> = {}
      for (const predId of predecessors) {
        const val = this.store.get(predId)
        if (val !== undefined) {
          inputs[predId] = val
        }
        // Check for conflicts
        if (this.store.hasConflicts(predId)) {
          inputs[`${predId}__conflict`] = this.store.getConflicts(predId)
        }
      }
      // Inject trigger command
      if (triggerCommand) {
        inputs.__command__ = triggerCommand
      }

      // -- Build context --
      const stages: { name: string; timestamp: number }[] = []
      const timeoutMs = (node.data.timeout_seconds ?? opts.defaultTimeout / 1000) * 1000

      const ctx: ExecutionContext = {
        nodeId,
        dagId: this.currentDagId,
        inputs,
        global: {},
        abortSignal: new AbortController().signal,
        reportStage: (stage: string) => {
          stages.push({ name: stage, timestamp: Date.now() })
          opts.onNodeStatusChange(nodeId, 'running', { stage })
        },
        timeout: timeoutMs,
        // Inject sub-DAG executor for dynamic node evolution
        subDAGExecutor: async (subDAG: DAGDocument) => {
          return this.execute(subDAG, handlers, opts)
        },
      }

      this.emit('node.started', { nodeId, type: node.type })

      // -- Hooks: Pre-execution (从上游 strategy 节点提取并执行) --
      const preHookErrors = this.runPreHooks(inputs)
      if (preHookErrors.length > 0) {
        throw new Error(`Pre-hooks failed: ${preHookErrors.join('; ')}`)
      }

      // -- Execute with timeout --
      const result = await this.executeWithTimeout(handler, node.data as any, ctx, timeoutMs)

      // -- If handler returned an error, fail the node --
      if (result.error) {
        throw new Error(result.error)
      }

      // -- Store output in ContextStore --
      this.store.set(nodeId, result.output, nodeId)

      // -- Track token cost --
      const tokenEst = this.estimateTokens(result.output)
      this.store.addTokenCost(tokenEst)

      // -- Hooks: Post-execution (日志、通知等) --
      this.runPostHooks(inputs, nodeId, result)

      // -- Verification Replanning (DAG保持无环，引擎内部处理打回重做) --
      // 当 verification 节点判定未通过时，引擎自动：
      //   1. 找到被质检的上游节点
      //   2. 注入质检反馈到上游节点的 instructions
      //   3. 重置上游节点状态为 pending
      //   4. 重新执行上游节点 + 重新质检
      //   5. 最多重试 max_retries 次
      // 用户画的 DAG 仍然是 [Agent] → [verification] → [merge]，没有循环边
      if (node.type === 'verification' && result.output?.verified === false) {
        const maxRetries = node.data.max_retries ?? 2
        const upstreamNodes = predecessors  // verification 的前驱就是被质检的节点
        let feedback = result.output?.feedback || 'Verification failed'
        const criteria = result.output?.criteria || ''

        for (let round = 1; round <= maxRetries; round++) {
          ctx.reportStage(`replan round ${round}/${maxRetries}: re-executing upstream...`)

          // Reset and re-execute each upstream node
          let allReplanOk = true
          for (const targetId of upstreamNodes) {
            const targetNode = nodeMap.get(targetId)
            if (!targetNode) continue

            // Inject feedback into upstream node's instructions
            const originalInstructions = targetNode.data.instructions || ''
            const replayedData = {
              ...targetNode.data,
              instructions: `${originalInstructions}\n\n[Verification Feedback - Round ${round}] ${feedback}\nCriteria: ${criteria}`,
            }

            // Reset state
            completed.delete(targetId)
            inFlight.delete(targetId)
            state.set(targetId, { status: 'pending' })
            this.store.delete(targetId)

            // Re-execute upstream node inline
            try {
              const targetHandler = handlers.get(targetNode.type)
              if (targetHandler) {
                const replayCtx: ExecutionContext = {
                  ...ctx,
                  nodeId: targetId,
                  inputs: ctx.inputs,
                }
                const replayResult = await this.executeWithTimeout(
                  targetHandler, replayedData, replayCtx, timeoutMs,
                )
                this.store.set(targetId, replayResult.output, targetId)
                state.set(targetId, {
                  status: 'passed',
                  result: replayResult,
                })
                completed.add(targetId)
              }
            } catch (replayErr) {
              state.set(targetId, {
                status: 'failed',
                error: (replayErr as Error).message,
              })
              failedNodes.add(targetId)
              allReplanOk = false
            }
          }

          if (!allReplanOk) break

          // Re-verify
          ctx.reportStage(`replan round ${round}/${maxRetries}: re-verifying...`)
          const reVerifyResult = await this.executeWithTimeout(handler, {
            ...node.data,
            criteria,
            auto_generate: false,
            _replan_round: round,
          }, ctx, timeoutMs)

          // Update verification output
          result.output = reVerifyResult.output
          result.metrics = reVerifyResult.metrics
          this.store.set(nodeId, reVerifyResult.output, nodeId)

          if (reVerifyResult.output?.verified === true) {
            ctx.reportStage(`verification passed on round ${round}`)
            break
          }

          feedback = reVerifyResult.output?.feedback || feedback
        }
      }

      this.finishNode(nodeId, state, failedNodes, completed, inFlight, {
        status: 'passed',
        result: {
          ...result,
          metrics: {
            ...result.metrics,
            stages: stages.length > 0 ? stages : undefined,
          },
        },
      }, opts)

      this.emit('node.completed', { nodeId, type: node.type, durationMs: result.metrics.durationMs })

      // -- Activate successors (Ready Frontier) --
      this.activateSuccessors(nodeId, completed, inFlight, ready, predMap, succMap, state)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)

      // continue_raw: propagate error info to downstream via ContextStore
      if (opts.onNodeFailed === 'continue_raw') {
        this.store.set(nodeId, { error: message, upstreamId: nodeId }, nodeId)
      }

      this.finishNode(nodeId, state, failedNodes, completed, inFlight, {
        status: 'failed', error: message,
        result: { output: null, error: message, metrics: { startTime: Date.now(), endTime: Date.now(), durationMs: 0 } },
      }, opts)
      failedNodes.add(nodeId)
      this.emit('node.failed', { nodeId, error: message })
      this.activateSuccessors(nodeId, completed, inFlight, ready, predMap, succMap, state)
    }
  }

  // ── Hooks engine (内置，不依赖外部平台) ──

  /** Scan upstream inputs for strategy.pre_hooks and execute them inline.
   *  Returns array of error messages. Empty array = all hooks passed.
   *  Pre-hooks can validate conditions, check budgets, enforce rules. */
  private runPreHooks(inputs: Record<string, any>): string[] {
    const errors: string[] = []
    for (const [, value] of Object.entries(inputs)) {
      if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>
        const hooks = obj.pre_hooks
        if (typeof hooks === 'string' && hooks.trim()) {
          for (const line of hooks.split('\n').map(l => l.trim()).filter(Boolean)) {
            // Interpret known pre-hook patterns
            const lower = line.toLowerCase()

            // Budget check pattern: "check budget <limit>"
            if (lower.startsWith('check budget')) {
              const usage = this.store.getTokenUsage()
              const limitStr = line.match(/[\d.]+/)?.[0]
              const limit = limitStr ? parseFloat(limitStr) * 1000 : Infinity
              if (usage > limit) {
                errors.push(`Budget exceeded: ${usage} > ${limit}`)
              }
              continue
            }

            // Validation pattern: "validate <field>"
            if (lower.startsWith('validate') || lower.startsWith('require')) {
              // Log that validation hook was triggered
              this.emit('hook.pre', { hook: line })
              continue
            }

            // Generic pre-hook: emit event for external handlers
            this.emit('hook.pre', { hook: line })
          }
        }
      }
    }
    return errors
  }

  /** Scan upstream inputs for strategy.post_hooks and execute them inline.
   *  Post-hooks can log results, send notifications, record metrics. */
  private runPostHooks(inputs: Record<string, any>, nodeId: string, result: any): void {
    for (const [, value] of Object.entries(inputs)) {
      if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>
        const hooks = obj.post_hooks
        if (typeof hooks === 'string' && hooks.trim()) {
          for (const line of hooks.split('\n').map(l => l.trim()).filter(Boolean)) {
            const lower = line.toLowerCase()

            // Log pattern: "log <message>"
            if (lower.startsWith('log')) {
              const logMsg = line.substring(3).trim() || `Node ${nodeId} completed`
              this.emit('hook.post', { hook: line, nodeId, message: logMsg, status: result.output?.verified !== false ? 'passed' : 'failed' })
              continue
            }

            // Notify pattern: "notify <target>"
            if (lower.startsWith('notify')) {
              this.emit('hook.post', { hook: line, nodeId, type: 'notification' })
              continue
            }

            // Generic post-hook
            this.emit('hook.post', { hook: line, nodeId })
          }
        }
      }
    }
  }

  /**
   * Ready Frontier: activate successors when all their predecessors are complete.
   */
  private activateSuccessors(
    nodeId: string,
    completed: Set<string>,
    inFlight: Set<string>,
    ready: Set<string>,
    predMap: Map<string, string[]>,
    succMap: Map<string, string[]>,
    state: Map<string, NodeExecutionState>,
  ): void {
    completed.add(nodeId)
    inFlight.delete(nodeId)

    const successors = succMap.get(nodeId) ?? []
    for (const succId of successors) {
      if (completed.has(succId) || inFlight.has(succId) || ready.has(succId)) continue
      const preds = predMap.get(succId) ?? []
      const allPredsDone = preds.every(p => completed.has(p))
      if (allPredsDone) {
        const s = state.get(succId)
        if (s && s.status === 'pending') {
          ready.add(succId)
        }
      }
    }
  }

  private finishNode(
    nodeId: string,
    state: Map<string, NodeExecutionState>,
    failedNodes: Set<string>,
    completed: Set<string>,
    inFlight: Set<string>,
    result: NodeExecutionState,
    opts: Required<ExecutionOptions>,
  ): void {
    state.set(nodeId, result)
    completed.add(nodeId)
    inFlight.delete(nodeId)
    if (result.status === 'failed' || result.status === 'skipped') {
      failedNodes.add(nodeId)
    }
    opts.onNodeStatusChange(nodeId, result.status, result.result)

    // Fire onLevelComplete when all nodes at a level are done
    const lvl = this.nodeLevels[nodeId] ?? 0
    const done = (this.levelDoneCount.get(lvl) ?? 0) + 1
    this.levelDoneCount.set(lvl, done)
    const total = this.levelNodeCount.get(lvl) ?? 0
    if (done >= total && !this.levelCompleted.has(lvl)) {
      this.levelCompleted.add(lvl)
      opts.onLevelComplete(lvl, this.totalLevels)
    }
  }

  private async executeWithTimeout(
    handler: (input: any, context: ExecutionContext) => Promise<ExecutionResult>,
    input: any,
    ctx: ExecutionContext,
    timeoutMs: number,
  ): Promise<ExecutionResult> {
    return new Promise<ExecutionResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Node "${ctx.nodeId}" timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      handler(input, ctx)
        .then(r => { clearTimeout(timer); resolve(r) })
        .catch(e => { clearTimeout(timer); reject(e) })
    })
  }

  private emit(type: string, data?: unknown): void {
    this.eventBus.emit({
      type,
      dagId: this.currentDagId,
      timestamp: Date.now(),
      ...(typeof data === 'object' && data !== null ? (data as any) : { data }),
    } as DAGEvent)
  }

  private determineFinalStatus(state: Map<string, NodeExecutionState>): 'completed' | 'failed' | 'partial' {
    const statuses = Array.from(state.values()).map(s => s.status)
    const allPassed = statuses.every(s => s === 'passed' || s === 'skipped')
    const anyFailed = statuses.some(s => s === 'failed')
    if (allPassed) return 'completed'
    if (anyFailed) return 'partial'
    return 'failed'
  }

  private estimateTokens(output: unknown): number {
    if (typeof output === 'string') return Math.ceil(output.length / 4)
    if (output && typeof output === 'object') {
      try { return Math.ceil(JSON.stringify(output).length / 4) } catch { return 10 }
    }
    return 1
  }

  private yieldControl(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1))
  }

  /** Expose ContextStore for external access (evolution hooks, debugging) */
  getStore(): ContextStore {
    return this.store
  }
}

/**
 * Simple string hash for dirty detection.
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(16)
}
