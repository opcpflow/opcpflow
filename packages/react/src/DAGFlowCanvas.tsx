import React, { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type NodeTypes,
  type EdgeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type FitViewOptions,
  type DefaultEdgeOptions,
  type Edge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { BaseNode } from './BaseNode'
import { getEdgeStyle } from './BaseEdge'
import type { DAGNode, DAGEdge } from '@opcpflow/core'
import { generateNodeId } from './hooks/useDAGFlow'

const defaultNodeTypes: NodeTypes = { default: BaseNode }
const defaultEdgeTypes: EdgeTypes = {}
const defaultFitViewOptions: FitViewOptions = { padding: 0.2 }

export interface DAGFlowCanvasProps {
  nodes: DAGNode[]
  edges: DAGEdge[]
  nodeTypes?: NodeTypes
  edgeTypes?: EdgeTypes
  onNodesChange?: OnNodesChange
  onEdgesChange?: OnEdgesChange
  onConnect?: OnConnect
  onNodeClick?: NodeMouseHandler
  onNodeDoubleClick?: NodeMouseHandler
  onEdgeContextMenu?: EdgeMouseHandler
  onNodeContextMenu?: NodeMouseHandler
  onReconnect?: (oldEdge: Edge, newConnection: Connection) => void
  defaultEdgeOptions?: DefaultEdgeOptions
  fitView?: boolean
  fitViewOptions?: FitViewOptions
  className?: string
  children?: React.ReactNode
  miniMap?: boolean
  controls?: boolean
  background?: boolean
  highlightedNodeIds?: Set<string>
  onNodeMouseEnter?: NodeMouseHandler
  onNodeMouseLeave?: NodeMouseHandler
}

function CanvasInner({
  nodes, edges, nodeTypes: customNodeTypes, edgeTypes: customEdgeTypes,
  onNodesChange, onEdgesChange, onConnect,
  onNodeClick, onNodeDoubleClick,
  onEdgeContextMenu, onNodeContextMenu,
  onReconnect: externalReconnect,
  defaultEdgeOptions, fitView = true, fitViewOptions, className, children,
  miniMap = true, controls = true, background = true, highlightedNodeIds,
  onNodeMouseEnter, onNodeMouseLeave,
}: DAGFlowCanvasProps) {
  const reactFlowInstance = useReactFlow()
  const reconnectRef = useRef<string | null>(null)

  const onReconnStart = useCallback((_e: React.MouseEvent, edge: Edge) => { reconnectRef.current = edge.id }, [])
  const onReconn = useCallback((oldEdge: Edge, conn: Connection) => {
    if (!conn.source || !conn.target) return
    reconnectRef.current = null
    if (externalReconnect) { externalReconnect(oldEdge, conn); return }
    onEdgesChange?.([{ type: 'remove', id: oldEdge.id }])
    onConnect?.(conn)
  }, [externalReconnect, onEdgesChange, onConnect])
  const onReconnEnd = useCallback((_e: MouseEvent | TouchEvent, edge: Edge) => {
    if (reconnectRef.current === edge.id) onEdgesChange?.([{ type: 'remove', id: edge.id }])
    reconnectRef.current = null
  }, [onEdgesChange])

  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const onEdgeEnter = useCallback((_e: React.MouseEvent, edge: Edge) => setHoveredEdge(edge.id), [])
  const onEdgeLeave = useCallback(() => setHoveredEdge(null), [])

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move' }, [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const t = e.dataTransfer?.getData('application/reactflow')
    if (!t || !onNodesChange) return
    onNodesChange([{ type: 'add', item: { id: generateNodeId(t), type: t, position: reactFlowInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY }), data: { label: t, type: t } } as any }])
  }, [reactFlowInstance, onNodesChange])
  const edgeOptions = useMemo((): DefaultEdgeOptions => ({ type: 'default', ...defaultEdgeOptions }), [defaultEdgeOptions])

  return (
    <ReactFlow
      nodes={nodes.map(n => ({ ...n, type: 'default', data: { ...n.data, _nodeType: n.type }, style: highlightedNodeIds?.has(n.id) ? { ...(n as any).style, boxShadow: '0 0 0 3px #6366f180', borderRadius: 8 } : (n as any).style })) as any}
      deleteKeyCode={null}
      edges={edges.map(e => {
  const isHovered = hoveredEdge === e.id
  return {
    ...e, type: 'default', reconnectable: true, interactionWidth: 20,
    style: {
      stroke: isHovered ? '#818cf8' : '#6366f1',
      strokeWidth: isHovered ? 4 : 2,
      transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
    },
    markerEnd: { type: 'arrowclosed', color: isHovered ? '#818cf8' : '#6366f1' },
  }
}) as any}
      nodeTypes={{ ...defaultNodeTypes, ...customNodeTypes }}
      edgeTypes={{ ...defaultEdgeTypes, ...customEdgeTypes }}
      onNodesChange={onNodesChange as OnNodesChange}
      onEdgesChange={onEdgesChange as OnEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onNodeContextMenu={onNodeContextMenu}
      onEdgeContextMenu={onEdgeContextMenu}
      onReconnect={onReconn}
      onReconnectStart={onReconnStart}
      onReconnectEnd={onReconnEnd}
      defaultEdgeOptions={edgeOptions}
      fitView={fitView}
      fitViewOptions={fitViewOptions || defaultFitViewOptions}
      className={className}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      onEdgeMouseEnter={onEdgeEnter}
      onEdgeMouseLeave={onEdgeLeave}
    >
      {background && <Background variant={BackgroundVariant.Dots} gap={20} size={1} />}
      {controls && <Controls />}
      {miniMap && <MiniMap />}
      {children}
      <style>{`
        .react-flow__node { background: transparent !important; border: none !important; outline: none !important; box-shadow: none !important; padding: 0 !important; border-radius: 10px; overflow: visible !important; }
        .react-flow__node > * { transition: box-shadow 0.15s ease !important; }
        .react-flow__node.selected, .react-flow__node:hover { box-shadow: none !important; outline: none !important; background: transparent !important; border: none !important; }
        .react-flow__node:hover > * { box-shadow: 0 0 0 2px #6366f140, 0 4px 12px rgba(0,0,0,0.08) !important; border-radius: 10px; overflow: visible !important; }
        .react-flow__node.selected > * { box-shadow: 0 0 0 2px #6366f180, 0 4px 12px rgba(0,0,0,0.15) !important; border-radius: 10px; overflow: visible !important; }
        .react-flow__node.selected:hover > * { box-shadow: 0 0 0 2.5px #6366f1b0, 0 4px 16px rgba(0,0,0,0.18) !important; }
        .react-flow__node.selected .opcp-node-delete, .react-flow__node:hover .opcp-node-delete { opacity: 1 !important; }
        .react-flow__edge.selected .react-flow__edge-path { stroke: #f59e0b !important; stroke-width: 4 !important; }
        .react-flow__edge-path { transition: stroke 0.15s ease, stroke-width 0.15s ease !important; }
      `}</style>
    </ReactFlow>
  )
}

export function DAGFlowCanvas(props: DAGFlowCanvasProps) {
  const [edgeMenu, setEdgeMenu] = useState<{ id: string; x: number; y: number } | null>(null)

  // Edge context menu handler — defined OUTSIDE ReactFlowProvider so it works reliably
  const handleEdgeCtx: EdgeMouseHandler = useCallback((e, edge) => {
    e.preventDefault()
    if (props.onEdgeContextMenu) { props.onEdgeContextMenu(e, edge); return }
    setEdgeMenu({ id: edge.id, x: e.clientX, y: e.clientY })
  }, [props.onEdgeContextMenu])

  const delEdge = useCallback(() => {
    if (!edgeMenu) return
    props.onEdgesChange?.([{ type: 'remove', id: edgeMenu.id }])
    setEdgeMenu(null)
  }, [edgeMenu, props.onEdgesChange])

  return (
    <ReactFlowProvider>
      <CanvasInner {...props} onEdgeContextMenu={handleEdgeCtx} />
      {/* Edge context menu — outside ReactFlowProvider */}
      {edgeMenu && createPortal(
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setEdgeMenu(null)} />
          <div style={{ position: 'fixed', top: edgeMenu.y, left: edgeMenu.x, background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 1000, minWidth: 160, padding: '4px 0', overflow: 'hidden' }}>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#ef4444', transition: 'background 0.1s ease' }}
              onClick={delEdge}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ef4444' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 20, flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </span>
              <span style={{ flex: 1, fontSize: 13, lineHeight: '20px' }}>Delete Edge</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </ReactFlowProvider>
  )
}
