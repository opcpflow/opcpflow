import { describe, it, expect } from 'vitest'
import { Executor } from '../executor'
import type { DAGDocument } from '@opcpflow/core'

describe('Executor', () => {
  const sampleDag: DAGDocument = {
    nodes: [
      { id: 'a', type: 'input', position: { x: 0, y: 0 }, data: { output_key: 'input_data' } },
      { id: 'b', type: 'process', position: { x: 100, y: 0 }, data: { output_key: 'processed' } },
      { id: 'c', type: 'output', position: { x: 200, y: 0 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'a', target: 'b', type: 'execution' },
      { id: 'e2', source: 'b', target: 'c', type: 'execution' },
    ],
    metadata: { name: 'test', version: 1 },
  }

  it('should build an execution plan', () => {
    const executor = new Executor()
    const plan = executor.plan(sampleDag)

    expect(plan.dagExecId).toBeDefined()
    expect(plan.nodes).toHaveLength(3)
    expect(plan.edges).toHaveLength(2)
    expect(plan.waves.length).toBeGreaterThanOrEqual(1)
    expect(plan.state.size).toBe(3)
  })

  it('should execute a simple DAG', async () => {
    const executor = new Executor()
    const state = await executor.execute(sampleDag)

    expect(state.size).toBe(3)
    for (const [, nodeState] of state) {
      expect(nodeState.status).toBe('completed')
    }
  })

  it('should handle empty DAG', async () => {
    const executor = new Executor()
    const emptyDag: DAGDocument = {
      nodes: [],
      edges: [],
      metadata: { name: 'empty', version: 1 },
    }

    const state = await executor.execute(emptyDag)
    expect(state.size).toBe(0)
  })

  it('should execute parallel branches', async () => {
    const parallelDag: DAGDocument = {
      nodes: [
        { id: 'start', type: 'input', position: { x: 0, y: 0 }, data: {} },
        { id: 'branch1', type: 'process', position: { x: 100, y: -50 }, data: {} },
        { id: 'branch2', type: 'process', position: { x: 100, y: 50 }, data: {} },
        { id: 'merge', type: 'output', position: { x: 200, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'branch1', type: 'execution' },
        { id: 'e2', source: 'start', target: 'branch2', type: 'execution' },
        { id: 'e3', source: 'branch1', target: 'merge', type: 'execution' },
        { id: 'e4', source: 'branch2', target: 'merge', type: 'execution' },
      ],
      metadata: { name: 'parallel', version: 1 },
    }

    const executor = new Executor({ maxConcurrency: 10 })
    const state = await executor.execute(parallelDag)

    expect(state.get('start')?.status).toBe('completed')
    expect(state.get('branch1')?.status).toBe('completed')
    expect(state.get('branch2')?.status).toBe('completed')
    expect(state.get('merge')?.status).toBe('completed')
  })

  it('should generate execution reports', async () => {
    const executor = new Executor()
    const state = await executor.execute(sampleDag)
    const report = executor.buildReport(state)

    expect(report).toHaveLength(3)
    expect(report[0].nodeID).toBeDefined()
    expect(report[0].status).toBe('completed')
  })
})
