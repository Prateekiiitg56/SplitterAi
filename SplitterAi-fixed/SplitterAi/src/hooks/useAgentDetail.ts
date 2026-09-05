import { useState, useEffect, useCallback } from 'react'
import { fetchAgentDetail } from '../lib/api'
import type { AgentInfo, AgentRole } from '../types'

export function useAgentDetail(role: AgentRole) {
  const [agentData, setAgentData] = useState<AgentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDetail = useCallback(async (targetRole: AgentRole = role) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAgentDetail(targetRole)
      setAgentData(data)
    } catch (err: any) {
      setError(err?.message || `Failed to fetch agent details for ${targetRole}`)
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    loadDetail(role)
  }, [role, loadDetail])

  return { agentData, loading, error, refetch: () => loadDetail(role) }
}
