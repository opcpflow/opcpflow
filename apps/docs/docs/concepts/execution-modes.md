---
sidebar_position: 2
title: Execution Engine
---

# Execution Engine

OpcpFlow's execution engine uses the **Ready Frontier** algorithm — event-driven, dependency-activated execution.

## Execution Modes

The engine supports two global modes:

| Mode | Behavior | Use Case |
|------|----------|----------|
| `live` | All handlers execute normally, external calls are made | Real workflow execution |
| `dry-run` | All nodes skip handler execution, return null output | Testing, CI validation |

## Ready Frontier Execution

The engine does not execute level-by-level. Instead, each node executes as soon as ALL its direct predecessors complete:

```
DAG:  A ──→ C     B ──→ C     A ──→ D
      A(2s)  B(5s)

t=0:  Start A and B (no dependencies)
t=2s: A completes → activate successors C and D
      C checks: A and B must both be done. B not done yet → blocked
      D checks: A is done → D is READY → execute immediately
t=5s: B completes → C's dependencies met → C is READY → execute
t=7s: C completes → Done
```

This eliminates the "slowest-node-wait" problem of level-based execution.

## Concurrent Execution

The engine runs all ready nodes concurrently with a configurable max parallel limit (default 10). This maximizes throughput while preventing resource exhaustion.

## Error Propagation

| Strategy | Behavior |
|----------|----------|
| `skip_downstream` (default) | Failed node → all downstream nodes are skipped |
| `continue_default` | Failed node → downstream gets empty input |
| `continue_raw` | Failed node → downstream gets `{ error, upstreamId }` |

## Verification Replanning

When a `verification` node fails, the engine automatically replans without creating DAG cycles:

1. Reset the upstream node's state
2. Inject verification feedback into the upstream node's instructions
3. Re-execute the upstream node
4. Re-verify
5. Repeat up to `max_retries` times

## Data Flow (Zero Config)

- **Inputs**: Automatically gathered from all predecessor nodes via ContextStore
- **Outputs**: Automatically registered for downstream nodes
- **`__command__`**: The trigger command is injected into every node automatically

## Sub-DAG Execution

The `dynamic` node generates and recursively executes sub-DAGs via `subDAGExecutor`, enabling the D4 evolution model (static → semi-dynamic → dynamic → evolution reuse).
