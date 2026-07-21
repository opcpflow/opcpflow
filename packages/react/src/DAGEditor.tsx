import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type DAGDocument,
  type DAGNode,
  type FormFieldDefinition,
  type NodeRegistry,
  type HandlerRegistry,
  D4EvolutionAnalyzer,
  ModelRegistry,
  getPredecessors,
  getSuccessors,
} from '@opcpflow/core'
import { OpcpFlowProvider } from './OpcpFlowProvider'
import { DAGFlowCanvas, type DAGFlowCanvasProps } from './DAGFlowCanvas'
import { NodePalette } from './NodePalette'
import { NodeConfigPanel } from './NodeConfigPanel'
import { useDAGFlow } from './hooks/useDAGFlow'
import { useExecution } from './hooks/useExecution'
import { ExecutionToolbar } from './ExecutionToolbar'
import { ExecutionLogPanel } from './ExecutionLogPanel'
import type { NodeTypes, EdgeTypes } from '@xyflow/react'

export interface DAGEditorProps {
  /** Node type definitions registry — required */
  registry: NodeRegistry
  /** Initial DAG document to load */
  initialDoc?: DAGDocument
  /** Called when user clicks Save (Ctrl+S). Receives the full document. */
  onSave?: (doc: DAGDocument) => void | Promise<void>
  /** Called when user clicks Back */
  onBack?: () => void
  /** External saving state (e.g. from API call) */
  saving?: boolean
  /** External error message */
  error?: string | null
  /** Read-only mode — hides Save button, prevents editing */
  readOnly?: boolean
  /** Custom React Flow node types */
  nodeTypes?: NodeTypes
  /** Custom React Flow edge types */
  edgeTypes?: EdgeTypes
  /** Container class name */
  className?: string
  /** Handler registry for execution sandbox (required for test mode) */
  executionHandlers?: HandlerRegistry
  /** Default execution mode */
  defaultExecutionMode?: 'edit' | 'test'
  /** Custom field renderers keyed by field name */
  fieldRenderers?: Record<string, React.ComponentType<{ field: FormFieldDefinition; value: unknown; onChange: (value: unknown) => void }>>
}

// ── Styles ──

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    background: '#f8fafc',
  },
  containerInner: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  palette: {
    width: 240,
    flexShrink: 0,
    overflow: 'auto',
    borderRight: '1px solid #e2e8f0',
  },
  canvasAndLog: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    position: 'relative' as const,
    overflow: 'visible',
  },
  configPanel: {
    width: 300,
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid #e2e8f0',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '8px 16px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    zIndex: 10,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: 12,
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: 8,
  },
  nameInput: {
    fontSize: 16,
    fontWeight: 600,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#1e293b',
    minWidth: 200,
  },
  backBtn: {
    padding: '4px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    background: 'white',
    cursor: 'pointer',
    fontSize: 13,
    color: '#475569',
  },
  saveBtn: {
    padding: '6px 20px',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    color: 'white',
    cursor: 'pointer',
    transition: 'background 0.1s',
  } as React.CSSProperties,
  countLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  separator: {
    width: 1,
    height: 20,
    background: '#e2e8f0',
  },
  errorBanner: {
    padding: '8px 16px',
    background: '#fef2f2',
    color: '#dc2626',
    fontSize: 13,
    borderBottom: '1px solid #fecaca',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '4px 16px',
    background: '#1e293b',
    color: '#94a3b8',
    fontSize: 11,
    zIndex: 10,
    flexShrink: 0,
  },
} as const

// ── Sub-components ──

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px',
        border: 'none',
        borderRadius: 6,
        fontSize: 13,
        cursor: 'pointer',
        background: active ? '#eef2ff' : 'transparent',
        color: active ? '#6366f1' : '#64748b',
        fontWeight: active ? 600 : 400,
      }}
    >
      {children}
    </button>
  )
}

// ── DAGEditor ──

export function DAGEditor({
  registry,
  initialDoc,
  onSave,
  onBack,
  saving = false,
  error: externalError,
  readOnly = false,
  nodeTypes: customNodeTypes,
  edgeTypes: customEdgeTypes,
  className,
  executionHandlers,
  defaultExecutionMode,
  fieldRenderers,
}: DAGEditorProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    removeNode,
    connect,
    selectedNode,
    selectNode,
    toDocument,
    reset,
    updateNodes,
  } = useDAGFlow()

  const exec = useExecution()
  const [execMode, setExecMode] = useState<'edit' | 'test'>(
    defaultExecutionMode || (executionHandlers ? 'test' : 'edit'),
  )

  // Load initial document when it becomes available
  useEffect(() => {
    if (initialDoc?.nodes?.length || initialDoc?.edges?.length) {
      reset(initialDoc)
    }
  }, [initialDoc, reset])

  const [workflowName, setWorkflowName] = useState(
    initialDoc?.metadata?.name || '',
  )

  // Sync name when initialDoc changes
  useEffect(() => {
    if (initialDoc?.metadata?.name) {
      setWorkflowName(initialDoc.metadata.name)
    }
  }, [initialDoc?.metadata?.name])

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const highlightedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return undefined
    const upstream = getPredecessors(hoveredNodeId, edges)
    const downstream = getSuccessors(hoveredNodeId, edges)
    return new Set([hoveredNodeId, ...upstream, ...downstream])
  }, [hoveredNodeId, edges])

  // ── Node context menu ──
  const [nodeContextMenu, setNodeContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null)
  const closeNodeMenu = useCallback(() => setNodeContextMenu(null), [])

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, node: { id: string }) => {
    e.preventDefault()
    setNodeContextMenu({ nodeId: node.id, x: e.clientX, y: e.clientY })
  }, [])

  const handleDeleteNodeFromMenu = useCallback(() => {
    if (nodeContextMenu) { removeNode(nodeContextMenu.nodeId); selectNode(null); closeNodeMenu() }
  }, [nodeContextMenu, removeNode, selectNode, closeNodeMenu])

  const handleCopyNode = useCallback(() => {
    if (nodeContextMenu) {
      const original = nodes.find(n => n.id === nodeContextMenu.nodeId)
      if (original) {
        addNode(original.type, original.data as any, {
          x: original.position.x + 50, y: original.position.y + 50,
        })
      }
    }
    closeNodeMenu()
  }, [nodeContextMenu, nodes, addNode, closeNodeMenu])

  const handlePinFromMenu = useCallback(() => {
    if (nodeContextMenu) { exec.pinNode(nodeContextMenu.nodeId, { pinned: true }); closeNodeMenu() }
  }, [nodeContextMenu, exec, closeNodeMenu])

  const handleUnpinFromMenu = useCallback(() => {
    if (nodeContextMenu) { exec.unpinNode(nodeContextMenu.nodeId); closeNodeMenu() }
  }, [nodeContextMenu, exec, closeNodeMenu])

  const labelInputRef = useRef<HTMLInputElement | null>(null)
  const [showPalette, setShowPalette] = useState(true)
  const [showConfig, setShowConfig] = useState(true)
  const [internalError, setInternalError] = useState<string | null>(null)
  const error = externalError || internalError

  // Add node from palette click
  const handleAddNode = useCallback(
    (nodeType: string) => {
      const node = addNode(nodeType)
      selectNode(node.id)
    },
    [addNode, selectNode],
  )

  // Save handler
  const handleSave = useCallback(async () => {
    if (!onSave || readOnly) return
    const doc = toDocument()
    doc.metadata.name = workflowName
    try {
      await onSave(doc)
      setInternalError(null)
    } catch (err) {
      setInternalError((err as Error).message)
    }
  }, [onSave, readOnly, toDocument, workflowName])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!readOnly) handleSave()
      }
      if (e.key === 'Backspace' && selectedNode) {
        const tag = document.activeElement?.tagName
        const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
        if (isEditing) {
          // User is editing a text field — stop event from reaching React Flow's
          // built-in delete handler, which would remove the selected node.
          e.stopPropagation()
        } else {
          e.stopImmediatePropagation()
          e.preventDefault()
          setShowConfig(true)
          requestAnimationFrame(() => {
            const input = labelInputRef.current
            if (input) {
              input.focus()
              const len = input.value.length
              input.setSelectionRange(len, len)
            }
          })
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, selectedNode, removeNode, selectNode, readOnly])

  const doc = useMemo(
    () => ({
      nodes,
      edges,
      metadata: {
        name: workflowName,
        version: initialDoc?.metadata?.version || 1,
        status: 'draft' as const,
      },
    }),
    [nodes, edges, workflowName, initialDoc?.metadata?.version],
  )

  const nodeCount = nodes.length
  const edgeCount = edges.length

  // ── Execution mode toggle handler ──
  const handleExecModeChange = useCallback(
    (newMode: 'edit' | 'test') => {
      setExecMode(newMode)
      exec.setMode(newMode)
    },
    [exec.setMode],
  )

  // ── Run all handler ──
  const handleRunAll = useCallback(() => {
    if (!executionHandlers) return
    const dag = toDocument()
    exec.runAll(dag, executionHandlers, {
      onValidateNode: (node) => {
        const def = registry.get(node.type)
        if (!def) return null
        const fields = def.formGroups?.flatMap(g => g.fields) || def.formFields || []
        for (const f of fields) {
          if (!f.required) continue
          const val = node.data[f.name]
          if (val === undefined || val === null || val === '') {
            return `[${node.id}] "${f.label}" is required`
          }
        }
        // Custom model: validate each field individually
        if (node.data.model === '__custom__') {
          return `[${node.id}] "Model Name" is required when using Custom model`
        }
        // Validate model configuration
        if (node.data.model) {
          const mc = ModelRegistry.get(node.data.model as string)
          if (!mc) {
            if (!node.data.api_endpoint) return `[${node.id}] "API Endpoint" is required for model "${node.data.model}"`
            if (!node.data.api_key) return `[${node.id}] "API Key" is required for model "${node.data.model}"`
          } else if (!ModelRegistry.getProviderKey(mc.provider)) {
            return `[${node.id}] API Key for provider "${mc.provider}" is missing. Call ModelRegistry.setProviderKey("${mc.provider}", "sk-...")`
          }
        }
        return null
      },
    })
  }, [executionHandlers, toDocument, exec.runAll, registry])

  // ── Compute edge status from node execution states ──
  const canvasEdges = useMemo(() => {
    if (exec.execState.status === 'idle') return edges
    const nodeStates = exec.execState.nodeStates
    return edges.map((e) => {
      const sourceState = nodeStates[e.source]
      let edgeStatus: string | undefined
      if (sourceState) {
        if (sourceState.status === 'running') edgeStatus = 'flowing'
        else if (sourceState.status === 'passed') edgeStatus = 'completed'
        else if (sourceState.status === 'failed' || sourceState.status === 'skipped') edgeStatus = 'skipped'
      }
      return {
        ...e,
        data: {
          ...(e.data || {}),
          status: edgeStatus,
        },
      }
    })
  }, [edges, exec.execState.status, exec.execState.nodeStates])

  // ── Inject execution status into node data ──
  const canvasNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        ...(exec.execState.status !== 'idle' ? { status: exec.getNodeStatus(n.id)?.status } : {}),
        onDelete: (nodeId: string) => { removeNode(nodeId); selectNode(null) },
      },
    }))
  }, [nodes, exec.execState.status, exec.getNodeStatus, removeNode, selectNode])

  // ── D4 evolution analysis ──
  const analyzerRef = useRef(new D4EvolutionAnalyzer())
  const suggestions = useMemo(() => {
    // Convert react history to analyzer format (state: DAGExecutionReport)
    const coreHistory = exec.history
      .filter((h) => h.state.report && h.state.report.status === 'completed')
      .map((h) => ({ state: h.state.report! }))

    // Include current run if completed and not already in history
    if (
      exec.execState.status === 'completed' &&
      exec.execState.report &&
      !coreHistory.some(
        (h) => h.state.startTime === exec.execState.report!.startTime,
      )
    ) {
      coreHistory.push({ state: exec.execState.report })
    }

    if (coreHistory.length < 2) return []
    const dag = toDocument()
    return analyzerRef.current.analyze(coreHistory, dag)
  }, [exec.execState, exec.history, toDocument])

  // ── Toolbar ──
  const isTestMode = execMode === 'test'
  const toolbar = (
    <div style={styles.toolbar}>
      <div style={styles.toolbarLeft}>
        {onBack && (
          <button onClick={onBack} style={styles.backBtn}>
            Back
          </button>
        )}
        <input
          type="text"
          value={workflowName}
          readOnly={readOnly}
          onChange={(e) => setWorkflowName(e.target.value)}
          placeholder="Workflow Name"
          style={styles.nameInput}
        />
      </div>

      <div style={styles.toolbarRight}>
        <ExecutionToolbar
          mode={execMode}
          onModeChange={handleExecModeChange}
          onRunAll={handleRunAll}
          onClear={exec.clear}
          isRunning={exec.execState.status === 'running'}
          hasResults={exec.execState.status !== 'idle'}
          onStep={exec.stepToNext}
          onPause={exec.pause}
          onResume={exec.resume}
          canStep={exec.canStep}
          isPaused={exec.isPaused}
        />
        {!isTestMode && (<>
            <span style={styles.countLabel}>
              {nodeCount} nodes, {edgeCount} edges
            </span>
            <div style={styles.separator} />
            <ToolbarButton
              active={showPalette}
              onClick={() => setShowPalette(!showPalette)}
            >
              Palette
            </ToolbarButton>
            <ToolbarButton
              active={showConfig}
              onClick={() => setShowConfig(!showConfig)}
            >
              Config
            </ToolbarButton>
            {onSave && !readOnly && (
              <>
                <div style={styles.separator} />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    ...styles.saveBtn,
                    background: saving ? '#94a3b8' : '#6366f1',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )

  // ── Error banner ──
  const errorBanner = error ? (
    <div style={styles.errorBanner}>{error}</div>
  ) : null

  // ── Status bar ──
  const statusBar = (
    <div style={styles.statusBar}>
      <div style={{ display: 'flex', gap: 16 }}>
        <span>{nodeCount} nodes</span>
        <span>{edgeCount} edges</span>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {saving && <span style={{ color: '#f59e0b' }}>Saving...</span>}
        <span>
          {selectedNode
            ? `Selected: ${selectedNode.id}`
            : 'No node selected'}
        </span>
      </div>
    </div>
  )

  return (
    <OpcpFlowProvider doc={doc} registry={registry} onDocChange={(updatedDoc) => {
      if (updatedDoc.nodes) updateNodes(updatedDoc.nodes as any)
    }}>
      <div style={styles.container} className={className}>
        {toolbar}
        {errorBanner}

        <div style={styles.containerInner}>
          {/* Palette sidebar */}
          {showPalette && (
            <div style={styles.palette}>
              <NodePalette registry={registry} onDragStart={handleAddNode} />
            </div>
          )}

          {/* Canvas */}
        <div style={styles.canvasAndLog}>
            <div style={styles.canvas} onContextMenu={(e) => e.preventDefault()}>
              <DAGFlowCanvas
                nodes={canvasNodes}
                edges={canvasEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={connect}
                onNodeClick={(_, node) => selectNode(node.id)}
                nodeTypes={customNodeTypes}
                edgeTypes={customEdgeTypes}
                fitView
                miniMap
                controls
                background
                highlightedNodeIds={highlightedNodeIds}
                onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
                onNodeMouseLeave={() => setHoveredNodeId(null)}
                onNodeContextMenu={handleNodeContextMenu}
              />
              {/* Node context menu */}
              {nodeContextMenu && (() => {
                const nodeId = nodeContextMenu.nodeId
                const isPinned = exec.isNodePinned(nodeId)
                const sep: React.CSSProperties = { height: 1, background: '#e2e8f0', margin: '4px 0' }
                const TrashIcon = () => (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                )
                const CopyIcon = () => (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                )
                const PinIcon = () => (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-.81.42A2 2 0 0 0 6 14.62V17h12v-2.38a2 2 0 0 0-1.08-1.79l-.81-.42A2 2 0 0 1 15 10.76V7H9v3.76Z"/>
                  </svg>
                )
                const baseItemStyle: React.CSSProperties = {
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', border: 'none',
                  background: 'transparent', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#1e293b',
                  transition: 'background 0.1s ease',
                }
                const iconStyle: React.CSSProperties = {
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 20, flexShrink: 0,
                }
                const labelStyle: React.CSSProperties = {
                  flex: 1, fontSize: 13, lineHeight: '20px',
                }
                const hoverBg = '#f1f5f9'
                const deleteHoverBg = '#fef2f2'
                return (
                  <div
                    style={{
                      position: 'fixed', top: nodeContextMenu.y, left: nodeContextMenu.x,
                      background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 1000,
                      minWidth: 160, padding: '4px 0', overflow: 'hidden',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button style={baseItemStyle} onClick={handleCopyNode}
                      onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                      <span style={iconStyle}><CopyIcon /></span>
                      <span style={labelStyle}>Copy Node</span>
                    </button>
                    <div style={sep} />
                    {isPinned ? (
                      <button style={baseItemStyle} onClick={handleUnpinFromMenu}
                        onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                        <span style={iconStyle}><PinIcon /></span>
                        <span style={labelStyle}>Unpin Output</span>
                      </button>
                    ) : (
                      <button style={baseItemStyle} onClick={handlePinFromMenu}
                        onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                        <span style={iconStyle}><PinIcon /></span>
                        <span style={labelStyle}>Pin Output</span>
                      </button>
                    )}
                    <div style={sep} />
                    <button style={{ ...baseItemStyle, color: '#ef4444' }} onClick={handleDeleteNodeFromMenu}
                      onMouseEnter={(e) => { e.currentTarget.style.background = deleteHoverBg; e.currentTarget.style.color = '#dc2626' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444' }}>
                      <span style={iconStyle}><TrashIcon /></span>
                      <span style={labelStyle}>Delete Node</span>
                    </button>
                  </div>
                )
              })()}
              {/* Click outside to close context menu */}
              {nodeContextMenu && (
                <div
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                  onClick={closeNodeMenu}
                />
              )}
            </div>

            {/* Execution Log Panel — show when test mode has results */}
            {isTestMode && (exec.execState.status !== 'idle' || exec.history.length > 0) && (
              <ExecutionLogPanel
                execState={exec.execState}
                history={exec.history}
                pinnedData={exec.pinnedData}
                selectedNodeId={selectedNode?.id}
                onSelectNode={(nodeId) => selectNode(nodeId)}
                onEditPinData={exec.editPinData}
                onUnpinNode={exec.unpinNode}
                suggestions={suggestions}
              />
            )}
          </div>

          {/* Config panel */}
          {showConfig && selectedNode && (
            <div style={styles.configPanel}>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>Node Config</span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button
                    onClick={() => setShowConfig(false)}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#94a3b8', padding: 0, lineHeight: 1 }}
                    title="Close config panel"
                  >×</button>
                </div>
              </div>
              <NodeConfigPanel node={selectedNode} labelInputRef={labelInputRef} fieldRenderers={fieldRenderers} />
            </div>
          )}
        </div>

        {statusBar}
      </div>
    </OpcpFlowProvider>
  )
}
