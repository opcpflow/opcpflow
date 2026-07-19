export interface ConflictEntry {
  key: string
  writers: string[]
  firstWrite: number
  lastWrite: number
}

export type ConflictResolution = 'last-write-wins' | 'first-write-wins' | 'merge' | 'error'

/**
 * Conflict detector for write-write conflicts in the context store.
 */
export class ConflictDetector {
  private conflicts = new Map<string, ConflictEntry[]>()
  private resolution: ConflictResolution

  constructor(resolution: ConflictResolution = 'last-write-wins') {
    this.resolution = resolution
  }

  /**
   * Register a write. Returns true if this is the first write, false if a conflict.
   */
  register(key: string, writer: string): boolean {
    const now = Date.now()
    const existing = this.conflicts.get(key)

    if (!existing) {
      this.conflicts.set(key, [
        { key, writers: [writer], firstWrite: now, lastWrite: now },
      ])
      return true
    }

    // New conflict on this key
    existing.push({
      key,
      writers: [...existing[existing.length - 1].writers, writer],
      firstWrite: existing[0].firstWrite,
      lastWrite: now,
    })
    return false
  }

  getConflicts(key?: string): ConflictEntry[] {
    if (key) {
      return this.conflicts.get(key) ?? []
    }
    const all: ConflictEntry[] = []
    for (const entries of this.conflicts.values()) {
      all.push(...entries)
    }
    return all
  }

  hasConflicts(key?: string): boolean {
    if (key) {
      return (this.conflicts.get(key)?.length ?? 0) > 1
    }
    for (const entries of this.conflicts.values()) {
      if (entries.length > 1) return true
    }
    return false
  }

  getResolution(): ConflictResolution {
    return this.resolution
  }

  setResolution(resolution: ConflictResolution): void {
    this.resolution = resolution
  }

  /**
   * Resolve a conflict: return the winning writer based on the configured strategy.
   */
  resolve(key: string): string | null {
    const entries = this.conflicts.get(key)
    if (!entries || entries.length === 0) return null

    if (entries.length === 1) return entries[0].writers[0]

    switch (this.resolution) {
      case 'first-write-wins':
        return entries[0].writers[0]
      case 'last-write-wins':
        return entries[entries.length - 1].writers[entries[entries.length - 1].writers.length - 1]
      case 'error':
        throw new Error(`Write conflict on key "${key}": writers=${entries[entries.length - 1].writers.join(',')}`)
      case 'merge':
        // Merge strategy: return comma-joined writer IDs; caller handles actual merge
        return entries[entries.length - 1].writers.join(',')
      default:
        return entries[entries.length - 1].writers[entries[entries.length - 1].writers.length - 1]
    }
  }

  clear(): void {
    this.conflicts.clear()
  }
}
