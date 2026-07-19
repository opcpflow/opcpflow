import { ExecutionHandler, type DAGExecutionReport } from '../../types/execution'
import type { DAGNode, DAGEdge, DAGDocument } from '../../types/dag-node'
import { ModelRegistry } from '../model-registry'

// ── Trigger ──
export const TriggerHandler: ExecutionHandler = async (input, ctx) => {
  const startTime = Date.now()
  return {
    output: {
      event: input.command || input.event || input.instructions || '',
      triggered_at: new Date().toISOString(),
    },
    metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
  }
}

// ── Dynamic ──
export const DynamicHandler: ExecutionHandler = async (input, ctx) => {
  const startTime = Date.now()
  const subTaskCommand = input.command || input.instructions || ''
  const rules = input.instructions || 'Execute the sub-task using available tools'
  const maxInstances = input.max_instances || 5

  // Resolve LLM config: node form > ModelRegistry
  const modelName = input.model || 'GPT-4o'
  const modelConfig = ModelRegistry.get(modelName)
  const endpoint = input.api_endpoint || modelConfig?.endpoint || ''
  const apiKey = input.api_key || (modelConfig ? ModelRegistry.getProviderKey(modelConfig.provider) : '') || ''

  ctx.reportStage('generating sub-DAG...')

  const subNodes: DAGNode[] = [
    {
      id: `${ctx.nodeId}_trigger`,
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: { command: subTaskCommand },
    },
    {
      id: `${ctx.nodeId}_llm`,
      type: 'llm_call',
      position: { x: 200, y: 0 },
      data: {
        instructions: subTaskCommand,
        model: modelName,
        api_endpoint: endpoint,
        api_key: apiKey,
      },
    },
    {
      id: `${ctx.nodeId}_output`,
      type: 'output',
      position: { x: 400, y: 0 },
      data: { format: 'auto' },
    },
  ]
  const subEdges: DAGEdge[] = [
    { id: `${ctx.nodeId}_e1`, source: `${ctx.nodeId}_trigger`, target: `${ctx.nodeId}_llm`, type: 'execution' },
    { id: `${ctx.nodeId}_e2`, source: `${ctx.nodeId}_llm`, target: `${ctx.nodeId}_output`, type: 'execution' },
  ]

  const subDAG: DAGDocument = {
    nodes: subNodes,
    edges: subEdges,
    metadata: { name: `dynamic-${ctx.nodeId}`, version: 1 },
  }

  let subResult: DAGExecutionReport | null = null
  if (ctx.subDAGExecutor) {
    ctx.reportStage('executing sub-DAG...')
    try {
      subResult = await ctx.subDAGExecutor(subDAG)
    } catch (err) {
      ctx.reportStage(`sub-DAG execution failed: ${(err as Error).message}`)
      return {
        output: null,
        error: `sub-DAG execution failed: ${(err as Error).message}`,
        metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
      }
    }
  }

  // Extract actual output from sub-DAG's llm_call node
  let subOutput: unknown = null
  if (subResult) {
    const llmNodeId = `${ctx.nodeId}_llm`
    const outputNodeId = `${ctx.nodeId}_output`
    const llmState = subResult.nodes[llmNodeId]
    const outputState = subResult.nodes[outputNodeId]
    subOutput = outputState?.result?.output || llmState?.result?.output || null
  }

  return {
    output: {
      results: [{
        command: subTaskCommand,
        status: subResult ? 'sub_dag_executed' : 'dynamic_fallback',
        sub_dag_status: subResult?.status,
        content: subOutput,              // ← 子 DAG 的真正产出
        generated_at: new Date().toISOString(),
      }],
      instance_count: 1,
      sub_dags: [{
        type: 'dynamic_generated',
        root_instruction: rules,
        node_count: subNodes.length,
        nodes: ['trigger', 'llm_call', 'output'],
      }],
    },
    metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
  }
}

// ── Task Decompose ──
// Splits a command into sub-tasks. Supports two modes:
//   1. LLM mode (recommended): calls LLM with decomposition rules to produce structured sub-tasks
//   2. Rule-based fallback: returns the instructions as a single sub-task
// When model + api_endpoint are configured, uses LLM; otherwise falls back to rules.
export const TaskDecomposeHandler: ExecutionHandler = async (input, ctx) => {
  const startTime = Date.now()
  const command = (typeof ctx.inputs.__command__ === 'string'
    ? ctx.inputs.__command__
    : ctx.inputs.__command__?.result?.output?.event) || input.command || input.instructions || ''
  const instructions = input.instructions || ''

  // Resolve model/endpoint/key: node form > ModelRegistry
  const modelName = input.model || ''
  const modelConfig = ModelRegistry.get(modelName)
  const endpoint = input.api_endpoint || modelConfig?.endpoint || ''
  const apiKey = input.api_key || (modelConfig ? ModelRegistry.getProviderKey(modelConfig.provider) : '') || ''

  let subTasks: { id: string; label: string; command: string; instructions: string }[]
  let method = 'rule_based'

  if (modelName && endpoint) {
    // LLM-based decomposition
    ctx.reportStage('decomposing with LLM...')
    try {
      const prompt = [
        `Decompose the task below into parallel sub-tasks. Rules: ${instructions}`,
        ``,
        `Task: ${command}`,
        ``,
        `- If the task is simple and needs no decomposition, return a SINGLE sub-task with the original instructions.`,
        `- If the task has multiple distinct aspects, split it into separate sub-tasks.`,
        ``,
        `Respond with a JSON array of objects, each with "id", "label", and "instructions" fields.`,
        `Example: [{"id": "copy", "label": "Copywriting", "instructions": "Write 3 versions..."}]`,
        `Output ONLY the JSON array, no other text.`,
      ].join('\n')

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)

      const text = data.choices?.[0]?.message?.content || data
      const parsed = JSON.parse(text.trim().replace(/^```json\s*|```$/g, '').trim())
      if (Array.isArray(parsed) && parsed.length > 0) {
        subTasks = parsed.map((st: any, i: number) => ({
          id: st.id || `sub_${i}`,
          label: st.label || `Sub-task ${i + 1}`,
          command,
          instructions: st.instructions || instructions,
        }))
        method = 'llm'
        ctx.reportStage(`decomposed into ${subTasks.length} sub-tasks`)
      } else {
        throw new Error('LLM did not return a valid task array')
      }
    } catch (err) {
      ctx.reportStage(`LLM decomposition failed: ${(err as Error).message}`)
      return {
        output: null,
        error: `LLM decomposition failed: ${(err as Error).message}`,
        metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
      }
    }
  } else {
    // Rule-based fallback: return as single sub-task
    subTasks = [{ id: 'default', label: instructions || command, command, instructions }]
  }

  return {
    output: {
      sub_tasks: subTasks,
      count: subTasks.length,
      method,
    },
    metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
  }
}

// ── Merge (Asset Composition) ──
// Three explicit composition pipelines (user selects which one to use):
//
//   LLM (default) — content/text/data assembly via language model
//     Config: model + api_endpoint
//     Example: "Combine copy + data + strategy into a marketing report"
//
//   MCP  — media composition tools (video/audio/image processing)
//     Config: tool_name + api_endpoint + parameters
//     Example: video_compose({clips, audio_track, subtitles}) → rendered MP4
//
//   API  — external rendering/transcoding service
//     Config: merge_api_endpoint + method + headers
//     Example: POST /render {assets, format} → download URL
//
// Assets come from ALL upstream nodes automatically via ctx.inputs.
// Merge semantically distinguishes upstream inputs:
//   - knowledge nodes → Assembly Guide (how to compose)
//   - strategy nodes  → Composition Rules (persona, rules, guidelines, hooks)
//   - all other nodes → source assets to be composed
export const MergeHandler: ExecutionHandler = async (input, ctx) => {
  const startTime = Date.now()
  const upstreamKeys = Object.keys(ctx.inputs).filter(k => k !== '__command__')

  // Semantically classify upstream inputs
  const knowledgeParts: string[] = []
  const strategyParts: string[] = []
  const assetList: { source: string; type: string; summary: string }[] = []

  for (const key of upstreamKeys) {
    const val = ctx.inputs[key]
    if (val === null || val === undefined) {
      assetList.push({ source: key, type: 'null', summary: '' })
      continue
    }
    if (typeof val !== 'object') {
      assetList.push({ source: key, type: typeof val, summary: String(val).substring(0, 80) })
      continue
    }
    const obj = val as Record<string, unknown>

    // ── Knowledge node detection ──
    if (obj.results || obj.inline_content || obj.assembled) {
      const parts: string[] = []
      if (obj.inline_content) parts.push(String(obj.inline_content))
      if (Array.isArray(obj.results)) {
        parts.push(obj.results.map((r: unknown) =>
          typeof r === 'string' ? r : JSON.stringify(r)
        ).join('\n'))
      }
      const text = parts.join('\n\n')
      if (text) knowledgeParts.push(`[${key}]\n${text}`)
      continue
    }

    // ── Strategy node detection (including hooks) ──
    if (obj.persona || obj.rules || obj.guidelines || obj.pre_hooks || obj.post_hooks) {
      const parts: string[] = []
      if (obj.persona) parts.push(`Persona: ${obj.persona}`)
      if (obj.rules) parts.push(`Rules: ${obj.rules}`)
      if (obj.guidelines) parts.push(`Guidelines: ${obj.guidelines}`)
      if (obj.pre_hooks) parts.push(`Pre-Hooks: ${obj.pre_hooks}`)
      if (obj.post_hooks) parts.push(`Post-Hooks: ${obj.post_hooks}`)
      strategyParts.push(`[${key}]\n${parts.join('\n')}`)
      continue
    }

    // ── Other upstream assets (agent outputs, dynamic, verification results) ──
    let summary = ''
    // dynamic node: results[0].content
    if (Array.isArray(obj.results) && obj.results.length > 0) {
      const first = obj.results[0] as Record<string, unknown>
      summary = typeof first.content === 'string'
        ? first.content.substring(0, 200)
        : typeof first.content === 'object'
          ? JSON.stringify(first.content).substring(0, 200)
          : JSON.stringify(first).substring(0, 200)
    } else if (obj.content) {
      summary = typeof obj.content === 'string' ? obj.content.substring(0, 200) : JSON.stringify(obj.content).substring(0, 200)
    } else if (obj.merged) {
      summary = `merged: ${Object.keys(obj.merged as object).join(', ')}`
    } else if (obj.verified !== undefined) {
      summary = `verified=${obj.verified}, score=${obj.score}`
    } else {
      summary = Object.keys(obj).join(', ')
    }
    assetList.push({ source: key, type: typeof val, summary })
  }

  const outputFormat = input.output_format || input.format || 'mixed'
  const pipeline = input.pipeline || 'llm'
  const compositionLog: string[] = []
  let merged: unknown = upstreamKeys.reduce((acc, k) => {
    (acc as Record<string, unknown>)[k] = ctx.inputs[k]
    return acc
  }, {} as Record<string, unknown>)

  compositionLog.push(`[${new Date().toISOString()}] Pipeline: ${pipeline}, assets: ${upstreamKeys.length}, format: ${outputFormat}`)
  if (knowledgeParts.length > 0) compositionLog.push(`[${new Date().toISOString()}] Assembly guide sources: ${knowledgeParts.length}`)
  if (strategyParts.length > 0) compositionLog.push(`[${new Date().toISOString()}] Composition rules sources: ${strategyParts.length}`)

  // ── Build structured context for all pipelines ──
  const guidanceSection = knowledgeParts.length > 0
    ? `[Assembly Guide]\n${knowledgeParts.join('\n\n')}`
    : ''
  const rulesSection = strategyParts.length > 0
    ? `[Composition Rules]\n${strategyParts.join('\n\n')}`
    : ''
  const assetsSection = assetList.length > 0
    ? `[Source Assets]\n${assetList.map(a => `[${a.source}] (${a.type}): ${a.summary}`).join('\n')}`
    : ''
  const instructionsSection = input.instructions
    ? `[Instructions]\n${input.instructions}`
    : ''
  const structuredContext = [guidanceSection, rulesSection, assetsSection, instructionsSection]
    .filter(Boolean)
    .join('\n\n')

  if (pipeline === 'mcp' && input.tool_name) {
    ctx.reportStage('calling MCP composition tool...')
    try {
      const endpoint = input.api_endpoint
      if (!endpoint) throw new Error('MCP endpoint not configured')
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: input.tool_name,
          parameters: {
            knowledge: knowledgeParts,
            strategy: strategyParts,
            assets: assetList,
            context: structuredContext,
            instructions: input.instructions || '',
            format: outputFormat,
            ...(input.parameters ? JSON.parse(typeof input.parameters === 'string' ? input.parameters : '{}') : {}),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
      merged = data.result || data.data || data
      compositionLog.push(`[${new Date().toISOString()}] MCP composition: OK`)
    } catch (err) {
      compositionLog.push(`[${new Date().toISOString()}] MCP failed: ${(err as Error).message}`)
    }
  } else if (pipeline === 'api' && input.merge_api_endpoint) {
    ctx.reportStage('calling composition API...')
    try {
      const res = await fetch(input.merge_api_endpoint, {
        method: input.merge_method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(input.merge_headers ? JSON.parse(typeof input.merge_headers === 'string' ? input.merge_headers : '{}') : {}),
        },
        body: JSON.stringify({
          knowledge: knowledgeParts,
          strategy: strategyParts,
          assets: assetList,
          context: structuredContext,
          instructions: input.instructions || '',
          format: outputFormat,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
      merged = data.result || data.data || data
      compositionLog.push(`[${new Date().toISOString()}] API composition: OK`)
    } catch (err) {
      compositionLog.push(`[${new Date().toISOString()}] API failed: ${(err as Error).message}`)
    }
  } else {
    // LLM pipeline (default): structured composition via language model
    ctx.reportStage('composing with LLM...')
    try {
      const modelName = input.model || ''
      const modelConfig = ModelRegistry.get(modelName)
      const endpoint = input.api_endpoint || modelConfig?.endpoint || ''
      const apiKey = input.api_key || (modelConfig ? ModelRegistry.getProviderKey(modelConfig.provider) : '') || ''
      if (endpoint && modelName) {
        const prompt = `Compose the following into a ${outputFormat} deliverable.\n\n${structuredContext}\n\nOutput format: ${outputFormat}`
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          merged = data.choices?.[0]?.message?.content || data
          compositionLog.push(`[${new Date().toISOString()}] LLM composition: OK`)
        } else {
          throw new Error(data.error?.message || `HTTP ${res.status}`)
        }
      } else {
        compositionLog.push(`[${new Date().toISOString()}] LLM: missing model or api_endpoint`)
      }
    } catch (err) {
      compositionLog.push(`[${new Date().toISOString()}] LLM failed: ${(err as Error).message}`)
    }
  }

  return {
    output: {
      merged,
      sources: upstreamKeys,
      format: outputFormat,
      pipeline_used: pipeline,
      asset_count: upstreamKeys.length,
      composition_log: compositionLog,
    },
    metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
  }
}

// ── Output ──
export const OutputHandler: ExecutionHandler = async (input, ctx) => {
  const startTime = Date.now()
  const expectedFormat = input.format || 'auto'

  // Validate output type matches upstream merge node's output format
  if (expectedFormat !== 'auto') {
    for (const [key, value] of Object.entries(ctx.inputs)) {
      if (value && typeof value === 'object') {
        const upstream = value as Record<string, unknown>
        const upstreamFormat = upstream.format || (upstream as any).output_format
        if (upstreamFormat && upstreamFormat !== expectedFormat) {
          return {
            output: null,
            error: `Output type mismatch: upstream "${key}" produced "${upstreamFormat}" but Output node expects "${expectedFormat}". Check the merge node's Output Format setting.`,
            metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
          }
        }
      }
    }
  }

  return {
    output: { ...ctx.inputs, ...input },
    metrics: { startTime, endTime: Date.now(), durationMs: Date.now() - startTime },
  }
}
