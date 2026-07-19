/**
 * Lightweight event bus for DAG execution lifecycle events.
 *
 * Supports pub/sub for:
 * - Node events: started, completed, failed, skipped
 * - DAG events: started, completed, failed, replanned
 * - Wave/level events: started, completed
 * - Budget events: exhausted
 * - Evolution events: pattern_detected, node_promoted
 */

export type EventHandler = (event: DAGEvent) => void

export interface DAGEvent {
  type: string
  dagId: string
  timestamp: number
  nodeId?: string
  data?: unknown
}

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>()
  private history: DAGEvent[] = []
  private maxHistory = 1000

  on(type: string, handler: EventHandler): () => void {
    const set = this.handlers.get(type) ?? new Set()
    set.add(handler)
    this.handlers.set(type, set)
    return () => {
      set.delete(handler)
      if (set.size === 0) this.handlers.delete(type)
    }
  }

  once(type: string, handler: EventHandler): void {
    const wrapper: EventHandler = (event) => {
      handler(event)
      this.off(type, wrapper)
    }
    this.on(type, wrapper)
  }

  off(type: string, handler: EventHandler): void {
    const set = this.handlers.get(type)
    if (set) {
      set.delete(handler)
      if (set.size === 0) this.handlers.delete(type)
    }
  }

  emit(event: DAGEvent): void {
    this.history.push(event)
    if (this.history.length > this.maxHistory) this.history.shift()

    const specific = this.handlers.get(event.type)
    if (specific) {
      for (const h of specific) {
        try { h(event) } catch (e) { console.error(`[EventBus] ${event.type}:`, e) }
      }
    }
    const wildcard = this.handlers.get('*')
    if (wildcard) {
      for (const h of wildcard) {
        try { h(event) } catch (e) { console.error('[EventBus] *:', e) }
      }
    }
  }

  getHistory(type?: string): DAGEvent[] {
    return type ? this.history.filter(e => e.type === type) : [...this.history]
  }

  clear(): void {
    this.handlers.clear()
    this.history = []
  }
}
