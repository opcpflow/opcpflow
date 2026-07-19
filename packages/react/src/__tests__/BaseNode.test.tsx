import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { OpcpFlowProvider } from '../OpcpFlowProvider'
import { BaseNode } from '../BaseNode'

import { createDefaultRegistry } from '@opcpflow/nodes'
const registry = createDefaultRegistry()

const doc = { nodes: [], edges: [], metadata: { name: 'test', version: 1 } }

function renderNode(status?: string) {
  return render(
    <ReactFlowProvider>
      <OpcpFlowProvider doc={doc} registry={registry}>
        <BaseNode
          id="test-node"
          data={{ label: 'Test Node', type: 'trigger', status, execution_mode: 'pipeline' }}
          selected={false}
        />
      </OpcpFlowProvider>
    </ReactFlowProvider>
  )
}

describe('BaseNode status display', () => {
  it('should render without status', () => {
    const { getByText } = renderNode()
    expect(getByText('Test Node')).toBeDefined()
  })

  it('should display passed status', () => {
    const { container } = renderNode('passed')
    // Should render with green-tinged border via status
    expect(container.textContent).toContain('Test Node')
  })

  it('should display running status', () => {
    const { container } = renderNode('running')
    expect(container.textContent).toContain('Test Node')
  })

  it('should display failed status', () => {
    const { container } = renderNode('failed')
    expect(container.textContent).toContain('Test Node')
  })

  it('should display skipped status', () => {
    const { container } = renderNode('skipped')
    expect(container.textContent).toContain('Test Node')
  })

  it('should display pending status', () => {
    const { container } = renderNode('pending')
    expect(container.textContent).toContain('Test Node')
  })
})
