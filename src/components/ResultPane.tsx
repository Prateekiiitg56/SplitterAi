import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Globe, FolderTree } from 'lucide-react'
import FileExplorer from './FileExplorer'
import { fetchProjectInfo, previewUrl, type ProjectInfo } from '../lib/api'
import { DEFAULT_WORKSPACE } from '../config'
import type { RunStatus } from '../types'
import { cx } from '../lib/cx'

const BUSY = new Set<RunStatus>(['planning', 'executing'])

interface ResultPaneProps {
  workspace: string
  runStatus: RunStatus
  changedFiles: string[]
}

/**
 * The project's output. When a run finishes, web projects open their preview here and everything else
 * opens the main file in the viewer (with Run for scripts). Files written by the run are highlighted.
 */
export function ResultPane({ workspace, runStatus, changedFiles }: ResultPaneProps) {
  const [info, setInfo] = useState<ProjectInfo | null>(null)
  const [tab, setTab] = useState<'preview' | 'files'>('files')
  const [openFile, setOpenFile] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const busy = BUSY.has(runStatus)
  const wasBusy = useRef(busy)
  // A tab the user picked is kept; only a finished run switches it automatically.
  const userPicked = useRef(false)
  const pick = (next: 'preview' | 'files') => {
    userPicked.current = true
    setTab(next)
  }

  // Re-read what to open on project switch and whenever a run settles.
  useEffect(() => {
    const finished = wasBusy.current && !busy
    wasBusy.current = busy
    if (busy || workspace === DEFAULT_WORKSPACE) {
      if (workspace === DEFAULT_WORKSPACE) setInfo(null)
      return
    }
    let cancelled = false
    fetchProjectInfo(workspace)
      .then((next) => {
        if (cancelled) return
        setInfo(next)
        setReload((n) => n + 1)
        if (userPicked.current && !finished) return
        userPicked.current = false
        if (next.entry.kind === 'web') setTab('preview')
        else {
          setTab('files')
          if (next.entry.path && (finished || !openFile)) setOpenFile(next.entry.path)
        }
      })
      .catch(() => !cancelled && setInfo(null))
    return () => {
      cancelled = true
    }
  }, [workspace, busy]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOpenFile(null)
    userPicked.current = false
  }, [workspace])

  const isWeb = info?.entry.kind === 'web'
  const url = info ? previewUrl(info.project_id) : null

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 h-10 px-2 border-b border-[var(--border)] bg-[var(--panel-2)] flex-shrink-0" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'preview'}
          disabled={!isWeb}
          onClick={() => pick('preview')}
          className={cx('inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-micro', tab === 'preview' ? 'bg-[var(--panel-3)] text-[var(--text)]' : 'text-[var(--dim)] disabled:opacity-40')}
        >
          <Globe size={12} /> Preview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'files'}
          onClick={() => pick('files')}
          className={cx('inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-micro', tab === 'files' ? 'bg-[var(--panel-3)] text-[var(--text)]' : 'text-[var(--dim)]')}
        >
          <FolderTree size={12} /> Files
          {changedFiles.length > 0 && <span className="text-[var(--accent)]">{changedFiles.length}</span>}
        </button>
        {isWeb && url && (
          <a href={url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-micro text-[var(--accent)] hover:underline">
            Open in new tab <ExternalLink size={11} />
          </a>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {tab === 'preview' && isWeb && url ? (
          <iframe key={reload} title="Project preview" src={url} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-forms allow-modals allow-same-origin" />
        ) : (
          <FileExplorer workspace={workspace} modifiedFiles={changedFiles} openFile={openFile} />
        )}
      </div>
    </div>
  )
}
