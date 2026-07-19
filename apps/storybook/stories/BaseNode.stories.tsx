import type { Meta, StoryObj } from '@storybook/react'
import { BaseNode } from '@opcpflow/react'
import { ReactFlowProvider } from '@xyflow/react'

const meta: Meta<typeof BaseNode> = {
  title: 'OpcpFlow/BaseNode',
  component: BaseNode,
  decorators: [
    (Story) => (
      <div style={{ width: 200, height: 100 }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof BaseNode>

export const Default: Story = {
  args: {
    id: 'node-1',
    type: 'llm-call',
    selected: false,
    data: {
      label: 'LLM Call',
      execution_mode: 'pipeline',
    },
  },
}

export const Selected: Story = {
  args: {
    id: 'node-2',
    type: 'api-call',
    selected: true,
    data: {
      label: 'API Call',
      execution_mode: 'dispatch',
    },
  },
}

export const WithValidation: Story = {
  args: {
    id: 'node-3',
    type: 'verification',
    selected: false,
    data: {
      label: 'Verification',
      criteria: 'Check output quality',
    },
  },
}
