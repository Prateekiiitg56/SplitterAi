import { useEffect, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import { fetchFileContent, runProjectFile, type FileContent } from '../lib/api'
import 'highlight.js/styles/github-dark.css'

const RUNNABLE = /\.(py|js|mjs|cjs)$/i

interface FileViewerProps {
  workspace: string
  path: string
  /** Reload when this changes (e.g. after a run rewrote the file). */
  version?: number
}

/** Read-only, syntax-highlighted view of one project file, with Run for Python/Node scripts. */
export function FileViewer({ workspace, path, version }: FileViewerProps) {
  const [file, setFile] = useState<FileContent | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<{ command: string; exit_code: number | null; output: string; error?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setFile(null)
    setHtml(null)
    setError(null)
    setRunResult(null)
    fetchFileContent(workspace, path)
      .then(async (data) => {
        if (cancelled) return
        setFile(data)
        if (data.binary || !data.content) return
        // Loaded on demand so the highlighter stays out of the main bundle.
        const { default: hljs } = await import('highlight.js/lib/common')
        const ext = path.split('.').pop()?.toLowerCase() || ''
        const highlighted = hljs.getLanguage(ext)
          ? hljs.highlight(data.content, { language: ext }).value
          : hljs.highlightAuto(data.content).value
        if (!cancelled) setHtml(highlighted)
      })
      .catch((err) => !cancelled && setError(err?.message || 'Could not read file'))
    return () => {
      cancelled = true
    }
  }, [workspace, path, version])

  const run = async () => {
    setRunning(true)
    setRunResult({ command: path, exit_code: null, output: '' })
    try {
      // Lines are shown as the program prints them.
      await runProjectFile(workspace, path, (event) => {
        setRunResult((prev) => {
          const current = prev ?? { command: path, exit_code: null, output: '' }
          if ('command' in event) return { ...current, command: event.command }
          if ('line' in event) return { ...current, output: current.output + event.line + '\n' }
          if ('exit_code' in event) return { ...current, exit_code: event.exit_code }
          return { ...current, error: event.error }
        })
      })
    } catch (err: any) {
      setRunResult((prev) => ({ command: prev?.command ?? path, exit_code: null, output: prev?.output ?? '', error: err?.message || 'Run failed' }))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--panel-2)]">
        <span className="font-mono text-meta font-semibold text-[var(--text)] truncate" title={path}>{path}</span>
        {RUNNABLE.test(path) && (
          <button
            type="button"
            onClick={run}
            disabled={running}
            aria-label={`Run ${path}`}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-[var(--accent)] text-[#1A1410] text-micro font-semibold disabled:opacity-50"
          >
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={11} fill="currentColor" />} Run
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto bg-[var(--bg-inset)]">
        {error ? (
          <p className="p-3 text-micro text-[var(--bad)]">{error}</p>
        ) : !file ? (
          <div className="flex items-center gap-2 p-3 text-micro text-[var(--faint)]">
            <Loader2 size={12} className="animate-spin" /> Loading {path}
          </div>
        ) : file.binary ? (
          <p className="p-3 text-micro text-[var(--faint)]">Binary file ({file.size} bytes), not shown.</p>
        ) : (
          <pre className="hljs m-0 p-3 text-micro font-mono leading-relaxed whitespace-pre">
            {html ? <code dangerouslySetInnerHTML={{ __html: html }} /> : <code>{file.content}</code>}
            {file.truncated && <span className="block mt-2 text-[var(--faint)]">... truncated at 512 KB</span>}
          </pre>
        )}
      </div>
      {runResult && (
        <div className="max-h-[40%] min-h-[6rem] overflow-auto border-t border-[var(--border)] bg-[#0d0b09] p-3 font-mono text-micro" role="log" aria-label="Run output">
          <div className="text-[var(--faint)] mb-1">
            $ {runResult.command}
            {runResult.exit_code !== null && <span className={runResult.exit_code === 0 ? ' text-[var(--good)]' : ' text-[var(--bad)]'}> (exit {runResult.exit_code})</span>}
          </div>
          <pre className="m-0 whitespace-pre-wrap text-[var(--text-2)]">{runResult.output}</pre>
          {running && <div className="text-[var(--faint)]">running…</div>}
          {runResult.error && <div className="text-[var(--bad)]">{runResult.error}</div>}
        </div>
      )}
    </div>
  )
}
