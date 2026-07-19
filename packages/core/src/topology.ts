import type { DAGNode, DAGEdge } from './types/dag-node'

export interface LevelMap {
  [nodeId: string]: number
}

export function computeLevels(nodes: DAGNode[], edges: DAGEdge[]): LevelMap {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const n of nodes) {
    inDegree.set(n.id, 0)
    adj.set(n.id, [])
  }
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1)
  }

  const levels: LevelMap = {}
  const queue: string[] = []

  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id)
      levels[id] = 0
    }
  }

  while (queue.length > 0) {
    const u = queue.shift()!
    for (const v of adj.get(u) || []) {
      levels[v] = Math.max(levels[v] || 0, (levels[u] || 0) + 1)
      inDegree.set(v, (inDegree.get(v) || 0) - 1)
      if (inDegree.get(v) === 0) queue.push(v)
    }
  }

  return levels
}

export function findParallelGroups(nodes: DAGNode[], edges: DAGEdge[]): string[][] {
  const levels = computeLevels(nodes, edges)
  const groups = new Map<number, string[]>()
  for (const [id, level] of Object.entries(levels)) {
    const group = groups.get(level) || []
    group.push(id)
    groups.set(level, group)
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([, ids]) => ids)
}

export function getTopologicalOrder(nodes: DAGNode[], edges: DAGEdge[]): string[] {
  const levels = computeLevels(nodes, edges)
  return Object.entries(levels)
    .sort(([, a], [, b]) => a - b)
    .map(([id]) => id)
}

export function getPredecessors(nodeId: string, edges: DAGEdge[]): string[] {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source)
}

export function getSuccessors(nodeId: string, edges: DAGEdge[]): string[] {
  return edges.filter((e) => e.source === nodeId).map((e) => e.target)
}
