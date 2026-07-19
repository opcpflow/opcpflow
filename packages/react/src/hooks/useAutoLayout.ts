import { useMemo } from 'react'
import type { DAGNode, DAGEdge } from '@opcpflow/core'
import { computeLevels } from '@opcpflow/core'

export interface UseAutoLayoutOptions {
  direction?: 'TB' | 'LR'
  nodeWidth?: number
  nodeHeight?: number
  levelGap?: number
  nodeGap?: number
}

export interface UseAutoLayoutReturn {
  nodes: DAGNode[]
  layouted: boolean
}

export function useAutoLayout(
  nodes: DAGNode[],
  edges: DAGEdge[],
  options: UseAutoLayoutOptions = {},
): UseAutoLayoutReturn {
  const {
    direction = 'TB',
    nodeWidth = 200,
    nodeHeight = 80,
    levelGap = 80,
    nodeGap = 40,
  } = options

  const layouted = useMemo(() => {
    if (nodes.length === 0) return false
    return true
  }, [nodes])

  const layoutedNodes = useMemo(() => {
    if (nodes.length === 0) return []

    // Compute topological levels
    const levels = computeLevels(nodes, edges)

    // Group nodes by level
    const levelGroups = new Map<number, string[]>()
    for (const node of nodes) {
      const level = levels[node.id] ?? 0
      if (!levelGroups.has(level)) {
        levelGroups.set(level, [])
      }
      levelGroups.get(level)!.push(node.id)
    }

    const sortedLevels = Array.from(levelGroups.entries()).sort(([a], [b]) => a - b)

    // Compute positions
    const isHorizontal = direction === 'LR'
    const positioned = nodes.map((node) => {
      const level = levels[node.id] ?? 0
      const group = levelGroups.get(level) || []
      const indexInGroup = group.indexOf(node.id)
      const groupSize = group.length

      let x: number
      let y: number

      if (isHorizontal) {
        x = level * (nodeWidth + levelGap) + nodeWidth / 2
        if (groupSize === 1) {
          y = 150
        } else {
          const totalHeight = (groupSize - 1) * (nodeHeight + nodeGap)
          y = 150 - totalHeight / 2 + indexInGroup * (nodeHeight + nodeGap)
        }
      } else {
        y = level * (nodeHeight + levelGap) + nodeHeight / 2
        if (groupSize === 1) {
          x = 250
        } else {
          const totalWidth = (groupSize - 1) * (nodeWidth + nodeGap)
          x = 250 - totalWidth / 2 + indexInGroup * (nodeWidth + nodeGap)
        }
      }

      return {
        ...node,
        position: { x, y },
      }
    })

    return positioned
  }, [nodes, edges, direction, nodeWidth, nodeHeight, levelGap, nodeGap])

  return {
    nodes: layoutedNodes,
    layouted,
  }
}
