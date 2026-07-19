import React, { useCallback } from 'react'
import { DAGFlowCanvas, NodePalette, NodeConfigPanel } from '@opcpflow/react'
import { createDefaultRegistry } from '@opcpflow/nodes'
import { sentimentNodeDefinition } from './custom-node'
import { SentimentNodeRenderer } from './custom-renderer'
import { SentimentForm } from './custom-form'

const registry = createDefaultRegistry()
registry.register(sentimentNodeDefinition)

const customNodeTypes = {
  'sentiment-analysis': SentimentNodeRenderer,
}

export default function App(): React.ReactElement {
  const handleSave = useCallback((nodes: any[], edges: any[], metadata: any) => {
    console.log('save', { nodes, edges, metadata })
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <NodePalette
        categories={registry.getCategories()}
        onDragStart={(type) => console.log('drag', type)}
      />
      <main style={{ flex: 1 }}>
        <DAGFlowCanvas
          nodes={[]}
          edges={[]}
          nodeTypes={customNodeTypes}
          onSave={handleSave}
        />
      </main>
      <NodeConfigPanel
        node={null}
        onUpdate={(id, data) => console.log('update', id, data)}
        customFields={{ 'sentiment-analysis': SentimentForm }}
      />
    </div>
  )
}
