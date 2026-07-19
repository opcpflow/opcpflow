# OpcpFlow

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.4+-3178C6?logo=typescript" alt="TypeScript" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm-monorepo-F69220?logo=pnpm" alt="pnpm" /></a>
  <img src="https://img.shields.io/badge/status-pre--release-yellow" alt="Pre-release" />
</p>

**Open DAG Workflow Framework** — AI agent assembly, multi-type asset composition, and D4 self-evolving TypeScript DAG framework.

Includes a visual editor, 11 AI orchestration node types, Ready Frontier event-driven engine, ContextStore three-level memory, and D4EvolutionHook for automatic workflow evolution.

> **Why OpcpFlow?**
>
> - **D4 Self-Evolution** — Workflows evolve from static to dynamic based on usage patterns, rather than staying fixed forever
> - **Agent Assembly Pattern** — Knowledge + Strategy + Execution + Verification in a complete AI Agent paradigm, not just a toolchain
> - **Ready Frontier Engine** — Execute as soon as dependencies are met; no waiting for same-level peers
> - **TypeScript Native + Embeddable** — Not a standalone service; `npm install` into any React app

```bash
npm install @opcpflow/core @opcpflow/nodes @opcpflow/react
```

---

## Packages

```
@opcpflow/core       DAG types, validation, topology, Ready Frontier engine, ContextStore, EventBus, D4 evolution
@opcpflow/nodes      11 AI orchestration node definitions (colors, icons, categories, form fields)
@opcpflow/react      DAGEditor visual editor + sandbox execution
@opcpflow/engine     Ready Frontier execution engine, ContextStore, sub-graph replanning, telemetry
```

### Dependency Flow

```
react → nodes → core
engine → core
```

---

## Core Capabilities

| Capability | Description |
|------------|-------------|
| **11 AI Nodes** | trigger / task_decompose / dynamic / llm_call / api_call / mcp_tool / knowledge / strategy / verification / merge / output |
| **Ready Frontier Engine** | Dependency-activated execution; no level-based waiting |
| **ContextStore 3-Level Memory** | L1 scratch / L2 structured state / L3 external cache, with conflict detection + freshness + source tagging |
| **EventBus** | dag.* / node.* lifecycle events for observability and evolution hooks |
| **D4 Evolution** | Static → semi-static → dynamic → evolution reuse; unmatched sub-tasks automatically become sub-DAGs |
| **D4EvolutionHook** | Tracks dynamic node frequency and latency; auto-suggests promotion to static nodes |
| **Token Budget Control** | Track token consumption; circuit breaker on over-limit |
| **Auto Data Routing** | Connect edges = data flows; zero-config input/output |
| **Sandbox Testing** | Execute DAGs inside the editor; nodes change color in real-time |
| **Headless CI** | `testDAG()` for UI-less execution, ideal for CI pipelines |

---

## Node Types (11)

| Category | Type | Description |
|----------|------|-------------|
| **control** | `trigger` | DAG execution entry point |
| | `task_decompose` | Split commands into parallel sub-tasks |
| | `dynamic` | ⚡ Catch-all handler + D4 evolution |
| | `output` | Final deliverable output |
| **ai** | `llm_call` | LLM inference / generation |
| | `knowledge` | Multi-source knowledge retrieval |
| | `strategy` | Persona / rules / behavior guidelines |
| **integration** | `api_call` | HTTP API calls |
| | `mcp_tool` | MCP protocol tool calls |
| | `merge` | Multi-type asset composition |
| **verification** | `verification` | SGV adversarial quality check |

---

## D4 Evolution Model

```
L1: Static               L2: Semi-Static          L3: Dynamic             L4: Evolution Reuse

Complete DAG             User draws skeleton +    No predefined DAG       Best-practice auto-
drawn by user            dynamic catch-all        fully dynamic           retrieval and adaptation
Fully predictable        Flexible                 Learning path           Continuous micro-evolution

           ───→ increased usage ───→ sub-task path stabilizes ───→ D4EvolutionHook suggests promotion
```

---

## Quick Start

```tsx
import { DAGEditor } from '@opcpflow/react'
import { createDefaultRegistry } from '@opcpflow/nodes'

const registry = createDefaultRegistry()

export default function App() {
  return (
    <DAGEditor
      registry={registry}
      onSave={(doc) => console.log('Saved:', doc)}
    />
  )
}
```

### Programmatic Execution + D4 Evolution

```ts
import { DAGExecutionEngine, HandlerRegistry, D4EvolutionHook } from '@opcpflow/core'

const engine = new DAGExecutionEngine({ maxTokens: 100000 })
const evolution = new D4EvolutionHook()
const handlers = HandlerRegistry.createWithBuiltIns()

const report = await engine.execute(dag, handlers, {
  mode: 'live',
  onDAGComplete: (report) => {
    const insights = evolution.analyze('my-workflow', report)
    console.log('Suggestions:', insights.suggestions)
  },
})

console.log('Token usage:', engine.getStore().getTokenUsage())
```

---

## Development

```bash
pnpm install
pnpm -r build
pnpm -r test
cd apps/demo && pnpm dev
```

## License

Apache 2.0
