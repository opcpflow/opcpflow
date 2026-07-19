/**
 * Budget controller for token usage management.
 *
 * Tracks token consumption across DAG execution and enforces
 * configurable limits with multiple budget strategies.
 */
export type BudgetStrategy = 'hard' | 'soft' | 'adaptive'

export interface BudgetConfig {
  maxTokens: number
  strategy: BudgetStrategy
  warningThreshold?: number // percentage (0-100) at which to warn
  adaptiveFactor?: number // multiplier for adaptive strategy
}

export interface BudgetStatus {
  used: number
  limit: number
  remaining: number
  percentage: number
  isExhausted: boolean
  isWarning: boolean
  strategy: BudgetStrategy
}

export class BudgetController {
  private config: BudgetConfig
  private used = 0
  private warned = false

  constructor(config: BudgetConfig) {
    this.config = {
      warningThreshold: 80,
      adaptiveFactor: 1.5,
      ...config,
    }
  }

  /**
   * Request token allocation. Returns true if allowed, false if denied.
   */
  request(tokens: number): boolean {
    if (tokens <= 0) return true

    switch (this.config.strategy) {
      case 'hard':
        return this.hardAllocate(tokens)
      case 'soft':
        return this.softAllocate(tokens)
      case 'adaptive':
        return this.adaptiveAllocate(tokens)
      default:
        return this.hardAllocate(tokens)
    }
  }

  /**
   * Record token usage after execution.
   */
  record(tokens: number): void {
    this.used += tokens

    if (!this.warned && this.config.warningThreshold !== undefined) {
      const pct = this.getPercentage()
      if (pct >= this.config.warningThreshold) {
        this.warned = true
      }
    }
  }

  /**
   * Get current budget status.
   */
  getStatus(): BudgetStatus {
    return {
      used: this.used,
      limit: this.config.maxTokens,
      remaining: Math.max(0, this.config.maxTokens - this.used),
      percentage: this.getPercentage(),
      isExhausted: this.used >= this.config.maxTokens,
      isWarning: this.warned,
      strategy: this.config.strategy,
    }
  }

  /**
   * Check if the budget is exhausted.
   */
  isExhausted(): boolean {
    return this.used >= this.config.maxTokens
  }

  /**
   * Reset the budget counter.
   */
  reset(): void {
    this.used = 0
    this.warned = false
  }

  /**
   * Update the budget configuration.
   */
  updateConfig(config: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...config }
  }

  getRemaining(): number {
    return Math.max(0, this.config.maxTokens - this.used)
  }

  getUsed(): number {
    return this.used
  }

  // ---- allocation strategies ----

  private hardAllocate(tokens: number): boolean {
    return this.used + tokens <= this.config.maxTokens
  }

  private softAllocate(tokens: number): boolean {
    // Soft: allow overshoot up to 20%
    const softLimit = this.config.maxTokens * 1.2
    return this.used + tokens <= softLimit
  }

  private adaptiveAllocate(tokens: number): boolean {
    // Adaptive: multiply remaining budget by adaptive factor
    const remaining = this.config.maxTokens - this.used
    const effectiveRemaining = remaining * (this.config.adaptiveFactor ?? 1.5)
    return tokens <= effectiveRemaining
  }

  private getPercentage(): number {
    if (this.config.maxTokens <= 0) return 100
    return (this.used / this.config.maxTokens) * 100
  }
}
