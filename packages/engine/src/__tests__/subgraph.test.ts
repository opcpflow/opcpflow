import { describe, it, expect } from 'vitest'
import { SubgraphAnalyzer } from '../subgraph'
import type { DAGNode, DAGEdge } from '@opcpflow/core'

describe('SubgraphAnalyzer', () => {
  const analyzer = new SubgraphAnalyzer()

  const nodes: DAGNode[] = [
    { id: 'a', type: 'input', position: { x: 0, y: 0 }, data: {} },
    { id: 'b', type: 'process', position: { x: 100, y: 0 }, data: {} },
    { id: 'c', type: 'process', position: { x: 200, y: 0 }, data: {} },
    { id: 'd', type: 'output', position: { x: 300, y: 0 }, data: {} },
    { id: 'e', type: 'process', position: { x: 100, y: 100 }, data: {} },
  ]

  const edges: DAGEdge[] = [
    { id: 'e1', source: 'a', target: 'b', type: 'execution' },
    { id: 'e2', source: 'b', target: 'c', type: 'execution' },
    { id: 'e3', source: 'c', target: 'd', type: 'execution' },
    { id: 'e4', source: 'a', target: 'e', type: 'execution' },
  ]

  it('should extract a subgraph', () => {
    const sub = analyzer.extractSubgraph(nodes, edges, new Set(['a', 'b', 'c']))
    expect(sub.nodes).toHaveLength(3)
    expect(sub.edges).toHaveLength(2)
  })

  it('should compute subgraph hash', () => {
    const sub1 = analyzer.extractSubgraph(nodes, edges, new Set(['a', 'b']))
    const sub2 = analyzer.extractSubgraph(nodes, edges, new Set(['a', 'b']))
    expect(analyzer.computeHash(sub1.nodes, sub1.edges)).toBe(
      analyzer.computeHash(sub2.nodes, sub2.edges),
    )
  })

  it('should find connected components', () => {
    const components = analyzer.findConnectedComponents(edges)
    expect(components.length).toBeGreaterThanOrEqual(1)
    expect(components[0]).toContain('a')
    expect(components[0]).toContain('d')
  })

  it('should detect sequential chains', () => {
    const patterns = analyzer.detectCommonPatterns(nodes, edges)
    const chains = patterns.filter((p) => p.name === 'sequential_chain')
    expect(chains.length).toBeGreaterThanOrEqual(1)

    // b->c->d is a chain (each node has exactly 1 in/out)
    const mainChain = chains.find((c) => c.nodeIds.includes('b') && c.nodeIds.includes('d'))
    expect(mainChain).toBeDefined()

    // 'a' has 2 outgoing edges (fan-out), so it's excluded from sequential chain
    const aChain = chains.find((c) => c.nodeIds.includes('a'))
    expect(aChain).toBeUndefined()
  })

  it('should detect fan-out', () => {
    const patterns = analyzer.detectCommonPatterns(nodes, edges)
    const fanOuts = patterns.filter((p) => p.name === 'fan_out')
    // Node 'a' has edges to 'b' and 'e' — but only 2, not >= 3
    expect(fanOuts.length).toBe(0)
  })

  it('should sort matches by score', () => {
    const patterns = analyzer.detectCommonPatterns(nodes, edges)
    for (let i = 1; i < patterns.length; i++) {
      expect(patterns[i].score).toBeLessThanOrEqual(patterns[i - 1].score)
    }
  })
})
