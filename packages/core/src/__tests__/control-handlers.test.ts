import { describe, it, expect } from 'vitest'
import { OutputHandler, TriggerHandler } from '../engine/built-in/control-handlers'
import type { ExecutionContext } from '../types/execution'

function makeCtx(overrides?: Partial<ExecutionContext>): ExecutionContext {
  return {
    nodeId: 'test',
    dagId: 'test-dag',
    inputs: {},
    global: {},
    abortSignal: new AbortController().signal,
    reportStage: () => {},
    ...overrides,
  }
}

describe('OutputHandler', () => {
  it('should merge inputs', async () => {
    const r = await OutputHandler({ custom: 123 }, makeCtx({ inputs: { prev: 'data' } }))
    expect(r.output).toEqual({ prev: 'data', custom: 123 })
  })
})

describe('TriggerHandler', () => {
  it('should return event data', async () => {
    const r = await TriggerHandler({ event: { type: 'manual' } }, makeCtx())
    expect(r.output.event.type).toBe('manual')
    expect(r.output.triggered_at).toBeDefined()
  })
})
