import type { EngineEvent } from '../types'

/**
 * Event bus for DAG engine lifecycle events.
 *
 * Supports pub/sub for:
 * - Node events: started, completed, failed, skipped
 * - DAG events: started, completed, failed, replanned
 * - Wave events: started, completed
 * - Budget events: exhausted
 */
export type EventHandler = (event: EngineEvent) => void

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>()
  private history: EngineEvent[] = []
  private maxHistory = 1000

  /**
   * Subscribe to an event type.
   * Use '*' to listen to all events.
   */
  on(type: string, handler: EventHandler): () => void {
    const set = this.handlers.get(type) ?? new Set()
    set.add(handler)
    this.handlers.set(type, set)

    // Return unsubscribe function
    return () => {
      set.delete(handler)
      if (set.size === 0) this.handlers.delete(type)
    }
  }

  /**
   * Subscribe to a single event, then unsubscribe.
   */
  once(type: string, handler: EventHandler): void {
    const wrapper: EventHandler = (event) => {
      handler(event)
      this.off(type, wrapper)
    }
    this.on(type, wrapper)
  }

  /**
   * Unsubscribe a handler.
   */
  off(type: string, handler: EventHandler): void {
    const set = this.handlers.get(type)
    if (set) {
      set.delete(handler)
      if (set.size === 0) this.handlers.delete(type)
    }
  }

  /**
   * Emit an event to all subscribers.
   */
  emit(event: EngineEvent): void {
    this.history.push(event)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    // Notify specific handlers
    const specificHandlers = this.handlers.get(event.type)
    if (specificHandlers) {
      for (const handler of specificHandlers) {
        try {
          handler(event)
        } catch (err) {
          console.error(`[EventBus] Error in handler for "${event.type}":`, err)
        }
      }
    }

    // Notify wildcard handlers
    const wildcardHandlers = this.handlers.get('*')
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          handler(event)
        } catch (err) {
          console.error('[EventBus] Error in wildcard handler:', err)
        }
      }
    }
  }

  /**
   * Get event history.
   */
  getHistory(type?: string): EngineEvent[] {
    if (type) {
      return this.history.filter((e) => e.type === type)
    }
    return [...this.history]
  }

  /**
   * Clear all handlers and history.
   */
  clear(): void {
    this.handlers.clear()
    this.history = []
  }
}
