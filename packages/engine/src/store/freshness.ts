/**
 * Freshness tracker for data staleness detection.
 */
export class FreshnessTracker {
  private timestamps = new Map<string, number>()

  record(key: string): void {
    this.timestamps.set(key, Date.now())
  }

  getAge(key: string): number | undefined {
    const ts = this.timestamps.get(key)
    return ts !== undefined ? Date.now() - ts : undefined
  }

  isStale(key: string, ttlMs: number): boolean {
    const age = this.getAge(key)
    return age !== undefined && age > ttlMs
  }

  isFresh(key: string, ttlMs: number): boolean {
    const age = this.getAge(key)
    return age !== undefined && age <= ttlMs
  }

  getTimestamp(key: string): number | undefined {
    return this.timestamps.get(key)
  }

  getAll(): Map<string, number> {
    return new Map(this.timestamps)
  }

  delete(key: string): void {
    this.timestamps.delete(key)
  }

  clear(): void {
    this.timestamps.clear()
  }
}
