import type { NodeTypeDefinition } from '@opcpflow/core'

export const llmCallDefinition: NodeTypeDefinition = {
  type: 'llm_call',
  label: 'LLM Call',
  category: 'ai',
  icon: '\u{1F9E0}',
  color: '#6366f1',
  description: 'Call an LLM. Select a registered model, or choose "Custom..." to configure endpoint and API key manually.',
  defaultData: {
    label: 'LLM Call',
    model: '__custom__',
    temperature: 0.7,
    max_tokens: 2048,
  },
  formGroups: [
    {
      title: 'Input',
      fields: [
        {
          name: 'instructions',
          label: 'Instructions',
          type: 'textarea',
          required: true,
          placeholder: 'Enter the prompt/instructions for the LLM...',
        },
      ],
    },
    {
      title: 'Model',
      fields: [
        {
          name: 'model',
          label: 'Model',
          type: 'select',
          required: true,
          defaultValue: '__custom__',
          dynamicOptions: 'model_registry',
          placeholder: 'Select a model or choose Custom...',
        },
        {
          name: 'temperature',
          label: 'Temperature',
          type: 'number',
          defaultValue: 0.7,
          placeholder: '0.0 - 2.0',
        },
        {
          name: 'max_tokens',
          label: 'Max Tokens',
          type: 'number',
          defaultValue: 2048,
          placeholder: 'Maximum output tokens',
        },
      ],
    },
  ],
  outputFields: [
    { name: 'content', label: 'Content', type: 'string', description: 'LLM response text' },
    { name: 'model', label: 'Model', type: 'string', description: 'Model used' },
    { name: 'usage', label: 'Usage', type: 'object', description: 'Token usage stats' },
  ],
}
