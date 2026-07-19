import type { DAGDocument } from '../../types/dag-node'
import type {
  DAGExecutionReport,
  NodeExecutionState,
} from '../../types/execution'

/**
 * A single execution run wrapped for analysis.
 */
export interface ExecutionRecord {
  state: DAGExecutionReport
}

/**
 * A suggestion to evolve a node from one D4 maturity level to the next.
 *
 * Levels:
 *   1 — pipeline (linear, deterministic)
 *   2 — dispatch  (load-balanced across executors)
 *   3 — dynamic   (sub-DAG resolved at runtime)
 *   4 — adaptive  (self-modifying based on history)
 */
export interface D4Suggestion {
  fromLevel: 1 | 2 | 3
  toLevel: 2 | 3 | 4
  nodeId: string
  confidence: number
  reason: string
  action: string
}

interface NodeStats {
  totalExecutions: number
  passed: number
  failed: number
  skipped: number
  totalDuration: number
  durations: number[]
}

/**
 * Analyzes DAG execution history and suggests D4 maturity evolution for nodes.
 *
 * Rules:
 * - L1->L2: pipeline node skipped >60% of the time over >=3 runs
 * - L2->L3: dispatch node passed >85% of the time over >=5 runs
 * - Duration anomaly: any node averaging 5x longer than peers gets flagged
 */
export class D4EvolutionAnalyzer {
  /**
   * Analyze execution history and return ranked evolution suggestions.
   * Returns empty array if fewer than 2 records are provided.
   */
  analyze(history: ExecutionRecord[], dag: DAGDocument): D4Suggestion[] {
    const suggestions: D4Suggestion[] = []
    if (history.length < 2) return suggestions

    const nodeStats = this.collectNodeStats(history, dag)

    for (const [nodeId, stats] of Object.entries(nodeStats)) {
      const node = dag.nodes.find((n) => n.id === nodeId)
      if (!node) continue
      const mode = node.data.execution_mode || 'pipeline'

      // L1->L2: pipeline node with high skip rate
      if (mode === 'pipeline' && stats.totalExecutions >= 3) {
        const skipRate = stats.skipped / stats.totalExecutions
        if (skipRate > 0.6) {
          suggestions.push({
            fromLevel: 1,
            toLevel: 2,
            nodeId,
            confidence: Math.min(skipRate, 0.95),
            reason: `Skipped ${stats.skipped}/${stats.totalExecutions} times (${Math.round(skipRate * 100)}%)`,
            action: 'Try switching execution_mode to "dispatch"',
          })
        }
      }

      // L2->L3: dispatch node with stable patterns
      if (mode === 'dispatch' && stats.totalExecutions >= 5) {
        const passRate = stats.passed / stats.totalExecutions
        if (passRate > 0.85) {
          suggestions.push({
            fromLevel: 2,
            toLevel: 3,
            nodeId,
            confidence: Math.min(passRate, 0.9),
            reason: `Passed ${stats.passed}/${stats.totalExecutions} times (${Math.round(passRate * 100)}%)`,
            action: 'Consider switching execution_mode to "dynamic" with a sub-DAG',
          })
        }
      }

      // Duration anomaly: any mode
      if (stats.totalExecutions >= 3) {
        const avgDuration = stats.totalDuration / stats.totalExecutions
        const otherDurations = Object.entries(nodeStats)
          .filter(([id]) => id !== nodeId)
          .flatMap(([, s]) => s.durations)
        if (otherDurations.length > 0) {
          const otherAvg =
            otherDurations.reduce((a, b) => a + b, 0) / otherDurations.length
          if (avgDuration > otherAvg * 5 && otherAvg > 0) {
            suggestions.push({
              fromLevel: 1,
              toLevel: 2,
              nodeId,
              confidence: 0.7,
              reason: `Avg ${Math.round(avgDuration)}ms — ${Math.round(avgDuration / otherAvg)}x other nodes`,
              action:
                'Check configuration or consider dispatch mode for load balancing',
            })
          }
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private collectNodeStats(
    history: ExecutionRecord[],
    dag: DAGDocument,
  ): Record<string, NodeStats> {
    const stats: Record<string, NodeStats> = {}
    for (const n of dag.nodes) {
      stats[n.id] = {
        totalExecutions: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        totalDuration: 0,
        durations: [],
      }
    }

    for (const record of history) {
      const state = record.state
      if (state.status !== 'completed') continue

      for (const [nodeId, nodeState] of Object.entries(state.nodes)) {
        if (!stats[nodeId]) continue
        stats[nodeId].totalExecutions++

        switch (nodeState.status) {
          case 'passed':
            stats[nodeId].passed++
            break
          case 'failed':
            stats[nodeId].failed++
            break
          case 'skipped':
            stats[nodeId].skipped++
            break
        }

        if (nodeState.result?.metrics?.durationMs) {
          stats[nodeId].totalDuration += nodeState.result.metrics.durationMs
          stats[nodeId].durations.push(nodeState.result.metrics.durationMs)
        }
      }
    }

    return stats
  }
}
