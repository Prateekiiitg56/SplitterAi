import { useEffect, useState } from 'react'
import { Gear } from '@phosphor-icons/react'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/primitives/Button'
import { TextField } from '../components/primitives/Field'
import { fetchHealth, type HealthStatus, type StackId } from '../lib/api'
import { getSharedSecret, setSharedSecret } from '../config'
import { useUI } from '../context/UIContext'
import { readPreference, writePreference } from '../lib/preferences'

/** Setup status from /health (never the keys themselves) and this browser's preferences. */
export default function SettingsPage() {
  const { models, selectedModel, setSelectedModel } = useUI()
  const [health, setHealth] = useState<HealthStatus | null | undefined>(undefined)
  const [secret, setSecret] = useState(getSharedSecret())
  const [saved, setSaved] = useState(false)
  const [stack, setStack] = useState<StackId>(readPreference('stack', 'auto') as StackId)

  useEffect(() => {
    fetchHealth().then(setHealth)
  }, [saved])

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden text-[var(--text)]">
      <PageHeader icon={<Gear size={16} />} title="Settings" meta="/ setup" />
      <div className="page-body flex-1 overflow-y-auto p-6 space-y-8 max-w-[720px]">
        <section className="space-y-2">
          <h2 className="text-[13px] font-semibold">Backend</h2>
          {health === undefined ? (
            <p className="text-meta text-[var(--dim)]">Checking…</p>
          ) : health === null ? (
            <p className="text-meta text-[var(--bad)]">Backend unreachable.</p>
          ) : (
            <ul className="text-meta text-[var(--text-2)] space-y-1">
              <li>Version {health.version}, up {Math.round(health.uptime_s / 60)} min</li>
              <li>
                LLM: {health.fake_llm ? 'scripted fake model (SPLITTER_FAKE_LLM)' : health.llm_ready ? 'ready' : 'no key configured'}
              </li>
              {Object.entries(health.llm_keys).map(([provider, ok]) => (
                <li key={provider}>
                  {provider}: <span className={ok ? 'text-[var(--good)]' : 'text-[var(--faint)]'}>{ok ? 'key set' : 'no key'}</span>
                </li>
              ))}
              <li>
                Shell sandbox: {health.sandbox.mode === 'none' ? 'disabled (SPLITTER_SANDBOX=none)' : `${health.sandbox.mode}, ${health.sandbox.available ? 'available' : 'not available'}`}
              </li>
              <li>Concurrent agents per run (MAX_CONCURRENT_AGENTS): {health.max_concurrent_agents}</li>
              <li>Shared secret required: {health.auth_required ? 'yes' : 'no'}</li>
            </ul>
          )}
          <p className="text-micro text-[var(--faint)]">Provider keys live in the backend .env and are never sent to the browser.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold">Shared secret</h2>
          <TextField
            label="SHARED_SECRET of the backend"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            hint="Stored in this browser only; sent as X-API-Key (and ?token= for previews and the WebSocket)."
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSharedSecret(secret.trim())
              setSaved((v) => !v)
            }}
          >
            Save
          </Button>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold">Defaults for new runs</h2>
          <label className="block text-meta text-[var(--dim)]">
            Model
            <select
              value={selectedModel.id}
              onChange={(e) => {
                const next = models.find((m) => m.id === e.target.value)
                if (next) setSelectedModel(next)
              }}
              className="mt-1 block w-full h-9 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] px-2 text-[var(--text)]"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-meta text-[var(--dim)]">
            Web stack
            <select
              value={stack}
              onChange={(e) => {
                setStack(e.target.value as StackId)
                writePreference('stack', e.target.value)
              }}
              className="mt-1 block w-full h-9 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] px-2 text-[var(--text)]"
            >
              <option value="auto">Auto</option>
              <option value="tailwind">Tailwind</option>
              <option value="plain">Plain HTML/CSS</option>
              <option value="react">React + Vite</option>
            </select>
          </label>
        </section>
      </div>
    </div>
  )
}
