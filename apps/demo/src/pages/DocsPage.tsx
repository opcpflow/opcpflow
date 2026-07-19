import React from 'react'
import { Link } from 'react-router-dom'

const containerStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: '0 auto',
  padding: '40px 24px 80px',
}

const titleStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  color: '#0f172a',
  marginBottom: 8,
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 16,
  color: '#64748b',
  marginBottom: 40,
}

const sectionStyle: React.CSSProperties = {
  marginBottom: 40,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: '#0f172a',
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: '1px solid #e2e8f0',
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: 10,
  padding: 20,
  border: '1px solid #e2e8f0',
  marginBottom: 12,
  transition: 'box-shadow 0.15s',
  display: 'block',
  textDecoration: 'none',
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#0f172a',
  marginBottom: 4,
}

const cardDescStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#64748b',
  lineHeight: 1.5,
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  backgroundColor: '#eef2ff',
  color: '#4f46e5',
  marginLeft: 8,
}

const externalLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  color: '#4f46e5',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 500,
}

interface DocCardProps {
  title: string
  desc: string
  badge?: string
  href: string
}

function DocCard({ title, desc, badge, href }: DocCardProps) {
  const isExternal = href.startsWith('http')
  const Wrapper = isExternal ? 'a' : Link
  const props = isExternal
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { to: href }

  return (
    <Wrapper
      {...props}
      style={cardStyle}
      onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
      onMouseOut={(e) => { e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={cardTitleStyle}>
        {title}
        {badge && <span style={badgeStyle}>{badge}</span>}
        {isExternal && <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8' }}>↗</span>}
      </div>
      <div style={cardDescStyle}>{desc}</div>
    </Wrapper>
  )
}

export default function DocsPage() {
  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Documentation</h1>
      <p style={subtitleStyle}>
        API references, guides, and examples for building with OpcpFlow.
        The full documentation site is available at{' '}
        <a href="https://github.com/opcpflow/opcpflow" style={{ color: '#4f46e5' }}>github.com/opcpflow/opcpflow</a>.
      </p>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Getting Started</h2>
        <DocCard
          title="Quickstart"
          desc="Set up OpcpFlow in 3 steps: install, create, and run your first DAG."
          href="https://github.com/opcpflow/opcpflow/getting-started/quickstart"
        />
        <DocCard
          title="Installation"
          desc="Install OpcpFlow packages via npm, pnpm, or yarn."
          href="https://github.com/opcpflow/opcpflow/getting-started/installation"
        />
        <DocCard
          title="Create App CLI"
          desc="Scaffold a new OpcpFlow project with the interactive CLI."
          href="https://github.com/opcpflow/opcpflow/getting-started/create-app"
        />
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Core Concepts</h2>
        <DocCard
          title="DAG"
          desc="Directed Acyclic Graph concepts and how OpcpFlow models workflows."
          href="https://github.com/opcpflow/opcpflow/concepts/dag"
        />
        <DocCard
          title="Execution Modes"
          desc="Pipeline, dispatch, and dynamic execution strategies explained."
          href="https://github.com/opcpflow/opcpflow/concepts/execution-modes"
        />
        <DocCard
          title="InputRefs"
          desc="Variable routing between DAG nodes using the template syntax."
          href="https://github.com/opcpflow/opcpflow/concepts/input-refs"
        />
        <DocCard
          title="ContextStore"
          desc="Three-level caching architecture for data sharing across nodes."
          href="https://github.com/opcpflow/opcpflow/concepts/context-store"
        />
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Packages</h2>
        <DocCard
          title="@opcpflow/core"
          desc="Core types, validation, serialization, topology, and variable engine."
          href="https://github.com/opcpflow/opcpflow/packages/core"
          badge="core"
        />
        <DocCard
          title="@opcpflow/react"
          desc="React components for building DAG editors with xyflow."
          href="https://github.com/opcpflow/opcpflow/packages/react"
          badge="react"
        />
        <DocCard
          title="@opcpflow/nodes"
          desc="11 preset node types for AI agent assembly."
          href="https://github.com/opcpflow/opcpflow/packages/nodes"
          badge="nodes"
        />
        <DocCard
          title="@opcpflow/engine"
          desc="DAG execution engine with Ready Frontier algorithm."
          href="https://github.com/opcpflow/opcpflow/packages/engine"
          badge="engine"
        />
        <DocCard
          title="@opcpflow/commander"
          desc="Enterprise workforce commander for DAG orchestration."
          href="https://github.com/opcpflow/opcpflow/packages/commander"
          badge="commander"
        />
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Guides & Examples</h2>
        <DocCard
          title="Custom Nodes"
          desc="Create custom node types with the OpcpFlow node SDK."
          href="https://github.com/opcpflow/opcpflow/guides/custom-nodes"
        />
        <DocCard
          title="Migration from n8n"
          desc="Migrate your existing n8n workflows to OpcpFlow."
          href="https://github.com/opcpflow/opcpflow/guides/migration-from-n8n"
        />
        <DocCard
          title="Simple Pipeline"
          desc="End-to-end example of a simple data pipeline DAG."
          href="https://github.com/opcpflow/opcpflow/examples/simple-pipeline"
        />
        <DocCard
          title="Branching"
          desc="Condition branching and switch patterns in DAGs."
          href="https://github.com/opcpflow/opcpflow/examples/branching"
        />
        <DocCard
          title="Parallel Processing"
          desc="Parallel execution with parallel gate and sync barrier nodes."
          href="https://github.com/opcpflow/opcpflow/examples/parallel"
        />
      </div>

      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>API Reference</h2>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          Detailed API documentation is available on the full docs site.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href="https://github.com/opcpflow/opcpflow/packages/core" style={externalLinkStyle}>
            @opcpflow/core ↗
          </a>
          <a href="https://github.com/opcpflow/opcpflow/packages/react" style={externalLinkStyle}>
            @opcpflow/react ↗
          </a>
          <a href="https://github.com/opcpflow/opcpflow/packages/nodes" style={externalLinkStyle}>
            @opcpflow/nodes ↗
          </a>
          <a href="https://github.com/opcpflow/opcpflow/packages/engine" style={externalLinkStyle}>
            @opcpflow/engine ↗
          </a>
          <a href="https://github.com/opcpflow/opcpflow/packages/commander" style={externalLinkStyle}>
            @opcpflow/commander ↗
          </a>
        </div>
      </div>
    </div>
  )
}
