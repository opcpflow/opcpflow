import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  OpcpFlowProvider,
  DAGFlowCanvas,
  NodePalette,
  NodeConfigPanel,
  useDAGFlow,
  useAutoLayout,
  useExecution,
  ExecutionToolbar,
  ExecutionLogPanel,
} from '@opcpflow/react'
import { createDefaultRegistry } from '@opcpflow/nodes'
import type { DAGDocument, DAGNode, DAGEdge, Metadata, NodeRegistry } from '@opcpflow/core'
import { HandlerRegistry, D4EvolutionAnalyzer, ModelRegistry, exportDAG, importDAG, validateAll } from '@opcpflow/core'
import simplePipeline from '../../../../packages/nodes/examples/simple-pipeline.json'

const registry: NodeRegistry = createDefaultRegistry()

const defaultDoc = simplePipeline as unknown as DAGDocument

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: 'calc(100vh - 56px)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: 'white',
  flexShrink: 0,
}

const toolbarGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  alignItems: 'center',
}

const toolbarBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 500,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  backgroundColor: 'white',
  color: '#1e293b',
  cursor: 'pointer',
  transition: 'background 0.15s',
  whiteSpace: 'nowrap',
}

const toolbarPrimaryBtnStyle: React.CSSProperties = {
  ...toolbarBtnStyle,
  backgroundColor: '#4f46e5',
  color: 'white',
  border: '1px solid #4f46e5',
}

const editorAreaStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
}

const sidebarStyle: React.CSSProperties = {
  width: 220,
  borderRight: '1px solid #e2e8f0',
  overflowY: 'auto',
  backgroundColor: 'white',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
}

const canvasWrapStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
}

const configPanelStyle: React.CSSProperties = {
  width: 280,
  borderLeft: '1px solid #e2e8f0',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'white',
  flexShrink: 0,
}

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  fontSize: 12,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: '#f8fafc',
  color: '#1e293b',
}

const statusBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 16px',
  borderTop: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  fontSize: 11,
  color: '#94a3b8',
  flexShrink: 0,
}

const fileInputRef = { current: null as HTMLInputElement | null }

export default function EditorPage() {
  const [docName, setDocName] = useState('Simple Data Pipeline')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusMessage, setStatusMessage] = useState('Ready')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [nodeMenu, setNodeMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null)
  const labelInputRef = useRef<HTMLInputElement | null>(null)
  const exec = useExecution()
  const [execMode, setExecMode] = useState<'edit' | 'test'>('edit')
  const handlersRef = useRef(HandlerRegistry.createWithBuiltIns())
  const analyzerRef = useRef(new D4EvolutionAnalyzer())
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
    clear,
    reset,
    toDocument,
    updateNodes,
  } = useDAGFlow(defaultDoc.nodes, defaultDoc.edges)

  const handleRunAll = useCallback(() => {
    const dag = toDocument()
    exec.runAll(dag, handlersRef.current, {
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
  }, [toDocument, exec.runAll])

  const handleExecModeChange = useCallback((newMode: 'edit' | 'test') => {
    setExecMode(newMode)
    exec.setMode(newMode)
  }, [exec.setMode])

  const handleNodeDragStart = useCallback(
    (type: string) => {
      const newNode = addNode(type, undefined, {
        x: 200 + Math.random() * 200,
        y: 100 + Math.random() * 200,
      })
      selectNode(newNode.id)
      setStatusMessage(`Added node: ${type}`)
    },
    [addNode, selectNode],
  )

  const handleNew = useCallback(() => {
    clear()
    setDocName('Untitled DAG')
    setStatusMessage('New DAG created')
  }, [clear])

  const handleSave = useCallback(() => {
    const doc = toDocument()
    doc.metadata.name = docName
    const json = JSON.stringify(doc, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${docName.replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatusMessage('DAG saved as JSON')
  }, [toDocument, docName])

  const handleExport = useCallback(() => {
    const doc = toDocument()
    const json = JSON.stringify(doc, null, 2)
    navigator.clipboard.writeText(json).then(() => {
      setStatusMessage('DAG JSON copied to clipboard')
    }).catch(() => {
      setStatusMessage('Failed to copy to clipboard')
    })
  }, [toDocument])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const doc = await importDAG(file)
      reset(doc)
      setDocName(doc.metadata.name || 'Imported DAG')
      setStatusMessage(`Imported: ${file.name}`)
    } catch (err) {
      setStatusMessage(`Import failed: ${(err as Error).message}`)
    }
    e.target.value = ''
  }, [reset])

  const handleValidate = useCallback(() => {
    const result = validateAll(nodes, edges, { maxDepth: 50 })
    if (result.valid) {
      setStatusMessage('DAG is valid (no errors)')
    } else {
      const msgs = result.errors.map((e) => `[${e.type}] ${e.message}`).join('; ')
      setStatusMessage(`Validation: ${result.errors.length} error(s): ${msgs}`)
    }
  }, [nodes, edges])

  const handleLayout = useCallback(() => {
    try {
      const layouted = useAutoLayout(nodes, edges)
      reset({ nodes: layouted.nodes, edges, metadata: { name: docName, version: 1 } })
      setStatusMessage('Auto-layout applied')
    } catch {
      setStatusMessage('Auto-layout failed')
    }
  }, [nodes, edges, docName, reset])

  const handleDeleteSelected = useCallback(() => {
    if (selectedNode) {
      removeNode(selectedNode.id)
      setStatusMessage(`Deleted node: ${selectedNode.id}`)
    }
  }, [selectedNode, removeNode])

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, node: { id: string }) => {
    e.preventDefault()
    selectNode(node.id)
    setNodeMenu({ nodeId: node.id, x: e.clientX, y: e.clientY })
  }, [selectNode])

  const handleCopyNode = useCallback(() => {
    if (!nodeMenu) return
    const original = nodes.find(n => n.id === nodeMenu.nodeId)
    if (original) {
      addNode(original.type, original.data as any, {
        x: original.position.x + 50,
        y: original.position.y + 50,
      })
    }
    setNodeMenu(null)
  }, [nodeMenu, nodes, addNode])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Backspace on selected node → focus the label input for editing
      if (e.key === 'Backspace' && selectedNode) {
        requestAnimationFrame(() => {
          const input = labelInputRef.current
          if (input) {
            input.focus()
            const len = input.value.length
            input.setSelectionRange(len, len)
          }
        })
      }
    },
    [selectedNode],
  )

  const selectedDAGNode = useMemo(
    () => nodes.find((n) => n.id === selectedNode?.id) || null,
    [nodes, selectedNode],
  )

  // Inject onDelete and execution status into canvas nodes
  const canvasNodes = useMemo(
    () => nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        ...(exec.execState.status !== 'idle' ? { status: exec.getNodeStatus(n.id)?.status } : {}),
        onDelete: (nodeId: string) => { removeNode(nodeId); selectNode(null) },
      },
    })),
    [nodes, exec.execState.status, exec.getNodeStatus, removeNode, selectNode],
  )

  // Edge status for execution animation
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
      return { ...e, data: { ...(e.data || {}), status: edgeStatus } }
    })
  }, [edges, exec.execState.status, exec.execState.nodeStates])

  // D4 evolution analysis suggestions
  const suggestions = useMemo(() => {
    const coreHistory = exec.history
      .filter((h) => h.state.report && h.state.report.status === 'completed')
      .map((h) => ({ state: h.state.report! }))
    if (
      exec.execState.status === 'completed' &&
      exec.execState.report &&
      !coreHistory.some((h) => h.state.startTime === exec.execState.report!.startTime)
    ) {
      coreHistory.push({ state: exec.execState.report })
    }
    if (coreHistory.length < 2) return []
    const dag = toDocument()
    return analyzerRef.current.analyze(coreHistory, dag)
  }, [exec.execState, exec.history, toDocument])

  const nodeCount = nodes.length
  const edgeCount = edges.length

  return (
    <div style={pageStyle} onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <div style={toolbarGroupStyle}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginRight: 12 }}>
            {docName}
          </span>
          <button
            style={toolbarBtnStyle}
            onClick={handleNew}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
          >
            New
          </button>
          <button
            style={toolbarPrimaryBtnStyle}
            onClick={handleSave}
            onMouseOver={(e) => { e.currentTarget.style.background = '#4338ca' }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#4f46e5' }}
          >
            Save
          </button>
        </div>

        {/* Execution toolbar (sandbox test) */}
        <ExecutionToolbar
          mode={execMode}
          onModeChange={handleExecModeChange}
          onRunAll={handleRunAll}
          onClear={exec.clear}
          isRunning={exec.execState.status === 'running'}
          hasResults={exec.execState.status !== 'idle'}
        />

        <div style={toolbarGroupStyle}>
          <button
            style={toolbarBtnStyle}
            onClick={() => { handleExport(); setStatusMessage('DAG exported to clipboard') }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
          >
            Export
          </button>
          <button
            style={toolbarBtnStyle}
            onClick={handleImport}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
          >
            Import
          </button>
          <button
            style={toolbarBtnStyle}
            onClick={handleValidate}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
          >
            Validate
          </button>
          <button
            style={toolbarBtnStyle}
            onClick={handleLayout}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
          >
            Layout
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div style={editorAreaStyle}>
        {/* Node Palette Sidebar */}
        <div style={sidebarStyle}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <NodePalette
              registry={registry}
              onDragStart={handleNodeDragStart}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        {/* Canvas + Execution Log */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ ...canvasWrapStyle, flex: 1 }}>
            <OpcpFlowProvider
              doc={{ nodes, edges, metadata: { name: docName, version: 1 } }}
              registry={registry}
            >
              <DAGFlowCanvas
                nodes={canvasNodes}
                edges={canvasEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={connect}
                onNodeClick={(_, node) => selectNode(node.id)}
                onNodeDoubleClick={(_, node) => selectNode(node.id)}
                onNodeContextMenu={handleNodeContextMenu}
              />
            </OpcpFlowProvider>
            {/* Node context menu */}
            {nodeMenu && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setNodeMenu(null)} />
                <div style={{ position: 'fixed', top: nodeMenu.y, left: nodeMenu.x, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, minWidth: 160, padding: '4px 0' }} onClick={(e) => e.stopPropagation()}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#1e293b', transition: 'background 0.1s ease' }}
                    onClick={handleCopyNode}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 20, flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </span>
                    <span style={{ flex: 1, fontSize: 13, lineHeight: '20px' }}>Copy Node</span>
                  </button>
                  <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
                  <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#ef4444', transition: 'background 0.1s ease' }}
                    onClick={() => { removeNode(nodeMenu.nodeId); selectNode(null); setNodeMenu(null) }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 20, flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </span>
                    <span style={{ flex: 1, fontSize: 13, lineHeight: '20px' }}>Delete Node</span>
                  </button>
                </div>
              </>
            )}
        </div>

        {/* Execution Log Panel in test mode */}
        {execMode === 'test' && (exec.execState.status !== 'idle' || exec.history.length > 0) && (
          <ExecutionLogPanel
            execState={exec.execState}
            history={exec.history}
            pinnedData={exec.pinnedData}
            selectedNodeId={selectedDAGNode?.id || null}
            onSelectNode={(id) => selectNode(id)}
            onEditPinData={exec.editPinData}
            onUnpinNode={exec.unpinNode}
            suggestions={suggestions}
          />
        )}
      </div>

      {/* Config Panel */}
        <div style={configPanelStyle}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
            <span>Configuration</span>
            <button
              onClick={() => selectNode(null)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 16, color: '#94a3b8', padding: 0, lineHeight: 1, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Close config panel"
            >×</button>
          </div>
          {selectedDAGNode ? (
            <OpcpFlowProvider
              doc={{ nodes, edges, metadata: { name: docName, version: 1 } }}
              registry={registry}
              onDocChange={(updatedDoc) => {
                if (updatedDoc.nodes) updateNodes(updatedDoc.nodes)
              }}
            >
              <NodeConfigPanel node={selectedDAGNode} labelInputRef={labelInputRef} />
            </OpcpFlowProvider>
          ) : (
            <div style={{ padding: 20, color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>
              Select a node to configure
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div style={statusBarStyle}>
        <span>{statusMessage}</span>
        <span>{nodeCount} nodes | {edgeCount} edges</span>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}
