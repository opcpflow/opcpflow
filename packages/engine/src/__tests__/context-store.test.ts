import { describe, it, expect, beforeEach } from 'vitest'
import { ContextStore } from '../context-store'
import { BudgetTracker } from '../store/budget'
import { ConflictDetector } from '../store/conflict'
import { FreshnessTracker } from '../store/freshness'
import { SourceTracker } from '../store/source-tag'

describe('ContextStore', () => {
  let store: ContextStore

  beforeEach(() => {
    store = new ContextStore()
  })

  it('should store and retrieve values', () => {
    store.set('key1', 'value1', 'node1')
    expect(store.get('key1')).toBe('value1')
  })

  it('should track source tags', () => {
    store.set('key1', 'value1', 'node1')
    const source = store.getSource('key1')
    expect(source?.nodeId).toBe('node1')
    expect(source?.key).toBe('key1')
  })

  it('should track freshness', () => {
    store.set('key1', 'value1')
    const age = store.getAge('key1')
    expect(age).toBeGreaterThanOrEqual(0)
  })

  it('should detect stale data', () => {
    store.set('key1', 'value1')
    // With a very short TTL, data should be fresh immediately
    expect(store.isStale('key1', -1)).toBe(true)
    expect(store.isStale('key1', 100_000)).toBe(false)
  })

  it('should detect conflicts', () => {
    store.set('key1', 'value1', 'node1')
    store.set('key1', 'value2', 'node2')

    expect(store.hasConflicts('key1')).toBe(true)
    const conflicts = store.getConflicts('key1') as Array<{ key: string; writers: string[] }>
    expect(conflicts.length).toBeGreaterThanOrEqual(1)
  })

  it('should track token budget', () => {
    const budgetStore = new ContextStore({ maxTokens: 100 })
    expect(budgetStore.addTokenCost(50)).toBe(true)
    expect(budgetStore.addTokenCost(60)).toBe(false) // would exceed
    expect(budgetStore.getTokenUsage()).toBe(50)
  })

  it('should take snapshots', () => {
    store.set('a', 1)
    store.set('b', 2)
    const snap = store.snapshot()
    expect(snap.a).toBe(1)
    expect(snap.b).toBe(2)
  })

  it('should clear all data', () => {
    store.set('key1', 'value1')
    store.clear()
    expect(store.has('key1')).toBe(false)
    expect(store.size()).toBe(0)
  })
})

describe('BudgetTracker', () => {
  it('should track token usage', () => {
    const tracker = new BudgetTracker({ maxTokens: 1000 })
    expect(tracker.record('node1', 100)).toBe(true)
    expect(tracker.getTotalTokens()).toBe(100)
  })

  it('should enforce limits', () => {
    const tracker = new BudgetTracker({ maxTokens: 100 })
    expect(tracker.record('node1', 101)).toBe(false)
    expect(tracker.isExhausted()).toBe(true)
  })

  it('should enforce node count limits', () => {
    const tracker = new BudgetTracker({ maxTokens: 1000, maxNodes: 2 })
    expect(tracker.record('node1', 10)).toBe(true)
    expect(tracker.record('node2', 10)).toBe(true)
    expect(tracker.record('node3', 10)).toBe(false)
    expect(tracker.isExhausted()).toBe(true)
  })

  it('should reset', () => {
    const tracker = new BudgetTracker({ maxTokens: 100 })
    tracker.record('node1', 50)
    expect(tracker.isExhausted()).toBe(false)
    tracker.reset()
    expect(tracker.getTotalTokens()).toBe(0)
  })
})

describe('ConflictDetector', () => {
  it('should detect conflicts', () => {
    const detector = new ConflictDetector()
    expect(detector.register('key1', 'node1')).toBe(true)
    expect(detector.register('key1', 'node2')).toBe(false)
    expect(detector.hasConflicts('key1')).toBe(true)
  })

  it('should resolve by last-write-wins', () => {
    const detector = new ConflictDetector('last-write-wins')
    detector.register('key1', 'node1')
    detector.register('key1', 'node2')
    expect(detector.resolve('key1')).toBe('node2')
  })

  it('should resolve by first-write-wins', () => {
    const detector = new ConflictDetector('first-write-wins')
    detector.register('key1', 'node1')
    detector.register('key1', 'node2')
    expect(detector.resolve('key1')).toBe('node1')
  })

  it('should throw on error resolution', () => {
    const detector = new ConflictDetector('error')
    detector.register('key1', 'node1')
    detector.register('key1', 'node2')
    expect(() => detector.resolve('key1')).toThrow('Write conflict')
  })
})

describe('FreshnessTracker', () => {
  it('should track freshness', () => {
    const tracker = new FreshnessTracker()
    tracker.record('key1')
    expect(tracker.getAge('key1')).toBeGreaterThanOrEqual(0)
    expect(tracker.isFresh('key1', 100_000)).toBe(true)
    expect(tracker.isStale('key1', -1)).toBe(true)
  })
})

describe('SourceTracker', () => {
  it('should tag sources', () => {
    const tracker = new SourceTracker()
    tracker.tag('key1', 'node1')
    expect(tracker.getSource('key1')?.nodeId).toBe('node1')
    expect(tracker.getKeysByNode('node1')).toEqual(['key1'])
  })
})
