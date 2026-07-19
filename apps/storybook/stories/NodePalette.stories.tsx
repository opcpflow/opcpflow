import type { Meta, StoryObj } from '@storybook/react'
import { NodePalette, OpcpFlowProvider } from '@opcpflow/react'
import { createDefaultRegistry } from '@opcpflow/nodes'
import { OpcpFlowProvider as Provider } from '@opcpflow/react'

const registry = createDefaultRegistry()

const meta: Meta<typeof NodePalette> = {
  title: 'OpcpFlow/NodePalette',
  component: NodePalette,
  decorators: [
    (Story) => (
      <div style={{ width: 260, height: 600, border: '1px solid #e2e8f0' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof NodePalette>

export const Default: Story = {
  args: {
    categories: registry.getCategories(),
    onDragStart: () => {},
  },
}
