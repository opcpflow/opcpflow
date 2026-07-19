import React, { useMemo, useCallback } from 'react'
import type { NodeRegistry, NodeTypeDefinition } from '@opcpflow/core'

const defaultIcons: Record<string, string> = {
  trigger: '▶',
  'task_decompose': '🔀',
  'dynamic': '⚡',
  'llm_call': '\u{1F9E0}',
  'api_call': '\u{1F310}',
  'knowledge': '\u{1F50D}',
  verification: '✅',
  output: '\u{1F4E4}',
  'mcp_tool': '\u{1F527}',
  strategy: '📋',
  merge: '🔗',
}

export interface NodePaletteProps {
  registry: NodeRegistry
  onDragStart: (nodeType: string) => void
  filterCategory?: string
  searchQuery?: string
}

export function NodePalette({ registry, onDragStart, filterCategory, searchQuery }: NodePaletteProps) {
  const categories = useMemo(() => {
    return registry.getCategories()
  }, [registry])

  const filteredDefs = useCallback(
    (category: string): NodeTypeDefinition[] => {
      let defs = registry.getByCategory(category)
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        defs = defs.filter(
          (d) =>
            d.label.toLowerCase().includes(q) ||
            d.type.toLowerCase().includes(q) ||
            d.description?.toLowerCase().includes(q),
        )
      }
      return defs
    },
    [registry, searchQuery],
  )

  const visibleCategories = useMemo(() => {
    if (filterCategory) {
      return categories.filter((c) => c === filterCategory)
    }
    return categories
  }, [categories, filterCategory])

  return (
    <div style={{ padding: 8 }}>
      {visibleCategories.map((category) => {
        const defs = filteredDefs(category)
        if (defs.length === 0) return null

        return (
          <div key={category} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#94a3b8',
                marginBottom: 6,
                padding: '0 4px',
              }}
            >
              {category}
            </div>
            {defs.map((def) => (
              <div
                key={def.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', def.type)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => onDragStart(def.type)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'grab',
                  transition: 'background 0.15s',
                  userSelect: 'none',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f1f5f9'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Color indicator */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: def.color || '#6366f1',
                    flexShrink: 0,
                  }}
                />
                {/* Icon */}
                <span style={{ fontSize: 16, lineHeight: 1 }}>
                  {def.icon || defaultIcons[def.type] || '\u{1F4CB}'}
                </span>
                {/* Label */}
                <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                  {def.label}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
