export interface QuotaInfo {
  provider: string
  label: string
  color: string
  used: number
  limit: number
  unit: string
  resetsIn?: string
}

export const mockQuotas: QuotaInfo[] = [
  { provider: 'gemini',     label: 'Gemini Free',     color: '#3D8B5F', used: 11, limit: 15,  unit: 'req/min', resetsIn: '38s' },
  { provider: 'groq',       label: 'Groq Free',       color: '#D97706', used: 18, limit: 30,  unit: 'req/min', resetsIn: '22s' },
  { provider: 'openrouter', label: 'OpenRouter Free', color: '#2563EB', used: 3,  limit: 200, unit: 'req/day', resetsIn: '14h' },
]

export default function QuotaBar({ quotas }: { quotas: QuotaInfo[] }) {
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 border-t flex-shrink-0" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <p className="t-micro">API Quotas</p>
      {quotas.map((q) => {
        const pct = Math.min((q.used / q.limit) * 100, 100)
        const isHigh = pct >= 80
        return (
          <div key={q.provider} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium" style={{ color: 'var(--color-text-1)' }}>{q.label}</span>
              <span className="font-mono text-zinc-400 tabular-nums">{q.used}/{q.limit}</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-elevated)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: isHigh ? '#DC2626' : q.color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
