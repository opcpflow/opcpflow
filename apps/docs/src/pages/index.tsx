import React from 'react'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import Heading from '@theme/Heading'

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <header
      style={{
        backgroundColor: '#0f172a',
        color: 'white',
        padding: '80px 0',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
        <Heading as="h1" style={{ fontSize: 48, fontWeight: 800, marginBottom: 16, letterSpacing: '-1.5px' }}>
          {siteConfig.title}
        </Heading>
        <p style={{ fontSize: 20, color: '#94a3b8', marginBottom: 32 }}>
          {siteConfig.tagline} &mdash; Build, execute, and monitor complex workflow
          pipelines with a visual editor and a powerful execution engine.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link
            className="button button--primary button--lg"
            to="/getting-started/quickstart"
          >
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/concepts/dag"
          >
            Learn the Concepts
          </Link>
        </div>
      </div>
    </header>
  )
}

function FeatureCard({ title, description, link }: { title: string; description: string; link: string }) {
  return (
    <div style={{ padding: 24 }}>
      <Heading as="h3" style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
        <Link to={link} style={{ color: 'var(--ifm-color-primary)', textDecoration: 'none' }}>
          {title}
        </Link>
      </Heading>
      <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>{description}</p>
    </div>
  )
}

export default function Home(): JSX.Element {
  return (
    <Layout
      title="OpcpFlow Documentation"
      description="Documentation for OpcpFlow - Open DAG Workflow Framework"
    >
      <HomepageHeader />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          <FeatureCard
            title="Quickstart"
            description="Get started with OpcpFlow in 3 steps. Install, create, and run your first DAG."
            link="/getting-started/quickstart"
          />
          <FeatureCard
            title="DAG Concepts"
            description="Learn about the Directed Acyclic Graph model and how OpcpFlow represents workflows."
            link="/concepts/dag"
          />
          <FeatureCard
            title="Execution Modes"
            description="Learn about pipeline, dispatch, and dynamic execution modes in OpcpFlow."
            link="/concepts/execution-modes"
          />
          <FeatureCard
            title="Input Refs"
            description="Understand how InputRefs route variables precisely between DAG nodes."
            link="/concepts/input-refs"
          />
          <FeatureCard
            title="Context Store"
            description="Three-level caching (L1/L2/L3) for efficient data sharing across DAG execution."
            link="/concepts/context-store"
          />
          <FeatureCard
            title="Create App"
            description="Scaffold a new OpcpFlow project in seconds with the create-app CLI."
            link="/getting-started/create-app"
          />
        </div>
      </main>
    </Layout>
  )
}
