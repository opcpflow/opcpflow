/**
 * Token bill — tracks and bills token usage per DAG execution.
 *
 * Provides detailed breakdowns of token consumption by node,
 * model, and operation type.
 */
export interface BillEntry {
  nodeId: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
  operation: string
  timestamp: number
}

export interface BillSummary {
  totalTokens: number
  totalCost: number
  totalPromptTokens: number
  totalCompletionTokens: number
  nodeCount: number
  modelBreakdown: Record<string, { tokens: number; cost: number; calls: number }>
  entries: BillEntry[]
}

export interface RateCardEntry {
  model: string
  promptRate: number  // per 1K tokens
  completionRate: number  // per 1K tokens
}

const defaultRateCard: RateCardEntry[] = [
  { model: 'gpt-4o-mini', promptRate: 0.15, completionRate: 0.60 },
  { model: 'gpt-4o', promptRate: 2.50, completionRate: 10.00 },
  { model: 'gpt-4.5-preview', promptRate: 10.00, completionRate: 30.00 },
  { model: 'claude-opus-4', promptRate: 15.00, completionRate: 75.00 },
  { model: 'claude-sonnet-4', promptRate: 3.00, completionRate: 15.00 },
  { model: 'claude-haiku-3.5', promptRate: 0.25, completionRate: 1.25 },
]

export class TokenBill {
  private entries: BillEntry[] = []
  private rateCard: Map<string, RateCardEntry>

  constructor(rateCard?: RateCardEntry[]) {
    this.rateCard = new Map()
    const rates = rateCard ?? defaultRateCard
    for (const rate of rates) {
      this.rateCard.set(rate.model, rate)
    }
  }

  /**
   * Add a bill entry for a node execution.
   */
  addEntry(entry: Omit<BillEntry, 'totalTokens' | 'cost' | 'timestamp'>): BillEntry {
    const totalTokens = entry.promptTokens + entry.completionTokens
    const cost = this.calculateCost(entry.model, entry.promptTokens, entry.completionTokens)

    const billEntry: BillEntry = {
      ...entry,
      totalTokens,
      cost,
      timestamp: Date.now(),
    }

    this.entries.push(billEntry)
    return billEntry
  }

  /**
   * Get the full bill summary.
   */
  getSummary(): BillSummary {
    let totalTokens = 0
    let totalCost = 0
    let totalPromptTokens = 0
    let totalCompletionTokens = 0

    const modelBreakdown: Record<string, { tokens: number; cost: number; calls: number }> = {}

    for (const entry of this.entries) {
      totalTokens += entry.totalTokens
      totalCost += entry.cost
      totalPromptTokens += entry.promptTokens
      totalCompletionTokens += entry.completionTokens

      const mb = modelBreakdown[entry.model] ?? { tokens: 0, cost: 0, calls: 0 }
      mb.tokens += entry.totalTokens
      mb.cost += entry.cost
      mb.calls++
      modelBreakdown[entry.model] = mb
    }

    return {
      totalTokens,
      totalCost,
      totalPromptTokens,
      totalCompletionTokens,
      nodeCount: this.entries.length,
      modelBreakdown,
      entries: [...this.entries],
    }
  }

  /**
   * Get all entries for a specific node.
   */
  getNodeEntries(nodeId: string): BillEntry[] {
    return this.entries.filter((e) => e.nodeId === nodeId)
  }

  /**
   * Get all entries for a specific model.
   */
  getModelEntries(model: string): BillEntry[] {
    return this.entries.filter((e) => e.model === model)
  }

  /**
   * Register or update a rate card entry.
   */
  setRate(rate: RateCardEntry): void {
    this.rateCard.set(rate.model, rate)
  }

  /**
   * Get the current rate card.
   */
  getRateCard(): RateCardEntry[] {
    return Array.from(this.rateCard.values())
  }

  /**
   * Estimate cost without recording an entry.
   */
  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    return this.calculateCost(model, promptTokens, completionTokens)
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries = []
  }

  /**
   * Get total entries count.
   */
  getEntryCount(): number {
    return this.entries.length
  }

  private calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const rate = this.rateCard.get(model)
    if (!rate) return 0

    const promptCost = (promptTokens / 1000) * rate.promptRate
    const completionCost = (completionTokens / 1000) * rate.completionRate
    return promptCost + completionCost
  }
}
