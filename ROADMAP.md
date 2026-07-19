# OpcpFlow Roadmap

> _Last updated: 2026-07-19_

OpcpFlow is an open-source DAG workflow framework for AI agent assembly and multi-type asset composition, with a visual editor and Ready Frontier execution engine.

---

## Milestone 1: Core Framework (v0.1.0)

**Status: Complete** ✅

### Core Framework
- [x] Core types: DAGNode, DAGEdge, DAGDocument, Metadata
- [x] DAG validation: cycle detection, orphan detection, depth validation
- [x] Topology: level computation, topological sort, parallel group detection
- [x] Node registry: type registration, category browsing, form field definitions
- [x] Handler registry: type-based handler registration + override

### Preset Nodes (11 types)
- [x] **Control**: trigger, task_decompose, dynamic, output
- [x] **AI**: llm_call, knowledge, strategy
- [x] **Integration**: api_call, mcp_tool, merge
- [x] **Verification**: verification

### Execution Engine
- [x] Ready Frontier event-driven execution
- [x] ContextStore three-level memory (L1 scratch / L2 state / L3 cache)
- [x] EventBus lifecycle events (dag.* / node.*)
- [x] Verification sub-graph replanning (no DAG cycles)
- [x] Dynamic sub-DAG generation and recursive execution
- [x] Token budget tracking
- [x] D4 evolution hook (execution frequency + bottleneck analysis)
- [x] Custom handler override support
- [x] Auto data routing (zero-config, DAG topology based)

### React Editor
- [x] DAGFlowCanvas: xyflow-based interactive canvas
- [x] NodePalette: draggable node type sidebar
- [x] NodeConfigPanel: dynamic form-based config editing
- [x] Dynamic handler customization
- [x] Sandbox test execution

### CLI & Demo
- [x] `@opcpflow/create-app` CLI scaffold
- [x] Online demo editor
- [x] Documentation site

---

## Milestone 2: Community & Ecosystem (v0.2.0 - v0.5.0)

**Estimated: Q3-Q4 2026**

### Community Features
- [ ] Node SDK for third-party developers
- [ ] Community node marketplace
- [ ] Example gallery with community contributions
- [ ] GitHub Discussions integration

### Enhanced Developer Experience
- [ ] VSCode extension with DAG preview
- [ ] Hot-reload node development
- [ ] Interactive DAG debugger (step-through execution)
- [ ] Performance profiling

### Documentation
- [ ] Interactive tutorials on docs site
- [ ] Migration guides (n8n, Flowise, LangGraph)
- [ ] API reference with examples
- [ ] Best practices guide

### Extended Nodes
- [ ] Custom node starter template
- [ ] Node composability (sub-DAGs as nodes)

---

## Milestone 3: Enterprise & Scale (v1.0.0+)

**Estimated: Q1-Q2 2027**

### Performance & Scale
- [ ] Web Worker offloading for large DAGs (1000+ nodes)
- [ ] Virtualized canvas rendering
- [ ] Incremental validation (edit-sized diffs)
- [ ] Bundle size optimization (< 50KB core, < 100KB react)

### Enterprise Features
- [ ] Self-evolving workflows (D4 evolution promotion to static nodes)
- [ ] Audit logging and version history
- [ ] RBAC integration
- [ ] On-premise deployment support

### Ecosystem
- [ ] REST API for headless DAG management
- [ ] Webhook triggers and event sources
- [ ] Bi-directional sync with n8n / Temporal

---

## How to Contribute

- [CONTRIBUTING.md](.github/CONTRIBUTING.md) for development setup
- [Discussions](https://github.com/opcpflow/opcpflow/discussions) to share ideas

_This roadmap is a living document._
