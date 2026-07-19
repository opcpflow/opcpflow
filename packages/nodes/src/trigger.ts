import type { NodeTypeDefinition } from '@opcpflow/core'

export const triggerDefinition: NodeTypeDefinition = {
  type: 'trigger',
  label: 'Trigger',
  category: 'control',
  icon: '▶',
  color: '#10b981',
  description: 'DAG execution start point. A DAG must have exactly one trigger node.',
  defaultData: {
    label: 'Trigger',
    instructions: 'Start execution',
  },
  formGroups: [
    {
      title: 'Input',
      fields: [
        {
          name: 'command',
          label: 'Command',
          type: 'textarea',
          required: true,
          placeholder: 'e.g. Generate 3 marketing copy for spring campaign',
        },
      ],
    },
  ],
  outputFields: [
    { name: 'event', label: 'Event', type: 'string', description: 'The trigger command text' },
    { name: 'triggered_at', label: 'Triggered At', type: 'string', description: 'ISO timestamp of trigger' },
  ],
}
