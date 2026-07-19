import type { DAGNode, DAGEdge } from '@opcpflow/core'
import type { SubgraphMatch } from './types'

/**
 * Subgraph computation and pattern matching utilities.
 *
 * Supports:
 * - Extracting a subgraph from a DAG by node IDs
 * - Computing a hash for subgraph identity
 * - Finding subgraphs that match known patterns
 * - Detecting isomorphic patterns
 */
export class SubgraphAnalyzer {
  /**
   * Extract a subgraph from the DAG containing only the specified node IDs.
   * Automatically includes edges between the selected nodes.
   */
  extractSubgraph(nodes: DAGNode[], edges: DAGEdge[], nodeIds: Set<string>): { nodes: DAGNode[]; edges: DAGEdge[] } {
    const subNodes = nodes.filter((n) => nodeIds.has(n.id))
    const nodeSet = new Set(nodeIds)
    const subEdges = edges.filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target))

    return { nodes: subNodes, edges: subEdges }
  }

  /**
   * Compute a hash for a subgraph based on its node types and edge structure.
   */
  computeHash(nodes: DAGNode[], edges: DAGEdge[]): string {
    const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id))
    const sortedEdges = [...edges].sort((a, b) => {
      if (a.source !== b.source) return a.source.localeCompare(b.source)
      return a.target.localeCompare(b.target)
    })

    const parts: string[] = []

    for (const node of sortedNodes) {
      parts.push(`${node.type}:${node.data.instructions ?? ''}`)
    }

    for (const edge of sortedEdges) {
      parts.push(`${edge.source}->${edge.target}:${edge.type}`)
    }

    // Simple hash function
    const str = parts.join('|')
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0 // Convert to 32bit integer
    }
    return `sub_${Math.abs(hash).toString(36)}`
  }

  /**
   * Find subgraphs matching known patterns.
   * A pattern is defined by a name and a predicate function.
   */
  findMatchingSubgraphs(
    nodes: DAGNode[],
    edges: DAGEdge[],
    patterns: Map<string, (nodes: DAGNode[], edges: DAGEdge[]) => string[][]>,
  ): SubgraphMatch[] {
    const matches: SubgraphMatch[] = []

    for (const [name, predicate] of patterns) {
      const matchedSets = predicate(nodes, edges)
      for (const nodeIds of matchedSets) {
        matches.push({
          name,
          nodeIds,
          score: this.computeMatchScore(nodes, edges, nodeIds),
        })
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score)
  }

  /**
   * Detect common subgraph patterns.
   */
  detectCommonPatterns(nodes: DAGNode[], edges: DAGEdge[]): SubgraphMatch[] {
    const patterns = new Map<string, (nodes: DAGNode[], edges: DAGEdge[]) => string[][]>()

    // Pattern 1: Sequential chain (A -> B -> C)
    patterns.set('sequential_chain', (n, e) => {
      const chains: string[][] = []
      const visited = new Set<string>()

      for (const node of n) {
        if (visited.has(node.id)) continue

        const chain: string[] = [node.id]
        visited.add(node.id)
        let current = node.id

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const outgoing = e.filter((edge) => edge.source === current)
          if (outgoing.length !== 1) break

          const next = outgoing[0].target
          const incoming = e.filter((edge) => edge.target === next)

          // Only follow if the next node has exactly one incoming edge
          if (incoming.length !== 1) break

          chain.push(next)
          visited.add(next)
          current = next
        }

        if (chain.length >= 2) {
          chains.push(chain)
        }
      }

      return chains
    })

    // Pattern 2: Fan-out (A -> B, A -> C, A -> D)
    patterns.set('fan_out', (n, e) => {
      const result: string[][] = []
      const outDegree = new Map<string, number>()

      for (const edge of e) {
        outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1)
      }

      for (const [nodeId, degree] of outDegree) {
        if (degree >= 3) {
          const targets = e.filter((ed) => ed.source === nodeId).map((ed) => ed.target)
          result.push([nodeId, ...targets])
        }
      }

      return result
    })

    // Pattern 3: Fan-in (A -> D, B -> D, C -> D)
    patterns.set('fan_in', (n, e) => {
      const result: string[][] = []
      const inDegree = new Map<string, number>()

      for (const edge of e) {
        inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1)
      }

      for (const [nodeId, degree] of inDegree) {
        if (degree >= 3) {
          const sources = e.filter((ed) => ed.target === nodeId).map((ed) => ed.source)
          result.push([...sources, nodeId])
        }
      }

      return result
    })

    // Pattern 4: Diamond (A -> B, A -> C, B -> D, C -> D)
    patterns.set('diamond', (n, e) => {
      const result: string[][] = []
      const adj = new Map<string, string[]>()
      for (const edge of e) {
        const list = adj.get(edge.source) ?? []
        list.push(edge.target)
        adj.set(edge.source, list)
      }

      for (const node of n) {
        const children = adj.get(node.id) ?? []
        if (children.length < 2) continue

        // Check if any pair of children converge
        for (let i = 0; i < children.length; i++) {
          for (let j = i + 1; j < children.length; j++) {
            const ciDesc = adj.get(children[i]) ?? []
            const cjDesc = adj.get(children[j]) ?? []
            const common = ciDesc.filter((d) => cjDesc.includes(d))

            if (common.length > 0) {
              result.push([node.id, children[i], children[j], common[0]])
            }
          }
        }
      }

      return result
    })

    return this.findMatchingSubgraphs(nodes, edges, patterns)
  }

  /**
   * Compute the connected subgraphs in a DAG.
   * Returns arrays of node IDs forming connected components.
   */
  findConnectedComponents(edges: DAGEdge[]): string[][] {
    const graph = new Map<string, string[]>()
    for (const edge of edges) {
      const srcList = graph.get(edge.source) ?? []
      srcList.push(edge.target)
      graph.set(edge.source, srcList)
      const tgtList = graph.get(edge.target) ?? []
      tgtList.push(edge.source)
      graph.set(edge.target, tgtList)
    }

    const visited = new Set<string>()
    const components: string[][] = []

    for (const nodeId of graph.keys()) {
      if (visited.has(nodeId)) continue

      const component: string[] = []
      const stack = [nodeId]
      while (stack.length > 0) {
        const current = stack.pop()!
        if (visited.has(current)) continue
        visited.add(current)
        component.push(current)
        for (const neighbor of graph.get(current) ?? []) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor)
          }
        }
      }

      if (component.length > 0) {
        components.push(component)
      }
    }

    return components
  }

  private computeMatchScore(_nodes: DAGNode[], _edges: DAGEdge[], nodeIds: string[]): number {
    // Score based on subgraph size and complexity
    const size = nodeIds.length
    const uniqueTypes = new Set(
      _nodes.filter((n) => nodeIds.includes(n.id)).map((n) => n.type),
    ).size

    return size * 10 + uniqueTypes * 5
  }
}
