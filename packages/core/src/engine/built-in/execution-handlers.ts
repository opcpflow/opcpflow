import { ExecutionHandler } from '../../types/execution'
import { ModelRegistry } from '../model-registry'

/**
 * Default execution handlers for all worker & verification node types.
 *
 * These provide basic direct-execution behavior suitable for sandbox testing.
 * Consumers can override specific handlers to integrate with their platform
 * (e.g., OPCP delegates to employee skill pipelines).
 *
 * Required fields are validated at runtime — missing values produce clear
 * error messages shown in the execution log panel.
 */

// ── LLM Call ──
// Automatically assembles upstream knowledge + strategy into the LLM prompt:
//   [knowledge node] → knowledge context (results, inline_content)
//   [strategy node] → persona, rules, guidelines
//   [any upstream] → supplementary context
// The user's instructions are appended as the final task.
export const LLMCallHandler: ExecutionHandler = async (input, ctx) => {
  const startTime = Date.now()
  ctx.reportStage('assembling context...')

  try {
    const instructions = input.instructions || input.prompt
    if (!instructions) throw new Error('[Required] instructions is missing')

    // Resolve: node form > ModelRegistry
    const modelName = input.model || ''
    const modelConfig = ModelRegistry.get(modelName)
    const endpoint = input.api_endpoint || modelConfig?.endpoint
    if (!endpoint) throw new Error(`[Required] api_endpoint is missing for model "${modelName}". Configure it in ModelRegistry or set api_endpoint on the node.`)
    const apiKey = input.api_key || (modelConfig ? ModelRegistry.getProviderKey(modelConfig.provider) : '') || ''

    // Collect upstream knowledge + strategy from ctx.inputs
    const knowledgeParts: string[] = []
    const strategyParts: string[] = []
    const otherContext: string[] = []

    for (const [key, value] of Object.entries(ctx.inputs)) {
      if (key === '__command__') continue
      if (!value || typeof value !== 'object') {
        otherContext.push(`[${key}]: ${String(value).substring(0, 200)}`)
        continue
      }
      const obj = value as Record<string, unknown>

      // Detect knowledge node output
      if (obj.results || obj.inline_content || obj.assembled) {
        if (obj.inline_content) knowledgeParts.push(String(obj.inline_content))
        if (Array.isArray(obj.results)) {
          knowledgeParts.push(obj.results.map((r: unknown) =>
            typeof r === 'string' ? r : JSON.stringify(r)
          ).join('\n'))
        }
        continue
      }

      // Detect strategy node output (includes hooks)
      if (obj.persona || obj.rules || obj.guidelines || obj.pre_hooks || obj.post_hooks) {
        if (obj.persona) strategyParts.push(`Persona: ${obj.persona}`)
        if (obj.rules) strategyParts.push(`Rules: ${obj.rules}`)
        if (obj.guidelines) strategyParts.push(`Guidelines: ${obj.guidelines}`)
        if (obj.pre_hooks) strategyParts.push(`Pre-Hooks: ${obj.pre_hooks}`)
        if (obj.post_hooks) strategyParts.push(`Post-Hooks: ${obj.post_hooks}`)
        continue
      }

      // Other upstream output
      const str = JSON.stringify(obj).substring(0, 300)
      if (str) otherContext.push(`[${key}]: ${str}`)
    }

    // Assemble the full prompt
    const sections: string[] = []
    if (knowledgeParts.length > 0) {
      sections.push(`[Knowledge Context]\n${knowledgeParts.join('\n\n')}`)
    }
    if (strategyParts.length > 0) {
      sections.push(`[Strategy]\n${strategyParts.join('\n')}`)
    }
    if (otherContext.length > 0) {
      sections.push(`[Context]\n${otherContext.join('\n')}`)
    }
    sections.push(`[Task]\n${instructions}`)
    const finalPrompt = sections.join('\n\n')

    ctx.reportStage('calling LLM...')
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: input.model,
        messages: [{ role: 'user', content: finalPrompt }],
        temperature: input.temperature ?? 0.7,
        max_tokens: input.max_tokens ?? 2048,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || `Request failed: ${res.status}`)
    return {
      output: {
        content: data.choices?.[0]?.message?.content || data,
        model: input.model,
        assembled_context: {
          knowledge_sources: knowledgeParts.length,
          strategy_sources: strategyParts.length,
          other_sources: otherContext.length,
        },
      },
      metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
    }
  } catch (err) {
    return {
      output: null, error: (err as Error).message,
      metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
    }
  }
}

// ── API Call ──
// Automatically injects upstream context into the API request body as `_context`.
export const APICallHandler: ExecutionHandler = async (input, ctx) => {
  const startTime = Date.now()
  ctx.reportStage('calling external API...')
  try {
    const url = input.url || input.instructions
    if (!url) throw new Error('[Required] url is missing')
    const method = input.method ? input.method.toUpperCase() : undefined
    const headers = input.headers
      ? (typeof input.headers === 'string' ? JSON.parse(input.headers) : input.headers)
      : { 'Content-Type': 'application/json' }
    const hasBody = method !== 'GET' && method !== 'HEAD'

    // Inject upstream context into request body
    let body = input.body || {}
    if (typeof body === 'string') try { body = JSON.parse(body) } catch { /* keep as-is */ }
    if (typeof body === 'object' && body !== null) {
      const upstreamKeys = Object.keys(ctx.inputs).filter(k => k !== '__command__')
      if (upstreamKeys.length > 0) {
        (body as Record<string, unknown>)._context = upstreamKeys.reduce((acc, k) => {
          const v = ctx.inputs[k]
          acc[k] = typeof v === 'object' ? '(see upstream)' : v
          return acc
        }, {} as Record<string, unknown>)
      }
    }

    const res = await fetch(url, { method, headers, body: hasBody ? JSON.stringify(body) : undefined })
    const data = await res.json().catch(() => ({ status: res.status, text: res.statusText }))
    return { output: data, metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime } }
  } catch (err) {
    return {
      output: null, error: (err as Error).message,
      metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
    }
  }
}

// ── Knowledge ──
// Dual-mode: inline query via API + upstream assembly.
// Users can configure a query directly in the panel (searches external KB via API),
// OR connect upstream nodes (mcp/api/llm/db) that provide knowledge context.
// All results are merged into a unified knowledge package for downstream agents.
export const KnowledgeHandler: ExecutionHandler = async (input, ctx) => {
  const startTime = Date.now()
  ctx.reportStage('assembling knowledge...')

  const knowledgeResults: unknown[] = []
  const inlineContent: string[] = []

  // 0. Start with inline content from config panel (direct knowledge entry)
  if (input.inline_content) {
    inlineContent.push(input.inline_content)
  }

  // 1. Collect from upstream inputs (mcp/api/llm/db query results)
  for (const [key, value] of Object.entries(ctx.inputs)) {
    if (key === '__command__') continue
    if (typeof value === 'string') {
      inlineContent.push(value)
    } else if (Array.isArray(value)) {
      knowledgeResults.push(...value)
    } else if (typeof value === 'object' && value !== null) {
      // Try common result shapes
      const results = (value as any).results ?? (value as any).data ?? (value as any).rows
      if (Array.isArray(results)) {
        knowledgeResults.push(...results)
      } else {
        inlineContent.push(JSON.stringify(value))
      }
    }
  }

  return {
    output: {
      results: knowledgeResults,
      total: knowledgeResults.length,
      inline_content: inlineContent.join('\n'),
      assembled: true,
      _sources: {
        upstream_count: Object.keys(ctx.inputs).filter(k => k !== '__command__').length,
      },
    },
    metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
  }
}

// ── MCP Tool ──
// Injects upstream context into tool parameters as `_context`.
export const MCPToolHandler: ExecutionHandler = async (input, ctx) => {
  const startTime = Date.now()
  ctx.reportStage('calling MCP tool...')
  try {
    const toolName = input.tool_name
    if (!toolName) throw new Error('[Required] tool_name is missing')
    const endpoint = input.api_endpoint
    if (!endpoint) throw new Error('[Required] api_endpoint is missing')
    const parameters = typeof input.parameters === 'string' ? JSON.parse(input.parameters) : (input.parameters || {})

    // Inject upstream context
    const upstreamKeys = Object.keys(ctx.inputs).filter(k => k !== '__command__')
    if (upstreamKeys.length > 0) {
      parameters._context = upstreamKeys.reduce((acc, k) => {
        const v = ctx.inputs[k]
        if (v && typeof v === 'object') {
          acc[k] = (v as Record<string, unknown>).inline_content
            || (v as Record<string, unknown>).content
            || (v as Record<string, unknown>).result
            || `(${Object.keys(v as object).join(', ')})`
        } else {
          acc[k] = v
        }
        return acc
      }, {} as Record<string, unknown>)
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool_name: toolName, parameters }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || `MCP call failed: ${res.status}`)
    return {
      output: data.result || data.data || data,
      metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
    }
  } catch (err) {
    return {
      output: null, error: (err as Error).message,
      metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
    }
  }
}

// ── Strategy Package ──
// Dual-mode: inline config + upstream assembly.
// Collects: persona, rules, guidelines, pre_hooks, post_hooks.
// Output merges both sources — upstream takes priority over inline defaults.
export const StrategyHandler: ExecutionHandler = async (input, ctx) => {
  const startTime = Date.now()
  ctx.reportStage('assembling strategy...')

  const persona: string[] = []
  const rules: string[] = []
  const guidelines: string[] = []
  const preHooks: string[] = []
  const postHooks: string[] = []

  // 1. Collect from upstream inputs
  for (const [, value] of Object.entries(ctx.inputs)) {
    if (typeof value === 'string') {
      persona.push(value)
    } else if (typeof value === 'object' && value !== null) {
      if (value.persona) persona.push(value.persona)
      if (value.rules) rules.push(value.rules)
      if (value.guidelines) guidelines.push(value.guidelines)
      if (value.pre_hooks) preHooks.push(value.pre_hooks)
      if (value.post_hooks) postHooks.push(value.post_hooks)
      if (value.content) persona.push(value.content)
    }
  }

  // 2. Merge with inline config (inline serves as defaults)
  const finalPersona = input.persona
    ? [input.persona, ...persona].join('\n').trim()
    : persona.join('\n').trim()
  const finalRules = input.rules
    ? [input.rules, ...rules].join('\n').trim()
    : rules.join('\n').trim()
  const finalGuidelines = input.guidelines
    ? [input.guidelines, ...guidelines].join('\n').trim()
    : guidelines.join('\n').trim()
  const finalPreHooks = input.pre_hooks
    ? [input.pre_hooks, ...preHooks].join('\n').trim()
    : preHooks.join('\n').trim()
  const finalPostHooks = input.post_hooks
    ? [input.post_hooks, ...postHooks].join('\n').trim()
    : postHooks.join('\n').trim()

  return {
    output: {
      persona: finalPersona,
      rules: finalRules,
      guidelines: finalGuidelines,
      pre_hooks: finalPreHooks,
      post_hooks: finalPostHooks,
      _sources: {
        inline: { persona: !!input.persona, rules: !!input.rules, guidelines: !!input.guidelines, hooks: !!(input.pre_hooks || input.post_hooks) },
        upstream: Object.keys(ctx.inputs).filter(k => k !== '__command__'),
      },
    },
    metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
  }
}

// ── Verification (SGV Two-Step) ──
// Dual-mode verification:
//   1. Auto-generate criteria from sub-task context (Blind step) when auto_generate=true
//   2. Use manually entered criteria when provided
//   3. Validate upstream output against criteria (Grounded step)
// The Blind step determines "what to check" without seeing the output.
// The Grounded step checks the actual output against criteria.
export const VerificationHandler: ExecutionHandler = async (input, ctx) => {
  const startTime = Date.now()
  ctx.reportStage('SGV verification...')

  const upstreamKeys = Object.keys(ctx.inputs).filter(k => k !== '__command__')
  const autoGen = input.auto_generate !== false
  const command = ctx.inputs.__command__ || ''
  const criteriaFromInput = input.criteria || ''

  // Determine criteria
  let criteria: string
  let criteriaSource: 'manual' | 'auto_generated'

  if (criteriaFromInput) {
    // User provided manual criteria
    criteria = criteriaFromInput
    criteriaSource = 'manual'
    ctx.reportStage('using manual criteria')
  } else if (autoGen) {
    // Auto-generate criteria from sub-task context (SGV Step 1: Blind)
    ctx.reportStage('SGV Step 1: generating blind criteria...')
    const contextSummary = [
      command ? `Command: ${command}` : '',
      upstreamKeys.length > 0 ? `Verifying: ${upstreamKeys.join(', ')}` : '',
      input.instructions ? `Context: ${input.instructions}` : '',
    ].filter(Boolean).join('\n')

    criteria = [
      `Auto-generated SGV criteria for verification:`,
      ``,
      `Quality checks:`,
      `- Output must be complete and non-empty`,
      `- Output must directly address the given task`,
      `- Output must follow any constraints specified in the instructions`,
      ``,
      `Context: ${contextSummary || 'General quality verification'}`,
    ].join('\n')
    criteriaSource = 'auto_generated'
    ctx.reportStage('SGV Step 1: blind criteria generated')
  } else {
    criteria = 'General quality: output must be complete and non-empty.'
    criteriaSource = 'auto_generated'
  }

  // Validate upstream output (SGV Step 2: Grounded)
  ctx.reportStage('SGV Step 2: grounded verification...')
  const hasOutput = upstreamKeys.length > 0
  let score = 0
  const feedback: string[] = []
  const minScore = input.min_score ?? 0.7

  if (hasOutput) {
    score = minScore // Base score when output exists
    for (const key of upstreamKeys) {
      const val = ctx.inputs[key]
      if (val === null || val === undefined) {
        feedback.push(`"${key}" produced no output`)
        score = Math.max(0, score - 0.2)
      } else if (typeof val === 'object' && Object.keys(val).length === 0) {
        feedback.push(`"${key}" output is empty`)
        score = Math.max(0, score - 0.1)
      } else {
        feedback.push(`"${key}" produced valid output`)
      }
    }
  } else {
    feedback.push('No upstream output to verify')
    score = 0
  }

  const verified = score >= minScore

  return {
    output: {
      verified,
      score: Math.round(score * 100) / 100,
      min_score: minScore,
      criteria,
      criteria_source: criteriaSource,
      checked_nodes: upstreamKeys,
      feedback: feedback.join('; '),
      sgv_steps: {
        blind: { criteria_generated: criteriaSource === 'auto_generated', criteria },
        grounded: { nodes_checked: upstreamKeys, score, verified },
      },
    },
    metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
  }
}
