import React from 'react'
import {
  BaseEdge as XYBaseEdge,
  type EdgeProps,
  getBezierPath,
} from '@xyflow/react'

export type ExecutionEdgeStatus = 'flowing' | 'completed' | 'skipped' | 'idle'

export interface BaseEdgeData extends Record<string, unknown> {
  edgeType?: 'execution' | 'data-flow'
  label?: string
  status?: ExecutionEdgeStatus
}

export function getEdgeStyle(
  edgeType: 'execution' | 'data-flow',
  status?: ExecutionEdgeStatus,
) {
  if (edgeType === 'data-flow') {
    return { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '5,5' }
  }

  switch (status) {
    case 'flowing':
      return { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '8 4' }
    case 'completed':
      return { stroke: '#22c55e', strokeWidth: 2 }
    case 'skipped':
      return { stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '6,3' }
    default:
      return { stroke: '#6366f1', strokeWidth: 2 }
  }
}

export function getEdgeColor(
  edgeType: 'execution' | 'data-flow',
  status?: ExecutionEdgeStatus,
): string {
  if (status === 'completed') return '#22c55e'
  if (status === 'flowing') return '#3b82f6'
  if (status === 'skipped') return '#94a3b8'
  return edgeType === 'data-flow' ? '#94a3b8' : '#6366f1'
}

const flowDashKeyframes = `
@keyframes flowDash {
  to {
    stroke-dashoffset: -24;
  }
}
`

export function BaseEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    selected,
  } = props

  const edgeData = (props.data || {}) as BaseEdgeData
  const effectiveEdgeType = edgeData.edgeType || 'execution'
  const execStatus = edgeData.status
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const defaultStyle = getEdgeStyle(effectiveEdgeType, execStatus)
  const strokeColor = selected ? '#f59e0b' : defaultStyle.stroke

  // When edge is flowing, add animation
  const isFlowing = execStatus === 'flowing' && !selected

  return (
    <>
      <style>{flowDashKeyframes}</style>
      <XYBaseEdge
        id={id}
        path={edgePath}
        interactionWidth={20}
        style={{
          ...defaultStyle,
          stroke: strokeColor,
          ...(isFlowing
            ? {
                animation: 'flowDash 0.5s linear infinite',
              }
            : {}),
          ...(style as React.CSSProperties),
        }}
        markerEnd={markerEnd}
      />
      {edgeData.label && (
        <foreignObject
          width={120}
          height={20}
          x={(sourceX + targetX) / 2 - 60}
          y={(sourceY + targetY) / 2 - 10}
          style={{ overflow: 'visible' }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.9)',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              color: getEdgeColor(effectiveEdgeType, execStatus),
              textAlign: 'center',
              fontWeight: 500,
              border: `1px solid ${getEdgeColor(effectiveEdgeType, execStatus)}40`,
            }}
          >
            {edgeData.label}
          </div>
        </foreignObject>
      )}
    </>
  )
}
