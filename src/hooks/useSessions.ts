import { useState, useEffect, useCallback } from 'react'
import { fetchSessions, serverEvents, type SessionInfo } from '../lib/api'
import type { SessionEntry } from '../types'

const toProject = (s: SessionInfo, idx: number): SessionEntry => ({
  // Folder name: stable across re-sorts and deletes, unlike the list index.
  id: s.workspace.split(/[/\\]/).filter(Boolean).pop() || `s${idx}`,
  workspace: s.workspace,
  task: s.name || s.task,
  name: s.name || undefined,
  status: (s.status as any) || 'done',
  createdAt: s.created_at || 'Just now',
  updatedAt: s.updated_at ? new Date(s.updated_at * 1000).toISOString() : undefined,
  subtaskCount: s.subtask_count || 1,
})

export function useSessions() {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    try {
      const data = await fetchSessions()
      if (data) {
        setSessions(data.map(toProject))
        setError(null)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load once (retrying with backoff while the backend is down), then reload when the server says the list changed.
  useEffect(() => {
    let active = true
    let timerId: ReturnType<typeof setTimeout> | null = null
    let retries = 0

    const load = async () => {
      if (!active) return
      try {
        const data = await fetchSessions()
        if (!active) return
        setSessions(data.map(toProject))
        setError(null)
        retries = 0
      } catch (err: any) {
        if (!active) return
        setError(err?.message || 'Failed to fetch sessions')
        // Back off (3s .. 30s) so a busy or rate-limited backend isn't hammered.
        timerId = setTimeout(load, Math.min(3000 * 2 ** retries, 30000))
        retries++
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const onChange = () => load()
    serverEvents.addEventListener('sessions_changed', onChange)
    return () => {
      active = false
      if (timerId) clearTimeout(timerId)
      serverEvents.removeEventListener('sessions_changed', onChange)
    }
  }, [])

  return { sessions, loading, error, refetch: loadSessions }
}
