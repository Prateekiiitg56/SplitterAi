import { useEffect, useRef, useState } from 'react'
import { Gauge } from '@phosphor-icons/react'
import { cx } from '../../lib/cx'
import { fetchAgentQuotas } from '../../lib/api'
import { fmtTokens } from '../StrategyPanel'
import type { QuotaInfo } from '../../types'

const REFRESH_MS = 30_000

function fmtCountdown(seconds: number) {
  if (seconds <= 0) return 'now'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function resetLabel(q: QuotaInfo, now: number) {
  if (q.resets_at === null) return 'Credit-based, no daily reset'
  const at = new Date(q.resets_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `Resets in ${fmtCountdown(q.resets_at - now)} (${at})`
}

/** Status-bar button that opens per-model usage for the current daily quota window. */
export function UsagePopover() {
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState<QuotaInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now() / 1000)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const load = () => {
      setNow(Date.now() / 1000)
      fetchAgentQuotas()
        .then((u) => {
          setUsage(u)
          setError(null)
        })
        .catch((e: Error) => setError(e.message))
    }
    load()
    const id = setInterval(load, REFRESH_MS)

    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      clearInterval(id)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Used models first, then the rest in registry order.
  const rows = usage ? [...usage].sort((a, b) => Number(b.requests > 0) - Number(a.requests > 0)) : []
  const anyLimited = usage?.some((q) => q.limited)

  return (
    <div ref={ref} className="relative h-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cx(
          'flex items-center gap-[5px] h-full px-1.5 transition-colors duration-[var(--d-quick)] hover:bg-[var(--ide-hover)]',
          anyLimited && 'text-[var(--ide-warn)]',
        )}
      >
        <Gauge size={12} aria-hidden="true" />
        <span>Usage</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Model usage"
          className="absolute bottom-full right-0 mb-1 w-[340px] max-w-[calc(100vw-32px)] max-h-[60vh] overflow-y-auto
                     bg-[var(--ide-raised)] border border-[var(--ide-border)] rounded-[8px] shadow-xl p-3 z-50
                     text-[12px] text-[var(--ide-text)]"
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-semibold text-[var(--ide-text-hi)]">Model usage today</span>
            <span className="text-[11px] text-[var(--ide-text-faint)]">requests / tokens</span>
          </div>

          {error && <p className="text-[var(--ide-bad)]">{error}</p>}
          {!usage && !error && <p className="text-[var(--ide-text-dim)]">Loading…</p>}

          <ul className="space-y-2">
            {rows.map((q) => (
              <li key={q.model} className="border-t border-[var(--ide-border-soft)] pt-2 first:border-0 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono truncate" title={q.model}>
                    {q.model.split('/').pop()}
                  </span>
                  <span className="font-mono whitespace-nowrap text-[var(--ide-text-dim)]">
                    {q.requests} / {fmtTokens(q.prompt_tokens + q.completion_tokens)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5 text-[11px] text-[var(--ide-text-faint)]">
                  <span>{resetLabel(q, now)}</span>
                  {q.limited ? (
                    <span className="text-[var(--ide-warn)]">Limit hit</span>
                  ) : q.errors > 0 ? (
                    <span>{q.errors} failed</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
