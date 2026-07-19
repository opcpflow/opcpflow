import type { Meta, StoryObj } from '@storybook/react'
import { SubFlowNode } from '@opcpflow/react'

const meta: Meta<typeof SubFlowNode> = {
  title: 'OpcpFlow/SubFlowNode',
  component: SubFlowNode,
  decorators: [
    (Story) => (
      <div style={{ width: 300, height: 200 }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SubFlowNode>

export const OnceMode: Story = {
  args: {
    id: 'sub-1',
    type: 'sub-flow',
    selected: false,
    data: {
      label: 'Sub Process',
      mode: 'once',
      sub_dag: { nodes: [], edges: [] },
    },
  },
}

export const ForEachMode: Story = {
  args: {
    id: 'sub-2',
    type: 'sub-flow',
    selected: true,
    data: {
      label: 'Batch Process',
      mode: 'for_each',
      iteration_field: 'items',
      sub_dag: { nodes: [], edges: [] },
    },
  },
}
