/**
 * Context store for DAG execution memory.
 *
 * Three-level memory model:
 *   L1: Node scratch space (ephemeral, cleared per node)
 *   L2: Structured state (outputs, summaries, key points)
 *   L3: External cache (TTL+LRU for MCP/API results)
 *
 * Features:
 * - Source tagging (which node produced each value)
 * - Freshness tracking (timestamp per key, TTL-based staleness)
 * - Conflict detection (multiple writers to same key)
 * - Token budget tracking
 */

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

interface CacheEntry {
  value: unknown
  expiresAt: number
  lastAccess: number
}

export class ContextStore {
  // L1: Node temporary scratch
  private scratch = new Map<string, Map<string, unknown>>()
  // L2: Structured state
  private data = new Map<string, unknown>()
  private summaries = new Map<string, string>()
  private sourceTags = new Map<string, SourceTag>()
  private freshness = new Map<string, number>()
  private conflicts = new Map<string, ConflictRecord[]>()
  // L3: External cache
  private cache = new Map<string, CacheEntry>()
  private cacheMaxSize = 100
  // Token tracking
  private tokenUsage = 0
  private maxTokens?: number

  constructor(options?: { maxTokens?: number; cacheMaxSize?: number }) {
    this.maxTokens = options?.maxTokens
    this.cacheMaxSize = options?.cacheMaxSize ?? 100
  }

  // ── L1: Node scratch ──

  setScratch(nodeId: string, key: string, value: unknown): void {
    let space = this.scratch.get(nodeId)
    if (!space) {
      space = new Map()
      this.scratch.set(nodeId, space)
    }
    space.set(key, value)
  }

  getScratch(nodeId: string, key: string): unknown | undefined {
    return this.scratch.get(nodeId)?.get(key)
  }

  clearScratch(nodeId: string): void {
    this.scratch.delete(nodeId)
  }

  // ── L2: Structured state ──

  set(key: string, value: unknown, sourceNodeId?: string): void {
    const now = Date.now()

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

  get<T = unknown>(key: string): T | undefined {
    return this.data.get(key) as T | undefined
  }

  has(key: string): boolean {
    return this.data.has(key)
  }

  delete(key: string): void {
    this.data.delete(key)
    this.summaries.delete(key)
    this.sourceTags.delete(key)
    this.freshness.delete(key)
    this.conflicts.delete(key)
  }

  /** Auto-generated or cached summary of a node's output */
  getSummary(key: string): string | undefined {
    return this.summaries.get(key)
  }

  setSummary(key: string, summary: string): void {
    this.summaries.set(key, summary)
  }

  /** All L2 data as a plain object */
  snapshot(): Record<string, unknown> {
    const obj: Record<string, unknown> = {}
    for (const [key, value] of this.data) {
      obj[key] = value
    }
    return obj
  }

  // ── Freshness ──

  getAge(key: string): number | undefined {
    const ts = this.freshness.get(key)
    return ts !== undefined ? Date.now() - ts : undefined
  }

  isStale(key: string, ttlMs: number): boolean {
    const age = this.getAge(key)
    return age !== undefined && age > ttlMs
  }

  // ── Source tagging ──

  getSource(key: string): SourceTag | undefined {
    return this.sourceTags.get(key)
  }

  // ── Conflict detection ──

  getConflicts(key?: string): ConflictRecord[] | Map<string, ConflictRecord[]> {
    if (key) return this.conflicts.get(key) ?? []
    return new Map(this.conflicts)
  }

  hasConflicts(key?: string): boolean {
    if (key) return (this.conflicts.get(key)?.length ?? 0) > 0
    return this.conflicts.size > 0
  }

  // ── L3: External cache ──

  cacheSet(key: string, value: unknown, ttlMs: number): void {
    if (this.cache.size >= this.cacheMaxSize) {
      // LRU eviction
      let oldest: string | null = null
      let oldestAccess = Infinity
      for (const [k, entry] of this.cache) {
        if (entry.lastAccess < oldestAccess) {
          oldestAccess = entry.lastAccess
          oldest = k
        }
      }
      if (oldest) this.cache.delete(oldest)
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      lastAccess: Date.now(),
    })
  }

  cacheGet<T = unknown>(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }
    entry.lastAccess = Date.now()
    return entry.value as T
  }

  // ── Token budget ──

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

  // ── Lifecycle ──

  clear(): void {
    this.scratch.clear()
    this.data.clear()
    this.summaries.clear()
    this.sourceTags.clear()
    this.freshness.clear()
    this.conflicts.clear()
    this.cache.clear()
    this.tokenUsage = 0
  }

  size(): number {
    return this.data.size
  }
}
