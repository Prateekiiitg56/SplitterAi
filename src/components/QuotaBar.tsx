import { useState, useEffect } from 'react'
import { fetchAgentQuotas } from '../lib/api'

export interface QuotaInfo {
  provider: string
  modelKey: string
  requestsUsed: number
  requestsLimit: number
  usedPercentage: number
  resetTime?: string
  status: string
}

export default function QuotaBar() {
  const [quotas, setQuotas] = useState<QuotaInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchAgentQuotas()
      .then((data) => {
        if (active) {
          setQuotas(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load quotas')
          setLoading(false)
        }
      })
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-2 px-3.5 py-3 border-t border-white/[0.08] bg-[#101218] flex-shrink-0">
        <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-semibold">API QUOTAS</p>
        <div className="h-2 rounded bg-white/[0.06] animate-pulse w-full" />
        <div className="h-2 rounded bg-white/[0.06] animate-pulse w-3/4" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-1.5 px-3.5 py-3 border-t border-white/[0.08] bg-[#101218] flex-shrink-0 text-[11px] text-amber-400">
        <p className="font-semibold">⚠️ Quota Load Error</p>
        <p className="text-neutral-400 text-[10px]">{error}</p>
      </div>
    )
  }

  if (quotas.length === 0) {
    return (
      <div className="flex flex-col gap-1 px-3.5 py-3 border-t border-white/[0.08] bg-[#101218] flex-shrink-0 text-[11px] text-neutral-500">
        <p className="font-semibold uppercase tracking-wider text-[10px]">API QUOTAS</p>
        <p className="text-[11px]">No active provider usage recorded.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 px-3.5 py-3 border-t border-white/[0.08] bg-[#101218] flex-shrink-0">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold">API FREE-TIER QUOTAS</p>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      {quotas.map((q) => {
        const pct = q.usedPercentage || Math.min(100, Math.round((q.requestsUsed / (q.requestsLimit || 1)) * 100))
        const isHigh = pct >= 80
        const color = q.modelKey === 'gemini' ? '#39C08A' : q.modelKey === 'xai' ? '#9B6BE0' : '#3E8DF0'

        return (
          <div key={q.provider} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-white">{q.provider}</span>
              <span className="font-mono text-neutral-400 text-[10.5px]">{q.requestsUsed} / {q.requestsLimit} reqs</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/[0.08]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: isHigh ? '#EF4444' : color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
