import React from 'react'
import { BaseNode } from '@opcpflow/react'
import type { DAGNode } from '@opcpflow/core'

// Custom renderer that adds a sentiment badge to the node
export function SentimentNodeRenderer(props: { node: DAGNode; selected: boolean }): React.ReactElement {
  const { node, selected } = props
  const sentiment = (node.data as any).sentimentResult

  const badgeColor = sentiment === 'positive' ? '#22c55e'
    : sentiment === 'negative' ? '#ef4444'
    : '#6b7280'

  return (
    <div style={{ position: 'relative' }}>
      <BaseNode
        id={node.id}
        type={node.type}
        selected={selected}
        data={node.data}
      />
      {sentiment && (
        <div style={{
          position: 'absolute', top: -8, right: -8,
          width: 16, height: 16, borderRadius: '50%',
          backgroundColor: badgeColor,
          border: '2px solid white',
        }} />
      )}
    </div>
  )
}
