/**
 * Model tier selector — selects the appropriate model tier
 * based on task complexity, cost sensitivity, and quality requirements.
 */
export type ModelTier = 'fast' | 'balanced' | 'quality' | 'premium'

export interface TierConfig {
  tier: ModelTier
  model: string
  costPer1KTokens: number
  quality: number // 0-1 score
  speed: number // 0-1 score
}

export interface TaskProfile {
  complexity: 'low' | 'medium' | 'high' | 'critical'
  expectedTokens: number
  requiresReasoning: boolean
  requiresToolUse: boolean
  maxCost?: number
}

export interface TierRecommendation {
  tier: ModelTier
  model: string
  estimatedCost: number
  confidence: number
  reasons: string[]
}

const defaultTiers: TierConfig[] = [
  { tier: 'fast', model: 'gpt-4o-mini', costPer1KTokens: 0.15, quality: 0.6, speed: 0.95 },
  { tier: 'balanced', model: 'gpt-4o', costPer1KTokens: 2.50, quality: 0.85, speed: 0.8 },
  { tier: 'quality', model: 'gpt-4.5-preview', costPer1KTokens: 10.0, quality: 0.95, speed: 0.6 },
  { tier: 'premium', model: 'claude-opus-4', costPer1KTokens: 15.0, quality: 0.98, speed: 0.5 },
]

export class ModelTierSelector {
  private tiers: TierConfig[]

  constructor(tiers?: TierConfig[]) {
    this.tiers = tiers ?? defaultTiers
  }

  /**
   * Recommend a model tier based on the task profile.
   */
  recommend(profile: TaskProfile, budgetRemaining?: number): TierRecommendation {
    const reasons: string[] = []

    // Filter by budget if provided
    let candidates = this.tiers
    if (budgetRemaining !== undefined && profile.expectedTokens > 0) {
      candidates = this.tiers.filter((t) => {
        const estCost = (profile.expectedTokens / 1000) * t.costPer1KTokens
        return estCost <= budgetRemaining
      })
    }

    if (candidates.length === 0) {
      // Budget too tight; use cheapest
      const cheapest = this.tiers.reduce((a, b) =>
        a.costPer1KTokens < b.costPer1KTokens ? a : b,
      )
      reasons.push('Budget constraints forced cheapest tier')
      return {
        tier: cheapest.tier,
        model: cheapest.model,
        estimatedCost: (profile.expectedTokens / 1000) * cheapest.costPer1KTokens,
        confidence: 0.5,
        reasons,
      }
    }

    // Score candidates based on task profile
    const scored = candidates.map((t) => ({
      tier: t,
      score: this.scoreTier(t, profile),
    }))
    scored.sort((a, b) => b.score - a.score)

    const best = scored[0].tier

    if (profile.complexity === 'critical' || profile.requiresReasoning) {
      reasons.push('High complexity or reasoning required')
    }
    if (budgetRemaining !== undefined) {
      reasons.push(`Budget cap applied: $${(budgetRemaining / 1000).toFixed(2)}K remaining`)
    }

    const estimatedCost = (profile.expectedTokens / 1000) * best.costPer1KTokens

    return {
      tier: best.tier,
      model: best.model,
      estimatedCost,
      confidence: scored[0].score / 100,
      reasons,
    }
  }

  /**
   * Get the configuration for a specific tier.
   */
  getTierConfig(tier: ModelTier): TierConfig | undefined {
    return this.tiers.find((t) => t.tier === tier)
  }

  /**
   * Register or update a tier configuration.
   */
  setTierConfig(config: TierConfig): void {
    const idx = this.tiers.findIndex((t) => t.tier === config.tier)
    if (idx >= 0) {
      this.tiers[idx] = config
    } else {
      this.tiers.push(config)
    }
  }

  /**
   * Get all registered tiers.
   */
  getTiers(): TierConfig[] {
    return [...this.tiers]
  }

  private scoreTier(tier: TierConfig, profile: TaskProfile): number {
    let score = 50

    // Quality requirements
    switch (profile.complexity) {
      case 'critical':
        score += tier.quality * 40
        break
      case 'high':
        score += tier.quality * 25
        break
      case 'medium':
        score += tier.quality * 10
        break
      case 'low':
        score += (1 - tier.quality) * 15 // favor cheaper for low complexity
        break
    }

    // Reasoning requirements
    if (profile.requiresReasoning) {
      score += tier.quality * 20
    }

    // Tool use
    if (profile.requiresToolUse) {
      score += tier.quality * 10
    }

    // Cost sensitivity (favor cheaper for large expected tokens)
    if (profile.expectedTokens > 5000) {
      score += (1 - tier.costPer1KTokens / 20) * 15
    }

    return score
  }
}
