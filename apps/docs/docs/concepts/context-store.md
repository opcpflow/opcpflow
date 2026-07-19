---
sidebar_position: 4
title: ContextStore
---

# ContextStore — Three-Level Memory

The ContextStore is OpcpFlow's data-sharing layer. It manages data flow between DAG nodes during execution with three memory levels.

## Three Levels

### L1: Node Scratch Space

Temporary variables within a single node's execution. Cleared automatically when the node completes.

```typescript
store.setScratch('node_a', 'counter', 1)
const val = store.getScratch('node_a', 'counter')
store.clearScratch('node_a')
```

### L2: Structured State

All node outputs are stored here, keyed by node ID. Supports source tagging, freshness tracking, and conflict detection.

```typescript
// Store node output
store.set('llm_call_1', { content: 'Generated text' }, 'llm_call_1')

// Retrieve for downstream nodes
const output = store.get('llm_call_1')

// Source tagging
const source = store.getSource('llm_call_1')
// { nodeId: 'llm_call_1', key: 'llm_call_1', timestamp: ... }

// Freshness
const age = store.getAge('llm_call_1')  // ms since write
const stale = store.isStale('llm_call_1', 60000)  // older than 60s?

// Conflict detection (multiple nodes writing to same key)
const conflicts = store.getConflicts('duplicate_key')

// Get all data
const snapshot = store.snapshot()
```

### L3: External Cache

TTL-based cache for MCP tool results and API call responses. LRU eviction when cache is full.

```typescript
store.cacheSet('api_result', data, 30000)  // TTL: 30s
const cached = store.cacheGet('api_result')  // undefined if expired
```

## Token Budget

```typescript
store.addTokenCost(500)
const used = store.getTokenUsage()
const remaining = store.getRemainingBudget()
```

## Auto-Routing

The engine automatically routes data between nodes:

1. Node A completes → `store.set('A', output, 'A')`
2. Node B starts → engine reads `store.get(predId)` for all predecessors
3. All predecessor outputs available via `ctx.inputs`
