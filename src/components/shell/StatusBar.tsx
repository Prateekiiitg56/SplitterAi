import type { ReactNode } from 'react'
import { FolderSimple, Cpu, Stack } from '@phosphor-icons/react'
import { cx } from '../../lib/cx'
import { useApp } from '../../context/AppContext'
import { useUI } from '../../context/UIContext'

function ItemShell({ children, tone }: { children: ReactNode; tone?: 'live' }) {
  return (
    <div
      className={cx(
        'flex items-center gap-[5px] h-full px-1.5',
        'transition-colors duration-[var(--d-quick)] hover:bg-[var(--ide-hover)]',
        tone === 'live' ? 'text-[var(--ide-good)]' : undefined,
      )}
    >
      {children}
    </div>
  )
}

export function StatusBar() {
  const { sessions, currentWorkspace, runStatus } = useApp()
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
            <span>{runStatus === 'idle' ? 'Ready' : runStatus}</span>
          </ItemShell>
        )}
      </div>

      <div className="flex items-center gap-3.5 h-full">
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
  )
}
