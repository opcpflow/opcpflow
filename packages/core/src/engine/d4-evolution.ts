/**
 * D4 Evolution Hook — connects DAG execution to the evolution pipeline.
 *
 * D4 Model:
 *   L1 Static    → User draws complete DAG, all nodes pre-defined
 *   L2 Semi-dynamic → Static nodes + dynamic node for unmatched sub-tasks
 *   L3 Dynamic   → task_decompose + dynamic only, no static branches
 *   L4 Evolution → Frequently used dynamic paths auto-promoted to static
 *
 * This hook listens to DAG completion events and:
 * 1. Detects frequently executed dynamic node patterns
 * 2. Tracks execution metrics (duration, token cost, quality)
 * 3. Generates evolution suggestions (promote dynamic → static)
 */

import type { DAGExecutionReport, NodeExecutionState } from '../types/execution'

export interface EvolutionRecord {
  dagId: string
  timestamp: number
  totalNodes: number
  dynamicNodes: number
  staticNodes: number
  durationMs: number
  nodeTypes: Record<string, number>
  failedNodes: string[]
  suggestions: EvolutionSuggestion[]
}

export interface EvolutionSuggestion {
  type: 'promote_dynamic' | 'optimize_bottleneck' | 'add_verification' | 'merge_pattern'
  nodeId?: string
  confidence: number
  reason: string
  suggestion: string
}

/**
 * D4 Evolution Engine — analyzes execution patterns and generates
 * suggestions for workflow evolution.
 */
export class D4EvolutionHook {
  private history: EvolutionRecord[] = []
  private maxHistory = 100
  private dynamicPatterns = new Map<string, number>() // pattern → count
  private nodeDurationHistories = new Map<string, number[]>() // nodeId → durations

  /**
   * Process a DAG execution report and generate evolution insights.
   * Call this from onDAGComplete callback.
   */
  analyze(dagId: string, report: DAGExecutionReport & { storeSnapshot?: Record<string, unknown> }): EvolutionRecord {
    const nodeStates = Object.values(report.nodes)
    const nodeTypes = this.collectNodeTypes(report.nodes)
    const dynamicNodeEntries = Object.entries(report.nodes).filter(
      ([, s]) => s.result?.output?.sub_dags,
    )

    const record: EvolutionRecord = {
      dagId,
      timestamp: Date.now(),
      totalNodes: nodeStates.length,
      dynamicNodes: dynamicNodeEntries.length,
      staticNodes: nodeStates.length - dynamicNodeEntries.length,
      durationMs: report.endTime - report.startTime,
      nodeTypes,
      failedNodes: Object.entries(report.nodes)
        .filter(([, s]) => s.status === 'failed')
        .map(([id]) => id),
      suggestions: [],
    }

    // Track dynamic node pattern frequencies
    for (const [nodeId] of dynamicNodeEntries) {
      const count = (this.dynamicPatterns.get(nodeId) ?? 0) + 1
      this.dynamicPatterns.set(nodeId, count)

      // Suggest promotion when a dynamic node has been used frequently
      if (count >= 3) {
        record.suggestions.push({
          type: 'promote_dynamic',
          nodeId,
          confidence: Math.min(0.5 + count * 0.1, 0.95),
          reason: `Dynamic node "${nodeId}" executed ${count} times`,
          suggestion: `Consider adding a static node for "${nodeId}" — this pattern is recurring`,
        })
      }
    }

    // Track node durations for bottleneck detection
    for (const [nodeId, state] of Object.entries(report.nodes)) {
      const duration = state.result?.metrics?.durationMs
      if (duration && duration > 0) {
        const history = this.nodeDurationHistories.get(nodeId) ?? []
        history.push(duration)
        if (history.length > 20) history.shift()
        this.nodeDurationHistories.set(nodeId, history)

        // Detect bottlenecks: average duration significantly above median
        if (history.length >= 3) {
          const avg = history.reduce((a, b) => a + b, 0) / history.length
          const allDurations = Array.from(this.nodeDurationHistories.values()).flat()
          if (allDurations.length > 0) {
            const median = this.median(allDurations)
            if (avg > median * 3 && avg > 2000) {
              record.suggestions.push({
                type: 'optimize_bottleneck',
                nodeId,
                confidence: 0.6,
                reason: `Node "${nodeId}" avg ${(avg / 1000).toFixed(1)}s vs median ${(median / 1000).toFixed(1)}s`,
                suggestion: 'Consider model optimization or parallelization',
              })
            }
          }
        }
      }
    }

    // Track execution history
    this.history.push(record)
    if (this.history.length > this.maxHistory) this.history.shift()

    return record
  }

  /** Get all evolution records for analysis */
  getHistory(): EvolutionRecord[] {
    return [...this.history]
  }

  /** Get dynamic pattern frequencies */
  getDynamicPatterns(): Map<string, number> {
    return new Map(this.dynamicPatterns)
  }

  /** Reset all tracking data */
  reset(): void {
    this.history = []
    this.dynamicPatterns.clear()
    this.nodeDurationHistories.clear()
  }

  private collectNodeTypes(nodes: Record<string, NodeExecutionState>): Record<string, number> {
    const types: Record<string, number> = {}
    for (const [, state] of Object.entries(nodes)) {
      const type = (state.result?.output as any)?.type || 'unknown'
      types[type] = (types[type] ?? 0) + 1
    }
    return types
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }
}
