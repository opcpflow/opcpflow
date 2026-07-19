# Custom Nodes Example

This example demonstrates how to create custom node types for OpcpFlow.

## What's included

- **custom-node.ts** — Node type definition (form fields, defaults, metadata)
- **custom-executor.ts** — Custom execution logic for the node
- **custom-renderer.tsx** — Custom React renderer with visual enhancements
- **custom-form.tsx** — Custom form fields for the config panel
- **App.tsx** — Integration example showing how to register and use custom nodes

## Quick start

```ts
import { createDefaultRegistry } from '@opcpflow/nodes'
import { sentimentNodeDefinition } from './custom-node'

const registry = createDefaultRegistry()
registry.register(sentimentNodeDefinition)
```

See `App.tsx` for the full integration example.
