import type { ExecutorSelector } from '../../types/execution'

/**
 * Default ExecutorSelector that picks a random handler from matching candidates.
 *
 * Matching strategy:
 * 1. Filter handlers by requiredSkill (if provided) or nodeType
 * 2. Also include any handler named 'default'
 * 3. If no candidates match, fall back to the first available handler
 */
export class RandomExecutorSelector implements ExecutorSelector {
  select(params: {
    requiredSkill?: string
    nodeId: string
    nodeType: string
    allHandlers: string[]
    context: { reportStage: (s: string) => void }
  }): { selected: string; candidates: string[]; strategy: string } {
    const { requiredSkill, nodeType, allHandlers } = params

    // Filter handlers matching the required skill or node type
    const matchField = requiredSkill || nodeType
    const candidates = allHandlers.filter(
      (h) => h === matchField || h === nodeType || h === 'default',
    )

    if (candidates.length === 0) {
      return {
        selected: allHandlers[0] || nodeType,
        candidates: [],
        strategy: 'fallback',
      }
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)]
    return { selected, candidates, strategy: 'random' }
  }
}
