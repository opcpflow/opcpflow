import React, { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'

/**
 * Custom Node Type: StatusIndicator
 *
 * A custom node that shows a colored status indicator based on the
 * `status` field in the node data. Demonstrates how to create custom
 * node types with custom rendering.
 */
export interface StatusIndicatorData {
  label?: string
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  progress?: number
  message?: string
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  pending: { bg: '#f8fafc', border: '#e2e8f0', text: '#94a3b8' },
  running: { bg: '#eef2ff', border: '#6366f1', text: '#4f46e5' },
  completed: { bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },
  failed: { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c' },
  skipped: { bg: '#fefce8', border: '#f59e0b', text: '#b45309' },
}

export const StatusIndicatorNode = memo(function StatusIndicatorNode({
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as StatusIndicatorData
  const status = nodeData.status || 'pending'
  const colors = statusColors[status] || statusColors.pending

  return (
    <div
      style={{
        padding: '12px 20px',
        borderRadius: 12,
        backgroundColor: colors.bg,
        border: `2px solid ${selected ? '#6366f1' : colors.border}`,
        minWidth: 160,
        textAlign: 'center',
        boxShadow: selected ? '0 4px 12px rgba(99,102,241,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'all 0.15s',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.border }} />

      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
        {nodeData.label || 'Status'}
      </div>

      <div style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: colors.border + '20',
        color: colors.text,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {status}
      </div>

      {nodeData.progress !== undefined && (
        <div style={{ marginTop: 8, width: '100%', height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${nodeData.progress}%`, height: '100%', backgroundColor: colors.border, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
      )}

      {nodeData.message && (
        <div style={{ fontSize: 11, color: colors.text, marginTop: 6, opacity: 0.7 }}>
          {nodeData.message}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: colors.border }} />
    </div>
  )
})

/**
 * Custom Node Type: DataPreview
 *
 * Shows a preview of data passed through the node. Useful for debugging
 * and monitoring DAG execution.
 */
export interface DataPreviewData {
  label?: string
  preview?: string
  type?: 'text' | 'json' | 'number'
}

export const DataPreviewNode = memo(function DataPreviewNode({
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as DataPreviewData
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        backgroundColor: 'white',
        border: `2px solid ${selected ? '#6366f1' : '#d1d5db'}`,
        minWidth: 180,
        maxWidth: 280,
        boxShadow: selected ? '0 4px 12px rgba(99,102,241,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <Handle type="target" position={Position.Top} />

      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
        {nodeData.label || 'Data Preview'}
      </div>

      <div style={{
        backgroundColor: '#f8fafc',
        borderRadius: 6,
        padding: 8,
        fontSize: 11,
        fontFamily: '"SF Mono", "Consolas", monospace',
        color: '#475569',
        maxHeight: 100,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}>
        {nodeData.preview || 'No data'}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
})

/**
 * Example of registering custom node types for use in @xyflow/react.
 *
 * Usage:
 * ```
 * import { StatusIndicatorNode, DataPreviewNode } from './CustomNodes'
 *
 * const nodeTypes = {
 *   'status-indicator': StatusIndicatorNode,
 *   'data-preview': DataPreviewNode,
 * }
 *
 * <DAGFlowCanvas nodeTypes={nodeTypes} ... />
 * ```
 */
export const customNodeTypes = {
  'status-indicator': StatusIndicatorNode,
  'data-preview': DataPreviewNode,
}

/**
 * Example custom node definitions for the NodeRegistry.
 */
export const customNodeDefinitions = [
  {
    type: 'status-indicator',
    label: 'Status Indicator',
    category: 'custom',
    icon: '\u{1F7E2}',
    color: '#6366f1',
    description: 'Displays execution status with a colored indicator.',
    defaultData: {
      label: 'Status',
      status: 'pending',
    },
    formFields: [
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'Running', value: 'running' },
          { label: 'Completed', value: 'completed' },
          { label: 'Failed', value: 'failed' },
          { label: 'Skipped', value: 'skipped' },
        ],
        defaultValue: 'pending',
      },
      {
        name: 'message',
        label: 'Message',
        type: 'text',
        placeholder: 'Optional status message...',
      },
    ],
  },
  {
    type: 'data-preview',
    label: 'Data Preview',
    category: 'custom',
    icon: '\u{1F4CA}',
    color: '#8b5cf6',
    description: 'Shows a preview of data flowing through the DAG.',
    defaultData: {
      label: 'Preview',
      preview: 'No data',
      type: 'text',
    },
    formFields: [
      {
        name: 'type',
        label: 'Data Type',
        type: 'select',
        options: [
          { label: 'Text', value: 'text' },
          { label: 'JSON', value: 'json' },
          { label: 'Number', value: 'number' },
        ],
        defaultValue: 'text',
      },
    ],
  },
]
