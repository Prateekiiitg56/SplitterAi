import { useState, useEffect, useCallback } from 'react'
import { fetchSessions } from '../lib/api'
import type { SessionEntry } from '../types'

export function useSessions() {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    try {
      const data = await fetchSessions()
      if (data) {
        setSessions(
          data.map((s, idx) => ({
            id: `api-s${idx}`,
            workspace: s.workspace,
            task: s.task,
            status: (s.status as any) || 'done',
            createdAt: s.created_at || 'Just now',
            subtaskCount: s.subtask_count || 1,
          }))
        )
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

    const poll = async () => {
      if (!active) return
      try {
        const data = await fetchSessions()
        if (active && data) {
          setSessions(
            data.map((s, idx) => ({
              id: `api-s${idx}`,
              workspace: s.workspace,
              task: s.task,
              status: (s.status as any) || 'done',
              createdAt: s.created_at || 'Just now',
              subtaskCount: s.subtask_count || 1,
            }))
          )
          setError(null)
          setLoading(false)
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to fetch sessions')
          setLoading(false)
          // Silent polling retry if server booting
          timerId = setTimeout(poll, 3000)
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
