export type DAGStatus = 'draft' | 'active' | 'archived'

export type EdgeType = 'execution' | 'data-flow'

export interface Position {
  x: number
  y: number
}

export interface DAGNode<T = Record<string, unknown>> {
  id: string
  type: string
  position: Position
  data: T & {
    label?: string
    instructions?: string
    max_retries?: number
    timeout_seconds?: number
    config?: Record<string, unknown>
    /** @internal Auto-resolved by engine from DAG topology */
    input_refs?: string[]
    /** @internal Auto-assigned by engine for data routing */
    output_key?: string
  }
}

export interface DAGEdge {
  id: string
  source: string
  target: string
  type: EdgeType
  label?: string
  sourceHandle?: string
  targetHandle?: string
  data?: Record<string, unknown>
}

export interface Metadata {
  name: string
  description?: string
  version: number
  status?: DAGStatus
  tags?: string[]
  created_at?: string
  updated_at?: string
}

export interface DAGDocument {
  nodes: DAGNode[]
  edges: DAGEdge[]
  metadata: Metadata
}

export interface ExecutionReport {
  dagExecID: string
  nodeResults: NodeResult[]
  startTime: string
  endTime: string
  status: 'completed' | 'failed' | 'partial'
  error?: string
}

export interface NodeResult {
  nodeID: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  output?: unknown
  error?: string
  startTime?: string
  endTime?: string
  retryCount?: number
}
