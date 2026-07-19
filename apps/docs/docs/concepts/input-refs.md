---
sidebar_position: 3
title: Data Flow (Auto-Route)
---

# Data Flow — Zero-Configuration Routing

OpcpFlow uses **automatic data routing** based on DAG topology. Users do not need to manually configure `input_refs` or `output_key`.

## How It Works

```
[Node A] ──execution──→ [Node B]
    │                       │
  A's output             B automatically receives
  stored in               all predecessor outputs
  ContextStore            via ctx.inputs
```

1. When a node completes, its output is automatically stored in the ContextStore keyed by node ID
2. When a dependent node starts, the engine automatically collects all predecessor outputs
3. The collected data is available as `ctx.inputs` in the node's execution handler

## What's Available in ctx.inputs

| Key | Source | Description |
|-----|--------|-------------|
| `triggerId` | trigger node | The trigger node's command output |
| `nodeId` | any upstream node | Each upstream node's full output |
| `__command__` | engine | The original trigger command text (injected into ALL nodes automatically) |

## Example

```typescript
// In any node's handler:
const handler: ExecutionHandler = async (input, ctx) => {
  // input = this node's form configuration
  // ctx.inputs = ALL predecessor outputs, auto-routed by the engine

  const triggerCommand = ctx.inputs.__command__
  const upstreamResult = ctx.inputs.upstream_node_id

  return { output: `Processed: ${upstreamResult}` }
}
```

## ContextStore

The ContextStore provides three-level memory:

| Level | Purpose | Lifetime |
|-------|---------|----------|
| L1 Scratch | Node temporary variables | Cleared per node |
| L2 State | Structured outputs | DAG execution |
| L3 Cache | MCP/API result cache | TTL-based eviction |

## Key Design Principle

**No configuration needed.** The engine determines data flow entirely from the DAG's edge connections. Add an edge = establish a data dependency. Remove an edge = remove the dependency. This keeps the workflow editor simple and the data flow predictable.
