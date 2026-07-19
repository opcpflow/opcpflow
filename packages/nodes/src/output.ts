import type { NodeTypeDefinition } from '@opcpflow/core'

export const outputDefinition: NodeTypeDefinition = {
  type: 'output',
  label: 'Output',
  category: 'control',
  icon: '\u{1F4E4}',
  color: '#64748b',
  description: 'Final deliverable output. Supports all media types: video, audio, image, document, mixed media, JSON data — whatever the user requested.',
  defaultData: {
    label: 'Output',
  },
  formGroups: [
    {
      title: 'Delivery',
      fields: [
        {
          name: 'format',
          label: 'Output Type',
          type: 'select',
          required: true,
          defaultValue: 'auto',
          options: [
            { label: 'Auto (detect from upstream)', value: 'auto' },
            { label: 'Video', value: 'video' },
            { label: 'Audio', value: 'audio' },
            { label: 'Image', value: 'image' },
            { label: 'Document', value: 'document' },
            { label: 'Mixed Media', value: 'mixed' },
            { label: 'Text', value: 'text' },
            { label: 'JSON Data', value: 'json' },
            { label: 'Markdown', value: 'markdown' },
            { label: 'Code', value: 'code' },
            { label: 'File', value: 'file' },
          ],
        },
      ],
    },
  ],
  outputFields: [
    { name: 'result', label: 'Result', type: 'object', description: 'Final DAG output' },
    { name: 'format', label: 'Format', type: 'string', description: 'Output format type' },
    { name: 'deliverable', label: 'Deliverable', type: 'any', description: 'The actual deliverable content (may be file URL, media reference, structured data, etc.)' },
  ],
}
