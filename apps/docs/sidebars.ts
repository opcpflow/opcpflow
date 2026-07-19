import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/quickstart',
        'getting-started/installation',
        'getting-started/create-app',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/dag',
        'concepts/execution-modes',
        'concepts/input-refs',
        'concepts/context-store',
      ],
    },
    {
      type: 'category',
      label: 'Packages',
      items: [
        'packages/core',
        'packages/react',
        'packages/nodes',
        'packages/engine',
        'packages/commander',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/custom-nodes',
        'guides/migration-from-n8n',
        'guides/migration-from-flowise',
        'guides/migration-from-langgraph',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/simple-pipeline',
        'examples/branching',
        'examples/parallel',
        'examples/subgraph',
        'examples/for-each',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/production-checklist',
      ],
    },
  ],
}

export default sidebars
