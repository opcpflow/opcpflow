---
name: Feature Request
about: Suggest an idea for OpcpFlow
title: '[Feature] '
labels: enhancement
assignees: ''
---

## Is your feature request related to a problem? Please describe.

A clear and concise description of what the problem is.
E.g., "I'm always frustrated when [...]"

## Describe the Solution You'd Like

A clear and concise description of what you want to happen.

### API Example (if applicable)

```typescript
// Example of how you envision the API
import { createDAG } from '@opcpflow/core'

const dag = createDAG()
  .addNode({ type: 'llm_call', ... })
  .addEdge({ from: 'node-1', to: 'node-2' })
```

### Visual Example (if applicable)

Describe how the feature would look in the editor UI.

## Describe Alternatives You've Considered

A clear and concise description of any alternative solutions or features you've considered.

## Use Case

Describe the real-world scenario where this feature would be useful:

- **Who** would use this?
- **What** problem does it solve?
- **Why** is the current approach insufficient?

## Additional Context

Add any other context, references, or examples about the feature request here:

- Links to similar features in other projects
- Screenshots or mockups
- Technical considerations (performance, compatibility, etc.)

## Would you be willing to contribute?

- [ ] Yes, I'd like to submit a PR for this feature
- [ ] I'd need guidance but could help
- [ ] No, I'm just suggesting the idea
