import { useState, useCallback, useRef, useEffect } from 'react'
import { DAGExecutionEngine } from '@opcpflow/core'
import type {
  DAGDocument,
  DAGExecutionReport,
  NodeExecutionState,
  ExecutionOptions,
  PinnedData,
  HandlerRegistry,
} from '@opcpflow/core'

export type ExecutionMode = 'edit' | 'test'

export interface DAGExecutionState {
  status: 'idle' | 'running' | 'completed' | 'aborted'
  nodeStates: Record<string, NodeExecutionState>
  report?: DAGExecutionReport
  startTime?: number
  endTime?: number
}

export interface ExecutionRecord {
  id: string
  timestamp: number
  state: DAGExecutionState
}

export interface UseExecutionReturn {
  mode: ExecutionMode
  execState: DAGExecutionState
  history: ExecutionRecord[]
  pinnedData: Record<string, PinnedData>
  setMode: (mode: ExecutionMode) => void
  runAll: (
    dag: DAGDocument,
    handlers: HandlerRegistry,
    options?: ExecutionOptions,
  ) => Promise<void>
  clear: () => void
  getNodeStatus: (nodeId: string) => NodeExecutionState | undefined
  pinNode: (nodeId: string, output: any) => void
  unpinNode: (nodeId: string) => void
  isNodePinned: (nodeId: string) => boolean
  editPinData: (nodeId: string, output: any) => void
  stepToNext: () => void
  pause: () => void
  resume: () => void
  canStep: boolean
  isPaused: boolean
}

const MAX_RECORDS = 10
const STORAGE_KEY = 'opcpflow_execution_history'
const PINNED_KEY = 'opcpflow_pinned_data'
let recordCounter = 0

function generateRecordId(): string {
  recordCounter++
  return `exec_${recordCounter}_${Date.now()}`
}

export function useExecution(): UseExecutionReturn {
  const [mode, setMode] = useState<ExecutionMode>('edit')
  const [execState, setExecState] = useState<DAGExecutionState>({
    status: 'idle',
    nodeStates: {},
  })
  const [history, setHistory] = useState<ExecutionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      /* ignore */
    }
    return []
  })
  const [pinnedData, setPinnedData] = useState<Record<string, PinnedData>>(() => {
    try {
      const saved = localStorage.getItem(PINNED_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      /* ignore */
    }
    return {}
  })

  const engineRef = useRef<DAGExecutionEngine>(new DAGExecutionEngine())
  const abortRef = useRef<AbortController | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const stepResolveRef = useRef<(() => void) | null>(null)
  const pauseAfterCurrentRef = useRef(false)

  const runAll = useCallback(
    async (
      dag: DAGDocument,
      handlers: HandlerRegistry,
      options?: ExecutionOptions,
    ): Promise<void> => {
      // Abort any previous run
      if (abortRef.current) {
        abortRef.current.abort()
      }
      abortRef.current = new AbortController()

      const startTime = Date.now()

      // Set running state
      const initialState: DAGExecutionState = {
        status: 'running',
        nodeStates: {},
        startTime,
      }
      setExecState(initialState)

      try {
        const report = await engineRef.current.execute(dag, handlers, {
          ...options,
          pinnedData: { ...pinnedData, ...options?.pinnedData },
          onNodeStatusChange: (nodeId: string, status: string, detail?: any) => {
            setExecState((prev) => ({
              ...prev,
              nodeStates: {
                ...prev.nodeStates,
                [nodeId]: {
                  status: status as NodeExecutionState['status'],
                  ...(detail || {}),
                },
              },
            }))
          },
          onLevelComplete: async (levelIdx: number, totalLevels: number) => {
            // Call the original onLevelComplete if provided
            await options?.onLevelComplete?.(levelIdx, totalLevels)

            // If paused or stepping, wait for user signal
            if (pauseAfterCurrentRef.current || stepResolveRef.current) {
              await new Promise<void>((resolve) => {
                stepResolveRef.current = resolve
              })
              stepResolveRef.current = null
              setIsPaused(false)
            }
          },
        })

        const endTime = Date.now()
        const completedState: DAGExecutionState = {
          status: 'completed',
          nodeStates: report.nodes,
          report,
          startTime,
          endTime,
        }
        setExecState(completedState)

        // Save to history
        const record: ExecutionRecord = {
          id: generateRecordId(),
          timestamp: Date.now(),
          state: completedState,
        }
        setHistory((prev) => {
          const next = [record, ...prev]
          const sliced = next.slice(0, MAX_RECORDS)
          try {
            const toStore = sliced.map((r) => ({
              id: r.id,
              timestamp: r.timestamp,
              state: r.state,
            }))
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
          } catch {
            /* ignore quota errors */
          }
          return sliced
        })
      } catch (err) {
        const endTime = Date.now()
        const abortedState: DAGExecutionState = {
          status: 'aborted',
          nodeStates: {},
          startTime,
          endTime,
        }
        setExecState(abortedState)
      }
    },
    [pinnedData],
  )

  const clear = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setExecState({
      status: 'idle',
      nodeStates: {},
    })
  }, [])

  const getNodeStatus = useCallback(
    (nodeId: string): NodeExecutionState | undefined => {
      return execState.nodeStates[nodeId]
    },
    [execState.nodeStates],
  )

  const pinNode = useCallback((nodeId: string, output: any) => {
    setPinnedData((prev) => ({
      ...prev,
      [nodeId]: { output, pinnedAt: Date.now() },
    }))
  }, [])

  const unpinNode = useCallback((nodeId: string) => {
    setPinnedData((prev) => {
      const next = { ...prev }
      delete next[nodeId]
      return next
    })
  }, [])

  const isNodePinned = useCallback(
    (nodeId: string): boolean => {
      return nodeId in pinnedData
    },
    [pinnedData],
  )

  const editPinData = useCallback((nodeId: string, output: any) => {
    setPinnedData((prev) => {
      const existing = prev[nodeId]
      if (!existing) return prev
      return {
        ...prev,
        [nodeId]: { ...existing, output, pinnedAt: Date.now() },
      }
    })
  }, [])

  const stepToNext = useCallback(() => {
    stepResolveRef.current?.()
    setIsPaused(false)
  }, [])

  const pause = useCallback(() => {
    pauseAfterCurrentRef.current = true
    setIsPaused(true)
  }, [])

  const resume = useCallback(() => {
    pauseAfterCurrentRef.current = false
    stepResolveRef.current?.()
    setIsPaused(false)
  }, [])

  // Persist pinnedData to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedData))
    } catch {
      /* ignore quota errors */
    }
  }, [pinnedData])

  const canStep = isPaused && stepResolveRef.current !== null

  return {
    mode,
    execState,
    history,
    pinnedData,
    setMode,
    runAll,
    clear,
    getNodeStatus,
    pinNode,
    unpinNode,
    isNodePinned,
    editPinData,
    stepToNext,
    pause,
    resume,
    canStep,
    isPaused,
  }
}
