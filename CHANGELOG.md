# Changelog

All notable changes to OpcpFlow will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0-pre] - 2026-07-13

### Added

#### Core Framework (`@opcpflow/core`)
- DAG type system: `DAGNode`, `DAGEdge`, `DAGDocument`, `DAGStatus`, `ExecutionMode`
- DAG validation: cycle detection, orphan detection, maximum depth validation
- Topology utilities: level computation, topological sort, parallel group detection
- Variable engine: `{{ $context.path }}` variable parsing and resolution
- JSON serialization and deserialization with legacy format compatibility
- Node registry: type registration, category browsing, form field definitions
- Export/import utilities with file download support (browser)

#### React Canvas (`@opcpflow/react`)
- `DAGFlowCanvas` component: xyflow-based interactive canvas with drag-select
- `NodePalette` component: categorized node type browser with drag-to-canvas
- `NodeConfigPanel` component: dynamic form-based configuration editor
- `EditorToolbar` component: New, Save, Export, Import, Auto-Layout actions
- `useDAGStore` hook: zustand-based state management for editor state
- Custom node type system with type-safe data schemas

#### Preset Nodes (`@opcpflow/nodes`)
- 11 preset node types across 4 categories:
  - **Control**: trigger, task_decompose, dynamic, output
  - **AI**: llm_call, knowledge, strategy
  - **Integration**: api_call, mcp_tool, merge
  - **Verification**: verification
- Simple pipeline example DAG

#### CLI Scaffold (`@opcpflow/create-app`)
- Interactive CLI with prompts for project name, template, TypeScript
- Basic Vite+React template with pre-configured editor
- Automatic dependency installation

#### Demo App (opcpflow-demo)
- Landing page with hero section, feature cards, and quickstart code
- Online DAG editor with full editor layout
  - Node palette sidebar with search and drag-to-add
  - Interactive DAG canvas with xyflow
  - Node configuration panel with dynamic forms
  - Toolbar with New, Save, Export, Import, Auto-Layout
- API reference placeholder page
- Custom node examples

#### Documentation Site (opcpflow-docs)
- Docusaurus-based documentation site
- Getting Started guides: Quickstart, Installation, Create App
- Concepts: DAG, Execution Modes, InputRefs, ContextStore
- Package API references: Core, React, Nodes, Engine, Commander
- Migration guides: n8n, Flowise, LangGraph
- Examples: Pipeline, Branching, Parallel, Subgraph, For-Each
- Deployment: Production checklist

#### Community Infrastructure
- GitHub CI workflow (lint, typecheck, test, build)
- GitHub E2E workflow (nightly Playwright tests, 3 browsers)
- GitHub Publish workflow (npm publishing on release)
- GitHub Release workflow (auto-generated changelog)
- Issue templates (bug report, feature request)
- CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md

#### Testing
- Playwright-based E2E test harness
- Core render test: canvas rendering and node creation
- Engine execute test: DAG execution and validation
- Full-cycle test: editor → save → load → execute
- Sample DAG fixtures for testing
