import type { DAGNode, DAGEdge, NodeResult } from '@opcpflow/core'
import type { NodeStatus } from '../types'

export interface RecordedExecution {
  dagExecId: string
  startTime: number
  endTime?: number
  nodes: DAGNode[]
  edges: DAGEdge[]
  nodeStates: RecordedNodeState[]
  status?: string
  error?: string
}

export interface RecordedNodeState {
  nodeId: string
  status: NodeStatus
  attempt: number
  timestamp: number
  output?: unknown
  error?: string
}

/**
 * Execution recorder — captures full DAG execution history.
 *
 * Records all state transitions and supports exporting
 * execution reports for analysis and debugging.
 */
export class ExecutionRecorder {
  private executions = new Map<string, RecordedExecution>()

  /**
   * Record the start of a DAG execution.
   */
  recordStart(dagExecId: string, nodes: DAGNode[], edges: DAGEdge[]): void {
    this.executions.set(dagExecId, {
      dagExecId,
      startTime: Date.now(),
      nodes,
      edges,
      nodeStates: [],
    })
  }

  /**
   * Record a node state transition.
   */
  recordNodeState(
    nodeId: string,
    status: NodeStatus,
    attempt: number,
    output?: unknown,
    error?: string,
  ): void {
    for (const [, exec] of this.executions) {
      exec.nodeStates.push({
        nodeId,
        status,
        attempt,
        timestamp: Date.now(),
        output,
        error,
      })
    }
  }

  /**
   * Record the completion of a DAG execution.
   */
  recordComplete(dagExecId: string, status: string, error?: string): void {
    const exec = this.executions.get(dagExecId)
    if (exec) {
      exec.endTime = Date.now()
      exec.status = status
      exec.error = error
    }
  }

  /**
   * Get a recorded execution by ID.
   */
  getExecution(dagExecId: string): RecordedExecution | undefined {
    return this.executions.get(dagExecId)
  }

  /**
   * Get all recorded executions.
   */
  getAllExecutions(): RecordedExecution[] {
    return Array.from(this.executions.values())
  }

  /**
   * Build a NodeResult[] report from a recorded execution.
   */
  buildReport(dagExecId: string): NodeResult[] {
    const exec = this.executions.get(dagExecId)
    if (!exec) return []

    // Group node states by nodeId and take the last one
    const lastStates = new Map<string, RecordedNodeState>()
    for (const state of exec.nodeStates) {
      lastStates.set(state.nodeId, state)
    }

    const results: NodeResult[] = []
    for (const node of exec.nodes) {
      const state = lastStates.get(node.id)
      if (!state) continue

      results.push({
        nodeID: state.nodeId,
        status: this.toReportStatus(state.status),
        output: state.output,
        error: state.error,
        retryCount: state.attempt > 0 ? state.attempt - 1 : 0,
      })
    }

    return results
  }

  /**
   * Get the timeline of state transitions for a node.
   */
  getNodeTimeline(dagExecId: string, nodeId: string): RecordedNodeState[] {
    const exec = this.executions.get(dagExecId)
    if (!exec) return []
    return exec.nodeStates.filter((s) => s.nodeId === nodeId)
  }

  /**
   * Get the execution duration in milliseconds.
   */
  getDuration(dagExecId: string): number | undefined {
    const exec = this.executions.get(dagExecId)
    if (!exec || !exec.endTime) return undefined
    return exec.endTime - exec.startTime
  }

  /**
   * Export all executions as JSON-compatible data.
   */
  export(): Record<string, unknown> {
    const data: Record<string, unknown> = {}
    for (const [id, exec] of this.executions) {
      data[id] = {
        startTime: exec.startTime,
        endTime: exec.endTime,
        nodeCount: exec.nodes.length,
        edgeCount: exec.edges.length,
        stateCount: exec.nodeStates.length,
        status: exec.status,
        error: exec.error,
      }
    }
    return { executions: data }
  }

  /**
   * Clear recorded data.
   */
  clear(): void {
    this.executions.clear()
  }

  private toReportStatus(status: NodeStatus): 'pending' | 'running' | 'completed' | 'failed' | 'skipped' {
    switch (status) {
      case 'ready':
      case 'blocked':
        return 'pending'
      default:
        return status
    }
  }
}
