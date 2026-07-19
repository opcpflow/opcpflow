import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ExecutionLogPanel } from '../ExecutionLogPanel'
import type { DAGExecutionState, ExecutionRecord } from '../hooks/useExecution'

const idleState: DAGExecutionState = { status: 'idle', nodeStates: {} }
const runningState: DAGExecutionState = {
  status: 'running',
  nodeStates: { a: { status: 'running' }, b: { status: 'pending' } },
  startTime: Date.now(),
}
const completedState: DAGExecutionState = {
  status: 'completed',
  nodeStates: {
    a: { status: 'passed', result: { output: 'ok', metrics: { startTime: 0, endTime: 1, durationMs: 1 } } },
    b: { status: 'passed', result: { output: 'done', metrics: { startTime: 0, endTime: 1, durationMs: 1 } } },
  },
  startTime: Date.now() - 100,
  endTime: Date.now(),
}
const failedState: DAGExecutionState = {
  status: 'completed',
  nodeStates: {
    a: { status: 'passed', result: { output: 'ok', metrics: { startTime: 0, endTime: 1, durationMs: 1 } } },
    b: { status: 'failed', error: 'Something went wrong' },
    c: { status: 'skipped', error: 'Upstream node failed' },
  },
  startTime: Date.now() - 100,
  endTime: Date.now(),
}

const historyRecord: ExecutionRecord = {
  id: 'exec_1',
  timestamp: Date.now(),
  state: completedState,
}

describe('ExecutionLogPanel', () => {
  it('should show empty state when idle and no history', () => {
    const { getByText } = render(
      <ExecutionLogPanel execState={idleState} history={[]} pinnedData={{}} />
    )
    expect(getByText('Run the DAG to see execution results')).toBeDefined()
  })

  it('should show running state', () => {
    const { getByText } = render(
      <ExecutionLogPanel execState={runningState} history={[]} pinnedData={{}} />
    )
    expect(getByText('Running...')).toBeDefined()
  })

  it('should show completed state with passing nodes', () => {
    const { getByText } = render(
      <ExecutionLogPanel execState={completedState} history={[]} pinnedData={{}} />
    )
    expect(getByText(/2\/2 passed/)).toBeDefined()
  })

  it('should show failed state with error count', () => {
    const { getByText } = render(
      <ExecutionLogPanel execState={failedState} history={[]} pinnedData={{}} />
    )
    const summary = getByText(/1\/3 passed/)
    expect(summary).toBeDefined()
  })

  it('should show history dropdown when multiple records', () => {
    const history: ExecutionRecord[] = [
      historyRecord,
      { id: 'exec_2', timestamp: Date.now(), state: completedState },
    ]
    const { container } = render(
      <ExecutionLogPanel execState={completedState} history={history} pinnedData={{}} />
    )
    const select = container.querySelector('select')
    expect(select).toBeDefined()
    expect(select?.options.length).toBe(3) // Latest + 2 history
  })

  it('should show empty state even with history if idle', () => {
    const { getByText } = render(
      <ExecutionLogPanel
        execState={idleState}
        history={[historyRecord]}
        pinnedData={{}}
      />
    )
    // Should NOT show "Run the DAG" since there's history
    // Instead should show the history content
    expect(getByText('Execution Log')).toBeDefined()
  })

  it('should show pin badge for pinned nodes', () => {
    const { container } = render(
      <ExecutionLogPanel
        execState={completedState}
        history={[]}
        pinnedData={{ a: { output: 'pinned', pinnedAt: Date.now() } }}
      />
    )
    expect(container.textContent).toContain('📌')
  })
})
