import type { DAGNode, DAGEdge } from '@opcpflow/core'
import type { NodeStatus, ReadyResult } from './types'

/**
 * Ready Frontier algorithm.
 *
 * Determines which nodes in a DAG are ready to execute based on
 * the completion status of their predecessors.
 */
export class Frontier {
  /**
   * Compute which nodes are ready, blocked, or completed given the
   * current node status map.
   */
  compute(nodes: DAGNode[], edges: DAGEdge[], state: Map<string, NodeStatus>): ReadyResult {
    const ready: string[] = []
    const blocked: string[] = []
    const completed: string[] = []

    const adjacency = buildReverseAdjacency(edges)

    for (const node of nodes) {
      const status = state.get(node.id) ?? 'pending'

      if (status === 'completed') {
        completed.push(node.id)
        continue
      }
      if (status === 'running' || status === 'skipped') {
        continue
      }

      const predecessors = adjacency.get(node.id) ?? []
      if (predecessors.length === 0) {
        // Root node (no incoming edges) — always ready if pending
        if (status === 'pending' || status === 'ready') {
          ready.push(node.id)
        }
        continue
      }

      const allDone = predecessors.every((predId) => state.get(predId) === 'completed')
      const anyFailed = predecessors.some((predId) => state.get(predId) === 'failed')

      if (allDone) {
        if (status === 'pending' || status === 'ready') {
          ready.push(node.id)
        }
      } else if (anyFailed) {
        blocked.push(node.id)
      } else {
        blocked.push(node.id)
      }
    }

    return { ready, blocked, completed }
  }

  /**
   * Compute execution waves: group nodes by topological level.
   * Within each wave, all nodes can execute in parallel.
   */
  computeWaves(nodes: DAGNode[], edges: DAGEdge[]): string[][] {
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

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const currentWave = nodes
        .filter((n) => degree.get(n.id) === 0)
        .map((n) => n.id)
        // Only include nodes not already placed in a wave
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

  /**
   * Check whether a specific node is blocked by failed predecessors.
   */
  isBlocked(nodeId: string, edges: DAGEdge[], state: Map<string, NodeStatus>): boolean {
    const predecessors = edges.filter((e) => e.target === nodeId).map((e) => e.source)
    return predecessors.some((predId) => state.get(predId) === 'failed')
  }
}

function buildReverseAdjacency(edges: DAGEdge[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const e of edges) {
    const list = map.get(e.target) ?? []
    list.push(e.source)
    map.set(e.target, list)
  }
  return map
}
