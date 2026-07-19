import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { DAGDocument, DAGNode, DAGEdge, Metadata, NodeRegistry } from '@opcpflow/core'

export interface OpcpFlowContextValue {
  doc: DAGDocument
  registry: NodeRegistry
  selectedNodeId: string | null
  onUpdateNodes: (nodes: DAGNode[]) => void
  onUpdateEdges: (edges: DAGEdge[]) => void
  onSelectNode: (id: string | null) => void
  onSave: (nodes: DAGNode[], edges: DAGEdge[], metadata: Metadata) => void
}

const OpcpFlowContext = createContext<OpcpFlowContextValue | null>(null)

export interface OpcpFlowProviderProps {
  doc: DAGDocument
  registry: NodeRegistry
  children: ReactNode
  onSave?: (nodes: DAGNode[], edges: DAGEdge[], metadata: Metadata) => void
  onDocChange?: (doc: DAGDocument) => void
}

export function OpcpFlowProvider({
  doc: initialDoc,
  registry,
  children,
  onSave: externalOnSave,
  onDocChange,
}: OpcpFlowProviderProps) {
  const [doc, setDoc] = useState<DAGDocument>(initialDoc)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const onUpdateNodes = useCallback(
    (nodes: DAGNode[]) => {
      setDoc((prev) => {
        const next = { ...prev, nodes }
        onDocChange?.(next)
        return next
      })
    },
    [onDocChange],
  )

  const onUpdateEdges = useCallback(
    (edges: DAGEdge[]) => {
      setDoc((prev) => {
        const next = { ...prev, edges }
        onDocChange?.(next)
        return next
      })
    },
    [onDocChange],
  )

  const onSelectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id)
  }, [])

  const onSave = useCallback(
    (nodes: DAGNode[], edges: DAGEdge[], metadata: Metadata) => {
      externalOnSave?.(nodes, edges, metadata)
    },
    [externalOnSave],
  )

  const value: OpcpFlowContextValue = {
    doc,
    registry,
    selectedNodeId,
    onUpdateNodes,
    onUpdateEdges,
    onSelectNode,
    onSave,
  }

  return <OpcpFlowContext.Provider value={value}>{children}</OpcpFlowContext.Provider>
}

export function useOpcpFlow(): OpcpFlowContextValue {
  const ctx = useContext(OpcpFlowContext)
  if (!ctx) {
    throw new Error('useOpcpFlow must be used within an OpcpFlowProvider')
  }
  return ctx
}
