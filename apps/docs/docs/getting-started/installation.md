---
sidebar_position: 2
title: Installation
---

# Installation

OpcpFlow is available as separate npm packages. Install only what you need.

## Package overview

| Package | Description |
|---------|-------------|
| `@opcpflow/core` | Core types, validation, serialization, topology |
| `@opcpflow/react` | React canvas components (xyflow-based) |
| `@opcpflow/nodes` | 11 preset node definitions for AI workflows |
| `@opcpflow/engine` | DAG execution engine |
| `@opcpflow/tokens` | Token budget, model tier, semantic cache |

## Install all packages

```bash
pnpm add @opcpflow/core @opcpflow/react @opcpflow/nodes @opcpflow/engine
```

## Install individually

### Core only

```bash
pnpm add @opcpflow/core
```

Basic usage:

```typescript
import { DAGDocument, validateAll, computeLevels } from '@opcpflow/core'

const doc: DAGDocument = {
  nodes: [...],
  edges: [...],
  metadata: { name: 'My DAG', version: 1 },
}

// Validate
const result = validateAll(doc.nodes, doc.edges)
console.log(result.valid)

// Compute topological levels
const levels = computeLevels(doc.nodes, doc.edges)
```

### Core + React (for visual editor)

```bash
pnpm add @opcpflow/core @opcpflow/react @xyflow/react
```

### Core + Nodes (for preset node types)

```bash
pnpm add @opcpflow/core @opcpflow/nodes
```

## Peer dependencies

The `@opcpflow/react` package requires:

- `react` ^18.0.0
- `react-dom` ^18.0.0
- `@xyflow/react` ^12.0.0

These are listed as peer dependencies and must be installed separately.

## Using with a bundler

OpcpFlow packages are distributed as ESM with TypeScript declarations.
They work with:

- **Vite** (recommended)
- Webpack 5
- esbuild
- Rollup
- Any bundler that supports ESM
