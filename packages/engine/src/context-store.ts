import type { SourceTag, ConflictRecord } from './types'

/**
 * Context store for passing data between DAG nodes during execution.
 *
 * Supports:
 * - Source tagging (which node produced each value)
 * - Freshness tracking (timestamp per key)
 * - Conflict detection (multiple writers to same key)
 * - Budget tracking (optional token/cost limits)
 */
export class ContextStore {
  private data = new Map<string, unknown>()
  private sourceTags = new Map<string, SourceTag>()
  private freshness = new Map<string, number>()
  private conflicts = new Map<string, ConflictRecord[]>()
  private tokenUsage = 0
  private maxTokens?: number

  constructor(options?: { maxTokens?: number }) {
    this.maxTokens = options?.maxTokens
  }

  // ---- read / write ----

  get<T = unknown>(key: string): T | undefined {
    return this.data.get(key) as T | undefined
  }

  set(key: string, value: unknown, sourceNodeId?: string): void {
    const now = Date.now()

    // Detect write conflicts
    if (this.data.has(key)) {
      const record: ConflictRecord = {
        key,
        writers: [this.sourceTags.get(key)?.nodeId ?? 'unknown', sourceNodeId ?? 'unknown'].filter(Boolean),
        timestamp: now,
      }
      const existing = this.conflicts.get(key) ?? []
      existing.push(record)
      this.conflicts.set(key, existing)
    }

    this.data.set(key, value)
    this.freshness.set(key, now)

    if (sourceNodeId) {
      this.sourceTags.set(key, { nodeId: sourceNodeId, key, timestamp: now })
    }
  }

  has(key: string): boolean {
    return this.data.has(key)
  }

  delete(key: string): void {
    this.data.delete(key)
    this.sourceTags.delete(key)
    this.freshness.delete(key)
    this.conflicts.delete(key)
  }

  clear(): void {
    this.data.clear()
    this.sourceTags.clear()
    this.freshness.clear()
    this.conflicts.clear()
    this.tokenUsage = 0
  }

  // ---- source tagging ----

  getSource(key: string): SourceTag | undefined {
    return this.sourceTags.get(key)
  }

  getSources(): Map<string, SourceTag> {
    return new Map(this.sourceTags)
  }

  // ---- freshness ----

  getAge(key: string): number | undefined {
    const ts = this.freshness.get(key)
    return ts !== undefined ? Date.now() - ts : undefined
  }

  isStale(key: string, ttlMs: number): boolean {
    const age = this.getAge(key)
    return age !== undefined && age > ttlMs
  }

  getFreshness(): Map<string, number> {
    return new Map(this.freshness)
  }

  // ---- conflict detection ----

  getConflicts(key?: string): ConflictRecord[] | Map<string, ConflictRecord[]> {
    if (key) {
      return this.conflicts.get(key) ?? []
    }
    return new Map(this.conflicts)
  }

  hasConflicts(key?: string): boolean {
    if (key) {
      return (this.conflicts.get(key)?.length ?? 0) > 0
    }
    return this.conflicts.size > 0
  }

  // ---- budget ----

  addTokenCost(cost: number): boolean {
    if (this.maxTokens !== undefined && this.tokenUsage + cost > this.maxTokens) {
      return false
    }
    this.tokenUsage += cost
    return true
  }

  getTokenUsage(): number {
    return this.tokenUsage
  }

  getRemainingBudget(): number | undefined {
    if (this.maxTokens === undefined) return undefined
    return Math.max(0, this.maxTokens - this.tokenUsage)
  }

  // ---- snapshot ----

  snapshot(): Record<string, unknown> {
    const obj: Record<string, unknown> = {}
    for (const [key, value] of this.data) {
      obj[key] = value
    }
    return obj
  }

  size(): number {
    return this.data.size
  }
}
