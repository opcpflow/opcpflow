import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExecution } from '../hooks/useExecution'
import type { DAGDocument } from '@opcpflow/core'
import { HandlerRegistry } from '@opcpflow/core'

const sampleDag: DAGDocument = {
  nodes: [
    { id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
    { id: 'b', type: 'output', position: { x: 100, y: 0 }, data: {} },
  ],
  edges: [{ id: 'e1', source: 'a', target: 'b', type: 'execution' }],
  metadata: { name: 'test', version: 1 },
}

describe('useExecution', () => {
  it('should start in edit mode with idle state', () => {
    const { result } = renderHook(() => useExecution())
    expect(result.current.mode).toBe('edit')
    expect(result.current.execState.status).toBe('idle')
    expect(result.current.history).toEqual([])
  })

  it('should switch between edit and test modes', () => {
    const { result } = renderHook(() => useExecution())
    act(() => result.current.setMode('test'))
    expect(result.current.mode).toBe('test')
    act(() => result.current.setMode('edit'))
    expect(result.current.mode).toBe('edit')
  })

  it('should runAll and update execState to completed', async () => {
    const { result } = renderHook(() => useExecution())
    const handlers = HandlerRegistry.createWithBuiltIns()

    await act(async () => {
      await result.current.runAll(sampleDag, handlers)
    })

    expect(result.current.execState.status).toBe('completed')
    expect(result.current.execState.nodeStates['a']?.status).toBe('passed')
    expect(result.current.execState.nodeStates['b']?.status).toBe('passed')
  })

  it('should save execution to history', async () => {
    const { result } = renderHook(() => useExecution())
    const handlers = HandlerRegistry.createWithBuiltIns()

    await act(async () => {
      await result.current.runAll(sampleDag, handlers)
    })

    expect(result.current.history.length).toBe(1)
    expect(result.current.history[0].state.status).toBe('completed')
  })

  it('should clear state on clear()', async () => {
    const { result } = renderHook(() => useExecution())
    const handlers = HandlerRegistry.createWithBuiltIns()

    await act(async () => {
      await result.current.runAll(sampleDag, handlers)
    })

    act(() => result.current.clear())

    expect(result.current.execState.status).toBe('idle')
  })

  it('should getNodeStatus for specific nodes', async () => {
    const { result } = renderHook(() => useExecution())
    const handlers = HandlerRegistry.createWithBuiltIns()

    await act(async () => {
      await result.current.runAll(sampleDag, handlers)
    })

    const statusA = result.current.getNodeStatus('a')
    expect(statusA?.status).toBe('passed')
    expect(result.current.getNodeStatus('nonexistent')).toBeUndefined()
  })

  it('should pin and unpin nodes', () => {
    const { result } = renderHook(() => useExecution())

    act(() => result.current.pinNode('a', { value: 42 }))
    expect(result.current.isNodePinned('a')).toBe(true)

    act(() => result.current.unpinNode('a'))
    expect(result.current.isNodePinned('a')).toBe(false)
  })

  it('should edit pin data', () => {
    const { result } = renderHook(() => useExecution())

    act(() => result.current.pinNode('a', { value: 1 }))
    act(() => result.current.editPinData('a', { value: 99 }))

    expect(result.current.pinnedData['a'].output.value).toBe(99)
  })

  it('should handle step/pause/resume', () => {
    const { result } = renderHook(() => useExecution())

    expect(result.current.canStep).toBe(false)
    expect(result.current.isPaused).toBe(false)

    act(() => result.current.pause())
    expect(result.current.isPaused).toBe(true)

    act(() => result.current.stepToNext())
    // stepToNext resolves the pending promise but there's none
    // canStep should be false since no pending step

    act(() => result.current.resume())
    expect(result.current.isPaused).toBe(false)
  })

  it('should report error on runAll with cycle DAG', async () => {
    const { result } = renderHook(() => useExecution())
    const handlers = HandlerRegistry.createWithBuiltIns()
    const cycleDag: DAGDocument = {
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

    await act(async () => {
      await result.current.runAll(cycleDag, handlers)
    })

    expect(result.current.execState.status).toBe('aborted')
  })
})
