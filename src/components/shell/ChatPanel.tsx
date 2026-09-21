import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatTeardropText, At, PaperPlaneRight, Cpu, TerminalWindow } from '@phosphor-icons/react'
import { cx } from '../../lib/cx'
import { ChromeButton } from './ChromeButton'
import { EmptyState } from '../primitives/EmptyState'
import { Button } from '../primitives/Button'
import { useUI } from '../../context/UIContext'

/**
 * ChatPanel — the persistent composer rail on the right.
 */

interface ChatPanelProps {
  collapsed: boolean
  onToggle: () => void
}

const MAX_COMPOSER_HEIGHT = 90

export function ChatPanel({ collapsed, onToggle }: ChatPanelProps) {
  const navigate = useNavigate()
  const { selectedModel } = useUI()
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleDraftChange = (value: string) => {
    setDraft(value)
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(MAX_COMPOSER_HEIGHT, el.scrollHeight)}px`
  }

  const modelLabel = selectedModel.id.split('/').pop() ?? selectedModel.label

  return (
    <aside
      aria-label="Workspace chat"
      className={cx(
        'flex-shrink-0 flex flex-col overflow-hidden bg-[var(--ide-deep)]',
        'transition-[width] duration-[var(--d-base)] ease-standard',
        collapsed ? 'w-0 border-l-0' : 'w-[250px] border-l border-[var(--ide-border)]',
      )}
    >
      {!collapsed && (
        <>
          <div className="h-9 flex-shrink-0 flex items-center justify-between px-3 border-b border-[var(--ide-border-soft)]">
            <span
              className="h-[26px] px-2.5 inline-flex items-center gap-1.5 rounded-[5px]
                         bg-[var(--ide-raised)] text-[11.5px] font-medium text-[var(--ide-text-hi)]"
            >
              <ChatTeardropText size={13} weight="fill" className="text-[var(--ide-accent)]" aria-hidden="true" />
              Chat
            </span>
            <ChromeButton
              icon={<ChatTeardropText size={14} aria-hidden="true" />}
              label="Hide chat panel"
              onClick={onToggle}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <EmptyState
              icon={<ChatTeardropText size={28} weight="duotone" className="text-[var(--ide-accent)]" aria-hidden="true" />}
              title="Workspace chat lives here"
              detail="This panel isn't connected to the agent stream yet. The Console runs a live session against the same models and workspace."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<TerminalWindow size={14} aria-hidden="true" />}
                  onClick={() => navigate('/console')}
                >
                  Open Console
                </Button>
              }
            />
          </div>

          <div className="flex-shrink-0 p-2.5 border-t border-[var(--ide-border-soft)]">
            <div className="rounded-panel overflow-hidden bg-[var(--ide-raised)] border border-[var(--ide-border)]">
              <label htmlFor="shell-chat-draft" className="sr-only">
                Ask SplitterAI about your workspace
              </label>
              <textarea
                id="shell-chat-draft"
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                placeholder="Ask SplitterAI about your workspace…"
                className="w-full resize-none bg-transparent border-none outline-none
                           px-[11px] pt-2.5 pb-1 text-[12.5px] text-[var(--ide-text)]
                           placeholder:text-[var(--ide-text-faint)] min-h-5 max-h-[90px]"
              />
              <div className="flex items-center justify-between pl-2 pr-2 pt-1 pb-2">
                <div className="flex items-center gap-1">
                  <ChromeButton
                    icon={<At size={13} aria-hidden="true" />}
                    label="Add context (not connected yet)"
                    disabled
                  />
                  <span
                    className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-[5px]
                               bg-[var(--ide-raised-2)] text-[10.5px] font-mono text-[var(--ide-text-dim)]"
                    title={selectedModel.label}
                  >
                    <Cpu size={11} aria-hidden="true" />
                    {modelLabel}
                  </span>
                </div>
                <button
                  type="button"
                  disabled
                  aria-label="Send — chat is not connected yet"
                  title="Chat is not connected yet"
                  className="w-[22px] h-[22px] rounded-[5px] inline-flex items-center justify-center
                             bg-[var(--ide-accent)] text-white
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PaperPlaneRight size={12} weight="fill" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
