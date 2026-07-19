import type { DAGNode, DAGEdge } from '@opcpflow/core'
import type { CriticalPathInfo } from './types'

/**
 * Enhanced topological analysis for DAGs.
 *
 * Extends the basic topology utilities from @opcpflow/core with:
 * - Critical path analysis
 * - Cyclomatic complexity
 * - Fan-in / fan-out metrics
 * - Parallelism factor
 */
export class TopologyAnalyzer {
  /**
   * Find the critical path — the longest path through the DAG.
   * Each node is assumed to have unit weight unless specified otherwise.
   */
  criticalPath(nodes: DAGNode[], edges: DAGEdge[]): CriticalPathInfo {
    const topologicalOrder = this.topologicalSort(nodes, edges)
    const dist = new Map<string, number>()
    const prev = new Map<string, string | null>()

    for (const id of topologicalOrder) {
      dist.set(id, 0)
      prev.set(id, null)
    }

    for (const u of topologicalOrder) {
      const outgoing = edges.filter((e) => e.source === u)
      for (const edge of outgoing) {
        const weight = this.getNodeWeight(edge.target, nodes)
        const newDist = (dist.get(u) ?? 0) + weight
        if (newDist > (dist.get(edge.target) ?? 0)) {
          dist.set(edge.target, newDist)
          prev.set(edge.target, u)
        }
      }
    }

    // Find the node with the longest distance
    let maxDist = 0
    let maxNode = topologicalOrder[0] ?? ''
    for (const [id, d] of dist) {
      if (d > maxDist) {
        maxDist = d
        maxNode = id
      }
    }

    // Reconstruct the path
    const path: string[] = []
    let current: string | null = maxNode
    while (current !== null) {
      path.unshift(current)
      current = prev.get(current) ?? null
    }

    return { path, totalWeight: maxDist }
  }

  /**
   * Compute cyclomatic complexity: E - N + 2P
   * where E = edges, N = nodes, P = connected components.
   */
  cyclomaticComplexity(nodes: DAGNode[], edges: DAGEdge[]): number {
    const components = this.countConnectedComponents(nodes, edges)
    return edges.length - nodes.length + 2 * components
  }

  /**
   * Compute fan-in: number of incoming edges to a node.
   */
  fanIn(nodeId: string, edges: DAGEdge[]): number {
    return edges.filter((e) => e.target === nodeId).length
  }

  /**
   * Compute fan-out: number of outgoing edges from a node.
   */
  fanOut(nodeId: string, edges: DAGEdge[]): number {
    return edges.filter((e) => e.source === nodeId).length
  }

  /**
   * Compute the parallelism factor — ratio of max wave size to total nodes.
   * Higher values indicate more parallelism.
   */
  parallelismFactor(nodes: DAGNode[], edges: DAGEdge[]): number {
    if (nodes.length === 0) return 0

    const waves = this.computeWaves(nodes, edges)
    const maxWaveSize = Math.max(...waves.map((w) => w.length), 1)
    return maxWaveSize / nodes.length
  }

  /**
   * Compute the average path length through the DAG.
   */
  averagePathLength(nodes: DAGNode[], edges: DAGEdge[]): number {
    if (nodes.length <= 1) return 0

    const topologicalOrder = this.topologicalSort(nodes, edges)
    const roots = topologicalOrder.filter(
      (id) => !edges.some((e) => e.target === id),
    )
    const leaves = topologicalOrder.filter(
      (id) => !edges.some((e) => e.source === id),
    )

    let totalLength = 0
    let pathCount = 0

    for (const root of roots) {
      for (const leaf of leaves) {
        const length = this.shortestPathLength(root, leaf, edges)
        if (length > 0) {
          totalLength += length
          pathCount++
        }
      }
    }

    return pathCount > 0 ? totalLength / pathCount : 0
  }

  /**
   * Compute longest path length between two nodes.
   */
  longestPathLength(from: string, to: string, edges: DAGEdge[]): number {
    const adj = new Map<string, string[]>()
    for (const edge of edges) {
      const list = adj.get(edge.source) ?? []
      list.push(edge.target)
      adj.set(edge.source, list)
    }

    let maxLen = -1
    const visited = new Set<string>()

    const dfs = (current: string, depth: number): void => {
      if (current === to) {
        maxLen = Math.max(maxLen, depth)
        return
      }
      if (visited.has(current)) return
      visited.add(current)

      for (const next of adj.get(current) ?? []) {
        if (!visited.has(next)) {
          dfs(next, depth + 1)
        }
      }

      visited.delete(current)
    }

    dfs(from, 0)
    return maxLen
  }

  // ---- private ----

  private topologicalSort(nodes: DAGNode[], edges: DAGEdge[]): string[] {
    const inDegree = new Map<string, number>()
    const adj = new Map<string, string[]>()

    for (const n of nodes) {
      inDegree.set(n.id, 0)
      adj.set(n.id, [])
    }
    for (const e of edges) {
      adj.get(e.source)?.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
    }

    const queue: string[] = []
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id)
    }

    const order: string[] = []
    while (queue.length > 0) {
      const u = queue.shift()!
      order.push(u)
      for (const v of adj.get(u) ?? []) {
        inDegree.set(v, (inDegree.get(v) ?? 1) - 1)
        if (inDegree.get(v) === 0) queue.push(v)
      }
    }

    return order
  }

  private computeWaves(nodes: DAGNode[], edges: DAGEdge[]): string[][] {
    const inDegree = new Map<string, number>()
    const adj = new Map<string, string[]>()

    for (const n of nodes) {
      inDegree.set(n.id, 0)
      adj.set(n.id, [])
    }
    for (const e of edges) {
      adj.get(e.source)?.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
    }

    const waves: string[][] = []
    const degree = new Map(inDegree)

    while (true) {
      const currentWave = nodes
        .filter((n) => degree.get(n.id) === 0)
        .map((n) => n.id)
        .filter((id) => !waves.some((w) => w.includes(id)))

      if (currentWave.length === 0) break
      waves.push(currentWave)

      for (const id of currentWave) {
        for (const target of adj.get(id) ?? []) {
          degree.set(target, (degree.get(target) ?? 1) - 1)
        }
      }
    }

    return waves
  }

  private getNodeWeight(nodeId: string, nodes: DAGNode[]): number {
    const node = nodes.find((n) => n.id === nodeId)
    // Heavier nodes (LLM calls) have higher weight
    if (node?.type === 'llm_call' || node?.type === 'mcp_tool') return 3
    return 1
  }

  private countConnectedComponents(nodes: DAGNode[], edges: DAGEdge[]): number {
    if (nodes.length === 0) return 0

    const graph = new Map<string, string[]>()
    for (const n of nodes) graph.set(n.id, [])
    for (const e of edges) {
      graph.get(e.source)?.push(e.target)
      graph.get(e.target)?.push(e.source)
    }

    const visited = new Set<string>()
    let components = 0

    for (const n of nodes) {
      if (visited.has(n.id)) continue
      components++
      const stack = [n.id]
      while (stack.length > 0) {
        const current = stack.pop()!
        if (visited.has(current)) continue
        visited.add(current)
        for (const neighbor of graph.get(current) ?? []) {
          if (!visited.has(neighbor)) stack.push(neighbor)
        }
      }
    }

    return components
  }

  private shortestPathLength(from: string, to: string, edges: DAGEdge[]): number {
    const adj = new Map<string, string[]>()
    for (const edge of edges) {
      const list = adj.get(edge.source) ?? []
      list.push(edge.target)
      adj.set(edge.source, list)
    }

    const visited = new Set<string>()
    const queue: Array<{ id: string; dist: number }> = [{ id: from, dist: 0 }]
    visited.add(from)

    while (queue.length > 0) {
      const { id, dist } = queue.shift()!
      if (id === to) return dist

      for (const next of adj.get(id) ?? []) {
        if (!visited.has(next)) {
          visited.add(next)
          queue.push({ id: next, dist: dist + 1 })
        }
      }
    }

    return -1
  }
}
