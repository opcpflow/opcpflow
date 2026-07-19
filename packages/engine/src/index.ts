// Types
export type {
  ExecutionStrategy,
  NodeStatus,
  EngineConfig,
  BudgetConfig,
  NodeRuntimeState,
  ExecutionPlan,
  ReadyResult,
  SubgraphMatch,
  ReplanResult,
  CriticalPathInfo,
  SourceTag,
  ConflictRecord,
  TraceSpan,
  EngineEvent,
} from './types'

// Core engine classes
export { Executor, registerNodeHandler, getNodeHandler } from './executor'
export { Frontier } from './frontier'
export { ContextStore } from './context-store'
export { SubgraphAnalyzer } from './subgraph'
export { Replanner } from './replanner'
export type { ReplanStrategy, ReplanConfig } from './replanner'
export { TopologyAnalyzer } from './topology'

// Context store sub-modules
export { BudgetTracker } from './store/budget'
export type { BudgetLimit, NodeCost } from './store/budget'
export { FreshnessTracker } from './store/freshness'
export { SourceTracker } from './store/source-tag'
export type { DataSource } from './store/source-tag'
export { ConflictDetector } from './store/conflict'
export type { ConflictEntry, ConflictResolution } from './store/conflict'

// Telemetry
export { Tracer, Span } from './telemetry/tracer'
export { EventBus } from './telemetry/event-bus'
export type { EventHandler } from './telemetry/event-bus'
export { ExecutionRecorder } from './telemetry/recorder'
export type { RecordedExecution, RecordedNodeState } from './telemetry/recorder'
