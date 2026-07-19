import type { NodeTypeDefinition } from '@opcpflow/core'

export const verificationDefinition: NodeTypeDefinition = {
  type: 'verification',
  label: 'Verification',
  category: 'verification',
  icon: '✅',
  color: '#ec4899',
  description: 'SGV two-step quality verification. Auto-generates criteria from sub-task context (blind step), then validates output against criteria (grounded step). User can also manually enter criteria. Dual-mode: auto or manual.',
  defaultData: {
    label: 'Verification',
    min_score: 0.7,
    auto_generate: true,
  },
  formGroups: [
    {
      title: 'Mode',
      fields: [
        {
          name: 'auto_generate',
          label: 'Auto-Generate Criteria',
          type: 'boolean',
          defaultValue: true,
          description: 'Auto-generate from sub-task context when enabled',
        },
      ],
    },
    {
      title: 'SGV Criteria',
      description: 'Step 1 (Blind): produce conditions before seeing output. Step 2 (Grounded): check output against conditions.',
      showIf: { field: 'auto_generate', eq: false },
      fields: [
        {
          name: 'criteria',
          label: 'SGV Criteria',
          type: 'textarea',
          required: true,
          placeholder: 'Manually enter SGV criteria when auto-generate is disabled.',
        },
        {
          name: 'min_score',
          label: 'Minimum Score',
          type: 'number',
          defaultValue: 0.7,
          placeholder: 'Pass threshold (0.0 - 1.0)',
        },
      ],
    },
  ],
  outputFields: [
    { name: 'verified', label: 'Verified', type: 'boolean', description: 'Whether verification passed' },
    { name: 'score', label: 'Score', type: 'number', description: 'Verification score (0-1)' },
    { name: 'feedback', label: 'Feedback', type: 'string', description: 'SGV verification feedback' },
    { name: 'criteria_used', label: 'Criteria Used', type: 'string', description: 'Criteria applied (auto or manual)' },
    { name: 'sgv_steps', label: 'SGV Steps', type: 'object', description: 'Blind step + Grounded step results' },
  ],
}
