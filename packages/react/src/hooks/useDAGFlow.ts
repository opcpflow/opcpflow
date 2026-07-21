import { useState, useCallback, useMemo } from 'react'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react'
import type { DAGNode, DAGEdge, DAGDocument } from '@opcpflow/core'

let globalIdCounter = 0

export function generateNodeId(type: string): string {
  globalIdCounter++
  return `${type}_${globalIdCounter}_${Date.now()}`
}

export function generateEdgeId(source: string, target: string): string {
  return `edge_${source}_${target}`
}

export interface UseDAGFlowReturn {
  nodes: DAGNode[]
  edges: DAGEdge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  addNode: (type: string, data?: Record<string, unknown>, position?: { x: number; y: number }) => DAGNode
  removeNode: (id: string) => void
  addEdge: (source: string, target: string, edgeType?: 'execution' | 'data-flow') => DAGEdge | null
  removeEdge: (id: string) => void
  reconnectEdge: (oldEdgeId: string, newSource: string, newTarget: string) => void
  connect: OnConnect
  getDoc: () => DAGDocument
  /** Replace all nodes with a new array (used to sync external edits) */
  updateNodes: (nodes: DAGNode[]) => void
  clear: () => void
  selectedNode: DAGNode | null
  selectNode: (id: string | null) => void
  reset: (doc: DAGDocument) => void
  toDocument: () => DAGDocument
}

export function useDAGFlow(
  initialNodes: DAGNode[] = [],
  initialEdges: DAGEdge[] = [],
): UseDAGFlowReturn {
  const [nodes, setNodes] = useState<DAGNode[]>(initialNodes)
  const [edges, setEdges] = useState<DAGEdge[]>(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const onNodesChange = useCallback<OnNodesChange>(
    (changes: NodeChange[]) => {
      setNodes((nds) =>
        applyNodeChanges(changes, nds as any) as DAGNode[],
      )
    },
    [],
  )

  const onEdgesChange = useCallback<OnEdgesChange>(
    (changes: EdgeChange[]) => {
      setEdges((eds) =>
        applyEdgeChanges(changes, eds as any) as DAGEdge[],
      )
    },
    [],
  )

  const addNode = useCallback(
    (
      type: string,
      data?: Record<string, unknown>,
      position?: { x: number; y: number },
    ): DAGNode => {
      const id = generateNodeId(type)
      const newNode: DAGNode = {
        id,
        type,
        position: position || { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
        data: {
          label: type,
          execution_mode: 'pipeline',
          ...(data || {}),
        },
      }
      setNodes((nds) => [...nds, newNode])
      return newNode
    },
    [],
  )

  const removeNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    setSelectedNodeId((prev) => (prev === id ? null : prev))
  }, [])

  const addEdge = useCallback(
    (source: string, target: string, edgeType: 'execution' | 'data-flow' = 'execution'): DAGEdge | null => {
      if (!source || !target) return null
      const id = generateEdgeId(source, target)
      const newEdge: DAGEdge = {
        id,
        source,
        target,
        type: edgeType,
      }
      setEdges((eds) => [...eds, newEdge])
      return newEdge
    },
    [],
  )

  const removeEdge = useCallback((id: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== id))
  }, [])

  const reconnectEdge = useCallback(
    (oldEdgeId: string, newSource: string, newTarget: string) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === oldEdgeId ? { ...e, source: newSource, target: newTarget } : e,
        ),
      )
    },
    [],
  )

  const connect = useCallback<OnConnect>(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const newEdge: DAGEdge = {
        id: generateEdgeId(connection.source, connection.target),
        source: connection.source,
        target: connection.target,
        type: 'execution',
      }
      setEdges((eds) => [...eds, newEdge])
    },
    [],
  )

  const updateNodes = useCallback((updated: DAGNode[]) => {
    if (updated.length === 0) return
    setNodes(updated)
  }, [])

  const getDoc = useCallback((): DAGDocument => {
    return {
      nodes,
      edges,
      metadata: {
        name: 'untitled',
        version: 1,
        status: 'draft',
      },
    }
  }, [nodes, edges])

  const toDocument = useCallback((): DAGDocument => {
    return {
      nodes,
      edges,
      metadata: {
        name: '',
        version: 1,
      },
    }
  }, [nodes, edges])

  const clear = useCallback(() => {
    setNodes([])
    setEdges([])
    setSelectedNodeId(null)
  }, [])

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id)
  }, [])

  const reset = useCallback(
    (doc: DAGDocument) => {
      setNodes(doc.nodes || [])
      setEdges(doc.edges || [])
      setSelectedNodeId(null)
    },
    [],
  )

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  )

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    reconnectEdge,
    connect,
    getDoc,
    clear,
    selectedNode,
    selectNode,
    toDocument,
    reset,
    updateNodes,
  }
}
