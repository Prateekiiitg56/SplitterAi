import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatTeardropText, PaperPlaneRight, Cpu, Play, Trash } from '@phosphor-icons/react'
import { cx } from '../../lib/cx'
import { ChromeButton } from './ChromeButton'
import { EmptyState } from '../primitives/EmptyState'
import { MarkdownRenderer } from '../MarkdownRenderer'
import { useUI } from '../../context/UIContext'
import { useApp } from '../../context/AppContext'
import { streamChatMessage } from '../../lib/api'
import { DEFAULT_WORKSPACE, projectIdOf } from '../../config'

/**
 * ChatPanel — the right rail: quick questions answered in text. Chat never changes files; a reply's
 * "Run as task" hands the question to the agents (in the open project, or as a new one).
 */

interface ChatPanelProps {
  collapsed: boolean
  onToggle: () => void
}

interface Message {
  id: string
  sender: 'user' | 'agent'
  text: string
  source?: string
  failed?: boolean
}

const MAX_COMPOSER_HEIGHT = 90

export function ChatPanel({ collapsed, onToggle }: ChatPanelProps) {
  const navigate = useNavigate()
  const { selectedModel } = useUI()
  const { currentWorkspace, executeTask, runStatus } = useApp()
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const inProject = currentWorkspace !== DEFAULT_WORKSPACE
  const busy = runStatus === 'planning' || runStatus === 'executing'

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const handleDraftChange = (value: string) => {
    setDraft(value)
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(MAX_COMPOSER_HEIGHT, el.scrollHeight)}px`
  }

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    const history = messages.filter((m) => !m.failed).map((m) => ({ sender: m.sender, text: m.text }))
    const replyId = `a-${Date.now()}`
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: 'user', text }, { id: replyId, sender: 'agent', text: '', source: text }])
    handleDraftChange('')
    setSending(true)
    try {
      await streamChatMessage('planner', text, (delta) => {
        setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, text: m.text + delta } : m)))
      }, selectedModel.id, history)
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, text: err?.message || 'No reply: the backend could not be reached.', failed: true } : m)))
    } finally {
      setSending(false)
    }
  }

  const runAsTask = async (task: string) => {
    if (inProject) {
      // Follow-up work in the open project; its page shows the run.
      await executeTask(task, currentWorkspace, selectedModel.id)
      navigate(`/projects/${projectIdOf(currentWorkspace)}`)
    } else {
      navigate('/console', { state: { prefill: task } })
    }
  }

  const modelLabel = selectedModel.id ? selectedModel.id.split('/').pop() : selectedModel.label

  return (
    <aside
      aria-label="Chat"
      className={cx(
        'flex-shrink-0 flex flex-col overflow-hidden bg-[var(--ide-deep)]',
        'transition-[width] duration-[var(--d-base)] ease-standard',
        collapsed ? 'w-0 border-l-0' : 'w-[280px] border-l border-[var(--ide-border)]',
      )}
    >
      {!collapsed && (
        <>
          <div className="h-9 flex-shrink-0 flex items-center justify-between px-3 border-b border-[var(--ide-border-soft)]">
            <span className="h-[26px] px-2.5 inline-flex items-center gap-1.5 rounded-[5px] bg-[var(--ide-raised)] text-[11.5px] font-medium text-[var(--ide-text-hi)]">
              <ChatTeardropText size={13} weight="fill" className="text-[var(--ide-accent)]" aria-hidden="true" />
              Chat
            </span>
            <div className="flex items-center gap-0.5">
              {messages.length > 0 && (
                <ChromeButton icon={<Trash size={13} aria-hidden="true" />} label="Clear chat" onClick={() => setMessages([])} />
              )}
              <ChromeButton icon={<ChatTeardropText size={14} aria-hidden="true" />} label="Hide chat panel" onClick={onToggle} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" role="log" aria-live="polite" aria-label="Chat messages">
            {messages.length === 0 ? (
              <EmptyState
                icon={<ChatTeardropText size={28} weight="duotone" className="text-[var(--ide-accent)]" aria-hidden="true" />}
                title="Ask a quick question"
                detail={
                  inProject
                    ? 'Answers are text only. To change this project, ask here and press "Run in this project" on the reply.'
                    : 'Answers are text only. To have the agents build something, ask here and press "Run as task" on the reply.'
                }
              />
            ) : (
              messages.map((m) =>
                m.sender === 'user' ? (
                  <div key={m.id} className="ml-6 rounded-[10px] rounded-br-[3px] bg-[var(--ide-raised-2)] px-3 py-2 text-[12.5px] text-[var(--ide-text-hi)] whitespace-pre-wrap">
                    {m.text}
                  </div>
                ) : (
                  <div key={m.id} className={cx('text-[12.5px] leading-relaxed', m.failed ? 'text-[var(--bad,#e4715d)]' : 'text-[var(--ide-text)]')}>
                    {m.text ? <MarkdownRenderer content={m.text} /> : <span className="text-[var(--ide-text-faint)]">Thinking…</span>}
                    {m.source && m.text && !m.failed && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => runAsTask(m.source!)}
                        title={busy ? 'Wait for the current run to finish' : undefined}
                        className="mt-1.5 inline-flex items-center gap-1 h-6 px-2 rounded-[5px] border border-[var(--ide-border)] text-[11px] text-[var(--ide-text-dim)] hover:text-[var(--ide-text-hi)] hover:border-[var(--ide-accent)] disabled:opacity-40"
                      >
                        <Play size={10} weight="fill" aria-hidden="true" /> {inProject ? 'Run in this project' : 'Run as task'}
                      </button>
                    )}
                  </div>
                ),
              )
            )}
            <div ref={endRef} />
          </div>

          <div className="flex-shrink-0 p-2.5 border-t border-[var(--ide-border-soft)]">
            <div className="rounded-panel overflow-hidden bg-[var(--ide-raised)] border border-[var(--ide-border)] focus-within:border-[var(--ide-accent)]">
              <label htmlFor="shell-chat-draft" className="sr-only">Ask a question</label>
              <textarea
                id="shell-chat-draft"
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(e) => handleDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Ask a question…"
                className="w-full resize-none bg-transparent border-none outline-none px-[11px] pt-2.5 pb-1 text-[12.5px] text-[var(--ide-text)] placeholder:text-[var(--ide-text-faint)] min-h-5 max-h-[90px]"
              />
              <div className="flex items-center justify-between pl-2 pr-2 pt-1 pb-2">
                <span
                  className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded-[5px] bg-[var(--ide-raised-2)] text-[10.5px] font-mono text-[var(--ide-text-dim)] max-w-[170px] truncate"
                  title={`Model: ${selectedModel.label}`}
                >
                  <Cpu size={11} aria-hidden="true" />
                  {modelLabel}
                </span>
                <button
                  type="button"
                  onClick={send}
                  disabled={!draft.trim() || sending}
                  aria-label="Send question"
                  className="w-[24px] h-[24px] rounded-[5px] inline-flex items-center justify-center bg-[var(--ide-accent)] text-white disabled:opacity-40 disabled:cursor-not-allowed"
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
