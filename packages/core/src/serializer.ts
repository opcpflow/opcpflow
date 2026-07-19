import type { DAGDocument, DAGNode, DAGEdge, Metadata } from './types/dag-node'

export function toJSON(doc: DAGDocument): string {
  return JSON.stringify(doc, null, 2)
}

export function fromJSON(json: string): DAGDocument {
  const parsed = JSON.parse(json)
  if (!parsed.nodes || !parsed.edges || !parsed.metadata) {
    throw new Error('Invalid DAGDocument: missing required fields (nodes, edges, metadata)')
  }
  return {
    nodes: parsed.nodes as DAGNode[],
    edges: parsed.edges as DAGEdge[],
    metadata: parsed.metadata as Metadata,
  }
}

