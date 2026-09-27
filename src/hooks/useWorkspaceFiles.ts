import { useState, useEffect, useCallback } from 'react'
import { fetchFiles } from '../lib/api'
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

  // Load on project switch; agents write files mid-run, so refresh while busy and once more when the run settles.
  useEffect(() => {
    if (runStatus !== 'executing' && runStatus !== 'planning') {
      loadFiles(true)
      return
    }
    const id = setInterval(() => loadFiles(true), 4000)
    return () => clearInterval(id)
  }, [runStatus, loadFiles])

  return { fileTree, loading, error, refetch: () => loadFiles() }
}
