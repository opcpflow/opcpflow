import React from 'react'

// Custom form fields for the sentiment-analysis node
interface CustomFormProps {
  data: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export function SentimentForm({ data, onChange }: CustomFormProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Model</label>
        <select
          value={(data.model as string) || 'default'}
          onChange={(e) => onChange('model', e.target.value)}
          style={{
            width: '100%', padding: '6px 8px', borderRadius: 6,
            border: '1px solid #e2e8f0', fontSize: 13,
          }}
        >
          <option value="default">Default</option>
          <option value="precise">Precise</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Instructions</label>
        <textarea
          value={(data.instructions as string) || ''}
          onChange={(e) => onChange('instructions', e.target.value)}
          rows={3}
          style={{
            width: '100%', padding: '6px 8px', borderRadius: 6,
            border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical',
          }}
        />
      </div>
    </div>
  )
}
