import { NodeRegistry, type NodeTypeDefinition } from '@opcpflow/core'
import { triggerDefinition } from './trigger'
import { llmCallDefinition } from './llm-call'
import { apiCallDefinition } from './api-call'
import { knowledgeDefinition } from './knowledge'
import { verificationDefinition } from './verification'
import { outputDefinition } from './output'
import { mcpToolDefinition } from './mcp-tool'
import { taskDecomposeDefinition } from './task-decompose'
import { dynamicDefinition } from './dynamic'
import { strategyDefinition } from './strategy'
import { mergeDefinition } from './merge'

export const nodeDefinitions: NodeTypeDefinition[] = [
  triggerDefinition,
  taskDecomposeDefinition,
  dynamicDefinition,
  llmCallDefinition,
  apiCallDefinition,
  mcpToolDefinition,
  knowledgeDefinition,
  strategyDefinition,
  verificationDefinition,
  mergeDefinition,
  outputDefinition,
]

export function createDefaultRegistry(): NodeRegistry {
  const registry = new NodeRegistry()
  registry.registerMany(nodeDefinitions)
  return registry
}
