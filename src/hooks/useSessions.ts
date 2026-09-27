import { useState, useEffect, useCallback } from 'react'
import { fetchSessions, type SessionInfo } from '../lib/api'
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

  useEffect(() => {
    let active = true
    let timerId: any = null
    let retries = 0

    const poll = async () => {
      if (!active) return
      try {
        const data = await fetchSessions()
        if (active && data) {
          setSessions(data.map(toProject))
          setError(null)
          setLoading(false)
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to fetch sessions')
          setLoading(false)
          // Back off (3s .. 30s) so a busy or rate-limited backend isn't hammered.
          timerId = setTimeout(poll, Math.min(3000 * 2 ** retries, 30000))
          retries++
        }
      }
    }

    poll()

    return () => {
      active = false
      if (timerId) clearTimeout(timerId)
    }
  }, [])

  return { sessions, loading, error, refetch: loadSessions }
}
