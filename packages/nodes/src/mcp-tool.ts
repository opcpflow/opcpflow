import type { NodeTypeDefinition } from '@opcpflow/core'

export const mcpToolDefinition: NodeTypeDefinition = {
  type: 'mcp_tool',
  label: 'MCP Tool',
  category: 'integration',
  icon: '\u{1F527}',
  color: '#06b6d4',
  description: 'Call an MCP (Model Context Protocol) tool for accessing external capabilities.',
  defaultData: {
    label: 'MCP Tool',
  },
  formGroups: [
    {
      title: 'Tool',
      fields: [
        {
          name: 'tool_name',
          label: 'Tool Name',
          type: 'text',
          required: true,
          placeholder: 'e.g. web_search, web_fetch, database_query, video_compose...',
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
          label: 'Parameters',
          type: 'json',
          placeholder: '{"key": "value"}',
        },
      ],
    },
  ],
  outputFields: [
    { name: 'result', label: 'Result', type: 'any', description: 'MCP tool execution result' },
  ],
}
