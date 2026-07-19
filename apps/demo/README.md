# OpcpFlow Demo

An interactive online DAG workflow editor and demo application showcasing
the OpcpFlow framework's capabilities.

## Features

- **Visual DAG Editor** — Drag-and-drop interface for building workflow DAGs
- **11 Preset Nodes** — LLM call, API call, task decomposition, knowledge search, MCP tools, and more
- **Real-time Validation** — Cycle detection, orphan detection, depth limits
- **Export/Import** — Save and load DAG definitions as JSON
- **Custom Nodes** — Example showing how to create custom node types

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

## Project Structure

```
src/
  pages/
    LandingPage.tsx   — Hero section and feature cards
    EditorPage.tsx    — Full DAG editor with canvas
    DocsPage.tsx      — API reference placeholder
  components/
    CustomNodes.tsx   — Custom node type examples
  App.tsx             — Router setup
  main.tsx            — Entry point
```

## Tech Stack

- **Vite** + **React 18** + **TypeScript**
- **@xyflow/react** (React Flow) for canvas rendering
- **@opcpflow/core** for DAG types, validation, and serialization
- **@opcpflow/react** for editor components
- **@opcpflow/nodes** for preset node definitions

## License

MIT
