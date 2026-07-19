import React from 'react'
import { Link } from 'react-router-dom'

const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '0 24px',
}

const heroStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '80px 0 60px',
}

const heroTitleStyle: React.CSSProperties = {
  fontSize: 52,
  fontWeight: 800,
  color: '#0f172a',
  lineHeight: 1.1,
  marginBottom: 16,
  letterSpacing: '-1.5px',
}

const heroAccentStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const heroSubStyle: React.CSSProperties = {
  fontSize: 20,
  color: '#64748b',
  maxWidth: 600,
  margin: '0 auto 32px',
  lineHeight: 1.6,
}

const codeBlockStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  color: '#e2e8f0',
  padding: '16px 24px',
  borderRadius: 12,
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontSize: 14,
  textAlign: 'left',
  display: 'inline-block',
  margin: '0 auto',
  lineHeight: 1.8,
  maxWidth: '100%',
  overflowX: 'auto',
}

const btnPrimaryStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 32px',
  backgroundColor: '#4f46e5',
  color: 'white',
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 600,
  textDecoration: 'none',
  transition: 'background 0.15s, transform 0.1s',
  border: 'none',
  cursor: 'pointer',
}

const btnSecondaryStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '14px 32px',
  backgroundColor: 'white',
  color: '#1e293b',
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 600,
  textDecoration: 'none',
  border: '1px solid #d1d5db',
  transition: 'background 0.15s',
}

const featuresSectionStyle: React.CSSProperties = {
  padding: '60px 0',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: '#0f172a',
  textAlign: 'center',
  marginBottom: 48,
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 24,
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 28,
  border: '1px solid #e2e8f0',
  transition: 'box-shadow 0.15s, transform 0.1s',
}

const cardIconStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  marginBottom: 16,
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: '#0f172a',
  marginBottom: 8,
}

const cardDescStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#64748b',
  lineHeight: 1.6,
}

const footerStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 0',
  borderTop: '1px solid #e2e8f0',
  color: '#94a3b8',
  fontSize: 13,
}

const features = [
  {
    icon: '\u{1F3A8}',
    color: '#eef2ff',
    title: 'Visual DAG Editor',
    desc: 'Drag-and-drop interface for building complex workflow DAGs. Real-time validation and auto-layout.',
  },
  {
    icon: '\u{2699}\u{FE0F}',
    color: '#f0fdf4',
    title: 'Built-in Execution Engine',
    desc: 'Three execution modes: pipeline, dispatch, and dynamic. Support for retry, timeout, and replanning.',
  },
  {
    icon: '\u{1F9E0}',
    color: '#fef3c7',
    title: '11 Nodes for AI Workflows',
    desc: 'LLM calls, API requests, task decomposition, knowledge search, MCP tools, merge, verification, and more.',
  },
  {
    icon: '\u{1F527}',
    color: '#fce7f3',
    title: 'Extensible Plugin System',
    desc: 'Custom node SDK, community marketplace, MCP tool integration, and flexible node registry.',
  },
]

const nodeItems = [
  { type: 'Trigger', desc: 'DAG execution start point', color: '#10b981' },
  { type: 'Task Decompose', desc: 'Split commands into parallel sub-tasks', color: '#f59e0b' },
  { type: 'Dynamic', desc: 'Runtime sub-DAG generation with D4 evolution', color: '#8b5cf6' },
  { type: 'LLM Call', desc: 'Invoke any LLM model', color: '#6366f1' },
  { type: 'Knowledge', desc: 'Multi-source knowledge retrieval', color: '#06b6d4' },
  { type: 'Strategy', desc: 'Persona, rules, and behavior guidelines', color: '#ec4899' },
  { type: 'API Call', desc: 'HTTP REST/gRPC requests', color: '#f59e0b' },
  { type: 'MCP Tool', desc: 'MCP protocol tool integration', color: '#14b8a6' },
  { type: 'Merge', desc: 'Multi-type asset composition', color: '#84cc16' },
  { type: 'Verification', desc: 'SGV adversarial quality check', color: '#ef4444' },
  { type: 'Output', desc: 'Final deliverable output', color: '#64748b' },
]

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section style={heroStyle}>
        <div style={containerStyle}>
          <h1 style={heroTitleStyle}>
            <span style={heroAccentStyle}>Open DAG</span>
            <br />
            Workflow Framework
          </h1>
          <p style={heroSubStyle}>
            Build, execute, and monitor complex workflow pipelines with a visual editor
            and a powerful execution engine. Open-source and extensible by design.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 40 }}>
            <Link
              to="/editor"
              style={btnPrimaryStyle}
              onMouseOver={(e) => { e.currentTarget.style.background = '#4338ca' }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#4f46e5' }}
            >
              Try Online Editor
            </Link>
            <a
              href="https://github.com/opcpflow/opcpflow"
              target="_blank"
              rel="noopener noreferrer"
              style={btnSecondaryStyle}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc' }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
            >
              View on GitHub
            </a>
          </div>

          <div style={codeBlockStyle}>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Quickstart</div>
            <span style={{ color: '#22c55e' }}>$</span> npx @opcpflow/create-app my-dag-app<br />
            <span style={{ color: '#22c55e' }}>$</span> cd my-dag-app<br />
            <span style={{ color: '#22c55e' }}>$</span> pnpm dev
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={featuresSectionStyle}>
        <div style={containerStyle}>
          <h2 style={sectionTitleStyle}>Why OpcpFlow?</h2>
          <div style={gridStyle}>
            {features.map((feature, i) => (
              <div
                key={i}
                style={cardStyle}
                onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                onMouseOut={(e) => { e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ ...cardIconStyle, backgroundColor: feature.color }}>
                  {feature.icon}
                </div>
                <div style={cardTitleStyle}>{feature.title}</div>
                <div style={cardDescStyle}>{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Node Types Preview */}
      <section style={{ ...featuresSectionStyle, backgroundColor: 'white' }}>
        <div style={containerStyle}>
          <h2 style={sectionTitleStyle}>Preset Node Types</h2>
          <div style={{ ...gridStyle, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {nodeItems.map((node, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 16,
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
                onMouseOut={(e) => { e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  backgroundColor: node.color, flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{node.type}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{node.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={containerStyle}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
            Ready to build your workflow?
          </h2>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 28 }}>
            Get started in minutes with our CLI or try the online editor.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link to="/editor" style={btnPrimaryStyle}
              onMouseOver={(e) => { e.currentTarget.style.background = '#4338ca' }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#4f46e5' }}
            >
              Launch Editor
            </Link>
            <a
              href="https://www.npmjs.com/package/@opcpflow/create-app"
              target="_blank"
              rel="noopener noreferrer"
              style={btnSecondaryStyle}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc' }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
            >
              npm install
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={footerStyle}>
        <div style={containerStyle}>
          OpcpFlow is open-source software. Built with care by the OpcpFlow team.
          <br />
          <a href="https://github.com/opcpflow/opcpflow" style={{ color: '#4f46e5', textDecoration: 'none' }}>
            GitHub
          </a>
          {' · '}
          <a href="https://npmjs.com/package/@opcpflow/core" style={{ color: '#4f46e5', textDecoration: 'none' }}>
            npm
          </a>
          {' · '}
          <Link to="/docs" style={{ color: '#4f46e5', textDecoration: 'none' }}>Documentation</Link>
        </div>
      </footer>
    </div>
  )
}
