import { ExecutionHandler } from '../types/execution'
import {
  TriggerHandler, TaskDecomposeHandler, DynamicHandler, MergeHandler, OutputHandler,
} from './built-in/control-handlers'
import {
  LLMCallHandler, APICallHandler, KnowledgeHandler,
  MCPToolHandler, StrategyHandler, VerificationHandler,
} from './built-in/execution-handlers'

export class HandlerRegistry {
  private handlers = new Map<string, ExecutionHandler>()

  register(type: string, handler: ExecutionHandler): void {
    if (this.handlers.has(type)) {
      throw new Error(`Handler for type "${type}" is already registered — use override() to replace`)
    }
    this.handlers.set(type, handler)
  }

  registerMany(map: Record<string, ExecutionHandler>): void {
    for (const [type, handler] of Object.entries(map)) {
      this.register(type, handler)
    }
  }

  /**
   * Override an existing handler. Silently succeeds even if the type
   * doesn't exist yet (equivalent to register in that case).
   */
  override(type: string, handler: ExecutionHandler): void {
    this.handlers.set(type, handler)
  }

  get(type: string): ExecutionHandler | undefined {
    return this.handlers.get(type)
  }

  has(type: string): boolean {
    return this.handlers.has(type)
  }

  /** Get all registered handler type names */
  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys())
  }

  /** Create a registry with all built-in node handlers pre-registered */
  static createWithBuiltIns(): HandlerRegistry {
    const registry = new HandlerRegistry()
    // Control flow
    registry.register('trigger', TriggerHandler)
    registry.register('task_decompose', TaskDecomposeHandler)
    registry.register('dynamic', DynamicHandler)
    registry.register('merge', MergeHandler)
    registry.register('output', OutputHandler)
    // Execution — default direct-execution implementations
    registry.register('llm_call', LLMCallHandler)
    registry.register('api_call', APICallHandler)
    registry.register('mcp_tool', MCPToolHandler)
    registry.register('knowledge', KnowledgeHandler)
    registry.register('strategy', StrategyHandler)
    // Verification
    registry.register('verification', VerificationHandler)
    return registry
  }
}

// ── Re-exports for convenience ──
export {
  TriggerHandler, TaskDecomposeHandler, DynamicHandler, MergeHandler, OutputHandler,
  LLMCallHandler, APICallHandler, KnowledgeHandler,
  MCPToolHandler, StrategyHandler, VerificationHandler,
} from './built-in/index'
