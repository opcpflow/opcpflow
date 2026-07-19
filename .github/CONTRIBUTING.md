# Contributing to OpcpFlow

Thank you for your interest in contributing to OpcpFlow! We welcome contributions
from everyone, whether it's a bug report, feature suggestion, documentation
improvement, or code change.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project and everyone participating in it is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to
uphold this code.

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0

### Setup

```bash
# Clone the repository
git clone https://github.com/opcpflow/opcpflow.git
cd opcpflow

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### First-time Build

```bash
# Build core first (no dependencies)
pnpm build:core

# Build all packages
pnpm build:packages
```

## Development Workflow

### Branch Naming

- Feature branches: `feat/short-description`
- Bug fixes: `fix/short-description`
- Documentation: `docs/short-description`
- Performance: `perf/short-description`
- Refactoring: `refactor/short-description`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add node grouping support
fix: correct edge routing for parallel branches
docs: update quickstart guide
perf: optimize topology computation
refactor: extract validation logic
test: add engine execution tests
chore: update dependencies
```

### Development

```bash
# Watch mode for a specific package
pnpm --filter @opcpflow/core dev

# Run the demo app
pnpm --filter opcpflow-demo dev

# Run the docs site
pnpm --filter opcpflow-docs start
```

## Project Structure

```
opcpflow/
├── packages/           # Core packages
│   ├── core/          # Types, validation, serialization, topology
│   ├── react/         # React canvas components (xyflow-based)
│   ├── nodes/         # 11 preset AI workflow node definitions
│   ├── engine/        # DAG execution engine
│   ├── commander/     # Workforce commander for enterprise
│   ├── tokens/        # Design tokens
│   └── evolution/     # Self-evolving workflow optimizer
├── apps/              # Applications
│   ├── demo/          # Online DAG editor demo
│   ├── docs/          # Documentation site (Docusaurus)
│   ├── test-harness/  # E2E tests (Playwright)
│   └── storybook/     # Component explorer
├── examples/          # Example projects
└── .github/           # CI/CD and community files
```

## Pull Request Guidelines

1. **Keep PRs focused** — One feature or fix per PR. If you have multiple
   unrelated changes, create separate PRs.
2. **Include tests** — New features should include tests. Bug fixes should
   include a test that reproduces the bug.
3. **Update documentation** — If you change public API surface, update the
   relevant docs.
4. **Pass CI** — Ensure all checks pass before requesting review.
5. **Describe your changes** — Include a clear description of what and why.

### PR Checklist

- [ ] Code follows project coding standards
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Changeset added (for packages with changes)
- [ ] No breaking changes without discussion

## Coding Standards

### TypeScript

- Use strict TypeScript with proper type annotations
- Prefer interfaces over type aliases for object types
- Use `type` for unions, intersections, and mapped types
- Export all public types and functions
- Use `unknown` instead of `any` where possible

### React

- Use functional components with hooks
- Use TypeScript for all components
- Use React Flow (xyflow) for canvas components
- Keep components focused and composable

### Imports

- Use path aliases defined in tsconfig
- Organize imports: external → internal → relative
- Prefer named exports over default exports

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @opcpflow/core test

# Run tests in watch mode
pnpm --filter @opcpflow/core test:watch
```

### E2E Tests

```bash
# Build the demo app first
pnpm --filter opcpflow-demo build

# Run E2E tests
pnpm --filter opcpflow-test-harness test
```

### Test Conventions

- Unit tests live next to the source files as `*.test.ts(x)`
- E2E tests live in `apps/test-harness/integration/`
- Name test files after what they test
- Use descriptive test names (sentences)

## Documentation

- Package API docs live in `apps/docs/docs/packages/`
- Guides and examples live in `apps/docs/docs/guides/` and `apps/docs/docs/examples/`
- Update docs when changing public API
- Run the docs site locally to preview: `pnpm --filter opcpflow-docs start`

## Issue Reporting

### Bug Reports

When filing a bug report, please include:

- A clear title and description
- Steps to reproduce (code snippet or link to reproduction)
- Expected behavior vs actual behavior
- Environment info (OS, browser, Node.js version, package version)
- Screenshots if applicable

### Feature Requests

When suggesting a feature, please include:

- A clear title and description
- Use case and motivation
- Example API or behavior
- Whether you'd be willing to implement it

## Release Process

Maintainers follow these steps for releases:

1. Merge all PRs destined for the release
2. Create a release branch: `release/vX.Y.Z`
3. Update version numbers (changesets)
4. Generate changelog
5. Create a GitHub Release with release notes
6. The CI pipeline publishes to npm

## Questions?

If you have questions, feel free to:

- Open a [Discussion](https://github.com/opcpflow/opcpflow/discussions)
- Join our community chat
- Reach out to the maintainers

Thank you for contributing to OpcpFlow!
