---
sidebar_position: 3
title: Create App CLI
---

# Create App CLI

The `@opcpflow/create-app` package provides an interactive CLI to scaffold
new OpcpFlow projects.

## Usage

```bash
npx @opcpflow/create-app my-dag-app
```

Or install globally:

```bash
npm install -g @opcpflow/create-app
create-opcpflow-app my-dag-app
```

## Interactive prompts

The CLI will guide you through the setup:

### Project name

If you didn't provide a directory name as an argument, you'll be prompted
for one.

### TypeScript

Choose whether to use TypeScript. Recommended for type safety and better
developer experience.

### Template

Currently, only the `basic` template is available. It scaffolds a Vite +
React project with a pre-configured DAG editor.

## Generated project

After the CLI finishes, you'll have:

```
my-dag-app/
  package.json         — Project dependencies and scripts
  tsconfig.json        — TypeScript configuration
  vite.config.ts       — Vite configuration
  index.html           — HTML entry point
  src/
    App.tsx             — Main editor component with example DAG
    main.tsx            — Application entry point
```

### What's in the template

The `basic` template includes:

- A fully functional DAG editor UI
- Node palette sidebar with drag-to-add nodes
- Interactive canvas with pan, zoom, and connect
- Node configuration panel with dynamic forms
- Pre-populated example DAG (Trigger → LLM Call → Output)
- All packages pre-configured via npm dependencies

## Next steps

```bash
cd my-dag-app
npm install
npm run dev
```

Then open http://localhost:5173 to start editing your DAG.
