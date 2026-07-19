import { describe, it, expect } from 'vitest'
import { getEdgeStyle, getEdgeColor } from '../BaseEdge'

describe('BaseEdge styles', () => {
  it('should return execution style for execution edges', () => {
    const style = getEdgeStyle('execution')
    expect(style.stroke).toBe('#6366f1')
    expect(style.strokeWidth).toBe(2)
  })

  it('should return dashed style for data-flow edges', () => {
    const style = getEdgeStyle('data-flow')
    expect(style.stroke).toBe('#94a3b8')
    expect(style.strokeWidth).toBe(1.5)
    expect(style.strokeDasharray).toBe('5,5')
  })

  it('should return correct color for execution type', () => {
    expect(getEdgeColor('execution')).toBe('#6366f1')
    expect(getEdgeColor('data-flow')).toBe('#94a3b8')
  })
})
