import type { NodeTypeDefinition } from '@opcpflow/core'

export const apiCallDefinition: NodeTypeDefinition = {
  type: 'api_call',
  label: 'API Call',
  category: 'integration',
  icon: '\u{1F310}',
  color: '#f59e0b',
  description: 'Make an HTTP request to an external REST API endpoint.',
  defaultData: {
    label: 'API Call',
    method: 'GET',
  },
  formGroups: [
    {
      title: 'Request',
      fields: [
        {
          name: 'url',
          label: 'URL',
          type: 'text',
          required: true,
          placeholder: 'https://api.example.com/endpoint',
        },
        {
          name: 'method',
          label: 'Method',
          type: 'select',
          required: true,
          defaultValue: 'GET',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'DELETE', value: 'DELETE' },
            { label: 'PATCH', value: 'PATCH' },
          ],
        },
        {
          name: 'headers',
          label: 'Headers',
          type: 'json',
          placeholder: '{"Authorization": "Bearer {{token}}", "Content-Type": "application/json"}',
        },
        {
          name: 'body',
          label: 'Body',
          type: 'textarea',
          placeholder: 'Request body (JSON, form-encoded, or raw text)...',
        },
      ],
    },
  ],
  outputFields: [
    { name: 'data', label: 'Response Data', type: 'object', description: 'API response body' },
    { name: 'status', label: 'Status Code', type: 'number', description: 'HTTP status code' },
  ],
}
