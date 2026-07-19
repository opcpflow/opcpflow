import type { NodeTypeDefinition } from '@opcpflow/core'

// A custom "sentiment-analysis" node type
export const sentimentNodeDefinition: NodeTypeDefinition = {
  type: 'sentiment-analysis',
  label: 'Sentiment Analysis',
  category: 'ai',
  color: '#f43f5e',
  defaultData: {
    model: 'default',
    output_key: 'sentiment',
  },
  formFields: [
    { name: 'instructions', label: 'Analysis Instructions', type: 'textarea' },
    { name: 'model', label: 'Model', type: 'select', options: [
      { label: 'Default', value: 'default' },
      { label: 'Precise', value: 'precise' },
    ]},
    { name: 'output_key', label: 'Output Key', type: 'text' },
  ],
  description: 'Analyzes text sentiment (positive/negative/neutral)',
}
