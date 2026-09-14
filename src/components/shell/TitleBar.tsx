import { Search, PanelLeft, PanelRight } from 'lucide-react'
import { ChromeButton } from './ChromeButton'

/**
 * TitleBar — the 34px window chrome at the very top of the shell.
 *
 * Traffic lights on the left (decorative, matching the reference), a centred
 * command-palette affordance, and the two panel toggles on the right.
 *
 * The centre control dispatches the same `open-command-palette` event the old
 * Sidebar and TopBar dispatched, so behaviour is preserved exactly — note that
 * nothing in the app listens for that event yet, so it is inert today. It was
 * inert before this redesign too.
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
      {/* Traffic lights — decorative only, exactly as in the reference. */}
      <div className="flex items-center gap-2 w-[120px] flex-shrink-0" aria-hidden="true">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
      </div>

      <div className="flex-1 flex justify-center min-w-0">
        <button
          type="button"
          onClick={handleOpenCommandPalette}
          className="flex items-center justify-center gap-[7px] h-6 px-3 w-[360px] max-w-[44vw] rounded-panel
                     bg-[var(--ide-hover)] text-[var(--ide-text-faint)] text-meta
                     transition-colors duration-[var(--d-quick)] hover:text-[var(--ide-text)]"
        >
          <Search size={12} className="flex-shrink-0" aria-hidden="true" />
          <span className="truncate">{title}</span>
        </button>
      </div>

      <div className="w-[120px] flex-shrink-0 flex items-center justify-end gap-1">
        <ChromeButton
          icon={<PanelLeft size={14} aria-hidden="true" />}
          label={explorerCollapsed ? 'Show explorer' : 'Hide explorer'}
          onClick={onToggleExplorer}
          expanded={!explorerCollapsed}
          size={24}
        />
        <ChromeButton
          icon={<PanelRight size={14} aria-hidden="true" />}
          label={chatCollapsed ? 'Show chat panel' : 'Hide chat panel'}
          onClick={onToggleChat}
          expanded={!chatCollapsed}
          size={24}
        />
      </div>
    </div>
  )
}
