/**
 * Semantic cache for LLM invocation results.
 *
 * Caches LLM responses keyed by a semantic hash of the prompt,
 * reducing token usage for repeated or similar invocations.
 */
export interface CacheEntry {
  key: string
  prompt: string
  response: string
  model: string
  timestamp: number
  accessCount: number
  ttlMs?: number
}

export interface CacheConfig {
  maxEntries: number
  defaultTtlMs?: number
  similarityThreshold?: number // 0-1, for fuzzy matching
}

export class SemanticCache {
  private entries = new Map<string, CacheEntry>()
  private config: CacheConfig

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxEntries: config?.maxEntries ?? 1000,
      defaultTtlMs: config?.defaultTtlMs,
      similarityThreshold: config?.similarityThreshold ?? 1.0, // exact match by default
    }
  }

  /**
   * Get a cached response by exact prompt match.
   */
  get(prompt: string, model?: string): string | undefined {
    const key = this.makeKey(prompt, model)
    const entry = this.entries.get(key)

    if (!entry) return undefined

    // Check TTL
    if (entry.ttlMs !== undefined) {
      const age = Date.now() - entry.timestamp
      if (age > entry.ttlMs) {
        this.entries.delete(key)
        return undefined
      }
    }

    entry.accessCount++
    return entry.response
  }

  /**
   * Find a similar cached entry using simple string similarity.
   */
  findSimilar(prompt: string, model?: string, threshold?: number): { response: string; similarity: number } | undefined {
    const thr = threshold ?? this.config.similarityThreshold ?? 0.8

    for (const [, entry] of this.entries) {
      if (model && entry.model !== model) continue

      // Check TTL
      if (entry.ttlMs !== undefined) {
        const age = Date.now() - entry.timestamp
        if (age > entry.ttlMs) {
          continue
        }
      }

      const similarity = this.stringSimilarity(prompt, entry.prompt)
      if (similarity >= thr) {
        entry.accessCount++
        return { response: entry.response, similarity }
      }
    }

    return undefined
  }

  /**
   * Store a response in the cache.
   */
  set(prompt: string, response: string, model?: string, ttlMs?: number): void {
    // Evict if at capacity
    if (this.entries.size >= this.config.maxEntries) {
      this.evictLRU()
    }

    const key = this.makeKey(prompt, model)
    this.entries.set(key, {
      key,
      prompt,
      response,
      model: model ?? 'default',
      timestamp: Date.now(),
      accessCount: 1,
      ttlMs: ttlMs ?? this.config.defaultTtlMs,
    })
  }

  /**
   * Check if an exact match exists in cache.
   */
  has(prompt: string, model?: string): boolean {
    const key = this.makeKey(prompt, model)
    return this.entries.has(key)
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    let totalAccesses = 0
    let expiredEntries = 0

    for (const [, entry] of this.entries) {
      totalAccesses += entry.accessCount
      if (entry.ttlMs !== undefined) {
        const age = Date.now() - entry.timestamp
        if (age > entry.ttlMs) expiredEntries++
      }
    }

    return {
      size: this.entries.size,
      maxEntries: this.config.maxEntries,
      totalAccesses,
      expiredEntries,
      hitRate: totalAccesses > 0 ? (totalAccesses - this.entries.size) / totalAccesses : 0,
    }
  }

  /**
   * Invalidate cache entries matching a predicate.
   */
  invalidate(predicate: (entry: CacheEntry) => boolean): number {
    let count = 0
    for (const [key, entry] of this.entries) {
      if (predicate(entry)) {
        this.entries.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.entries.clear()
  }

  /**
   * Get the number of entries.
   */
  size(): number {
    return this.entries.size
  }

  // ---- private ----

  private makeKey(prompt: string, model?: string): string {
    return model ? `${model}::${prompt}` : prompt
  }

  private evictLRU(): void {
    let oldest = Date.now()
    let oldestKey: string | undefined

    for (const [key, entry] of this.entries) {
      if (entry.timestamp < oldest) {
        oldest = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.entries.delete(oldestKey)
    }
  }

  private stringSimilarity(a: string, b: string): number {
    if (a === b) return 1.0
    if (a.length < 10 || b.length < 10) {
      // Short strings: use character overlap
      return this.charOverlap(a, b)
    }

    // Longer strings: use word overlap
    const wordsA = new Set(a.toLowerCase().split(/\s+/))
    const wordsB = new Set(b.toLowerCase().split(/\s+/))
    const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)))
    const union = new Set([...wordsA, ...wordsB])

    if (union.size === 0) return 1.0
    return intersection.size / union.size
  }

  private charOverlap(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length)
    if (maxLen === 0) return 1.0
    let matches = 0
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) matches++
    }
    return matches / maxLen
  }
}

export interface CacheStats {
  size: number
  maxEntries: number
  totalAccesses: number
  expiredEntries: number
  hitRate: number
}
