import React, { useState, useMemo, useCallback, useRef } from 'react'
import type { DAGExecutionState, ExecutionRecord } from './hooks/useExecution'

interface D4Suggestion {
  fromLevel: number
  toLevel: number
  nodeId: string
  confidence: number
  reason: string
  action: string
}

interface Props {
  execState: DAGExecutionState
  history: ExecutionRecord[]
  pinnedData: Record<string, any>
  selectedNodeId?: string | null
  onSelectNode?: (nodeId: string) => void
  onEditPinData?: (nodeId: string, output: any) => void
  onUnpinNode?: (nodeId: string) => void
  suggestions?: D4Suggestion[]
}

// ── Status icon helpers ──

type NodeStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'

const statusConfig: Record<
  NodeStatus,
  { icon: string; color: string; label: string }
> = {
  pending: { icon: '⏳', color: '#94a3b8', label: 'Pending' },
  running: { icon: '▶', color: '#3b82f6', label: 'Running' },
  passed: { icon: '✅', color: '#22c55e', label: 'Passed' },
  failed: { icon: '❌', color: '#ef4444', label: 'Failed' },
  skipped: { icon: '⏭', color: '#a855f7', label: 'Skipped' },
}

function StatusIcon({ status }: { status: NodeStatus }) {
  const cfg = statusConfig[status]
  return (
    <span
      title={cfg.label}
      style={{ fontSize: 14, lineHeight: '20px', flexShrink: 0 }}
    >
      {cfg.icon}
    </span>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

// ── Styles ──

const styles = {
  container: {
    borderTop: '1px solid #e2e8f0',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: 240,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '8px 16px',
    borderBottom: '1px solid #f1f5f9',
    background: '#f8fafc',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
  },
  headerSummary: {
    fontSize: 12,
    color: '#64748b',
  },
  list: {
    overflow: 'auto',
    padding: '4px 0',
    flex: 1,
  },
  row: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: 8,
    padding: '6px 16px',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'background 0.1s',
    borderBottom: '1px solid #f8fafc',
  },
  nodeId: {
    fontWeight: 500,
    color: '#1e293b',
    minWidth: 120,
    maxWidth: 200,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  statusLabel: {
    fontWeight: 500,
    minWidth: 64,
  },
  duration: {
    color: '#94a3b8',
    fontSize: 11,
    minWidth: 56,
    textAlign: 'right' as const,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  },
  pinBadge: {
    fontSize: 12,
    lineHeight: '20px',
    flexShrink: 0,
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: '40px 16px',
    color: '#94a3b8',
    fontSize: 13,
  },
} as const

// ── Component ──

export function ExecutionLogPanel({
  execState,
  history,
  pinnedData,
  selectedNodeId,
  onSelectNode,
  onEditPinData,
  onUnpinNode,
  suggestions,
}: Props) {
  const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number | null>(null)
  const [editingPinNodeId, setEditingPinNodeId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'simple' | 'json'>('simple')
  const [jsonViewNodeId, setJsonViewNodeId] = useState<string | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  // Focus the editor textarea when it becomes visible
  React.useEffect(() => {
    if (editingPinNodeId && editorRef.current) {
      editorRef.current.focus()
      editorRef.current.select()
    }
  }, [editingPinNodeId])

  const commitPinEdit = useCallback(
    (nodeId: string, raw: string) => {
      setEditingPinNodeId(null)
      try {
        const parsed = JSON.parse(raw)
        onEditPinData?.(nodeId, parsed)
      } catch {
        // Invalid JSON — ignore edit
      }
    },
    [onEditPinData],
  )

  // Determine which execution state to display
  const displayState = useMemo(() => {
    if (selectedHistoryIdx !== null && history[selectedHistoryIdx]) {
      return history[selectedHistoryIdx].state
    }
    return execState
  }, [execState, history, selectedHistoryIdx])

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(displayState, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `execution-report-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [displayState])

  const { status, nodeStates, startTime, endTime } = displayState
  const isIdle = status === 'idle'

  // Count pass/fail
  const nodeIds = Object.keys(nodeStates)
  const passed = nodeIds.filter((id) => nodeStates[id]?.status === 'passed').length
  const failed = nodeIds.filter((id) => nodeStates[id]?.status === 'failed').length
  const skipped = nodeIds.filter((id) => nodeStates[id]?.status === 'skipped').length
  const total = nodeIds.length

  // Total duration
  const totalDuration =
    startTime && endTime ? formatDuration(endTime - startTime) : undefined

  // Token consumption
  const totalTokens = nodeIds.reduce((sum, id) => {
    const n = nodeStates[id]
    return sum + (n?.result?.contextInfo?.tokens_est || 0)
  }, 0)

  // Idle state
  if (isIdle && history.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          Run the DAG to see execution results
        </div>
      </div>
    )
  }

  const isViewingHistory = selectedHistoryIdx !== null
  const currentHistoryRecord = isViewingHistory && history[selectedHistoryIdx!]

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={styles.headerTitle}>
            {isViewingHistory ? 'Execution History' : 'Execution Log'}
          </span>
          {/* View mode toggle */}
          <div
            style={{
              display: 'flex',
              background: '#e2e8f0',
              borderRadius: 4,
              padding: 1,
              fontSize: 11,
              lineHeight: '18px',
            }}
          >
            <button
              onClick={() => { setViewMode('simple'); setJsonViewNodeId(null) }}
              style={{
                padding: '1px 8px',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                background: viewMode === 'simple' ? 'white' : 'transparent',
                color: viewMode === 'simple' ? '#1e293b' : '#64748b',
                fontWeight: viewMode === 'simple' ? 600 : 400,
                boxShadow: viewMode === 'simple' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              Simple
            </button>
            <button
              onClick={() => setViewMode('json')}
              style={{
                padding: '1px 8px',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                background: viewMode === 'json' ? 'white' : 'transparent',
                color: viewMode === 'json' ? '#1e293b' : '#64748b',
                fontWeight: viewMode === 'json' ? 600 : 400,
                boxShadow: viewMode === 'json' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              JSON
            </button>
          </div>
          {history.length > 1 && (
            <select
              value={selectedHistoryIdx ?? -1}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                setSelectedHistoryIdx(val === -1 ? null : val)
              }}
              style={{
                fontSize: 11,
                padding: '2px 6px',
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                background: 'white',
                color: '#475569',
              }}
            >
              <option value={-1}>Latest</option>
              {history.map((rec, i) => (
                <option key={rec.id} value={i}>
                  {new Date(rec.timestamp).toLocaleTimeString()} · {Object.keys(rec.state.nodeStates).length} nodes
                </option>
              ))}
            </select>
          )}
        </div>
        {status === 'running' ? (
          <span style={{ ...styles.headerSummary, color: '#3b82f6' }}>
            Running...
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={styles.headerSummary}>
              {passed}/{total} passed
              {failed > 0 && ` · ${failed} failed`}
              {skipped > 0 && ` · ${skipped} skipped`}
              {totalDuration && ` · ${totalDuration}`}
              {totalTokens > 0 && ` · ~${totalTokens} tokens`}
            </span>
            {total > 0 && (
              <button
                onClick={handleExport}
                title="Export execution report as JSON"
                style={{
                  fontSize: 14,
                  lineHeight: '20px',
                  padding: '2px 6px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                📥
              </button>
            )}
            {isViewingHistory && (
              <button
                onClick={() => setSelectedHistoryIdx(null)}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 4,
                  background: 'white',
                  cursor: 'pointer',
                  color: '#6366f1',
                }}
              >
                Current
              </button>
            )}
          </div>
        )}
      </div>

      {/* Node list */}
      <div style={styles.list}>
        {nodeIds.map((nodeId) => {
          const state = nodeStates[nodeId]
          if (!state) return null

          const st = state.status as NodeStatus
          const cfg = statusConfig[st]
          const isPinned = nodeId in pinnedData
          const duration =
            state.result?.metrics?.durationMs
              ? formatDuration(state.result.metrics.durationMs)
              : undefined
          const isSelected = selectedNodeId === nodeId
          const pinOutput = pinnedData[nodeId]

          return (
            <React.Fragment key={nodeId}>
              <div
                onClick={() => onSelectNode?.(nodeId)}
                style={{
                  ...styles.row,
                  background: isSelected ? '#f0f0ff' : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#f8fafc'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <StatusIcon status={st} />
                <span style={styles.nodeId} title={nodeId}>
                  {nodeId}
                </span>
                <span
                  style={{
                    ...styles.statusLabel,
                    color: cfg.color,
                  }}
                >
                  {cfg.label}
                </span>
                {(state as any).dispatch && (
                  <span
                    title={`Dispatched to ${(state as any).dispatch.selected}`}
                    style={{ fontSize: 12, lineHeight: '20px', flexShrink: 0, color: '#f59e0b' }}
                  >
                    ⚡{(state as any).dispatch.selected}
                  </span>
                )}
                {duration && <span style={styles.duration}>{duration}</span>}
                {state.result?.contextInfo && state.result.contextInfo.tokens_est > 0 && (
                  <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 40, textAlign: 'right', flexShrink: 0 }}>
                    ~{state.result.contextInfo.tokens_est}t
                  </span>
                )}
                {isPinned && (
                  <span
                    style={{
                      ...styles.pinBadge,
                      cursor: 'pointer',
                      opacity: editingPinNodeId === nodeId ? 0.6 : 1,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingPinNodeId(
                        editingPinNodeId === nodeId ? null : nodeId,
                      )
                    }}
                    title={editingPinNodeId === nodeId ? 'Close editor' : 'Edit pin data'}
                  >
                    📌
                  </span>
                )}
                {isPinned && (state as any).dirty && (
                  <span
                    style={{ ...styles.pinBadge, color: '#f59e0b' }}
                    title="Node output has changed since pinning (dirty)"
                  >
                    ⚠️
                  </span>
                )}
                {state.error && (
                  <span style={styles.errorText} title={state.error}>
                    {state.error}
                  </span>
                )}
              </div>
              {isPinned && editingPinNodeId === nodeId && pinOutput && (
                <div style={{ padding: '4px 16px 8px 44px' }}>
                  <textarea
                    ref={editorRef}
                    defaultValue={JSON.stringify(pinOutput.output ?? pinOutput, null, 2)}
                    onBlur={(e) => commitPinEdit(nodeId, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        setEditingPinNodeId(null)
                      }
                    }}
                    style={{
                      width: '100%',
                      minHeight: 80,
                      fontSize: 11,
                      fontFamily: 'monospace',
                      padding: 6,
                      border: '1px solid #d1d5db',
                      borderRadius: 4,
                      background: '#f9fafb',
                      color: '#1e293b',
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* JSON detail view */}
      {viewMode === 'json' && (
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '8px 16px',
            maxHeight: 300,
            overflow: 'auto',
            flexShrink: 0,
          }}
        >
          {selectedNodeId || jsonViewNodeId ? (
            (() => {
              const detailId = selectedNodeId || jsonViewNodeId
              const detailNode = nodeStates[detailId!]
              const detailOutput = detailNode?.result?.output
              const jsonStr = detailOutput
                ? JSON.stringify(detailOutput, null, 2)
                : 'No output data'
              return (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#64748b',
                      marginBottom: 6,
                      fontFamily: 'monospace',
                    }}
                  >
                    {detailId} output
                  </div>
                  <pre
                    style={{
                      fontSize: 11,
                      fontFamily: '"SF Mono", "Consolas", monospace',
                      background: '#1e293b',
                      color: '#e2e8f0',
                      padding: 12,
                      borderRadius: 6,
                      overflow: 'auto',
                      maxHeight: 240,
                      margin: 0,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {jsonStr}
                  </pre>
                </div>
              )
            })()
          ) : (
            <div
              style={{
                fontSize: 12,
                color: '#94a3b8',
                textAlign: 'center',
                padding: '20px 0',
              }}
            >
              Click a node row to view its JSON output
            </div>
          )}
        </div>
      )}

      {/* D4 Evolution Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            background: '#fafaf9',
            padding: '10px 16px',
            maxHeight: 160,
            overflow: 'auto',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>D4 Evolution Suggestions</span>
          </div>
          {suggestions.map((s, i) => {
            const levelLabel =
              s.fromLevel === 1
                ? 'L1 (pipeline)'
                : s.fromLevel === 2
                  ? 'L2 (dispatch)'
                  : 'L3 (dynamic)'
            const nextLabel =
              s.toLevel === 2
                ? 'L2 (dispatch)'
                : s.toLevel === 3
                  ? 'L3 (dynamic)'
                  : 'L4 (adaptive)'
            return (
              <div
                key={`${s.nodeId}-${i}`}
                style={{
                  fontSize: 12,
                  color: '#475569',
                  padding: '6px 8px',
                  marginBottom: 4,
                  background: 'white',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 500, color: '#1e293b' }}>
                  💡 {levelLabel}→{nextLabel}:{' '}
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {s.nodeId}
                  </span>
                </div>
                <div style={{ marginTop: 2 }}>{s.reason}</div>
                <div style={{ marginTop: 2, color: '#6366f1', fontStyle: 'italic' }}>
                  {s.action}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>Confidence: {Math.round(s.confidence * 100)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
