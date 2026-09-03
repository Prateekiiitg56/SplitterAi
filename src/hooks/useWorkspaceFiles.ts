import { useState, useEffect, useCallback } from 'react'
import { fetchFiles } from '../lib/api'
import { DEFAULT_WORKSPACE } from '../config'
import type { FileNode } from '../types'

export function useWorkspaceFiles(workspace: string = DEFAULT_WORKSPACE) {
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFiles = useCallback(async (targetWorkspace: string = workspace) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchFiles(targetWorkspace)
      setFileTree(data || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load file tree')
    } finally {
      setLoading(false)
    }
  }, [workspace])

  useEffect(() => {
    loadFiles(workspace)
  }, [workspace, loadFiles])

  return { fileTree, loading, error, refetch: () => loadFiles(workspace) }
}
