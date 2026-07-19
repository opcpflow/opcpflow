import type { DAGNode, DAGEdge, DAGDocument, NodeResult } from '@opcpflow/core'
import { getTopologicalOrder } from '@opcpflow/core'
import { Frontier } from './frontier'
import { ContextStore } from './context-store'
import { BudgetTracker } from './store/budget'
import { ConflictDetector } from './store/conflict'
import type {
  EngineConfig,
  NodeRuntimeState,
  NodeStatus,
  ExecutionPlan,
  ExecutionStrategy,
  EngineEvent,
} from './types'
import { Tracer } from './telemetry/tracer'
import { EventBus } from './telemetry/event-bus'
import { ExecutionRecorder } from './telemetry/recorder'

/**
 * DAG Executor.
 *
 * Drives DAG execution using the Ready Frontier algorithm.
 * Supports wave-based parallel execution, replanning on failure,
 * context-based data passing, budget tracking, and full telemetry.
 */
export class Executor {
  private frontier: Frontier
  private config: Required<EngineConfig>
  private tracer?: Tracer
  private eventBus: EventBus
  private recorder?: ExecutionRecorder

  constructor(config?: EngineConfig) {
    this.frontier = new Frontier()
    this.config = {
      strategy: config?.strategy ?? 'wave',
      maxConcurrency: config?.maxConcurrency ?? 10,
      enableReplan: config?.enableReplan ?? true,
      maxReplanDepth: config?.maxReplanDepth ?? 3,
      defaultTimeout: config?.defaultTimeout ?? 60_000,
      budget: config?.budget ?? { maxTokens: 64000 },
      enableTracing: config?.enableTracing ?? false,
      enableRecording: config?.enableRecording ?? false,
    }
    this.eventBus = new EventBus()

    if (this.config.enableTracing) {
      this.tracer = new Tracer()
    }
    if (this.config.enableRecording) {
      this.recorder = new ExecutionRecorder()
    }
  }

  getEventBus(): EventBus {
    return this.eventBus
  }

  getTracer(): Tracer | undefined {
    return this.tracer
  }

  getRecorder(): ExecutionRecorder | undefined {
    return this.recorder
  }

  /**
   * Build an execution plan from a DAG document.
   */
  plan(dag: DAGDocument, strategy?: ExecutionStrategy): ExecutionPlan {
    const dagExecId = generateId()
    const waves = this.frontier.computeWaves(dag.nodes, dag.edges)
    const state = new Map<string, NodeRuntimeState>()

    for (const node of dag.nodes) {
      state.set(node.id, {
        nodeId: node.id,
        status: 'pending',
        attempt: 0,
      })
    }

    return {
      dagExecId,
      nodes: dag.nodes,
      edges: dag.edges,
      metadata: dag.metadata,
      strategy: strategy ?? this.config.strategy,
      waves,
      state,
    }
  }

  /**
   * Execute a DAG document. Returns the final state map with results.
   */
  async execute(dag: DAGDocument): Promise<Map<string, NodeRuntimeState>> {
    const plan = this.plan(dag)
    return this.executePlan(plan)
  }

  /**
   * Execute a pre-built plan. Supports incremental execution.
   */
  async executePlan(plan: ExecutionPlan): Promise<Map<string, NodeRuntimeState>> {
    const store = new ContextStore(
      this.config.budget?.maxTokens ? { maxTokens: this.config.budget.maxTokens } : undefined
    )
    const budgetTracker = this.config.budget
      ? new BudgetTracker({
          maxTokens: this.config.budget.maxTokens ?? 1_000_000,
          maxCost: this.config.budget.maxCost,
          maxNodes: this.config.budget.maxNodes,
        })
      : undefined
    const conflictDetector = new ConflictDetector()

    this.emit('dag.started', plan.dagExecId, { nodeCount: plan.nodes.length })
    this.tracer?.startTrace(plan.dagExecId)
    this.recorder?.recordStart(plan.dagExecId, plan.nodes, plan.edges)

    const replanDepth = 0

    try {
      await this.executeWaves(
        plan,
        store,
        budgetTracker,
        conflictDetector,
        replanDepth,
      )

      const finalStatus = this.determineFinalStatus(plan.state)
      this.emit('dag.completed', plan.dagExecId, { status: finalStatus })
      this.recorder?.recordComplete(plan.dagExecId, finalStatus)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.emit('dag.failed', plan.dagExecId, { error: message })
      this.recorder?.recordComplete(plan.dagExecId, 'failed', message)
    }

    return plan.state
  }

  /**
   * Build a NodeResult[] from the final execution state for reporting.
   */
  buildReport(state: Map<string, NodeRuntimeState>): NodeResult[] {
    const results: NodeResult[] = []
    for (const [, s] of state) {
      results.push({
        nodeID: s.nodeId,
        status: this.toReportStatus(s.status),
        output: s.output,
        error: s.error,
        startTime: s.startedAt ? new Date(s.startedAt).toISOString() : undefined,
        endTime: s.completedAt ? new Date(s.completedAt).toISOString() : undefined,
        retryCount: s.attempt > 0 ? s.attempt - 1 : 0,
      })
    }
    return results
  }

  // ---- private ----

  private async executeWaves(
    plan: ExecutionPlan,
    store: ContextStore,
    budgetTracker: BudgetTracker | undefined,
    conflictDetector: ConflictDetector,
    replanDepth: number,
  ): Promise<void> {
    const { nodes, edges, state } = plan
    let waveIndex = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = this.frontier.compute(nodes, edges, this.toStatusMap(state))

      // Mark ready nodes
      for (const id of result.ready) {
        const s = state.get(id)!
        s.status = 'ready'
      }

      // If nothing is ready and nothing is running, we're done
      if (result.ready.length === 0) {
        const hasRunning = Array.from(state.values()).some(
          (s) => s.status === 'running',
        )
        if (!hasRunning) break
        // If something is still running, wait and re-check
        await this.yieldControl()
        continue
      }

      // Check budget before executing
      if (budgetTracker && !budgetTracker.canProceed()) {
        this.emit('budget.exhausted', plan.dagExecId, {
          totalTokens: budgetTracker.getTotalTokens(),
        })
        break
      }

      // Execute the current wave with concurrency limit
      const wave = result.ready.slice(0, this.config.maxConcurrency)
      this.emit('wave.started', plan.dagExecId, { wave: waveIndex, nodes: wave })

      await Promise.all(
        wave.map((nodeId) =>
          this.executeNode(nodeId, plan, store, budgetTracker, conflictDetector),
        ),
      )

      this.emit('wave.completed', plan.dagExecId, { wave: waveIndex, nodes: wave })
      waveIndex++

      // Check for failures that need replanning
      if (this.config.enableReplan && replanDepth < this.config.maxReplanDepth) {
        const failedNodes = Array.from(state.values()).filter(
          (s) => s.status === 'failed',
        )

        for (const failed of failedNodes) {
          const node = nodes.find((n) => n.id === failed.nodeId)
          if (node?.data.replan_on_failure !== false) continue

          const replanned = this.tryReplan(failed.nodeId, plan, replanDepth)
          if (replanned) {
            replanDepth++
            this.emit('dag.replanned', plan.dagExecId, {
              nodeId: failed.nodeId,
              depth: replanDepth,
            })
          }
        }
      }
    }
  }

  private async executeNode(
    nodeId: string,
    plan: ExecutionPlan,
    store: ContextStore,
    budgetTracker: BudgetTracker | undefined,
    conflictDetector: ConflictDetector,
  ): Promise<void> {
    const state = plan.state.get(nodeId)!
    const node = plan.nodes.find((n) => n.id === nodeId)!
    const span = this.tracer?.startSpan(nodeId, 'execute', plan.dagExecId)

    state.status = 'running'
    state.attempt++
    state.startedAt = Date.now()

    this.emit('node.started', plan.dagExecId, { nodeId })
    this.recorder?.recordNodeState(nodeId, 'running', state.attempt)

    try {
      // Gather inputs from predecessors via context store
      const inputs = this.gatherInputs(node, plan)

      // Resolve timeout
      const timeout = node.data.timeout_seconds ?? this.config.defaultTimeout
      const result = await this.executeWithTimeout(node, inputs, store, timeout)

      // Store output in context store
      if (result !== undefined) {
        const outputKey = node.data.output_key ?? nodeId
        store.set(outputKey, result, nodeId)
        conflictDetector.register(outputKey, nodeId)
      }

      // Record token cost if budget tracking is enabled
      if (budgetTracker) {
        const tokenCost = this.estimateTokenCost(result)
        budgetTracker.record(nodeId, tokenCost)
        store.addTokenCost(tokenCost)
      }

      state.status = 'completed'
      state.output = result
      state.completedAt = Date.now()

      this.emit('node.completed', plan.dagExecId, { nodeId })
      this.recorder?.recordNodeState(nodeId, 'completed', state.attempt, result)
      span?.end('ok')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      state.status = 'failed'
      state.error = message
      state.completedAt = Date.now()

      this.emit('node.failed', plan.dagExecId, { nodeId, error: message })
      this.recorder?.recordNodeState(nodeId, 'failed', state.attempt, undefined, message)
      span?.end('error', message)
    }
  }

  private async executeWithTimeout(
    node: DAGNode,
    inputs: Record<string, unknown>,
    store: ContextStore,
    timeoutMs: number,
  ): Promise<unknown> {
    // Default node executor: delegates to node type's handler
    // For LLM call nodes, this would invoke the LLM.
    // For API call nodes, this would make an HTTP request.
    // For now, we use a simple pass-through that returns the inputs.
    const handler = nodeHandlers.get(node.type)
    if (handler) {
      return handler(node, inputs, store)
    }

    // Fallback: return the inputs as output
    return inputs
  }

  private gatherInputs(node: DAGNode, plan: ExecutionPlan): Record<string, unknown> {
    const inputs: Record<string, unknown> = {}
    const predecessors = plan.edges
      .filter((e) => e.target === node.id)
      .map((e) => e.source)

    for (const predId of predecessors) {
      const predState = plan.state.get(predId)
      if (predState?.output !== undefined) {
        const key = plan.nodes.find((n) => n.id === predId)?.data.output_key ?? predId
        inputs[key] = predState.output
      }
    }

    return inputs
  }

  private tryReplan(
    failedNodeId: string,
    plan: ExecutionPlan,
    depth: number,
  ): boolean {
    if (depth >= this.config.maxReplanDepth) return false

    const failedNode = plan.nodes.find((n) => n.id === failedNodeId)
    if (!failedNode || failedNode.data.replan_on_failure === false) return false

    // Replan: mark the node as pending for retry
    const state = plan.state.get(failedNodeId)
    if (state) {
      state.status = 'pending'
      state.attempt = 0
      state.error = undefined
    }

    return true
  }

  private toStatusMap(state: Map<string, NodeRuntimeState>): Map<string, NodeStatus> {
    const map = new Map<string, NodeStatus>()
    for (const [id, s] of state) {
      map.set(id, s.status)
    }
    return map
  }

  private toReportStatus(
    s: NodeStatus,
  ): 'pending' | 'running' | 'completed' | 'failed' | 'skipped' {
    switch (s) {
      case 'ready':
      case 'blocked':
        return 'pending'
      default:
        return s
    }
  }

  private determineFinalStatus(
    state: Map<string, NodeRuntimeState>,
  ): 'completed' | 'failed' | 'partial' {
    const statuses = Array.from(state.values()).map((s) => s.status)
    const allCompleted = statuses.every((s) => s === 'completed' || s === 'skipped')
    const anyFailed = statuses.some((s) => s === 'failed')

    if (allCompleted) return 'completed'
    if (anyFailed) return 'partial'
    return 'failed'
  }

  private estimateTokenCost(_output: unknown): number {
    // Estimate token cost from output size
    if (typeof _output === 'string') return Math.ceil(_output.length / 4)
    if (_output && typeof _output === 'object') {
      try {
        return Math.ceil(JSON.stringify(_output).length / 4)
      } catch {
        return 10
      }
    }
    return 1
  }

  private emit(type: string, dagExecId: string, data?: unknown): void {
    this.eventBus.emit({
      type,
      dagExecId,
      timestamp: Date.now(),
      data,
    })
  }

  private yieldControl(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0))
  }
}

type NodeHandler = (
  node: DAGNode,
  inputs: Record<string, unknown>,
  store: ContextStore,
) => Promise<unknown>

const nodeHandlers = new Map<string, NodeHandler>()

/**
 * Register a handler for a specific node type.
 */
export function registerNodeHandler(type: string, handler: NodeHandler): void {
  nodeHandlers.set(type, handler)
}

/**
 * Get the registered handler for a node type.
 */
export function getNodeHandler(type: string): NodeHandler | undefined {
  return nodeHandlers.get(type)
}

function generateId(): string {
  return `dag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
