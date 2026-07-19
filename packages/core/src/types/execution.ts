import type { DAGDocument, DAGNode } from './dag-node'

export interface ExecutionContext {
  nodeId: string
  dagId: string
  inputs: Record<string, any>
  global: Record<string, any>
  abortSignal: AbortSignal
  reportStage: (stage: string) => void
  timeout?: number
  /** Optional executor for sub-DAG generation (used by dynamic node) */
  subDAGExecutor?: (subDAG: DAGDocument) => Promise<DAGExecutionReport>
}

export interface ExecutionResult {
  output: any
  error?: string
  metrics: {
    startTime: number
    endTime: number
    durationMs: number
    stages?: { name: string; timestamp: number }[]
  }
  /** Context info: input sources, refs count, token estimate for this node */
  contextInfo?: {
    sources: number
    refs: string[]
    tokens_est: number
  }
}

export type ExecutionHandler = (
  input: any,
  context: ExecutionContext,
) => Promise<ExecutionResult>

export interface ExecutionOptions {
  defaultTimeout?: number
  onNodeStatusChange?: (nodeId: string, status: string, detail?: any) => void
  mode?: 'live' | 'dry-run'
  pinnedData?: Record<string, PinnedData>
  /** Step mode: called after each level completes. Await the returned promise to pause. */
  onLevelComplete?: (levelIndex: number, totalLevels: number) => Promise<void>
  /**
   * Error propagation strategy when a node fails:
   * - skip_downstream (default): failed node → downstream skipped
   * - continue_default:    failed node → downstream gets data.defaultOutput or {}
   * - continue_raw:        failed node → downstream gets { error, upstreamId }
   */
  onNodeFailed?: 'skip_downstream' | 'continue_default' | 'continue_raw'
  /**
   * Called before executing a node to validate required fields.
   * Return error string to fail the node, or null/undefined to proceed.
   */
  onValidateNode?: (node: DAGNode) => string | null | undefined
  /** Called when DAG execution fully completes (for evolution hooks, telemetry, etc.) */
  onDAGComplete?: (report: DAGExecutionReport & { storeSnapshot?: Record<string, unknown> }) => void
}

/**
 * Dispatch mode: selects which executor handles a dispatch-capable node.
 * Default implementation picks randomly from matching handlers.
 */
export interface ExecutorSelector {
  select(params: {
    requiredSkill?: string
    nodeId: string
    nodeType: string
    allHandlers: string[]
    context: ExecutionContext
  }): { selected: string; candidates: string[]; strategy: string }
}

/**
 * Dynamic mode: resolves the sub-DAG for a dynamic node at runtime.
 * Default implementation reads from node.data.sub_dag.
 */
export interface SubDAGResolver {
  resolve(nodeId: string, nodeData: Record<string, unknown>): Promise<DAGDocument>
}

export interface DAGExecutionReport {
  status: 'completed' | 'aborted' | 'failed' | 'partial'
  nodes: Record<string, NodeExecutionState>
  startTime: number
  endTime: number
}

export interface NodeExecutionState {
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  result?: ExecutionResult
  error?: string
}

export interface PinnedData {
  output: any
  pinnedAt: number
  /** Hashes of upstream outputs at time of pinning, for stale detection */
  upstreamHashes?: Record<string, string>
}
