import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { WarningCircle } from '@phosphor-icons/react'
import { fetchHealth, type HealthStatus } from '../lib/api'
import { API_BASE } from '../config'

const RECHECK_MS = 15000

/** Explains a broken setup before the user hits it: backend down, no LLM key, no shell sandbox. */
export function SetupBanner() {
  const [health, setHealth] = useState<HealthStatus | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    const check = () => fetchHealth().then((h) => active && setHealth(h))
    check()
    const id = setInterval(check, RECHECK_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  let message: string | null = null
  if (health === null) {
    message = `Backend unreachable at ${API_BASE}. Start it with "python backend/server.py" (or "npm run dev:all").`
  } else if (health && !health.llm_ready) {
    message = 'No LLM key configured: add a GEMINI_API_KEY or OPENROUTER_API_KEY to .env and restart the backend.'
  } else if (health && health.sandbox.mode !== 'none' && !health.sandbox.available) {
    message = 'The shell sandbox (bubblewrap) is not available, so agents cannot run commands.'
  }
  if (!message) return null

  return (
    <div role="alert" className="flex items-center gap-2 px-4 py-2 text-[12px] border-b border-[var(--ide-border-soft)] bg-[var(--bad-quiet,#3a1c17)] text-[var(--bad,#e4715d)]">
      <WarningCircle size={14} aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {health && <Link to="/settings" className="underline">Settings</Link>}
    </div>
  )
}
