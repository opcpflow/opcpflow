import type { NodeTypeDefinition } from '@opcpflow/core'

export const taskDecomposeDefinition: NodeTypeDefinition = {
  type: 'task_decompose',
  label: 'Task Decompose',
  category: 'control',
  icon: '\u{1F500}',
  color: '#f59e0b',
  description: 'Split a command into parallel sub-tasks via LLM. Select a registered model, or choose "Custom..." to configure manually.',
  defaultData: {
    label: 'Task Decompose',
    model: '__custom__',
  },
  formGroups: [
    {
      title: 'Decomposition Rules',
      fields: [
        {
          name: 'instructions',
          label: 'Decomposition Rules',
          type: 'textarea',
          placeholder: 'Optional: describe how to split the task. Leave empty for LLM to auto-decompose, or rely on dynamic node for unmatched sub-tasks.',
        },
      ],
    },
    {
      title: 'LLM Config',
      description: 'LLM used for task decomposition. Select a registered model, or choose "Custom..." to enter endpoint and API key manually.',
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
    { name: 'sub_tasks', label: 'Sub Tasks', type: 'array', description: 'List of decomposed sub-tasks' },
    { name: 'count', label: 'Count', type: 'number', description: 'Number of sub-tasks created' },
    { name: 'method', label: 'Method', type: 'string', description: 'llm or rule_based' },
  ],
}
