/**
 * Source tagging for data provenance.
 * Records which node produced each value in the context store.
 */
export interface DataSource {
  nodeId: string
  key: string
  timestamp: number
}

export class SourceTracker {
  private sources = new Map<string, DataSource>()

  tag(key: string, nodeId: string): void {
    this.sources.set(key, { nodeId, key, timestamp: Date.now() })
  }

  getSource(key: string): DataSource | undefined {
    return this.sources.get(key)
  }

  getKeysByNode(nodeId: string): string[] {
    const keys: string[] = []
    for (const [key, source] of this.sources) {
      if (source.nodeId === nodeId) {
        keys.push(key)
      }
    }
    return keys
  }

  getAll(): Map<string, DataSource> {
    return new Map(this.sources)
  }

  delete(key: string): void {
    this.sources.delete(key)
  }

  clear(): void {
    this.sources.clear()
  }
}
