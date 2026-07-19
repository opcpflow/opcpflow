import type { NodeTypeDefinition } from '@opcpflow/core'

export const strategyDefinition: NodeTypeDefinition = {
  type: 'strategy',
  label: 'Strategy Package',
  category: 'ai',
  icon: '📋',
  color: '#14b8a6',
  description: 'Assemble strategy for agents: persona, rules, guidelines, and hooks (pre/post execution callbacks). Dual-mode: inline entry or upstream assembly.',
  defaultData: {
    label: 'Strategy Package',
  },
  formGroups: [
    {
      title: 'Persona',
      fields: [
        {
          name: 'persona',
          label: 'Persona',
          type: 'textarea',
          required: true,
          placeholder: 'Define the agent persona: who they are, their background, expertise...',
        },
      ],
    },
    {
      title: 'Rules',
      fields: [
        {
          name: 'rules',
          label: 'Rules & Constraints',
          type: 'textarea',
          placeholder: 'Hard rules the agent must follow... e.g. "Always output in Chinese", "Never make up data"',
        },
      ],
    },
    {
      title: 'Guidelines',
      fields: [
        {
          name: 'guidelines',
          label: 'Guidelines',
          type: 'textarea',
          placeholder: 'Behavioral guidelines: tone, style, quality standards...',
        },
      ],
    },
    {
      title: 'Hooks',
      description: 'Pre-hooks run before agent execution, post-hooks run after. Can include validation, logging, notifications.',
      collapsible: true,
      fields: [
        {
          name: 'pre_hooks',
          label: 'Pre-Hooks',
          type: 'textarea',
          placeholder: 'Actions before execution... e.g. "Check budget before calling LLM", "Validate input format"',
        },
        {
          name: 'post_hooks',
          label: 'Post-Hooks',
          type: 'textarea',
          placeholder: 'Actions after execution... e.g. "Log output to audit", "Send notification on failure"',
        },
      ],
    },
  ],
  outputFields: [
    { name: 'persona', label: 'Persona', type: 'string', description: 'Agent persona definition' },
    { name: 'rules', label: 'Rules', type: 'string', description: 'Hard rules and constraints' },
    { name: 'guidelines', label: 'Guidelines', type: 'string', description: 'Behavioral guidelines' },
    { name: 'pre_hooks', label: 'Pre-Hooks', type: 'string', description: 'Pre-execution callbacks' },
    { name: 'post_hooks', label: 'Post-Hooks', type: 'string', description: 'Post-execution callbacks' },
  ],
}
