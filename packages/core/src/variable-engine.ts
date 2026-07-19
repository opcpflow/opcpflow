import type { DAGNode, DAGEdge } from './types/dag-node'

export interface VariableRef {
  raw: string
  source: string
  path?: string
}

const REF_PATTERN = /\{\{(\$?\w+(?:\.\w+)*)\}\}/g

export function parseRefs(template: string): VariableRef[] {
  const refs: VariableRef[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(REF_PATTERN.source, 'g')
  while ((match = re.exec(template)) !== null) {
    const parts = match[1].split('.')
    refs.push({
      raw: match[0],
      source: parts[0],
      path: parts.slice(1).join('.') || undefined,
    })
  }
  return refs
}

export function collectAvailableVars(nodes: DAGNode[], edges: DAGEdge[]): Map<string, string[]> {
  const vars = new Map<string, string[]>()
  for (const node of nodes) {
    const key = node.data.output_key
    if (key) {
      vars.set(node.id, [key])
    }
    if (node.data.config?.output_keys && Array.isArray(node.data.config.output_keys)) {
      const existing = vars.get(node.id) || []
      vars.set(node.id, [...existing, ...node.data.config.output_keys])
    }
  }
  return vars
}

export function resolveVariables(
  template: string,
  context: Map<string, unknown>,
  availableVars: Map<string, string[]>,
): string {
  return template.replace(REF_PATTERN, (raw, ref: string) => {
    const parts = ref.split('.')
    const source = parts[0]
    const path = parts.slice(1).join('.')

    if (source.startsWith('$')) {
      const key = source.slice(1)
      const val = context.get(`__${key}__`)
      if (val !== undefined) {
        return resolveNested(val, path)
      }
    }

    if (context.has(ref)) {
      return String(context.get(ref))
    }

    return raw
  })
}

function resolveNested(obj: unknown, path: string): string {
  if (!path) return String(obj)
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return String(obj)
    }
  }
  return String(current ?? '')
}
