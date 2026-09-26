import type { ReactNode } from 'react'
import { FolderSimple, Cpu, Stack } from '@phosphor-icons/react'
import { cx } from '../../lib/cx'
import { useApp } from '../../context/AppContext'
import { useUI } from '../../context/UIContext'
import type { RunStatus } from '../../types'

function ItemShell({ children, tone }: { children: ReactNode; tone?: 'live' | 'warn' }) {
  return (
    <div
      className={cx(
        'flex items-center gap-[5px] h-full px-1.5',
        'transition-colors duration-[var(--d-quick)] hover:bg-[var(--ide-hover)]',
        tone === 'live' ? 'text-[var(--ide-good)]' : tone === 'warn' ? 'text-[var(--ide-warn)]' : undefined,
      )}
    >
      {children}
    </div>
  )
}

const RUN_LABEL: Record<RunStatus, string> = {
  idle: 'Ready',
  planning: 'Planning',
  executing: 'Running',
  done: 'Last run completed',
  error: 'Last run failed',
}

export function StatusBar() {
  const { sessions, currentWorkspace, runStatus, connection } = useApp()
  const { selectedModel } = useUI()

  const liveCount = sessions.filter((s) => s.status === 'executing' || s.status === 'planning').length
  const workspaceName = currentWorkspace.split(/[/\\]/).filter(Boolean).pop() ?? currentWorkspace
  const modelLabel = selectedModel.id.split('/').pop() ?? selectedModel.label

  return (
    <div
      className="h-[22px] flex-shrink-0 flex items-center justify-between px-4 sm:px-5
                 bg-[var(--ide-deep)] border-t border-[var(--ide-border-soft)]
                 text-[11px] text-[var(--ide-text-dim)] select-none"
    >
      <div className="flex items-center gap-3.5 h-full min-w-0">
        <ItemShell>
          <FolderSimple size={12} aria-hidden="true" />
          <span className="truncate max-w-[220px]" title={currentWorkspace}>
            {workspaceName}
          </span>
        </ItemShell>
        {liveCount > 0 ? (
          <ItemShell tone="live">
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full bg-[var(--ide-accent)] animate-pulse motion-reduce:animate-none"
            />
            <span>
              {liveCount} {liveCount === 1 ? 'project' : 'projects'} running
            </span>
          </ItemShell>
        ) : (
          <ItemShell>
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-[var(--ide-text-faint)]" />
            <span className="whitespace-nowrap">{RUN_LABEL[runStatus]}</span>
          </ItemShell>
        )}
      </div>

      <div className="flex items-center gap-3.5 h-full">
        {/* Real WebSocket state, announced politely when it changes. */}
        <div role="status" className="h-full">
          <ItemShell tone={connection === 'open' ? undefined : 'warn'}>
            <span
              aria-hidden="true"
              className={cx(
                'w-1.5 h-1.5 rounded-full',
                connection === 'open' ? 'bg-[var(--ide-good)]' : 'bg-[var(--ide-warn)]',
              )}
            />
            <span className="whitespace-nowrap" title="Real-time event stream (WebSocket)">
              {connection === 'open' ? 'Stream live' : connection === 'connecting' ? 'Connecting…' : 'Stream offline, retrying'}
            </span>
          </ItemShell>
        </div>
        {/* Secondary items drop on phones so the status bar never wraps or clips. */}
        <div className="hidden sm:contents">
        <ItemShell>
          <Cpu size={12} aria-hidden="true" />
          <span className="font-mono" title={selectedModel.label}>
            {modelLabel}
          </span>
        </ItemShell>
        <ItemShell>
          <Stack size={12} aria-hidden="true" />
          <span>
            {sessions.length} {sessions.length === 1 ? 'project' : 'projects'}
          </span>
        </ItemShell>
        </div>
      </div>
    </div>
  )
}
