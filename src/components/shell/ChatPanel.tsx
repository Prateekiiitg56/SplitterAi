import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, AtSign, Send, Cpu, Terminal } from 'lucide-react'
import { cx } from '../../lib/cx'
import { ChromeButton } from './ChromeButton'
import { EmptyState } from '../primitives/EmptyState'
import { Button } from '../primitives/Button'
import { useUI } from '../../context/UIContext'

/**
 * ChatPanel — the persistent composer rail on the right.
 *
 * Deliberately a UI shell. There *is* a chat transport in lib/api
 * (sendChatMessage), but the only conversation state in the app is local to
 * AIAssistantInterface on /console — there is no shared message store to read
 * from. Rather than stand up a second, parallel chat or fake a backend, this
 * renders the real chrome with an empty state that points at the Console,
 * where a live agent session actually runs.
 *
 * What *is* wired: the textarea auto-grows to 90px exactly as the reference's
 * vanilla JS did (now React state + a ref), and the model pill reads the
 * genuinely selected model out of UIContext. The send button is disabled and
 * says so, so nothing here pretends to work.
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

  // The reference grew the textarea on every input event; same behaviour, same
  // 90px ceiling, just driven from React's onChange.
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
        collapsed ? 'w-0 border-l-0' : 'w-[360px] border-l border-[var(--ide-border)]',
      )}
    >
      {!collapsed && (
        <>
          <div className="h-9 flex-shrink-0 flex items-center justify-between px-3 border-b border-[var(--ide-border-soft)]">
            <span
              className="h-[26px] px-2.5 inline-flex items-center gap-1.5 rounded-[5px]
                         bg-[var(--ide-raised)] text-[11.5px] font-medium text-[var(--ide-text-hi)]"
            >
              <MessageSquare size={12} aria-hidden="true" />
              Chat
            </span>
            <ChromeButton
              icon={<MessageSquare size={13} aria-hidden="true" />}
              label="Hide chat panel"
              onClick={onToggle}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <EmptyState
              icon={<MessageSquare size={26} aria-hidden="true" />}
              title="Workspace chat lives here"
              detail="This panel isn't connected to the agent stream yet. The Console runs a live session against the same models and workspace."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Terminal size={13} aria-hidden="true" />}
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
                    icon={<AtSign size={12.5} aria-hidden="true" />}
                    label="Add context (not connected yet)"
                    disabled
                  />
                  <span
                    className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-[5px]
                               bg-[var(--ide-raised-2)] text-[10.5px] font-mono text-[var(--ide-text-dim)]"
                    title={selectedModel.label}
                  >
                    <Cpu size={10} aria-hidden="true" />
                    {modelLabel}
                  </span>
                </div>
                <button
                  type="button"
                  disabled
                  aria-label="Send — chat is not connected yet"
                  title="Chat is not connected yet"
                  className="w-[22px] h-[22px] rounded-[5px] inline-flex items-center justify-center
                             bg-[var(--ide-accent)] text-[var(--ide-accent-ink)]
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={12} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
