import React from 'react'

export interface ExecutionToolbarProps {
  mode: 'edit' | 'test'
  onModeChange: (mode: 'edit' | 'test') => void
  onRunAll: () => void
  onClear: () => void
  isRunning: boolean
  hasResults: boolean
  onStep?: () => void
  onPause?: () => void
  onResume?: () => void
  canStep?: boolean
  isPaused?: boolean
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: 8,
  },
  modeGroup: {
    display: 'flex',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  modeBtn: {
    padding: '4px 14px',
    fontSize: 12,
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    lineHeight: '20px',
  },
  runBtn: {
    padding: '4px 16px',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center' as const,
    gap: 4,
    background: '#f0fdf4',
    color: '#16a34a',
  },
  runBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  clearBtn: {
    padding: '4px 14px',
    border: '1px solid #fecaca',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: '#fef2f2',
    color: '#dc2626',
  },
  pauseBtn: {
    padding: '4px 14px',
    border: '1px solid #fde68a',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: '#fffbeb',
    color: '#d97706',
  },
  stepBtn: {
    padding: '4px 14px',
    border: '1px solid #bfdbfe',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: '#eff6ff',
    color: '#2563eb',
  },
  stepBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  resumeBtn: {
    padding: '4px 14px',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: '#f0fdf4',
    color: '#16a34a',
  },
  separator: {
    width: 1,
    height: 20,
    background: '#e2e8f0',
  },
} as const

export function ExecutionToolbar(props: ExecutionToolbarProps) {
  const {
    mode, onModeChange, onRunAll, onClear, isRunning, hasResults,
    onStep, onPause, onResume, canStep, isPaused,
  } = props

  return (
    <div style={styles.container}>
      {/* Mode toggle: Edit | Test */}
      <div style={styles.modeGroup}>
        <button
          onClick={() => onModeChange('edit')}
          style={{
            ...styles.modeBtn,
            background: mode === 'edit' ? '#6366f1' : 'white',
            color: mode === 'edit' ? 'white' : '#64748b',
            fontWeight: mode === 'edit' ? 600 : 400,
            borderRight: '1px solid #e2e8f0',
          }}
        >
          Edit
        </button>
        <button
          onClick={() => onModeChange('test')}
          style={{
            ...styles.modeBtn,
            background: mode === 'test' ? '#6366f1' : 'white',
            color: mode === 'test' ? 'white' : '#64748b',
            fontWeight: mode === 'test' ? 600 : 400,
          }}
        >
          Test
        </button>
      </div>

      {mode === 'test' && (<>
      <div style={styles.separator} />

      {/* Run All button */}
      <button
        onClick={onRunAll}
        disabled={isRunning}
        style={{
          ...styles.runBtn,
          ...(isRunning ? styles.runBtnDisabled : {}),
        }}
      >
        {isRunning ? (
          <>
            <span style={{ display: 'inline-block', width: 12, height: 12 }}>
              <svg viewBox="0 0 24 24" fill="#16a34a" width={12} height={12}>
                <circle cx="12" cy="12" r="10" opacity={0.2} />
                <circle cx="12" cy="12" r="10" fill="none" stroke="#16a34a" strokeWidth={2} strokeDasharray="31.4" strokeDashoffset="0" />
              </svg>
            </span>
            Running...
          </>
        ) : (
          <>
            <span>▶</span>
            Run All
          </>
        )}
      </button>

      {/* Pause button — shown when running and not paused */}
      {isRunning && !isPaused && onPause && (
        <button onClick={onPause} style={styles.pauseBtn}>
          ⏸ Pause
        </button>
      )}

      {/* Step/Resume buttons — shown when paused */}
      {isPaused && (
        <>
          <button
            onClick={onStep}
            disabled={!canStep}
            style={{
              ...styles.stepBtn,
              ...(!canStep ? styles.stepBtnDisabled : {}),
            }}
          >
            ▶ Step
          </button>
          <button onClick={onResume} style={styles.resumeBtn}>
            ▶▶ Resume
          </button>
        </>
      )}

      {/* Clear button — shown when there are results */}
      {hasResults && !isRunning && (
        <button onClick={onClear} style={styles.clearBtn}>
          ■ Clear
        </button>
      )}
      </>)}
    </div>
  )
}
