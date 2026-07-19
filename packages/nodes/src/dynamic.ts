import type { NodeTypeDefinition } from '@opcpflow/core'

export const dynamicDefinition: NodeTypeDefinition = {
  type: 'dynamic',
  label: 'Dynamic',
  category: 'control',
  icon: '⚡',
  color: '#f97316',
  description: 'Dynamic sub-task handler. Catches unmatched sub-tasks from task_decompose, generates and executes a sub-DAG (trigger → llm_call → output) at runtime. Supports D4 evolution.',
  defaultData: {
    label: 'Dynamic',
    model: '__custom__',
  },
  formGroups: [
    {
      title: 'Dynamic Config',
      fields: [
        {
          name: 'instructions',
          label: 'Execution Rules',
          type: 'textarea',
          required: true,
          placeholder: 'Describe how to handle unmatched sub-tasks... e.g. "Execute each sub-task using available tools and return results"',
        },
        {
          name: 'max_instances',
          label: 'Max Parallel Instances',
          type: 'number',
          defaultValue: 5,
        },
      ],
    },
    {
      title: 'LLM Config',
      description: 'Model used by the dynamic sub-DAG for execution.',
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
    { name: 'results', label: 'Results', type: 'array', description: 'Dynamic sub-task execution results with actual content' },
    { name: 'instance_count', label: 'Count', type: 'number', description: 'Number of dynamic instances executed' },
    { name: 'sub_dags', label: 'Sub-DAGs', type: 'array', description: 'Generated sub-DAG descriptions for evolution tracking' },
  ],
}
