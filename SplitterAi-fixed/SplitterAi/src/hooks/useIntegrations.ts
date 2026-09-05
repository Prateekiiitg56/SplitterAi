import { useState, useEffect, useCallback } from 'react'
import {
  fetchIntegrations,
  connectIntegration,
  disconnectIntegration,
  reconfigureIntegration,
} from '../lib/api'
import type { Integration, AgentRole } from '../types'

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectingId, setConnectingId] = useState<string | null>(null)

  const loadIntegrations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchIntegrations()
      setIntegrations(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load workspace integrations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIntegrations()
  }, [loadIntegrations])

  const connect = async (payload: {
    type: 'mcp' | 'github' | 'oauth_generic'
    name: string
    token?: string
    url?: string
    repo?: string
    allowedRoles?: AgentRole[]
  }) => {
    setConnectingId(payload.name)
    try {
      const newInt = await connectIntegration(payload)
      setIntegrations((prev) => [...prev.filter((i) => i.id !== newInt.id), newInt])
      return newInt
    } finally {
      setConnectingId(null)
    }
  }

  const disconnect = async (id: string) => {
    await disconnectIntegration(id)
    setIntegrations((prev) => prev.filter((i) => i.id !== id))
  }

  const reconfigure = async (id: string, allowedRoles: AgentRole[]) => {
    const updated = await reconfigureIntegration(id, allowedRoles)
    setIntegrations((prev) => prev.map((i) => (i.id === id ? updated : i)))
  }

  return {
    integrations,
    loading,
    error,
    connectingId,
    refetch: loadIntegrations,
    connect,
    disconnect,
    reconfigure,
  }
}
