import { useState, useEffect, useCallback } from 'react'
import { fetchAgentQuotas } from '../lib/api'
import type { QuotaInfo } from '../types'

export function useQuotas() {
  const [quotas, setQuotas] = useState<QuotaInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadQuotas = useCallback(async () => {
    try {
      const data = await fetchAgentQuotas()
      setQuotas(data || [])
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to load quotas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQuotas()
  }, [loadQuotas])

  return { quotas, loading, error, refetch: loadQuotas }
}
