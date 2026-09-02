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
  { provider: 'gemini',     label: 'Gemini',     color: '#4285F4', used: 11, limit: 15,  unit: 'req/min', resetsIn: '38s' },
  { provider: 'groq',       label: 'Groq',       color: '#F55036', used: 18, limit: 30,  unit: 'req/min', resetsIn: '22s' },
  { provider: 'openrouter', label: 'OpenRouter',  color: '#6366F1', used: 3,  limit: 200, unit: 'req/day', resetsIn: '14h' },
]

export default function QuotaBar({ quotas }: { quotas: QuotaInfo[] }) {
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 border-t border-border flex-shrink-0">
      <p className="text-[10px] text-text-secondary uppercase tracking-wide"
        style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
        API Quota
      </p>
      {quotas.map((q) => {
        const pct = Math.min((q.used / q.limit) * 100, 100)
        const isHigh = pct >= 80
        return (
          <div key={q.provider} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-primary" style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                {q.label}
              </span>
              <span className="text-[10px] text-text-secondary tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
                {q.used}/{q.limit} {q.unit}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: isHigh ? '#D93025' : q.color,
                }}
              />
            </div>
            {q.resetsIn && (
              <p className="text-[9px] text-text-secondary text-right" style={{ fontFamily: 'var(--font-mono)' }}>
                resets in {q.resetsIn}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
