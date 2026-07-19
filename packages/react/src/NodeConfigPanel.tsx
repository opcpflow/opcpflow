import React, { useCallback, useRef, useMemo } from 'react'
import type { DAGNode, DAGEdge, FormFieldDefinition, FormFieldGroup } from '@opcpflow/core'
import { collectAvailableVars, getPredecessors, ModelRegistry } from '@opcpflow/core'
import { useOpcpFlow } from './OpcpFlowProvider'
import { InputRefsEditor } from './InputRefsEditor'

export interface NodeConfigPanelProps {
  node: DAGNode
  labelInputRef?: React.RefObject<HTMLInputElement | null>
}

export function NodeConfigPanel({ node, labelInputRef }: NodeConfigPanelProps) {
  const { registry, doc, onUpdateNodes } = useOpcpFlow()
  const typeDef = registry.get(node.type)

  const groups = useMemo(() => (typeDef?.formGroups || [])
    .map((g) => ({
      ...g,
      fields: g.fields.filter((f) => !AUTO_FIELDS.has(f.name)),
    }))
    .filter((g) => g.fields.length > 0), [typeDef])
  const fields = useMemo(() => (typeDef?.formFields || [])
    .filter((f) => f.type !== 'refs' && !AUTO_FIELDS.has(f.name)), [typeDef])
  const hasGroups = groups.length > 0

  const docRef = useRef(doc)
  docRef.current = doc
  const nodeRef = useRef(node)
  nodeRef.current = node

  const updateNodeData = useCallback(
    (key: string, value: unknown) => {
      const currentDoc = docRef.current
      const currentNode = nodeRef.current
      onUpdateNodes(
        currentDoc.nodes.map((n) =>
          n.id === currentNode.id
            ? { ...n, data: { ...n.data, [key]: value } }
            : n,
        ),
      )
    },
    [onUpdateNodes],
  )

  const batchUpdateNodeData = useCallback(
    (updates: Record<string, unknown>) => {
      const currentDoc = docRef.current
      const currentNode = nodeRef.current
      onUpdateNodes(
        currentDoc.nodes.map((n) =>
          n.id === currentNode.id
            ? { ...n, data: { ...n.data, ...updates } }
            : n,
        ),
      )
    },
    [onUpdateNodes],
  )

  if (!typeDef) {
    return (
      <div style={panelStyle}>
        <div style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', padding: 20 }}>
          Unknown node type: <strong>{node.type}</strong>
        </div>
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      {/* Header with inline editable label */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {typeDef.icon && <span style={{ fontSize: 18, flexShrink: 0 }}>{typeDef.icon}</span>}
          <input
            ref={labelInputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={node.data.label || ''}
            onChange={(e) => updateNodeData('label', e.target.value)}
            placeholder="Label..."
            style={{
              flex: 1,
              minWidth: 0,
              padding: '4px 6px',
              fontSize: 14,
              fontWeight: 600,
              border: '1px solid transparent',
              borderRadius: 4,
              outline: 'none',
              background: 'transparent',
              color: '#1e293b',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.background = 'white'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.background = 'transparent'
              if (!e.target.value.trim()) {
                updateNodeData('label', typeDef?.label || node.type)
              }
            }}
          />
          <span style={typeBadgeStyle}>{node.type}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>ID: {node.id}</div>
      </div>

      {/* Grouped Form Sections */}
      {hasGroups
        ? groups
            .filter((g) => {
              if (!g.showIf) return true
              const raw = (node.data as any)[g.showIf.field]
              if (raw !== undefined) return raw === g.showIf.eq
              const fieldDef = typeDef?.formGroups?.flatMap(p => p.fields).find(f => f.name === g.showIf!.field)
              return (fieldDef?.defaultValue ?? '') === g.showIf.eq
            })
            .map((group, gi) => (
            <FormSection
              key={`${node.id}_${gi}`}
              group={group}
              nodeId={node.id}
              nodeData={node.data}
              updateNodeData={updateNodeData}
              batchUpdateNodeData={batchUpdateNodeData}
              edges={doc.edges}
              nodes={doc.nodes}
            />
          ))
        : fields.filter((f) => f.type !== 'refs').map((field) => (
            <div key={field.name} style={sectionStyle}>
              {field.type !== 'boolean' && (
                <Label text={field.label} required={field.required} />
              )}
              <FieldRenderer
                field={field}
                nodeId={node.id}
                nodeData={node.data}
                updateNodeData={updateNodeData}
                batchUpdateNodeData={batchUpdateNodeData}
                edges={doc.edges}
                nodes={doc.nodes}
              />
            </div>
          ))}

      {/* Available References from upstream nodes */}
      <AvailableRefs nodeId={node.id} nodes={doc.nodes} edges={doc.edges} />
    </div>
  )
}

// ── FormSection ─────────────────────────────────────────────

function FormSection({
  group,
  nodeId,
  nodeData,
  updateNodeData,
  batchUpdateNodeData,
  edges = [],
  nodes = [],
}: {
  group: FormFieldGroup
  nodeId: string
  nodeData: Record<string, unknown>
  updateNodeData: (key: string, value: unknown) => void
  batchUpdateNodeData: (updates: Record<string, unknown>) => void
  edges?: DAGEdge[]
  nodes?: DAGNode[]
}) {
  const [collapsed, setCollapsed] = React.useState(
    group.collapsible && group.defaultCollapsed,
  )
  const hasTitle = !!group.title

  return (
    <div
      style={{
        ...sectionStyle,
        borderTop: hasTitle ? '1px solid #e2e8f0' : undefined,
        marginTop: hasTitle ? 4 : 0,
        paddingTop: hasTitle ? 10 : 4,
      }}
    >
      {hasTitle && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: group.collapsible ? 'pointer' : 'default',
            marginBottom: collapsed ? 0 : 8,
            userSelect: 'none',
          }}
          onClick={() => group.collapsible && setCollapsed(!collapsed)}
        >
          <div>
            <span style={sectionTitleStyle}>{group.title}</span>
            {group.description && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                {group.description}
              </div>
            )}
          </div>
          {group.collapsible && (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {collapsed ? '▶' : '▼'}
            </span>
          )}
        </div>
      )}

      {!collapsed && (
        <>
          {group.fields.map((field) => (
            <div key={field.name} style={{ marginBottom: field.type === 'boolean' ? 0 : 8 }}>
              {field.type !== 'boolean' && (
                <Label text={field.label} required={field.required} />
              )}
              <FieldRenderer
                field={field}
                nodeId={nodeId}
                nodeData={nodeData}
                updateNodeData={updateNodeData}
                batchUpdateNodeData={batchUpdateNodeData}
                edges={edges}
                nodes={nodes}
              />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ── FieldRenderer ─────────────────────────────────────────

function FieldRenderer({
  field,
  nodeId,
  nodeData,
  updateNodeData,
  batchUpdateNodeData,
  edges = [],
  nodes = [],
}: {
  field: FormFieldDefinition
  nodeId: string
  nodeData: Record<string, unknown>
  updateNodeData: (key: string, value: unknown) => void
  batchUpdateNodeData: (updates: Record<string, unknown>) => void
  edges?: DAGEdge[]
  nodes?: DAGNode[]
}) {
  const value = nodeData[field.name]
  const fieldValue = value ?? field.defaultValue ?? ''

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={fieldValue as string}
          onChange={(e) => updateNodeData(field.name, e.target.value)}
          placeholder={field.placeholder}
          style={inputStyle}
        />
      )

    case 'textarea':
      return (
        <textarea
          value={fieldValue as string}
          onChange={(e) => updateNodeData(field.name, e.target.value)}
          placeholder={field.placeholder}
          rows={12}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 240 }}
        />
      )

    case 'select':
      return <DynamicSelect field={field} fieldValue={fieldValue as string} nodeData={nodeData} updateNodeData={updateNodeData} batchUpdateNodeData={batchUpdateNodeData} />

    case 'number':
      return (
        <input
          type="number"
          value={fieldValue as number}
          onChange={(e) =>
            updateNodeData(field.name, parseFloat(e.target.value) || 0)
          }
          placeholder={field.placeholder}
          style={inputStyle}
        />
      )

    case 'boolean':
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={Boolean(fieldValue)}
            onChange={(e) => updateNodeData(field.name, e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: '#475569' }}>{field.label}</span>
        </label>
      )

    case 'json':
      return (
        <textarea
          value={
            typeof fieldValue === 'object'
              ? JSON.stringify(fieldValue, null, 2)
              : String(fieldValue || '')
          }
          onChange={(e) => {
            try {
              updateNodeData(field.name, JSON.parse(e.target.value))
            } catch {
              updateNodeData(field.name, e.target.value)
            }
          }}
          placeholder={field.placeholder || 'Enter JSON...'}
          rows={5}
          style={{
            ...inputStyle,
            fontFamily: '"SF Mono", "Consolas", monospace',
            fontSize: 11,
            resize: 'vertical',
            minHeight: 240,
          }}
        />
      )

    case 'employee':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input
            type="text"
            value={fieldValue as string}
            onChange={(e) => updateNodeData(field.name, e.target.value)}
            placeholder={field.placeholder || 'Employee ID...'}
            style={inputStyle}
          />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Enter the employee ID to assign
          </span>
        </div>
      )

    case 'refs':
      return (
        <InputRefsEditor
          nodeId={nodeId}
          value={(fieldValue as string[]) || []}
          onChange={(refs) => updateNodeData(field.name, refs)}
          edges={edges}
          nodes={nodes}
        />
      )

    default:
      return (
        <input
          type="text"
          value={fieldValue as string}
          onChange={(e) => updateNodeData(field.name, e.target.value)}
          style={inputStyle}
        />
      )
  }
}

// ── Sub-components ────────────────────────────────────────

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 4 }}>
      {text}
      {required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
    </div>
  )
}

// ── AvailableRefs ───────────────────────────────────────────

function AvailableRefs({ nodeId, nodes, edges }: {
  nodeId: string; nodes: DAGNode[]; edges: DAGEdge[]
}) {
  const refs = useMemo(() => {
    const allVars = collectAvailableVars(nodes, edges)
    const upstreamIds = new Set<string>()
    function walk(id: string) {
      const preds = getPredecessors(id, edges)
      for (const p of preds) { if (!upstreamIds.has(p)) { upstreamIds.add(p); walk(p) } }
    }
    walk(nodeId)
    const result: Array<{ nodeLabel: string; key: string }> = []
    for (const [nId, varNames] of allVars) {
      if (!upstreamIds.has(nId) || varNames.length === 0) continue
      const nd = nodes.find((n) => n.id === nId)
      const label = nd?.data?.label as string || nId
      for (const v of varNames) result.push({ nodeLabel: label, key: v })
    }
    return result
  }, [nodeId, nodes, edges])

  if (refs.length === 0) return null

  return (
    <div style={{ ...sectionStyle, borderTop: '1px solid #e2e8f0', marginTop: 4, paddingTop: 10 }}>
      <span style={{ ...sectionTitleStyle, display: 'block', marginBottom: 8 }}>
        Available References
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {refs.map((r, i) => (
          <span key={i} title={`from ${r.nodeLabel}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 7px', backgroundColor: '#f0fdf4', color: '#16a34a',
            fontSize: 11, borderRadius: 4,
            fontFamily: '"SF Mono", "Consolas", monospace',
          }}>
            {'{{'}{r.key}{'}}'}
            <span style={{ fontSize: 9, color: '#94a3b8' }}>from {r.nodeLabel}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── DynamicSelect ────────────────────────────────────────────

const CUSTOM_OPTION_VALUE = '__custom__'

function DynamicSelect({
  field,
  fieldValue,
  nodeData,
  updateNodeData,
  batchUpdateNodeData,
}: {
  field: FormFieldDefinition
  fieldValue: string
  nodeData: Record<string, unknown>
  updateNodeData: (key: string, value: unknown) => void
  batchUpdateNodeData: (updates: Record<string, unknown>) => void
}) {
  const options = useMemo(() => {
    if (field.dynamicOptions === 'model_registry') {
      const registered = ModelRegistry.getAll()
      if (registered.length === 0) {
        return [{ label: 'Custom...', value: CUSTOM_OPTION_VALUE }]
      }
      return [...registered, { label: 'Custom...', value: CUSTOM_OPTION_VALUE }]
    }
    return field.options || []
  }, [field.dynamicOptions, field.options])

  const isCustom = fieldValue === CUSTOM_OPTION_VALUE ||
    (field.dynamicOptions === 'model_registry' && fieldValue !== '' && !options.some((o) => o.value === fieldValue))

  // Ensure selected value matched to an option (case-insensitive fallback for model_registry)
  const matchedValue = useMemo(() => {
    if (isCustom) return CUSTOM_OPTION_VALUE
    if (!fieldValue || fieldValue === '') return ''
    const exact = options.find((o) => o.value === fieldValue)
    if (exact) return fieldValue
    if (field.dynamicOptions === 'model_registry') {
      const ci = options.find((o) => o.value.toLowerCase() === fieldValue.toLowerCase())
      if (ci) return ci.value
    }
    return CUSTOM_OPTION_VALUE
  }, [fieldValue, options, isCustom, field.dynamicOptions])

  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    updateNodeData(field.name, val)
  }, [field.name, updateNodeData])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <select
        value={matchedValue}
        onChange={handleSelectChange}
        style={{
          ...inputStyle,
          cursor: 'pointer',
          appearance: 'auto',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 2px #6366f120' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.boxShadow = 'none' }}
      >
        {(!fieldValue || fieldValue === '') && (
          <option value="" disabled>
            {field.placeholder || 'Select...'}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isCustom && field.dynamicOptions === 'model_registry' && (
        <>
          <input
            type="text"
            value={isCustom && fieldValue !== CUSTOM_OPTION_VALUE ? fieldValue : ''}
            onChange={(e) => updateNodeData(field.name, e.target.value)}
            placeholder="Enter custom model name..."
            style={inputStyle}
          />
          <input
            type="text"
            value={(nodeData.api_endpoint as string) || ''}
            onChange={(e) => updateNodeData('api_endpoint', e.target.value)}
            placeholder="https://api.openai.com/v1/chat/completions"
            style={inputStyle}
          />
          <input
            type="text"
            value={(nodeData.api_key as string) || ''}
            onChange={(e) => updateNodeData('api_key', e.target.value)}
            placeholder="API Key (sk-...) or leave blank for registry provider key"
            style={inputStyle}
          />
        </>
      )}
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  backgroundColor: 'white',
}

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #e2e8f0',
}

const typeBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 4,
  backgroundColor: '#f1f5f9',
  color: '#64748b',
}

const sectionStyle: React.CSSProperties = {
  padding: '8px 16px',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  color: '#94a3b8',
  letterSpacing: '0.5px',
}

/**
 * Auto-system fields that are resolved by the engine/Commander and
 * not displayed in the config panel.
 *
 * Any node definition that wants an auto field hidden should simply
 * not include it in its formGroups/formFields.
 */
const AUTO_FIELDS = new Set([
  'execution_mode', 'input_refs', 'output_key',
  'max_retries', 'timeout_seconds', 'replan_on_failure',
  'assigned_employee_id', 'required_skill',
])

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  fontSize: 13,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: 'white',
  color: '#1e293b',
  transition: 'border-color 0.15s',
}
