import type { NodeTypeDefinition } from '@opcpflow/core'

export const mergeDefinition: NodeTypeDefinition = {
  type: 'merge',
  label: 'Merge',
  category: 'integration',
  icon: '🔗',
  color: '#8b5cf6',
  description: 'Assemble multi-type assets into a final deliverable via MCP/API/LLM pipelines.',
  defaultData: {
    label: 'Merge',
    output_format: 'mixed',
    pipeline: 'llm',
  },
  formGroups: [
    {
      title: 'Composition',
      fields: [
        {
          name: 'instructions',
          label: 'Assembly Instructions',
          type: 'textarea',
          required: true,
          placeholder: 'Describe how to compose the final output from upstream assets...',
        },
        {
          name: 'output_format',
          label: 'Output Format',
          type: 'select',
          required: true,
          defaultValue: 'mixed',
          options: [
            { label: 'Video', value: 'video' },
            { label: 'Audio', value: 'audio' },
            { label: 'Image', value: 'image' },
            { label: 'Document', value: 'document' },
            { label: 'Mixed Media', value: 'mixed' },
            { label: 'JSON Data', value: 'json' },
          ],
        },
        {
          name: 'pipeline',
          label: 'Pipeline',
          type: 'select',
          required: true,
          defaultValue: 'llm',
          options: [
            { label: 'LLM — content/text assembly', value: 'llm' },
            { label: 'MCP Tool — media composition', value: 'mcp' },
            { label: 'API Call — rendering/transcoding', value: 'api' },
          ],
        },
      ],
    },
    {
      title: 'MCP Pipeline Config',
      description: 'Required when pipeline=mcp: media composition tool',
      showIf: { field: 'pipeline', eq: 'mcp' },
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        {
          name: 'tool_name',
          label: 'MCP Tool Name',
          type: 'text',
          required: true,
          placeholder: 'e.g. video_compose, audio_mix, subtitle_burn...',
        },
        {
          name: 'api_endpoint',
          label: 'MCP Server Endpoint',
          type: 'text',
          required: true,
          placeholder: 'http://localhost:8080/mcp',
        },
        {
          name: 'parameters',
          label: 'Tool Parameters',
          type: 'json',
          placeholder: '{"quality": "high", "transition": "fade"}',
        },
      ],
    },
    {
      title: 'API Pipeline Config',
      description: 'Required when pipeline=api: rendering/transcoding service',
      showIf: { field: 'pipeline', eq: 'api' },
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        {
          name: 'merge_api_endpoint',
          label: 'API Endpoint',
          type: 'text',
          required: true,
          placeholder: 'https://api.render-service.com/render',
        },
        {
          name: 'merge_method',
          label: 'HTTP Method',
          type: 'select',
          defaultValue: 'POST',
          options: [
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
          ],
        },
        {
          name: 'merge_headers',
          label: 'Headers',
          type: 'json',
          placeholder: '{"Authorization": "Bearer <token>"}',
        },
      ],
    },
    {
      title: 'LLM Pipeline Config',
      description: 'Required when pipeline=llm: language model for content assembly',
      showIf: { field: 'pipeline', eq: 'llm' },
      collapsible: true,
      defaultCollapsed: true,
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
      ],
    },
  ],
  outputFields: [
    { name: 'merged', label: 'Merged Output', type: 'object', description: 'Composited final deliverable' },
    { name: 'sources', label: 'Sources', type: 'array', description: 'Source node IDs assembled' },
    { name: 'format', label: 'Format', type: 'string', description: 'Output format' },
    { name: 'pipeline_used', label: 'Pipeline Used', type: 'string', description: 'Which pipeline was used' },
    { name: 'composition_log', label: 'Log', type: 'array', description: 'Step-by-step composition log' },
  ],
}
