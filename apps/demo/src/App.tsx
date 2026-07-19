import React from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import EditorPage from './pages/EditorPage'
import DocsPage from './pages/DocsPage'

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/editor', label: 'Editor' },
  { path: '/docs', label: 'Docs' },
]

const linkStyle: React.CSSProperties = {
  textDecoration: 'none',
  color: '#64748b',
  fontSize: 14,
  fontWeight: 500,
  padding: '6px 14px',
  borderRadius: 6,
  transition: 'background 0.15s, color 0.15s',
}

const activeLinkStyle: React.CSSProperties = {
  ...linkStyle,
  color: '#4f46e5',
  backgroundColor: '#eef2ff',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  height: 56,
  borderBottom: '1px solid #e2e8f0',
  backgroundColor: 'white',
  position: 'sticky',
  top: 0,
  zIndex: 100,
}

const logoStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: '#1e293b',
  textDecoration: 'none',
  letterSpacing: '-0.5px',
}

const logoAccent: React.CSSProperties = {
  color: '#6366f1',
}

const githubBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  textDecoration: 'none',
  color: '#1e293b',
  fontSize: 13,
  fontWeight: 500,
  transition: 'background 0.15s',
}

function NavLink({ path, label, currentPath }: { path: string; label: string; currentPath: string }) {
  const isActive = currentPath === path || (path !== '/' && currentPath.startsWith(path))
  return (
    <Link to={path} style={isActive ? activeLinkStyle : linkStyle}
      onMouseOver={(e) => { if (!isActive) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b' }}}
      onMouseOut={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' }}}
    >
      {label}
    </Link>
  )
}

function Layout() {
  const location = useLocation()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link to="/" style={logoStyle}>
            <span style={logoAccent}>Opcp</span>Flow
          </Link>
          <nav style={{ display: 'flex', gap: 4 }}>
            {navItems.map((item) => (
              <NavLink key={item.path} path={item.path} label={item.label} currentPath={location.pathname} />
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href="https://github.com/opcpflow/opcpflow"
            target="_blank"
            rel="noopener noreferrer"
            style={githubBtnStyle}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </a>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
