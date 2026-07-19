import { test, expect } from '@playwright/test'
import { exportDAG, importDAG, validateAll, detectCycle, computeLevels } from '@opcpflow/core'
import type { DAGDocument, DAGNode, DAGEdge } from '@opcpflow/core'
import simplePipeline from '../integration/sample-dags/simple-pipeline.json' assert { type: 'json' }

test.describe('Engine & Core', () => {
  test('should validate a valid DAG', () => {
    const doc = simplePipeline as unknown as DAGDocument
    const result = validateAll(doc.nodes, doc.edges, { maxDepth: 50 })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('should detect cycles', () => {
    const nodes: DAGNode[] = [
      { id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'llm-call', position: { x: 0, y: 100 }, data: {} },
      { id: 'c', type: 'output', position: { x: 0, y: 200 }, data: {} },
    ]
    const edges: DAGEdge[] = [
      { id: 'e1', source: 'a', target: 'b', type: 'execution' },
      { id: 'e2', source: 'b', target: 'c', type: 'execution' },
      { id: 'e3', source: 'c', target: 'a', type: 'execution' }, // cycle
    ]
    const errors = detectCycle(nodes, edges)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].type).toBe('cycle')
  })

  test('should compute topological levels', () => {
    const doc = simplePipeline as unknown as DAGDocument
    const levels = computeLevels(doc.nodes, doc.edges)

    // Trigger should be at level 0
    const triggerNode = doc.nodes.find((n) => n.type === 'trigger')
    expect(triggerNode).toBeDefined()
    expect(levels[triggerNode!.id]).toBe(0)

    // Output should be at the highest level
    const outputNode = doc.nodes.find((n) => n.type === 'output')
    expect(outputNode).toBeDefined()
    expect(levels[outputNode!.id]).toBeGreaterThan(0)
  })

  test('should serialize and deserialize DAG', () => {
    const doc = simplePipeline as unknown as DAGDocument

    // Serialize
    const json = exportDAG(doc)
    expect(typeof json).toBe('string')

    // Deserialize
    const restored = JSON.parse(json) as DAGDocument
    expect(restored.nodes).toHaveLength(doc.nodes.length)
    expect(restored.edges).toHaveLength(doc.edges.length)
    expect(restored.metadata.name).toBe(doc.metadata.name)
  })

  test('should detect empty DAG gracefully', () => {
    const doc: DAGDocument = {
      nodes: [],
      edges: [],
      metadata: { name: 'empty', version: 1 },
    }
    const result = validateAll(doc.nodes, doc.edges)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
