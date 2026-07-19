import type { Meta, StoryObj } from '@storybook/react'
import { DAGFlowCanvas, OpcpFlowProvider } from '@opcpflow/react'
import { createDefaultRegistry } from '@opcpflow/nodes'
import type { DAGDocument } from '@opcpflow/core'
import { ReactFlowProvider } from '@xyflow/react'

const sampleDoc: DAGDocument = {
  nodes: [
    { id: 'n1', type: 'trigger', position: { x: 50, y: 200 }, data: { label: 'Start' } },
    { id: 'n2', type: 'llm-call', position: { x: 350, y: 200 }, data: { label: 'Generate', instructions: 'Write a summary' } },
    { id: 'n3', type: 'output', position: { x: 650, y: 200 }, data: { label: 'Output', output_key: 'result' } },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', type: 'execution' },
    { id: 'e2', source: 'n2', target: 'n3', type: 'execution' },
  ],
  metadata: { name: 'Sample DAG', version: 1 },
}

const meta: Meta<typeof DAGFlowCanvas> = {
  title: 'OpcpFlow/DAGFlowCanvas',
  component: DAGFlowCanvas,
  decorators: [
    (Story) => (
      <div style={{ width: 800, height: 500, border: '1px solid #e2e8f0' }}>
        <ReactFlowProvider>
          <Story />
        </ReactFlowProvider>
      </div>
    ),
  ],
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof DAGFlowCanvas>

export const SimplePipeline: Story = {
  args: {
    nodes: sampleDoc.nodes,
    edges: sampleDoc.edges,
    nodeTypes: {},
    fitView: true,
  },
}
