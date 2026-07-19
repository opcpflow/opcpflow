import { describe, it, expect } from 'vitest'
import { HandlerRegistry } from '../engine/handler-registry'

describe('HandlerRegistry', () => {
  it('should register and retrieve a handler', () => {
    const r = new HandlerRegistry()
    const handler = async () => ({ output: 'ok', metrics: { startTime: 0, endTime: 0, durationMs: 0 } })
    r.register('test', handler)
    expect(r.has('test')).toBe(true)
    expect(r.get('test')).toBe(handler)
  })

  it('should throw on duplicate registration', () => {
    const r = new HandlerRegistry()
    const h = async () => ({ output: 'ok', metrics: { startTime: 0, endTime: 0, durationMs: 0 } })
    r.register('t', h)
    expect(() => r.register('t', h)).toThrow('already registered')
  })

  it('should override existing handler', () => {
    const r = new HandlerRegistry()
    const h1 = async () => ({ output: 'a', metrics: { startTime: 0, endTime: 0, durationMs: 0 } })
    const h2 = async () => ({ output: 'b', metrics: { startTime: 0, endTime: 0, durationMs: 0 } })
    r.register('t', h1)
    r.override('t', h2)
    expect(r.get('t')).toBe(h2)
  })

  it('should override non-existent handler (acts like register)', () => {
    const r = new HandlerRegistry()
    const h = async () => ({ output: 'ok', metrics: { startTime: 0, endTime: 0, durationMs: 0 } })
    r.override('t', h)
    expect(r.has('t')).toBe(true)
  })

  it('should get handler by type', () => {
    const r = new HandlerRegistry()
    const h = async () => ({ output: 'ok', metrics: { startTime: 0, endTime: 0, durationMs: 0 } })
    r.register('a', h)
    expect(r.get('a')).toBe(h)
    expect(r.get('nonexistent')).toBeUndefined()
  })

  it('should check if handler exists', () => {
    const r = new HandlerRegistry()
    r.register('a', async () => ({ output: 'ok', metrics: { startTime: 0, endTime: 0, durationMs: 0 } }))
    expect(r.has('a')).toBe(true)
    expect(r.has('b')).toBe(false)
  })

  it('should createWithBuiltIns and have all 11 handlers', () => {
    const r = HandlerRegistry.createWithBuiltIns()
    const types = [
      'trigger', 'task_decompose', 'dynamic', 'merge', 'output',
      'llm_call', 'api_call', 'mcp_tool', 'knowledge', 'strategy',
      'verification',
    ]
    for (const t of types) {
      expect(r.has(t)).toBe(true)
    }
  })

  it('should register multiple handlers at once', () => {
    const r = new HandlerRegistry()
    const h = async () => ({ output: 'ok', metrics: { startTime: 0, endTime: 0, durationMs: 0 } })
    r.registerMany({ a: h, b: h })
    expect(r.has('a')).toBe(true)
    expect(r.has('b')).toBe(true)
  })
})
