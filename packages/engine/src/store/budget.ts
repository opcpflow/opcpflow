export interface BudgetLimit {
  maxTokens: number
  maxCost?: number
  maxNodes?: number
}

export interface NodeCost {
  nodeId: string
  tokens: number
  cost?: number
}

/**
 * Budget tracker for token/cost management during DAG execution.
 */
export class BudgetTracker {
  private limit: BudgetLimit
  private nodeCosts: NodeCost[] = []
  private totalTokens = 0
  private totalCost = 0
  private exhausted = false

  constructor(limit: BudgetLimit) {
    this.limit = limit
  }

  record(nodeId: string, tokens: number, cost?: number): boolean {
    if (this.exhausted) return false

    this.totalTokens += tokens
    if (cost !== undefined) this.totalCost += cost

    this.nodeCosts.push({ nodeId, tokens, cost })

    // Check limits
    if (this.totalTokens > this.limit.maxTokens) {
      this.exhausted = true
      return false
    }
    if (this.limit.maxCost !== undefined && this.totalCost > this.limit.maxCost) {
      this.exhausted = true
      return false
    }
    if (this.limit.maxNodes !== undefined && this.nodeCosts.length > this.limit.maxNodes) {
      this.exhausted = true
      return false
    }

    return true
  }

  canProceed(): boolean {
    return !this.exhausted
  }

  getTotalTokens(): number {
    return this.totalTokens
  }

  getTotalCost(): number {
    return this.totalCost
  }

  getNodeCount(): number {
    return this.nodeCosts.length
  }

  getNodeCosts(): readonly NodeCost[] {
    return this.nodeCosts
  }

  getLimit(): BudgetLimit {
    return { ...this.limit }
  }

  getRemainingTokens(): number {
    return Math.max(0, this.limit.maxTokens - this.totalTokens)
  }

  isExhausted(): boolean {
    return this.exhausted
  }

  reset(): void {
    this.nodeCosts = []
    this.totalTokens = 0
    this.totalCost = 0
    this.exhausted = false
  }
}
