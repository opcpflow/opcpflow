import { describe, it, expect, beforeEach } from 'vitest'
import { Replanner } from '../replanner'
import type { DAGNode, DAGEdge } from '@opcpflow/core'
import type { NodeRuntimeState } from '../types'

describe('Replanner', () => {
  const nodes: DAGNode[] = [
    { id: 'a', type: 'input', position: { x: 0, y: 0 }, data: { output_key: 'data' } },
    { id: 'b', type: 'process', position: { x: 100, y: 0 }, data: {} },
    { id: 'c', type: 'process', position: { x: 200, y: 0 }, data: { max_retries: 2 } },
    { id: 'd', type: 'output', position: { x: 300, y: 0 }, data: {} },
  ]

  const edges: DAGEdge[] = [
    { id: 'e1', source: 'a', target: 'b', type: 'execution' },
    { id: 'e2', source: 'b', target: 'c', type: 'execution' },
    { id: 'e3', source: 'c', target: 'd', type: 'execution' },
  ]

  let state: Map<string, NodeRuntimeState>

  beforeEach(() => {
    state = new Map()
    for (const node of nodes) {
      state.set(node.id, {
        nodeId: node.id,
        status: 'completed',
        attempt: 1,
        startedAt: Date.now() - 1000,
        completedAt: Date.now(),
      })
    }
  })

  it('should retry a failed node within limit', () => {
    const replanner = new Replanner({ maxRetries: 3 })
    const nodeState = state.get('c')!
    nodeState.status = 'failed'
    nodeState.attempt = 1

    const result = replanner.replan('c', nodes, edges, state)
    expect(result.modified).toBe(true)
    expect(result.reason).toContain('Retrying')
  })

  it('should skip node after max retries', () => {
    const replanner = new Replanner({ maxRetries: 1, strategy: 'skip' })
    const nodeState = state.get('b')!
    nodeState.status = 'failed'
    nodeState.attempt = 2 // exceeded maxRetries

    const result = replanner.replan('b', nodes, edges, state)
    expect(result.modified).toBe(true)
    expect(result.reason).toContain('Skipping')

    // Node b should be removed from the DAG
    expect(result.nodes.find((n) => n.id === 'b')).toBeUndefined()
    // Edge should be rewired: a -> c
    const bypassEdge = result.edges.find((e) => e.source === 'a' && e.target === 'c')
    expect(bypassEdge).toBeDefined()
  })

  it('should abort when strategy is abort', () => {
    const replanner = new Replanner({ maxRetries: 1, strategy: 'abort' })
    const nodeState = state.get('b')!
    nodeState.status = 'failed'
    nodeState.attempt = 2

    const result = replanner.replan('b', nodes, edges, state)
    expect(result.modified).toBe(false)
    expect(result.reason).toContain('aborting')
  })

  it('should compute affected descendants', () => {
    const replanner = new Replanner()
    const affected = replanner.computeAffectedDescendants('b', edges)
    expect(affected).toContain('c')
    expect(affected).toContain('d')
    expect(affected).not.toContain('a')
    expect(affected).not.toContain('b')
  })

  it('should find alternative paths around a failed node', () => {
    const replanner = new Replanner()
    const alternatives = replanner.findAlternativePaths('b', nodes, edges)
    expect(alternatives.length).toBeGreaterThanOrEqual(1)
    expect(alternatives[0].source).toBe('a')
    expect(alternatives[0].target).toBe('c')
  })

  it('should handle unknown node gracefully', () => {
    const replanner = new Replanner()
    const result = replanner.replan('nonexistent', nodes, edges, state)
    expect(result.modified).toBe(false)
    expect(result.reason).toContain('not found')
  })
})
