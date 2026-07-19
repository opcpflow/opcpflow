import type { DAGNode, DAGEdge } from './types/dag-node'

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  type: 'cycle' | 'orphan' | 'depth' | 'missing-target' | 'duplicate-id' | 'node-not-found'
  message: string
  nodeId?: string
  edgeId?: string
  depth?: number
}

export function detectCycle(nodes: DAGNode[], edges: DAGEdge[]): ValidationError[] {
  const errors: ValidationError[] = []
  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    const list = adj.get(e.source)
    if (list) list.push(e.target)
  }

  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<string, number>()
  for (const n of nodes) color.set(n.id, WHITE)

  function dfs(u: string): boolean {
    color.set(u, GRAY)
    const neighbors = adj.get(u) || []
    for (const v of neighbors) {
      const c = color.get(v)
      if (c === GRAY) {
        errors.push({
          type: 'cycle',
          message: `Cycle detected involving node "${u}" → "${v}"`,
          nodeId: u,
        })
        return true
      }
      if (c === BLACK) continue
      if (dfs(v)) return true
    }
    color.set(u, BLACK)
    return false
  }

  for (const n of nodes) {
    if (color.get(n.id) === WHITE) dfs(n.id)
  }
  return errors
}

export function findOrphans(nodes: DAGNode[], edges: DAGEdge[]): ValidationError[] {
  const errors: ValidationError[] = []
  const hasIncoming = new Set<string>()
  const hasOutgoing = new Set<string>()

  for (const e of edges) {
    hasOutgoing.add(e.source)
    hasIncoming.add(e.target)
  }

  for (const n of nodes) {
    const isOrphan = !hasIncoming.has(n.id) && !hasOutgoing.has(n.id)
    if (isOrphan && nodes.length > 1) {
      errors.push({
        type: 'orphan',
        message: `Node "${n.id}" has no connections`,
        nodeId: n.id,
      })
    }
  }
  return errors
}

export function validateDepth(nodes: DAGNode[], edges: DAGEdge[], maxDepth = 50): ValidationError[] {
  const errors: ValidationError[] = []
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

  const queue: string[] = []
  const depth = new Map<string, number>()
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id)
      depth.set(id, 0)
    }
  }

  while (queue.length > 0) {
    const u = queue.shift()!
    const du = depth.get(u) || 0
    if (du >= maxDepth) {
      errors.push({ type: 'depth', message: `DAG depth exceeds max of ${maxDepth}`, nodeId: u, depth: du })
    }
    for (const v of adj.get(u) || []) {
      depth.set(v, Math.max(depth.get(v) || 0, du + 1))
      inDegree.set(v, (inDegree.get(v) || 0) - 1)
      if (inDegree.get(v) === 0) queue.push(v)
    }
  }
  return errors
}

export function validateAll(
  nodes: DAGNode[],
  edges: DAGEdge[],
  options?: { maxDepth?: number },
): ValidationResult {
  const errors: ValidationError[] = [
    ...detectCycle(nodes, edges),
    ...findOrphans(nodes, edges),
    ...validateDepth(nodes, edges, options?.maxDepth),
  ]
  return { valid: errors.length === 0, errors }
}
