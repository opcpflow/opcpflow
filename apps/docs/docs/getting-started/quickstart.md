---
sidebar_position: 1
title: Quickstart
---

# Quickstart

Get started with OpcpFlow in three steps.

## Prerequisites

- **Node.js** 18.0.0 or later
- **pnpm** 10.0.0 or later (recommended) or npm

## 1. Create a new project

Use the CLI scaffold to create a new OpcpFlow project:

```bash
npx @opcpflow/create-app my-dag-app
```

The CLI will ask you a few questions:

- **Project name**: defaults to the directory name you provided
- **Use TypeScript?**: recommended (default: yes)

After answering, the scaffold creates a ready-to-run project:

```
my-dag-app/
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  src/
    App.tsx       — Pre-configured DAG editor
    main.tsx      — Entry point
```

## 2. Install dependencies

```bash
cd my-dag-app
npm install
# or
pnpm install
```

## 3. Start the dev server

```bash
npm run dev
# or
pnpm dev
```

Open http://localhost:5173 in your browser. You should see a DAG editor
with a pre-populated example workflow.

## Next steps

- Learn about [DAG concepts](../concepts/dag.md)
- Understand the [execution engine](../concepts/execution-modes.md)
- Learn about [data flow (auto-routing)](../concepts/input-refs.md)
