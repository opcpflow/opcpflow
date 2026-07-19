---
sidebar_position: 1
title: DAG
---

# DAG (Directed Acyclic Graph)

A Directed Acyclic Graph (DAG) is the core model in OpcpFlow. It represents
a workflow as a collection of nodes connected by directed edges, with no
cycles (loops).

## Core types

### DAGNode

```typescript
interface DAGNode<T = Record<string, unknown>> {
  id: string
  type: string
  position: Position
  data: T & {
    label?: string
    instructions?: string
    max_retries?: number
    timeout_seconds?: number
    config?: Record<string, unknown>
  }
}
```

Each node has:
- **id**: Unique identifier
- **type**: Node type (e.g., `trigger`, `task_decompose`, `llm_call`, `knowledge`, `strategy`, `api_call`, `mcp_tool`, `verification`, `merge`, `output`, `dynamic`)
- **position**: X/Y coordinates for the visual editor
- **data**: Type-specific configuration data (form fields defined per node type)

### DAGEdge

```typescript
interface DAGEdge {
  id: string
  source: string
  target: string
  type: EdgeType  // 'execution' | 'data-flow'
  label?: string
  sourceHandle?: string
  targetHandle?: string
}
```

Edges connect nodes. The `type` field distinguishes:
- **execution**: Control flow — the target node executes after the source
- **data-flow**: Data dependency — the target node receives data from the source

### DAGDocument

```typescript
interface DAGDocument {
  nodes: DAGNode[]
  edges: DAGEdge[]
  metadata: Metadata
}
```

## DAG structure rules

1. **Single root**: A DAG typically has one trigger node (no incoming edges)
2. **No cycles**: The graph must be acyclic (enforced by validation)
3. **Connected**: All nodes should be reachable from the root (orphan detection)
4. **Typed edges**: Edges carry execution or data-flow semantics
5. **Level-based execution**: Nodes are grouped into topological levels

## Validation

Use the `validateAll` function to check DAG validity:

```typescript
import { validateAll } from '@opcpflow/core'

const result = validateAll(nodes, edges, { maxDepth: 50 })

if (result.valid) {
  console.log('DAG is valid')
} else {
  console.error('Validation errors:', result.errors)
}
```

Validation checks:
- **Cycle detection**: DFS-based cycle detection
- **Orphan detection**: Finds disconnected nodes
- **Depth validation**: Ensures the DAG doesn't exceed maximum depth

## Topology utilities

```typescript
import { computeLevels, findParallelGroups, getTopologicalOrder } from '@opcpflow/core'

// Get topological level for each node
const levels = computeLevels(nodes, edges)

// Find groups of nodes that can execute in parallel
const groups = findParallelGroups(nodes, edges)

// Get execution order
const order = getTopologicalOrder(nodes, edges)
```
