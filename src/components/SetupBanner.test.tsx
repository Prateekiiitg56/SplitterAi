import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ fetchHealth: vi.fn() }))
vi.mock('../lib/api', () => ({ fetchHealth: api.fetchHealth }))

import { SetupBanner } from './SetupBanner'

const healthy = {
  version: '0.2.0', uptime_s: 5, supabase_enabled: false, llm_ready: true, llm_keys: { gemini: true },
  fake_llm: false, sandbox: { mode: 'bwrap', available: true }, auth_required: false, max_concurrent_agents: 4,
}

const show = () => render(<MemoryRouter><SetupBanner /></MemoryRouter>)

describe('SetupBanner', () => {
  it('says when the backend is down', async () => {
    api.fetchHealth.mockResolvedValue(null)
    show()
    expect((await screen.findByRole('alert')).textContent).toMatch(/Backend unreachable/)
  })

  it('says when no LLM key is configured', async () => {
    api.fetchHealth.mockResolvedValue({ ...healthy, llm_ready: false })
    show()
    expect((await screen.findByRole('alert')).textContent).toMatch(/No LLM key configured/)
  })

  it('stays hidden when everything is set up', async () => {
    api.fetchHealth.mockResolvedValue(healthy)
    show()
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
