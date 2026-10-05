import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  handlers: null as any,
  startRun: vi.fn(),
  fetchRun: vi.fn(),
  cancelRun: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  AgentWebSocket: class {
    constructor(handlers: any) {
      api.handlers = handlers
    }
    connect() {}
    disconnect() {}
  },
  startRun: api.startRun,
  fetchRun: api.fetchRun,
  cancelRun: api.cancelRun,
}))

import { useAgentRunner } from './useAgentRunner'

const log = (runId: string, message: string) => ({ id: 'x', timestamp: '10:00:00', type: 'info', message, run_id: runId })
const result = (runId: string, status = 'done') => ({
  run_id: runId,
  status,
  subtasks: [{ id: 't1', role: 'coder', group: 1, instruction: 'do', status: 'success', steps: 2 }],
  results: {},
  report: { agents: 1 } as any,
  synthesis: 'built it',
  verification: { verdict: 'pass', issues: '', repair_rounds: 0 },
})

describe('useAgentRunner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('starts a run, follows only its events and applies its completion', async () => {
    api.startRun.mockResolvedValue({ run_id: 'r1', workspace: './workspace_output/todo-1' })
    const onWorkspace = vi.fn()
    const { result: hook } = renderHook(() => useAgentRunner(onWorkspace))

    let started: any
    await act(async () => {
      started = await hook.current.executeTask('make a todo app')
    })
    expect(started).toEqual({ runId: 'r1', workspace: './workspace_output/todo-1' })
    expect(onWorkspace).toHaveBeenCalledWith('./workspace_output/todo-1')
    expect(hook.current.runId).toBe('r1')
    expect(localStorage.getItem('splitterai_active_run')).toBe('r1')

    act(() => {
      api.handlers.onEvent(log('r1', 'mine'))
      api.handlers.onEvent(log('r2', 'other tab'))
      api.handlers.onPlan([{ id: 't1', role: 'coder', group: 1, instruction: 'do', status: 'pending', steps: 0 }], 'r1')
      api.handlers.onComplete(result('r2', 'error'), 'r2')
    })
    expect(hook.current.logs.map((l) => l.message)).toContain('mine')
    expect(hook.current.logs.map((l) => l.message)).not.toContain('other tab')
    expect(hook.current.runStatus).toBe('executing')

    act(() => api.handlers.onComplete(result('r1'), 'r1'))
    expect(hook.current.runStatus).toBe('done')
    expect(hook.current.runReport).toEqual({ agents: 1 })
    expect(hook.current.runOutcome?.synthesis).toBe('built it')
    expect(hook.current.subtasks[0].status).toBe('success')
    expect(localStorage.getItem('splitterai_active_run')).toBeNull()
  })

  it('resumes the stored run from GET /runs/{id} after a refresh', async () => {
    localStorage.setItem('splitterai_active_run', 'r7')
    api.fetchRun.mockResolvedValue({
      run_id: 'r7',
      workspace: './workspace_output/app-7',
      task: 'make an app',
      status: 'executing',
      subtasks: [{ id: 't1', role: 'coder', group: 1, instruction: 'do', status: 'running', steps: 1 }],
      logs: [log('r7', 'before refresh')],
      result: null,
    })
    const onWorkspace = vi.fn()
    const { result: hook } = renderHook(() => useAgentRunner(onWorkspace))

    act(() => api.handlers.onConnect())
    await waitFor(() => expect(hook.current.runStatus).toBe('executing'))
    expect(api.fetchRun).toHaveBeenCalledWith('r7')
    expect(hook.current.taskTitle).toBe('make an app')
    expect(hook.current.logs.map((l) => l.message)).toEqual(['before refresh'])
    expect(onWorkspace).toHaveBeenCalledWith('./workspace_output/app-7')
  })

  it('reports a failed start without following any run', async () => {
    api.startRun.mockRejectedValue(new Error('Backend server unreachable'))
    const { result: hook } = renderHook(() => useAgentRunner())
    await act(async () => {
      await hook.current.executeTask('x')
    })
    expect(hook.current.runStatus).toBe('error')
    expect(hook.current.errorMessage).toBe('Backend server unreachable')
    expect(hook.current.runId).toBeNull()
  })

  it('cancels the active run', async () => {
    api.startRun.mockResolvedValue({ run_id: 'r3', workspace: 'w' })
    api.cancelRun.mockResolvedValue(undefined)
    const { result: hook } = renderHook(() => useAgentRunner())
    await act(async () => {
      await hook.current.executeTask('x')
    })
    await act(async () => {
      await hook.current.cancelRun()
    })
    expect(api.cancelRun).toHaveBeenCalledWith('r3')
  })
})
