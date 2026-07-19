import React, { useMemo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { DAGNode } from '@opcpflow/core'
import { useOpcpFlow } from './OpcpFlowProvider'

const defaultColors: Record<string, string> = {
  control: '#6366f1',
  ai: '#22c55e',
  integration: '#0ea5e9',
  verification: '#ec4899',
}

const statusColors: Record<string, string> = {
  pending: '#94a3b8',
  running: '#f59e0b',
  completed: '#22c55e',
  failed: '#ef4444',
  skipped: '#94a3b8',
}

export interface BaseNodeProps {
  id: string
  data: DAGNode['data'] & { status?: string }
  selected?: boolean
  type?: string
  dragging?: boolean
  zIndex?: number
  selectable?: boolean
  isConnectable?: boolean
}

export function BaseNode({ id, data, selected }: BaseNodeProps) {
  const { registry } = useOpcpFlow()
  const nodeType = String((data as any)._nodeType || data.type || 'default')
  const typeDef = registry.get(nodeType)

  const categoryColor = useMemo(() => {
    if (typeDef?.color) return typeDef.color
    if (typeDef?.category) return defaultColors[typeDef.category] || '#64748b'
    return '#64748b'
  }, [typeDef])

  const statusColor = useMemo(() => {
    if (data.status && statusColors[data.status]) {
      return statusColors[data.status]
    }
    return undefined
  }, [data.status])

  const borderColor = statusColor || (selected ? categoryColor : '#e2e8f0')

  const handleStyle = useMemo(
    () => ({
      width: 10,
      height: 10,
      backgroundColor: categoryColor,
      border: '2px solid white',
      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    }),
    [categoryColor],
  )

  return (
    <div
      style={{
        background: 'white',
        border: 'none',
        outline: 'none',
        borderRadius: 10,
        padding: 0,
        width: '100%',
        minWidth: 200,
        boxShadow: selected
          ? `0 0 0 2px ${categoryColor}80, 0 4px 12px rgba(0,0,0,0.15)`
          : '0 1px 4px rgba(0,0,0,0.06)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: 13,
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <style>{`
        .react-flow__node:hover .react-flow__handle {
          transform: scale(1.5);
          box-shadow: 0 0 8px ${categoryColor}60;
        }
        .react-flow__handle {
          transition: transform 0.15s ease, box-shadow 0.15s ease !important;
        }
      `}</style>
      <Handle type="target" position={Position.Top} style={handleStyle} />

      {/* Header with icon + title + delete */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px 10px 16px' }}>
        {typeDef?.icon ? (
          <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{typeDef.icon}</span>
        ) : null}
        <div style={{
          fontWeight: 600, color: '#1e293b', fontSize: 14, lineHeight: 1.3, flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {String(data.label || typeDef?.label || data.type || '')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); (data as any).onDelete?.(id) }}
            title="Delete node"
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 14, lineHeight: 1, padding: 0, color: '#94a3b8', opacity: 0,
              transition: 'opacity 0.1s',
            }}
            className="opcp-node-delete"
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = '1' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.opacity = '0' }}
          >✕</button>
          <style>{`.react-flow__node:hover .opcp-node-delete { opacity: 1 !important; }`}</style>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  )
}
