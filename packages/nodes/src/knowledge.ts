import type { NodeTypeDefinition } from '@opcpflow/core'

export const knowledgeDefinition: NodeTypeDefinition = {
  type: 'knowledge',
  label: 'Knowledge',
  category: 'ai',
  icon: '\u{1F50D}',
  color: '#8b5cf6',
  description: 'Assemble knowledge for agents. Type knowledge directly, or receive from upstream nodes (mcp/api/llm/db). All sources merge into a unified knowledge package.',
  defaultData: {
    label: 'Knowledge',
  },
  formGroups: [
    {
      title: 'Direct Input',
      description: 'Type knowledge directly, or connect upstream nodes (mcp/api/llm/db) to assemble automatically',
      fields: [
        {
          name: 'inline_content',
          label: 'Direct Knowledge Input',
          type: 'textarea',
          placeholder: 'Type or paste knowledge content directly... Can be supplemented by upstream node data.',
        },
      ],
    },
  ],
  outputFields: [
    { name: 'results', label: 'Results', type: 'array', description: 'Search result items' },
    { name: 'total', label: 'Total', type: 'number', description: 'Total result count' },
    { name: 'inline_content', label: 'Inline Content', type: 'string', description: 'Directly entered knowledge text' },
    { name: 'assembled', label: 'Assembled', type: 'boolean', description: 'Whether knowledge was assembled from multiple sources' },
  ],
}
