import { AlertTriangle, Check, Minus, Plus } from 'lucide-react'
import { cx } from '../lib/cx'
import type { Confidence, ExecutionEstimate, PlanAnalysis, StrategyId } from '../lib/api'

export interface StrategySelection {
  id: StrategyId
  agents: number
  custom: boolean
}

const MAX_CUSTOM_AGENTS = 8

export const fmtTime = (s: number) => {
  if (s < 60) return `${Math.round(s)}s`
  const m = Math.floor(s / 60)
  const r = Math.round(s % 60)
  return r ? `${m}m ${r}s` : `${m}m`
}
export const fmtTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `${n}`)
export const range = (r: [number, number], f: (n: number) => string) => `${f(r[0])}–${f(r[1])}`

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  low: 'text-amber-300/80 bg-amber-300/[0.08]',
  medium: 'text-sky-300/80 bg-sky-300/[0.08]',
  high: 'text-emerald-300/80 bg-emerald-300/[0.08]',
}

/** Options only go up to the useful agent count; beyond it the estimate stops improving. */
const optionFor = (analysis: PlanAnalysis, agents: number): ExecutionEstimate =>
  analysis.options[Math.min(agents, analysis.options.length) - 1]

export function recommendedSelection(analysis: PlanAnalysis): StrategySelection {
  return { id: analysis.recommended, agents: analysis.recommended_agents, custom: false }
}

interface Props {
  analysis: PlanAnalysis
  selection: StrategySelection
  onSelect: (selection: StrategySelection) => void
  stale: boolean
}

export function StrategyPanel({ analysis, selection, onSelect, stale }: Props) {
  const customEstimate = optionFor(analysis, selection.agents)
  const overProvisioned = selection.custom && selection.agents > analysis.max_parallel
  const confidence = analysis.strategies.find((s) => s.id === analysis.recommended)?.confidence ?? 'low'

  const setCustomAgents = (agents: number) =>
    onSelect({ id: 'balanced', agents: Math.max(1, Math.min(MAX_CUSTOM_AGENTS, agents)), custom: true })

  return (
    <div className="px-4 py-3 border-t border-white/[0.06] space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/30">Execution strategy</span>
        <span className="h-px flex-1 bg-white/[0.06]" />
        <span className={cx('h-5 px-2 rounded-full text-[10px] font-medium inline-flex items-center', CONFIDENCE_STYLE[confidence])}>
          {confidence} confidence
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {[
          ['Complexity', analysis.complexity],
          ['Can run at once', `${analysis.max_parallel}`],
          ['Recommended', `${analysis.recommended_agents} agent${analysis.recommended_agents === 1 ? '' : 's'}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2">
            <dt className="text-[10px] text-white/35">{label}</dt>
            <dd className="mt-0.5 text-[13px] font-semibold text-white/85">{value}</dd>
          </div>
        ))}
      </dl>

      <div role="radiogroup" aria-label="Execution strategy" className="rounded-lg border border-white/[0.06] overflow-hidden">
        <div className="grid grid-cols-[1fr_52px_96px_84px] gap-2 px-3 py-1.5 bg-white/[0.02] text-[10px] font-mono uppercase tracking-wider text-white/30">
          <span>Strategy</span>
          <span className="text-right">Agents</span>
          <span className="text-right">Time</span>
          <span className="text-right">Tokens</span>
        </div>
        {analysis.strategies.map((s) => {
          const active = !selection.custom && selection.id === s.id
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect({ id: s.id, agents: s.agents, custom: false })}
              className={cx(
                'w-full grid grid-cols-[1fr_52px_96px_84px] gap-2 items-center px-3 py-2 text-left border-t border-white/[0.04] transition-colors',
                active ? 'bg-[#1488fc]/[0.12]' : 'hover:bg-white/[0.03]',
              )}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className={cx('w-3.5 h-3.5 shrink-0 rounded-full border flex items-center justify-center', active ? 'border-[#1488fc] bg-[#1488fc]' : 'border-white/20')}>
                  {active && <Check size={9} className="text-white" strokeWidth={3} />}
                </span>
                <span className="text-[12.5px] text-white/85 truncate">{s.label}</span>
                {s.id === analysis.recommended && (
                  <span className="text-[9.5px] px-1.5 rounded-full bg-[#1488fc]/20 text-[#7cc0ff]">recommended</span>
                )}
                <span className="text-[9.5px] text-white/35">
                  {s.repairs ? `up to ${s.repairs} repair${s.repairs === 1 ? '' : 's'}` : 'no repair'}
                </span>
              </span>
              <span className="text-right text-[12px] font-mono text-white/70">{s.agents}</span>
              <span className="text-right text-[12px] font-mono text-white/70">{range(s.time_s, fmtTime)}</span>
              <span className="text-right text-[12px] font-mono text-white/70">{range(s.tokens, fmtTokens)}</span>
            </button>
          )
        })}
        <div
          className={cx(
            'grid grid-cols-[1fr_52px_96px_84px] gap-2 items-center px-3 py-2 border-t border-white/[0.04]',
            selection.custom && 'bg-[#1488fc]/[0.12]',
          )}
        >
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              role="radio"
              aria-checked={selection.custom}
              onClick={() => setCustomAgents(selection.agents)}
              className="flex items-center gap-1.5"
            >
              <span className={cx('w-3.5 h-3.5 rounded-full border flex items-center justify-center', selection.custom ? 'border-[#1488fc] bg-[#1488fc]' : 'border-white/20')}>
                {selection.custom && <Check size={9} className="text-white" strokeWidth={3} />}
              </span>
              <span className="text-[12.5px] text-white/85">Custom</span>
            </button>
            <span className="ml-1 inline-flex items-center rounded-md border border-white/[0.08]">
              <button type="button" aria-label="Fewer agents" onClick={() => setCustomAgents(selection.agents - 1)} className="w-5 h-5 flex items-center justify-center text-white/45 hover:text-white">
                <Minus size={10} />
              </button>
              <button type="button" aria-label="More agents" onClick={() => setCustomAgents(selection.agents + 1)} className="w-5 h-5 flex items-center justify-center text-white/45 hover:text-white">
                <Plus size={10} />
              </button>
            </span>
          </span>
          <span className="text-right text-[12px] font-mono text-white/70">{selection.agents}</span>
          <span className="text-right text-[12px] font-mono text-white/70">{range(customEstimate.time_s, fmtTime)}</span>
          <span className="text-right text-[12px] font-mono text-white/70">{range(customEstimate.tokens, fmtTokens)}</span>
        </div>
      </div>

      {overProvisioned && (
        <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-amber-300/80">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          At most {analysis.max_parallel} subtask{analysis.max_parallel === 1 ? '' : 's'} can run at once, so agents beyond that sit idle.
          The recommended count is {analysis.recommended_agents}.
        </p>
      )}
      {stale && (
        <p className="text-[11.5px] text-white/40">You edited the plan. Estimates cover the original split; regenerate to refresh them.</p>
      )}

      <div>
        <p className="text-[11px] text-white/45">Why {analysis.recommended_agents} agent{analysis.recommended_agents === 1 ? '' : 's'}?</p>
        <ul className="mt-1 space-y-0.5">
          {analysis.reasons.map((r) => (
            <li key={r} className="text-[11.5px] leading-relaxed text-white/55 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[0.6em] before:w-1 before:h-1 before:rounded-full before:bg-white/25">
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
