import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  classifyIntent: vi.fn(),
  planTask: vi.fn(),
  sendChatMessage: vi.fn(),
  executeTaskWithPlan: vi.fn(),
  refetchSessions: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  classifyIntent: mocks.classifyIntent,
  planTask: mocks.planTask,
  sendChatMessage: mocks.sendChatMessage,
  uploadWorkspace: vi.fn(),
  importN8nWorkflow: vi.fn(),
}))

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    sessions: [],
    refetchSessions: mocks.refetchSessions,
    executeTaskWithPlan: mocks.executeTaskWithPlan,
    openProject: vi.fn(),
  }),
}))

vi.mock('../context/UIContext', () => ({
  useUI: () => ({ selectedModel: { id: 'm1', label: 'Model 1' }, setSelectedModel: vi.fn() }),
}))

vi.mock('../hooks/useIntegrations', () => ({ useIntegrations: () => ({ integrations: [] }) }))
vi.mock('../components/StrategyPanel', () => ({
  StrategyPanel: () => null,
  recommendedSelection: () => null,
}))

import ConsolePage from './ConsolePage'

function ProjectRoute() {
  const { projectId } = useParams()
  return <div>project page {projectId}</div>
}

function renderConsole() {
  return render(
    <MemoryRouter initialEntries={['/console']}>
      <Routes>
        <Route path="/console" element={<ConsolePage />} />
        <Route path="/projects/:projectId" element={<ProjectRoute />} />
      </Routes>
    </MemoryRouter>
  )
}

const send = (text: string) => {
  fireEvent.change(screen.getByLabelText('Chat message input'), { target: { value: text } })
  fireEvent.click(screen.getByLabelText('Send message'))
}

const plan = {
  task: 'make a todo app with dark mode',
  subtasks: [{ id: 't1', role: 'coder', group: 1, instruction: 'Build the todo app', status: 'pending', steps: 0 }],
}

describe('ConsolePage submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('turns a task without trigger keywords into a plan, then launches into the new project folder', async () => {
    mocks.classifyIntent.mockResolvedValue({ intent: 'task', confidence: 0.9 })
    mocks.planTask.mockResolvedValue(plan)
    mocks.executeTaskWithPlan.mockResolvedValue({ runId: 'r1', workspace: './workspace_output/make-a-todo-app-ab12' })
    renderConsole()

    send('make a todo app with dark mode')
    expect(await screen.findByText('Build the todo app')).toBeTruthy()
    expect(mocks.sendChatMessage).not.toHaveBeenCalled()
    expect(mocks.planTask.mock.calls[0][0]).toBe('make a todo app with dark mode')

    fireEvent.click(screen.getByText(/Launch build/))
    expect(await screen.findByText('project page make-a-todo-app-ab12')).toBeTruthy()
    expect(mocks.executeTaskWithPlan.mock.calls[0][2]).toBe('./workspace_output')
  })

  it('answers questions in chat and offers to run them as a task', async () => {
    mocks.classifyIntent.mockResolvedValue({ intent: 'chat', confidence: 0.9 })
    mocks.sendChatMessage.mockResolvedValue({ reply: 'let is block scoped', role: 'planner', timestamp: '10:00' })
    mocks.planTask.mockResolvedValue(plan)
    renderConsole()

    send('what is the difference between let and var?')
    expect(await screen.findByText('let is block scoped')).toBeTruthy()
    expect(mocks.planTask).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Run as task'))
    await waitFor(() => expect(mocks.planTask).toHaveBeenCalled())
    expect(mocks.planTask.mock.calls[0][0]).toBe('what is the difference between let and var?')
  })
})
