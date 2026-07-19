import React, { useMemo, useCallback, useRef } from 'react'
import type { DAGNode, DAGEdge } from '@opcpflow/core'
import { collectAvailableVars } from '@opcpflow/core'
import { getPredecessors } from '@opcpflow/core'

export interface InputRefsEditorProps {
  nodeId: string
  value: string[]
  onChange: (refs: string[]) => void
  edges: DAGEdge[]
  nodes: DAGNode[]
}

export function InputRefsEditor({
  nodeId,
  value,
  onChange,
  edges,
  nodes,
}: InputRefsEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const availableVars = useMemo(() => {
    const vars = collectAvailableVars(nodes, edges)
    const upstreamIds = new Set<string>()

    function collectUpstream(id: string) {
      const preds = getPredecessors(id, edges)
      for (const predId of preds) {
        if (!upstreamIds.has(predId)) {
          upstreamIds.add(predId)
          collectUpstream(predId)
        }
      }
    }

    collectUpstream(nodeId)

    const result: Array<{ nodeId: string; nodeLabel: string; varName: string; fullRef: string }> = []
    for (const [nId, varNames] of vars) {
      if (upstreamIds.has(nId)) {
        const node = nodes.find((n) => n.id === nId)
        const nodeLabel = node?.data?.label || nId
        for (const varName of varNames) {
          result.push({
            nodeId: nId,
            nodeLabel,
            varName,
            fullRef: `\${${varName}}`,
          })
        }
      }
    }
    return result
  }, [nodeId, nodes, edges])

  const toggleRef = useCallback(
    (fullRef: string) => {
      if (value.includes(fullRef)) {
        onChange(value.filter((r) => r !== fullRef))
      } else {
        onChange([...value, fullRef])
      }
    },
    [value, onChange],
  )

  const addCustomRef = useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) return
      const val = input.value.trim()
      if (val && !value.includes(val)) {
        onChange([...value, val])
      }
      input.value = ''
    },
    [value, onChange],
  )

  const hasUpstreamVars = availableVars.length > 0

  return (
    <div>
      {!hasUpstreamVars ? (
        <div
          style={{
            padding: '12px 8px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: 12,
            border: '1px dashed #d1d5db',
            borderRadius: 6,
          }}
        >
          No upstream variables available.
          <br />
          Connect upstream nodes with outputs first.
        </div>
      ) : (
        <div
          style={{
            border: '1px solid #d1d5db',
            borderRadius: 6,
            maxHeight: 160,
            overflowY: 'auto',
          }}
        >
          {groupBy(availableVars, 'nodeId').map(([nId, vars]) => (
            <div key={nId}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '4px 8px',
                  backgroundColor: '#f8fafc',
                  color: '#64748b',
                  borderBottom: '1px solid #e2e8f0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}
              >
                {vars[0].nodeLabel}
              </div>
              {vars.map((v) => (
                <label
                  key={v.fullRef}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 8px',
                    cursor: 'pointer',
                    fontSize: 12,
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.1s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f8fafc'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(v.fullRef)}
                    onChange={() => toggleRef(v.fullRef)}
                    style={{ width: 14, height: 14, cursor: 'pointer' }}
                  />
                  <code
                    style={{
                      fontSize: 11,
                      fontFamily: '"SF Mono", "Consolas", monospace',
                      color: '#6366f1',
                      backgroundColor: '#eef2ff',
                      padding: '1px 4px',
                      borderRadius: 3,
                    }}
                  >
                    {v.fullRef}
                  </code>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>
                    {v.varName}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Custom entry */}
      <div style={{ marginTop: 8 }}>
        <div
          style={{
            display: 'flex',
            gap: 4,
            alignItems: 'center',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Add custom ref..."
            style={{
              flex: 1,
              padding: '5px 8px',
              fontSize: 12,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              outline: 'none',
              fontFamily: '"SF Mono", "Consolas", monospace',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addCustomRef(e.currentTarget)
              }
            }}
          />
          <button
            onClick={() => addCustomRef(inputRef.current)}
            style={{
              padding: '5px 10px',
              fontSize: 12,
              backgroundColor: '#f1f5f9',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Active refs */}
      {value.length > 0 && (
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
          }}
        >
          {value.map((ref) => (
            <span
              key={ref}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                backgroundColor: '#eef2ff',
                color: '#4338ca',
                fontSize: 11,
                borderRadius: 12,
                fontFamily: '"SF Mono", "Consolas", monospace',
              }}
            >
              {ref}
              <button
                onClick={() => onChange(value.filter((r) => r !== ref))}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#4338ca',
                  fontSize: 14,
                  padding: 0,
                  lineHeight: 1,
                  opacity: 0.6,
                }}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function groupBy<T, K extends string>(
  items: T[],
  keyFn: ((item: T) => K) | keyof T,
): Array<[K, T[]]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = (typeof keyFn === 'function' ? keyFn(item) : item[keyFn as keyof T]) as unknown as K
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries())
}
