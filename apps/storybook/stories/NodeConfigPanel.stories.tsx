import type { Meta, StoryObj } from '@storybook/react'
import { NodeConfigPanel } from '@opcpflow/react'
import { createDefaultRegistry } from '@opcpflow/nodes'
import type { DAGNode } from '@opcpflow/core'

const registry = createDefaultRegistry()

const sampleNode: DAGNode = {
  id: 'n1',
  type: 'llm-call',
  position: { x: 0, y: 0 },
  data: {
    label: '文案生成',
    execution_mode: 'pipeline',
    instructions: '生成3条春节促销文案',
    max_retries: 2,
    timeout_seconds: 120,
  },
}

const meta: Meta<typeof NodeConfigPanel> = {
  title: 'OpcpFlow/NodeConfigPanel',
  component: NodeConfigPanel,
  decorators: [
    (Story) => (
      <div style={{ width: 320, height: 600, border: '1px solid #e2e8f0', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof NodeConfigPanel>

export const LLMNode: Story = {
  args: {
    node: sampleNode,
    registry,
    onUpdate: (id, data) => console.log('update', id, data),
  },
}

export const Empty: Story = {
  args: {
    node: null,
    registry: null as any,
    onUpdate: () => {},
  },
}
