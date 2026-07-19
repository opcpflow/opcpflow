import type { DAGNode, DAGEdge } from '@opcpflow/core'
import type { ReplanResult, NodeRuntimeState } from './types'

/**
 * Replanner — handles DAG re-planning when a node fails during execution.
 *
 * Strategies:
 * - retry: reset the failed node for re-execution
 * - skip: skip the failed node and rewire edges
 * - fallback: insert a fallback node
 * - abort: mark the DAG as failed
 */
export type ReplanStrategy = 'retry' | 'skip' | 'fallback' | 'abort'

export interface ReplanConfig {
  maxRetries: number
  strategy: ReplanStrategy
  fallbackNode?: DAGNode
}

/**
 * DAG Replanner.
 *
 * When a node fails during execution, the replanner decides how to
 * recover based on the node's configuration and the overall DAG state.
 */
export class Replanner {
  private config: ReplanConfig

  constructor(config?: Partial<ReplanConfig>) {
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      strategy: config?.strategy ?? 'retry',
      fallbackNode: config?.fallbackNode,
    }
  }

  /**
   * Replan after a node failure.
   *
   * @param failedNodeId - The ID of the failed node
   * @param nodes - All DAG nodes
   * @param edges - All DAG edges
   * @param state - Current execution state
   * @returns ReplanResult with modified DAG or abort decision
   */
  replan(
    failedNodeId: string,
    nodes: DAGNode[],
    edges: DAGEdge[],
    state: Map<string, NodeRuntimeState>,
  ): ReplanResult {
    const failedNode = nodes.find((n) => n.id === failedNodeId)
    if (!failedNode) {
      return { modified: false, nodes, edges, reason: `Node "${failedNodeId}" not found` }
    }

    // Check max retries
    const nodeState = state.get(failedNodeId)
    const attempts = nodeState?.attempt ?? 0
    const maxRetries = failedNode.data.max_retries ?? this.config.maxRetries

    if (attempts < maxRetries) {
      // Retry strategy: reset the node
      return this.applyRetry(failedNodeId, nodes, edges, state)
    }

    // Max retries exceeded, use configured strategy
    switch (this.config.strategy) {
      case 'skip':
        return this.applySkip(failedNodeId, nodes, edges)
      case 'fallback':
        return this.applyFallback(failedNodeId, nodes, edges, this.config.fallbackNode)
      case 'abort':
        return { modified: false, nodes, edges, reason: `Node "${failedNodeId}" failed after ${attempts} attempts, aborting` }
      default:
        return this.applyRetry(failedNodeId, nodes, edges, state)
    }
  }

  /**
   * Compute all nodes that are unreachable due to the failure.
   * These are downstream nodes that depend on the failed node.
   */
  computeAffectedDescendants(
    failedNodeId: string,
    edges: DAGEdge[],
  ): string[] {
    const adj = new Map<string, string[]>()
    for (const edge of edges) {
      const list = adj.get(edge.source) ?? []
      list.push(edge.target)
      adj.set(edge.source, list)
    }

    const affected: string[] = []
    const visited = new Set<string>()
    const queue = [failedNodeId]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      if (current !== failedNodeId) affected.push(current)

      for (const next of adj.get(current) ?? []) {
        if (!visited.has(next)) {
          queue.push(next)
        }
      }
    }

    return affected
  }

  /**
   * Find alternative paths around a failed node.
   * Returns edges that could reroute around the failure.
   */
  findAlternativePaths(
    failedNodeId: string,
    nodes: DAGNode[],
    edges: DAGEdge[],
  ): DAGEdge[] {
    const predecessors = edges.filter((e) => e.target === failedNodeId).map((e) => e.source)
    const successors = edges.filter((e) => e.source === failedNodeId).map((e) => e.target)
    const alternatives: DAGEdge[] = []

    // Try to route each predecessor directly to each successor
    for (const pred of predecessors) {
      for (const succ of successors) {
        // Only add if the edge doesn't already exist
        const exists = edges.some((e) => e.source === pred && e.target === succ)
        if (!exists) {
          alternatives.push({
            id: `alt_${pred}_${succ}`,
            source: pred,
            target: succ,
            type: 'execution',
            label: `bypass_${failedNodeId}`,
          })
        }
      }
    }

    return alternatives
  }

  // ---- private strategies ----

  private applyRetry(
    nodeId: string,
    nodes: DAGNode[],
    edges: DAGEdge[],
    state: Map<string, NodeRuntimeState>,
  ): ReplanResult {
    const nodeState = state.get(nodeId)
    if (nodeState) {
      nodeState.status = 'pending'
      nodeState.error = undefined
    }
    return {
      modified: true,
      nodes: [...nodes],
      edges: [...edges],
      reason: `Retrying node "${nodeId}"`,
    }
  }

  private applySkip(
    nodeId: string,
    nodes: DAGNode[],
    edges: DAGEdge[],
  ): ReplanResult {
    // Remove the failed node
    const newNodes = nodes.filter((n) => n.id !== nodeId)

    // Rewire edges: predecessor -> successor (skip failed node)
    const predecessors = edges.filter((e) => e.target === nodeId).map((e) => e.source)
    const successors = edges.filter((e) => e.source === nodeId).map((e) => e.target)
    const newEdges = edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId,
    )

    for (const pred of predecessors) {
      for (const succ of successors) {
        const exists = newEdges.some((e) => e.source === pred && e.target === succ)
        if (!exists) {
          newEdges.push({
            id: `bypass_${pred}_${succ}`,
            source: pred,
            target: succ,
            type: 'execution',
            label: `skip_${nodeId}`,
          })
        }
      }
    }

    return {
      modified: true,
      nodes: newNodes,
      edges: newEdges,
      reason: `Skipping failed node "${nodeId}" and rewiring edges`,
    }
  }

  private applyFallback(
    nodeId: string,
    nodes: DAGNode[],
    edges: DAGEdge[],
    fallbackNode?: DAGNode,
  ): ReplanResult {
    if (!fallbackNode) {
      return this.applySkip(nodeId, nodes, edges)
    }

    const newNodes = nodes.map((n) =>
      n.id === nodeId ? { ...fallbackNode, id: nodeId, data: { ...fallbackNode.data, label: `${fallbackNode.data.label ?? 'fallback'} (replacement)` } } : n,
    )

    return {
      modified: true,
      nodes: newNodes,
      edges: [...edges],
      reason: `Replacing failed node "${nodeId}" with fallback`,
    }
  }
}
