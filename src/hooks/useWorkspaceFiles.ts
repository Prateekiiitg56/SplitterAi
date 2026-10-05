import { useState, useEffect, useCallback } from 'react'
import { fetchFiles, serverEvents } from '../lib/api'
import { DEFAULT_WORKSPACE } from '../config'
import { useApp } from '../context/AppContext'
import type { FileNode } from '../types'

export function useWorkspaceFiles(workspace: string = DEFAULT_WORKSPACE) {
  const { runStatus } = useApp()
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // The projects root holds every project's folder; a new, unsaved project owns none of them.
  const isRoot = workspace === DEFAULT_WORKSPACE

  const loadFiles = useCallback(async (quiet = false) => {
    if (isRoot) {
      setFileTree([])
      setError(null)
      setLoading(false)
      return
    }
    if (!quiet) setLoading(true)
    setError(null)
    try {
      const data = await fetchFiles(workspace)
      setFileTree(data || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load file tree')
    } finally {
      setLoading(false)
    }
  }, [workspace, isRoot])

  // Load on project switch and when a run settles; while agents work, reload when they report a written
  // file in this workspace (pushed over the WebSocket, batched) instead of polling.
  useEffect(() => {
    loadFiles(true)
  }, [loadFiles, runStatus === 'executing' || runStatus === 'planning'])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const onWrite = (e: Event) => {
      if ((e as CustomEvent).detail?.workspace !== workspace || timer) return
      timer = setTimeout(() => {
        timer = null
        loadFiles(true)
      }, 500)
    }
    serverEvents.addEventListener('file_written', onWrite)
    return () => {
      serverEvents.removeEventListener('file_written', onWrite)
      if (timer) clearTimeout(timer)
    }
  }, [workspace, loadFiles])

  return { fileTree, loading, error, refetch: () => loadFiles() }
}
