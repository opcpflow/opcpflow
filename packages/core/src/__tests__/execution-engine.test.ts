import { describe, it, expect } from 'vitest'
import { DAGExecutionEngine } from '../engine/execution-engine'
import { HandlerRegistry } from '../engine/handler-registry'
import { testDAG } from '../engine'
import type { DAGDocument, DAGExecutionReport } from '../types/execution'

const engine = new DAGExecutionEngine()

const testHandler = async (input: any, ctx: any) => ({
  output: { result: 'ok' },
  metrics: { startTime: Date.now(), endTime: Date.now(), durationMs: 1 },
})

describe('DAGExecutionEngine', () => {
  it('should handle empty DAG (no nodes)', async () => {
    const dag: DAGDocument = { nodes: [], edges: [], metadata: { name: 'empty', version: 1 } }
    const handlers = HandlerRegistry.createWithBuiltIns()
    const report = await engine.execute(dag, handlers)
    expect(report.status).toBe('completed')
    expect(Object.keys(report.nodes)).toHaveLength(0)
  })

  it('should execute linear DAG A→B→C in order', async () => {
    const dag: DAGDocument = {
      nodes: [
        { id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'A' } },
        { id: 'b', type: 'output', position: { x: 100, y: 0 }, data: { label: 'B' } },
        { id: 'c', type: 'output', position: { x: 200, y: 0 }, data: { label: 'C' } },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', type: 'execution' },
        { id: 'e2', source: 'b', target: 'c', type: 'execution' },
      ],
      metadata: { name: 'linear', version: 1 },
    }
    const handlers = HandlerRegistry.createWithBuiltIns()
    const report = await engine.execute(dag, handlers)

    expect(report.status).toBe('completed')
    expect(report.nodes['a']?.status).toBe('passed')
    expect(report.nodes['b']?.status).toBe('passed')
    expect(report.nodes['c']?.status).toBe('passed')
    expect(report.nodes['a']?.result?.output).toBeDefined()
  })

  it('should detect cycles and throw', async () => {
    const dag: DAGDocument = {
      nodes: [
        { id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'b', type: 'output', position: { x: 100, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', type: 'execution' },
        { id: 'e2', source: 'b', target: 'a', type: 'execution' },
      ],
      metadata: { name: 'cycle', version: 1 },
    }
    const handlers = HandlerRegistry.createWithBuiltIns()
    await expect(engine.execute(dag, handlers)).rejects.toThrow('cycle')
  })

  it('should skip downstream nodes when upstream fails', async () => {
    const failHandler = async () => {
      throw new Error('intentional failure')
    }
    const dag: DAGDocument = {
      nodes: [
        { id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'b', type: 'custom', position: { x: 100, y: 0 }, data: {} },
        { id: 'c', type: 'output', position: { x: 200, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', type: 'execution' },
        { id: 'e2', source: 'b', target: 'c', type: 'execution' },
      ],
      metadata: { name: 'failure', version: 1 },
    }
    const handlers = HandlerRegistry.createWithBuiltIns()
    handlers.override('custom', failHandler)
    const report = await engine.execute(dag, handlers)

    expect(report.nodes['a']?.status).toBe('passed')
    expect(report.nodes['b']?.status).toBe('failed')
    expect(report.nodes['c']?.status).toBe('skipped')
    expect(report.nodes['c']?.error).toContain('Upstream')
  })

  it('should continue_default — downstream runs with empty inputs on upstream failure', async () => {
    const failHandler = async () => { throw new Error('fail') }
    const dag: DAGDocument = {
      nodes: [
        { id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'b', type: 'custom', position: { x: 100, y: 0 }, data: {} },
        { id: 'c', type: 'output', position: { x: 200, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', type: 'execution' },
        { id: 'e2', source: 'b', target: 'c', type: 'execution' },
      ],
      metadata: { name: 'cont-default', version: 1 },
    }
    const handlers = HandlerRegistry.createWithBuiltIns()
    handlers.override('custom', failHandler)
    const report = await engine.execute(dag, handlers, { onNodeFailed: 'continue_default' })

    expect(report.nodes['a']?.status).toBe('passed')
    expect(report.nodes['b']?.status).toBe('failed')
    expect(report.nodes['c']?.status).toBe('passed')
  })

  it('should continue_raw — downstream receives error info on upstream failure', async () => {
    const failHandler = async () => { throw new Error('boom') }
    let capturedCtx: any = null
    const captureHandler = async (_input: any, ctx: any) => {
      capturedCtx = { ...ctx.inputs }
      return { output: 'ok', metrics: { startTime: Date.now(), endTime: Date.now(), durationMs: 0 } }
    }
    const dag: DAGDocument = {
      nodes: [
        { id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'b', type: 'custom', position: { x: 100, y: 0 }, data: {} },
        { id: 'c', type: 'capture', position: { x: 200, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', type: 'execution' },
        { id: 'e2', source: 'b', target: 'c', type: 'execution' },
      ],
      metadata: { name: 'cont-raw', version: 1 },
    }
    const handlers = HandlerRegistry.createWithBuiltIns()
    handlers.override('custom', failHandler)
    handlers.override('capture', captureHandler)
    const report = await engine.execute(dag, handlers, { onNodeFailed: 'continue_raw' })

    expect(report.nodes['a']?.status).toBe('passed')
    expect(report.nodes['b']?.status).toBe('failed')
    expect(report.nodes['c']?.status).toBe('passed')
    expect(capturedCtx).not.toBeNull()
    expect(capturedCtx.b).toBeDefined()
    expect(capturedCtx.b.error).toContain('boom')
    expect(capturedCtx.b.upstreamId).toBe('b')
  })

  it('should use pinned data and skip handler execution', async () => {
    let handlerCalled = false
    const checkHandler = async () => {
      handlerCalled = true
      return { output: 'real', metrics: { startTime: Date.now(), endTime: Date.now(), durationMs: 0 } }
    }
    const dag: DAGDocument = {
      nodes: [
        { id: 'a', type: 'check', position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [],
      metadata: { name: 'pin-test', version: 1 },
    }
    const handlers = HandlerRegistry.createWithBuiltIns()
    handlers.override('check', checkHandler)
    const report = await engine.execute(dag, handlers, {
      pinnedData: { a: { output: 'pinned-value', pinnedAt: Date.now() } },
    })

    expect(handlerCalled).toBe(false)
    expect(report.nodes['a']?.status).toBe('passed')
    expect(report.nodes['a']?.result?.output).toBe('pinned-value')
  })

  it('should enforce timeout and mark node as failed', async () => {
    const slowHandler = async (_input: any, ctx: any) => {
      await new Promise((r) => setTimeout(r, 5000))
      return { output: 'too-late', metrics: { startTime: Date.now(), endTime: Date.now(), durationMs: 5000 } }
    }
    const dag: DAGDocument = {
      nodes: [
        { id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: { timeout_seconds: 0.05 } },
        { id: 'b', type: 'slow', position: { x: 100, y: 0 }, data: {} },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b', type: 'execution' }],
      metadata: { name: 'timeout', version: 1 },
    }
    const handlers = HandlerRegistry.createWithBuiltIns()
    handlers.override('slow', slowHandler)
    const report = await engine.execute(dag, handlers, { defaultTimeout: 30 })

    expect(report.nodes['a']?.status).toBe('passed')
    expect(report.nodes['b']?.status).toBe('failed')
    expect(report.nodes['b']?.error).toContain('timed out')
  }, 10000)

  it('should report stages via reportStage callback', async () => {
    const stages: string[] = []
    const stageHandler = async (_input: any, ctx: any) => {
      ctx.reportStage('phase-1')
      ctx.reportStage('phase-2')
      return { output: 'done', metrics: { startTime: Date.now(), endTime: Date.now(), durationMs: 0 } }
    }
    const dag: DAGDocument = {
      nodes: [
        { id: 'a', type: 'stage-test', position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [],
      metadata: { name: 'stages', version: 1 },
    }
    const handlers = HandlerRegistry.createWithBuiltIns()
    handlers.override('stage-test', stageHandler)
    const statusCb = (nodeId: string, status: string, detail?: any) => {
      if (detail?.stage) stages.push(detail.stage)
    }
    const report = await engine.execute(dag, handlers, { onNodeStatusChange: statusCb })

    expect(report.nodes['a']?.status).toBe('passed')
    expect(stages).toContain('phase-1')
    expect(stages).toContain('phase-2')
  })

  it('should call onLevelComplete callback after each level', async () => {
    const levelsCompleted: number[] = []
    const dag: DAGDocument = {
      nodes: [
        { id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
        { id: 'b', type: 'output', position: { x: 100, y: 0 }, data: {} },
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b', type: 'execution' }],
      metadata: { name: 'levels', version: 1 },
    }
    const handlers = HandlerRegistry.createWithBuiltIns()
    const report = await engine.execute(dag, handlers, {
      onLevelComplete: async (idx) => { levelsCompleted.push(idx) },
    })

    expect(report.status).toBe('completed')
    expect(levelsCompleted.length).toBeGreaterThanOrEqual(1)
  })

  it('should handle task_decompose node for branching execution', async () => {
    const dag: DAGDocument = {
      nodes: [
        { id: 'a', type: 'task_decompose', position: { x: 0, y: 0 }, data: { instructions: 'split into sub-tasks' } },
        { id: 'b', type: 'output', position: { x: 100, y: 0 }, data: {} },
        { id: 'c', type: 'output', position: { x: 200, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', type: 'execution' },
        { id: 'e2', source: 'a', target: 'c', type: 'execution' },
      ],
      metadata: { name: 'branch', version: 1 },
    }
    const handlers = HandlerRegistry.createWithBuiltIns()
    const report = await engine.execute(dag, handlers)

    expect(report.nodes['a']?.status).toBe('passed')
    expect(report.nodes['b']?.status).toBe('passed')
    expect(report.nodes['c']?.status).toBe('passed')
  })

  describe('testDAG', () => {
    it('should execute a simple DAG in dry-run mode', async () => {
      const dag: DAGDocument = {
        nodes: [
          { id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
          { id: 'b', type: 'output', position: { x: 100, y: 0 }, data: {} },
        ],
        edges: [{ id: 'e1', source: 'a', target: 'b', type: 'execution' }],
        metadata: { name: 'testdag', version: 1 },
      }
      const report = await testDAG(dag)
      expect(report.status).toBe('completed')
      expect(report.nodes['a']?.status).toBe('passed')
      expect(report.nodes['b']?.status).toBe('passed')
    })

    it('should accept custom handler overrides', async () => {
      let called = false
      const dag: DAGDocument = {
        nodes: [
          { id: 'a', type: 'custom-check', position: { x: 0, y: 0 }, data: {} },
        ],
        edges: [],
        metadata: { name: 'custom-handler', version: 1 },
      }
      const customHandlers = HandlerRegistry.createWithBuiltIns()
      customHandlers.override('custom-check', async () => {
        called = true
        return { output: 'custom', metrics: { startTime: Date.now(), endTime: Date.now(), durationMs: 0 } }
      })
      const report = await testDAG(dag, { handlers: customHandlers, mode: 'live' })
      expect(report.status).toBe('completed')
      expect(report.nodes['a']?.status).toBe('passed')
      expect(called).toBe(true)
    })
  })
})
