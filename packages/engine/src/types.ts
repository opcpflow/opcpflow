import type { DAGNode, DAGEdge, Metadata, NodeResult } from '@opcpflow/core'

export type ExecutionStrategy = 'wave' | 'sequential' | 'topological'
export type NodeStatus = 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped' | 'blocked'

export interface EngineConfig {
  strategy?: ExecutionStrategy
  maxConcurrency?: number
  enableReplan?: boolean
  maxReplanDepth?: number
  defaultTimeout?: number
  budget?: BudgetConfig
  enableTracing?: boolean
  enableRecording?: boolean
}

export interface BudgetConfig {
  maxTokens?: number
  maxCost?: number
  maxNodes?: number
}

export interface NodeRuntimeState {
  nodeId: string
  status: NodeStatus
  attempt: number
  startedAt?: number
  completedAt?: number
  output?: unknown
  error?: string
  tokenCost?: number
}

export interface ExecutionPlan {
  dagExecId: string
  nodes: DAGNode[]
  edges: DAGEdge[]
  metadata: Metadata
  strategy: ExecutionStrategy
  waves: string[][]
  state: Map<string, NodeRuntimeState>
}

export interface ReadyResult {
  ready: string[]
  blocked: string[]
  completed: string[]
}

export interface SubgraphMatch {
  name: string
  nodeIds: string[]
  score: number
}

export interface ReplanResult {
  modified: boolean
  nodes: DAGNode[]
  edges: DAGEdge[]
  reason?: string
}

export interface CriticalPathInfo {
  path: string[]
  totalWeight: number
}

export interface SourceTag {
  nodeId: string
  key: string
  timestamp: number
}

export interface ConflictRecord {
  key: string
  writers: string[]
  timestamp: number
}

export interface TraceSpan {
  spanId: string
  parentSpanId?: string
  nodeId: string
  operation: string
  startTime: number
  endTime?: number
  tags: Record<string, string>
  status: 'ok' | 'error'
  error?: string
}

export interface EngineEvent {
  type: string
  dagExecId: string
  timestamp: number
  nodeId?: string
  data?: unknown
}
