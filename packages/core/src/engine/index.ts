export { ModelRegistry } from './model-registry'
export type { ModelConfig } from './model-registry'
export { HandlerRegistry } from './handler-registry'
export { DAGExecutionEngine } from './execution-engine'
export { ContextStore } from './context-store'
export { EventBus } from './event-bus'
export type { DAGEvent, EventHandler } from './event-bus'
export { D4EvolutionHook } from './d4-evolution'
export type { EvolutionRecord, EvolutionSuggestion } from './d4-evolution'
export { D4EvolutionAnalyzer } from './evolution'
export type { D4Suggestion, ExecutionRecord } from './evolution'

import { HandlerRegistry } from './handler-registry'
import { DAGExecutionEngine } from './execution-engine'
import type { DAGDocument } from '../types/dag-node'
import type { ExecutionOptions, DAGExecutionReport } from '../types/execution'

/**
 * Headless DAG test API — no UI dependency, suitable for CI.
 *
 * @example
 * ```ts
 * import { testDAG } from '@opcpflow/core'
 * const report = await testDAG(dag, { mode: 'live' })
 * console.log(report.status, report.nodes)
 * ```
 */
export async function testDAG(
  dag: DAGDocument,
  options?: ExecutionOptions & {
    handlers?: HandlerRegistry
  },
): Promise<DAGExecutionReport> {
  const engine = new DAGExecutionEngine()
  const handlers = options?.handlers ?? HandlerRegistry.createWithBuiltIns()

  return engine.execute(dag, handlers, {
    mode: options?.mode || 'dry-run',
    defaultTimeout: options?.defaultTimeout,
    onNodeFailed: options?.onNodeFailed,
    ...(options?.pinnedData ? { pinnedData: options.pinnedData } : {}),
  })
}

// Built-in control flow handlers
export {
  TriggerHandler,
  TaskDecomposeHandler,
  DynamicHandler,
  MergeHandler,
  OutputHandler,
} from './built-in/control-handlers'

// Default execution handlers
export {
  LLMCallHandler,
  APICallHandler,
  KnowledgeHandler,
  MCPToolHandler,
  StrategyHandler,
  VerificationHandler,
} from './built-in/execution-handlers'
