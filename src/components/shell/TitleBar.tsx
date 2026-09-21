import { MagnifyingGlass, SidebarSimple, ChatTeardropText } from '@phosphor-icons/react'
import { ChromeButton } from './ChromeButton'

/**
 * TitleBar — the 34px window chrome at the very top of the shell.
 */

interface TitleBarProps {
  /** Shown inside the centre search affordance. */
  title: string
  explorerCollapsed: boolean
  onToggleExplorer: () => void
  chatCollapsed: boolean
  onToggleChat: () => void
}

export function TitleBar({
  title,
  explorerCollapsed,
  onToggleExplorer,
  chatCollapsed,
  onToggleChat,
}: TitleBarProps) {
  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  return (
    <div
      className="h-[34px] flex-shrink-0 flex items-center gap-2 px-3 select-none
                 bg-[var(--ide-deep)] border-b border-[var(--ide-border-soft)]"
    >
      {/* Spacer for symmetry with right controls */}
      <div className="w-[120px] flex-shrink-0" aria-hidden="true" />

      <div className="flex-1 flex justify-center min-w-0">
        <button
          type="button"
          onClick={handleOpenCommandPalette}
          className="flex items-center justify-center gap-[7px] h-6 px-3 w-[360px] max-w-[44vw] rounded-panel
                     bg-[var(--ide-hover)] text-[var(--ide-text-faint)] text-meta border border-[var(--ide-border-soft)]
                     transition-colors duration-[var(--d-quick)] hover:text-[var(--ide-text)] hover:border-[var(--ide-border)]"
        >
          <MagnifyingGlass size={13} className="flex-shrink-0 text-[var(--ide-text-dim)]" aria-hidden="true" />
          <span className="truncate">{title}</span>
        </button>
      </div>

      <div className="w-[120px] flex-shrink-0 flex items-center justify-end gap-1">
        <ChromeButton
          icon={<SidebarSimple size={14} aria-hidden="true" />}
          label={explorerCollapsed ? 'Show explorer' : 'Hide explorer'}
          onClick={onToggleExplorer}
          expanded={!explorerCollapsed}
          size={24}
        />
        <ChromeButton
          icon={<ChatTeardropText size={14} aria-hidden="true" />}
          label={chatCollapsed ? 'Show chat panel' : 'Hide chat panel'}
          onClick={onToggleChat}
          expanded={!chatCollapsed}
          size={24}
        />
      </div>
    </div>
  )
}
