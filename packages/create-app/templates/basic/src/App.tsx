import React, { useCallback, useMemo } from 'react'
import {
  OpcpFlowProvider,
  DAGFlowCanvas,
  NodePalette,
  NodeConfigPanel,
  useDAGFlow,
  useAutoLayout,
} from '@opcpflow/react'
import { createDefaultRegistry, nodeDefinitions } from '@opcpflow/nodes'
import type { DAGNode, DAGEdge, Metadata, NodeRegistry } from '@opcpflow/core'

const defaultNodes: DAGNode[] = [
  {
    id: 'trigger_1',
    type: 'trigger',
    position: { x: 300, y: 0 },
    data: { label: 'Start', execution_mode: 'pipeline', instructions: 'Start' },
  },
  {
    id: 'llm-call_1',
    type: 'llm_call',
    position: { x: 250, y: 150 },
    data: {
      label: 'Process',
      execution_mode: 'pipeline',
      instructions: 'Process input',
      model: 'gpt-4',
      max_tokens: 1000,
      output_key: 'result',
    },
  },
  {
    id: 'output_1',
    type: 'output',
    position: { x: 250, y: 320 },
    data: { label: 'Output', execution_mode: 'pipeline', output_key: 'final' },
  },
]

const defaultEdges: DAGEdge[] = [
  { id: 'e1', source: 'trigger_1', target: 'llm-call_1', type: 'execution' },
  { id: 'e2', source: 'llm-call_1', target: 'output_1', type: 'execution' },
]

const defaultMetadata: Metadata = {
  name: 'My First DAG',
  description: 'Created with create-opcpflow-app',
  version: 1,
  status: 'draft',
}

const registry: NodeRegistry = createDefaultRegistry(nodeDefinitions)

const appStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 16px',
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: '#f8fafc',
  flexShrink: 0,
}

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#1e293b',
}

const editorContainerStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
}

const sidebarStyle: React.CSSProperties = {
  width: 220,
  borderRight: '1px solid #e2e8f0',
  overflowY: 'auto',
  backgroundColor: '#ffffff',
  flexShrink: 0,
}

const canvasStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
}

const configPanelStyle: React.CSSProperties = {
  width: 280,
  borderLeft: '1px solid #e2e8f0',
  overflowY: 'auto',
  backgroundColor: '#ffffff',
  flexShrink: 0,
}

export default function App() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    connect,
    selectedNode,
    selectNode,
    reset,
    toDocument,
  } = useDAGFlow(defaultNodes, defaultEdges)

  const handleNodeDragStart = useCallback(
    (type: string) => {
      addNode(type)
    },
    [addNode],
  )

  const handleSave = useCallback(() => {
    const doc = toDocument()
    const json = JSON.stringify(doc, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.metadata.name || 'dag'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [toDocument])

  const selectedDAGNode = useMemo(
    () => nodes.find((n) => n.id === selectedNode?.id) || null,
    [nodes, selectedNode],
  )

  return (
    <div style={appStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>OpcpFlow DAG Editor</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnStyle} onClick={() => reset({ nodes: defaultNodes, edges: defaultEdges, metadata: defaultMetadata })}>
            New
          </button>
          <button style={btnStyle} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>

      <div style={editorContainerStyle}>
        <div style={sidebarStyle}>
          <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
            Nodes
          </div>
          <NodePalette
            registry={registry}
            onDragStart={handleNodeDragStart}
          />
        </div>

        <div style={canvasStyle}>
          <OpcpFlowProvider
            doc={{ nodes, edges, metadata: defaultMetadata }}
            registry={registry}
          >
            <DAGFlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={connect}
              onNodeClick={(_, node) => selectNode(node.id)}
              onNodeDoubleClick={(_, node) => selectNode(node.id)}
            />
          </OpcpFlowProvider>
        </div>

        <div style={configPanelStyle}>
          {selectedDAGNode ? (
            <NodeConfigPanel node={selectedDAGNode} />
          ) : (
            <div style={{ padding: 20, color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>
              Select a node to configure
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 13,
  fontWeight: 500,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  backgroundColor: 'white',
  color: '#1e293b',
  cursor: 'pointer',
}
