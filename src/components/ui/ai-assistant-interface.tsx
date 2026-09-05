import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  Play,
  Check,
  Cpu,
  Plus,
  Loader2,
  Send,
  Paperclip,
  X,
} from 'lucide-react'
import { AVAILABLE_MODELS, ROLE_META } from '../../data'
import { useApp } from '../../context/AppContext'
import { useUI } from '../../context/UIContext'
import type { AgentRole, Subtask } from '../../types'
import { sendChatMessage, planTask } from '../../lib/api'
import { AgentIcon } from '../Badges'
import { DEFAULT_WORKSPACE } from '../../config'
import SplitCanvas from '../SplitCanvas'
import { Modal } from '../primitives/Modal'
import { Button } from '../primitives/Button'
import { useScore } from '../../lib/motion'
import { cx } from '../../lib/cx'

interface ChatMessage {
  id: string
  sender: 'user' | 'agent'
  role?: AgentRole
  text: string
  timestamp: string
}

const ROLES: AgentRole[] = ['planner', 'coder', 'auditor', 'tester']

export function AIAssistantInterface() {
  const navigate = useNavigate()
  const score = useScore()
  const { executeTaskWithPlan } = useApp()
  const { selectedModel, setSelectedModel } = useUI()

  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole>('planner')
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [sessionAgents, setSessionAgents] = useState<AgentRole[]>(['planner'])
  const [showAddAgentModal, setShowAddAgentModal] = useState(false)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [isPlanning, setIsPlanning] = useState(false)
  const [draftPlan, setDraftPlan] = useState<{ taskTitle: string; subtasks: Subtask[] } | null>(null)

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages.length, isSending])

  const isMultiAgentSplitRequest = (msg: string) => {
    const lower = msg.toLowerCase()
    return (
      lower.includes('split') ||
      lower.includes('together') ||
      lower.includes('divide') ||
      lower.includes('build an app') ||
      lower.includes('build a website') ||
      lower.includes('create a project') ||
      lower.includes('create an app') ||
      lower.includes('build a') ||
      lower.includes('implement a')
    )
  }

  const handleSend = async (overrideText?: string) => {
    const textToSubmit = (overrideText || inputValue).trim()
    if (!textToSubmit || isSending) return

    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSubmit,
      timestamp: ts,
    }

    setChatMessages((prev) => [...prev, userMsg])
    setInputValue('')

    if (isMultiAgentSplitRequest(textToSubmit)) {
      setIsPlanning(true)
      try {
        const planResult = await planTask(textToSubmit, DEFAULT_WORKSPACE, selectedModel.id)
        const generatedSubtasks: Subtask[] = planResult.subtasks.map((st, idx) => ({
          id: st.id || `st-${idx + 1}`,
          role: st.role as AgentRole,
          group: st.group,
          instruction: st.instruction,
          status: 'pending' as const,
          steps: 0,
        }))
        setDraftPlan({ taskTitle: textToSubmit, subtasks: generatedSubtasks })
      } catch (err: any) {
        const errorMsg: ChatMessage = {
          id: `agent-err-${Date.now()}`,
          sender: 'agent',
          role: 'planner',
          text: `Plan generation failed: ${err?.message || 'Could not reach the backend planner.'}`,
          timestamp: ts,
        }
        setChatMessages((prev) => [...prev, errorMsg])
      } finally {
        setIsPlanning(false)
      }
      return
    }

    setIsSending(true)
    try {
      const historyPayload = chatMessages.map((m) => ({ sender: m.sender, text: m.text }))
      const resp = await sendChatMessage(selectedAgentRole, textToSubmit, selectedModel.id, historyPayload)
      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        role: selectedAgentRole,
        text: resp.reply,
        timestamp: resp.timestamp || ts,
      }
      setChatMessages((prev) => [...prev, agentMsg])
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `agent-err-${Date.now()}`,
        sender: 'agent',
        role: selectedAgentRole,
        text: `API error (${selectedMeta.label}): ${err?.message || 'Failed to connect to the model.'}`,
        timestamp: ts,
      }
      setChatMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }

  const handleAddAgentToSession = (role: AgentRole) => {
    if (!sessionAgents.includes(role)) {
      setSessionAgents([...sessionAgents, role])
    }
    setShowAddAgentModal(false)
  }

  const handleRemoveAgentFromSession = (role: AgentRole) => {
    if (sessionAgents.length <= 1) return
    const updated = sessionAgents.filter((r) => r !== role)
    setSessionAgents(updated)
    if (selectedAgentRole === role && updated.length > 0) {
      setSelectedAgentRole(updated[0])
    }
  }

  const handleConfirmAndLaunch = async () => {
    if (!draftPlan) return
    const planToExecute = draftPlan
    setDraftPlan(null)
    navigate('/projects/default')
    await executeTaskWithPlan(planToExecute.taskTitle, planToExecute.subtasks, DEFAULT_WORKSPACE, selectedModel.id)
  }

  const selectedMeta = ROLE_META[selectedAgentRole] || ROLE_META.coder

  return (
    <div className="relative flex-1 flex flex-col min-h-0 bg-[var(--bg)] text-[var(--text)] font-sans overflow-hidden">
      {/* The one earned 3D moment, behind everything. */}
      <SplitCanvas />

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 px-6 py-10 overflow-hidden">
        <motion.div
          variants={score.revealParent}
          initial="hidden"
          animate="shown"
          className="w-full max-w-[640px] flex flex-col items-center"
        >
          {/* Brand mark */}
          <motion.div variants={score.revealChild} className="mb-6">
            <span
              aria-hidden="true"
              className="w-10 h-10 rounded-[var(--r-control)] border border-[var(--border)] bg-[var(--panel)] flex items-center justify-center text-[var(--accent)] shadow-[var(--shadow-raise)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                <circle cx="12" cy="5" r="2.4" /><circle cx="5" cy="19" r="2.4" /><circle cx="19" cy="19" r="2.4" /><path d="M12 7.4V12M12 12L6.3 17M12 12l5.7 5" />
              </svg>
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={score.revealChild}
            className="text-[26px] leading-[1.2] font-semibold tracking-tight text-center mb-2.5"
          >
            Split the work. Run it in parallel.
          </motion.h1>

          <motion.p
            variants={score.revealChild}
            className="text-[13.5px] leading-[1.55] text-[var(--dim)] text-center max-w-[440px] mb-8"
          >
            Talk to one agent like a normal chat, or bring more into the room when a task is ready
            to be divided and run at once.
          </motion.p>

          {/* Composer card */}
          <motion.section
            variants={score.revealChild}
            className="w-full max-w-[560px] border border-[var(--border)] rounded-[var(--r-float)] shadow-[var(--shadow-float)] overflow-hidden"
            style={{ backgroundColor: 'rgba(15, 20, 32, 0.82)' }}
          >
            {/* Picker bar */}
            <div className="flex items-center justify-between gap-2 px-3.5 h-10 border-b border-[var(--border-soft)]">
              <div className="flex items-center gap-2">
                {/* Agent picker */}
                <div className="relative">
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => {
                      setAgentDropdownOpen((v) => !v)
                      setModelDropdownOpen(false)
                    }}
                    className="h-6"
                  >
                    <AgentIcon role={selectedAgentRole} size={13} className="text-[var(--accent)]" />
                    <span>{selectedMeta.label}</span>
                    <ChevronDown size={11} className="text-[var(--faint)]" />
                  </Button>

                  <AnimatePresence>
                    {agentDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        transition={score.transition.base}
                        className="absolute left-0 top-full mt-1.5 w-[200px] rounded-[var(--r-float)] border border-[var(--border)] bg-[var(--panel-2)] shadow-[var(--shadow-float)] p-1 z-50"
                      >
                        {ROLES.map((r) => {
                          const meta = ROLE_META[r]
                          const isSel = selectedAgentRole === r
                          return (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                setSelectedAgentRole(r)
                                setAgentDropdownOpen(false)
                              }}
                              className={cx(
                                'flex items-center justify-between w-full h-7 px-2 rounded-[var(--r-control)]',
                                'text-meta text-left transition-colors duration-[var(--d-quick)] ease-standard',
                                isSel
                                  ? 'bg-[var(--panel-3)] text-[var(--text)]'
                                  : 'text-[var(--dim)] hover:bg-[var(--panel-3)] hover:text-[var(--text)]',
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <AgentIcon role={r} size={13} />
                                <span>{meta.label}</span>
                              </span>
                              {isSel && <Check size={12} className="text-[var(--accent)]" />}
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Model picker */}
                <div className="relative">
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => {
                      setModelDropdownOpen((v) => !v)
                      setAgentDropdownOpen(false)
                    }}
                    className="h-6"
                  >
                    <Cpu size={13} className="text-[var(--accent)]" />
                    <span>{selectedModel.label}</span>
                    <ChevronDown size={11} className="text-[var(--faint)]" />
                  </Button>

                  <AnimatePresence>
                    {modelDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        transition={score.transition.base}
                        className="absolute left-0 top-full mt-1.5 w-[260px] rounded-[var(--r-float)] border border-[var(--border)] bg-[var(--panel-2)] shadow-[var(--shadow-float)] p-1 z-50"
                      >
                        {AVAILABLE_MODELS.map((m) => {
                          const isSel = selectedModel.id === m.id
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedModel(m)
                                setModelDropdownOpen(false)
                              }}
                              className={cx(
                                'flex items-center justify-between w-full px-2 py-1.5 rounded-[var(--r-control)]',
                                'text-meta text-left transition-colors duration-[var(--d-quick)] ease-standard',
                                isSel
                                  ? 'bg-[var(--panel-3)] text-[var(--text)]'
                                  : 'text-[var(--dim)] hover:bg-[var(--panel-3)] hover:text-[var(--text)]',
                              )}
                            >
                              <span className="flex flex-col min-w-0">
                                <span className="truncate">{m.label}</span>
                                <span className="font-mono text-micro text-[var(--faint)]">{m.provider}</span>
                              </span>
                              {isSel && <Check size={12} className="text-[var(--accent)] flex-shrink-0" />}
                            </button>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {sessionAgents.map((r) => {
                  const meta = ROLE_META[r] || ROLE_META.coder
                  const isSelected = selectedAgentRole === r
                  return (
                    <span
                      key={r}
                      onClick={() => setSelectedAgentRole(r)}
                      className={cx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-micro font-medium transition-colors cursor-pointer select-none',
                        isSelected
                          ? 'bg-[var(--panel-3)] border-[var(--accent-edge)] text-[var(--text)]'
                          : 'bg-[var(--panel-2)] border-[var(--border-soft)] text-[var(--dim)] hover:text-[var(--text)]'
                      )}
                    >
                      <AgentIcon role={r} size={11} />
                      <span>{meta.label}</span>
                      {sessionAgents.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveAgentFromSession(r)
                          }}
                          aria-label={`Remove ${meta.label}`}
                          title={`Remove ${meta.label} agent`}
                          className="hover:text-[var(--bad)] text-[var(--faint)] transition-colors p-0.5 rounded-full -mr-0.5"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Thread */}
            <AnimatePresence initial={false}>
              {chatMessages.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={score.transition.slow}
                  className="overflow-y-auto"
                  style={{ maxHeight: 260 }}
                >
                  <div className="px-3.5 py-3 space-y-3">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cx('flex gap-2.5', msg.sender === 'user' ? 'justify-end' : 'justify-start')}
                      >
                        {msg.sender === 'agent' && (
                          <span className="mt-0.5 shrink-0 text-[var(--dim)]">
                            <AgentIcon role={msg.role || selectedAgentRole} size={14} />
                          </span>
                        )}
                        <div
                          className={cx(
                            'max-w-[85%] px-3 py-2 rounded-[var(--r-control)] text-ui leading-[1.5]',
                            msg.sender === 'user'
                              ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-medium'
                              : 'bg-[var(--panel-2)] text-[var(--text)] border border-[var(--border)]',
                          )}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    {isSending && (
                      <div className="flex items-center gap-2 text-micro font-mono text-[var(--faint)]">
                        <Loader2 size={12} className="animate-spin text-[var(--accent)]" />
                        <span>{selectedMeta.label} ({selectedModel.label}) is replying…</span>
                      </div>
                    )}
                    {isPlanning && (
                      <div className="flex items-center gap-2 text-micro font-mono text-[var(--faint)]">
                        <Loader2 size={12} className="animate-spin text-[var(--accent)]" />
                        <span>Planning the split across {sessionAgents.length} agents…</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="flex flex-col gap-2 px-3.5 py-3">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={`Message the ${selectedMeta.label.toLowerCase()} agent, or describe a task to split across a team…`}
                rows={2}
                className="w-full bg-transparent border-none text-ui text-[var(--text)] font-sans resize-none outline-none min-h-[44px] leading-[1.55] placeholder:text-[var(--faint)]"
              />

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-soft)]">
                <div className="flex items-center gap-1">
                  <Button variant="quiet" size="sm" onClick={() => setShowAddAgentModal(true)}>
                    <Plus size={12} />
                    <span>Add agent</span>
                  </Button>
                  <button
                    type="button"
                    disabled
                    title="Attachments are not available yet"
                    className="inline-flex items-center gap-1.5 h-6 px-2 text-meta text-[var(--faint)] cursor-not-allowed"
                  >
                    <Paperclip size={12} />
                    <span>Attach</span>
                  </button>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isSending}
                >
                  <span>Send</span>
                  <Send size={12} />
                </Button>
              </div>
            </div>
          </motion.section>

          {/* Prompt hint */}
          <motion.div
            variants={score.revealChild}
            className="mt-4 text-micro text-[var(--faint)] text-center"
          >
            Try{' '}
            <button
              type="button"
              onClick={() => handleSend('build a REST API with auth and tests')}
              className="font-medium text-[var(--dim)] underline decoration-[var(--border-strong)] underline-offset-2 hover:text-[var(--text)] transition-colors duration-[var(--d-quick)] ease-standard"
            >
              build a REST API
            </button>
            ,{' '}
            <button
              type="button"
              onClick={() => handleSend('divide this project into frontend and backend')}
              className="font-medium text-[var(--dim)] underline decoration-[var(--border-strong)] underline-offset-2 hover:text-[var(--text)] transition-colors duration-[var(--d-quick)] ease-standard"
            >
              divide a project
            </button>
            , or{' '}
            <button
              type="button"
              onClick={() => handleSend('split a todo app across the team')}
              className="font-medium text-[var(--dim)] underline decoration-[var(--border-strong)] underline-offset-2 hover:text-[var(--text)] transition-colors duration-[var(--d-quick)] ease-standard"
            >
              split a todo app
            </button>
          </motion.div>
        </motion.div>
      </main>

      {/* Plan-and-confirm dialog */}
      <Modal
        open={!!draftPlan}
        onClose={() => setDraftPlan(null)}
        title="Multi-agent split proposed"
        description="Review how the task divides before launching. Each subtask runs as its own worker."
        width={520}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setDraftPlan(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" icon={<Play size={13} />} onClick={handleConfirmAndLaunch}>
              Start project & launch
            </Button>
          </>
        }
      >
        {draftPlan && (
          <div className="space-y-2">
            <p className="font-mono text-micro text-[var(--faint)] tabular-nums">
              {draftPlan.subtasks.length} subtasks · {draftPlan.taskTitle}
            </p>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
              {draftPlan.subtasks.map((st, idx) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-[var(--r-control)] bg-[var(--panel-2)] border border-[var(--border-soft)]"
                >
                  <span className="truncate flex-1 text-meta text-[var(--text)]">
                    <span className="font-mono text-micro text-[var(--faint)] mr-2 tabular-nums">{idx + 1}</span>
                    {st.instruction}
                  </span>
                  <span
                    className={cx(
                      'shrink-0 font-mono text-micro font-medium',
                      st.role === 'planner' && 'text-[var(--role-planner)]',
                      st.role === 'coder' && 'text-[var(--role-coder)]',
                      st.role === 'auditor' && 'text-[var(--role-reviewer)]',
                      st.role === 'tester' && 'text-[var(--role-runner)]',
                    )}
                  >
                    {st.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Add-agent dialog */}
      <Modal
        open={showAddAgentModal}
        onClose={() => setShowAddAgentModal(false)}
        title="Add an agent"
        description="Bring another worker into this session. Your next split runs across every agent here."
        width={460}
        footer={
          <Button variant="ghost" size="md" onClick={() => setShowAddAgentModal(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => {
              const isAlreadyIn = sessionAgents.includes(r)
              const meta = ROLE_META[r]
              const canRemove = isAlreadyIn && sessionAgents.length > 1
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    if (isAlreadyIn) {
                      if (canRemove) handleRemoveAgentFromSession(r)
                    } else {
                      handleAddAgentToSession(r)
                    }
                  }}
                  className={cx(
                    'flex flex-col items-center justify-between gap-1.5 rounded-[var(--r-control)] border p-3 cursor-pointer',
                    'text-meta font-medium capitalize transition-all duration-[var(--d-quick)] ease-standard',
                    isAlreadyIn
                      ? 'border-[var(--accent-edge)] bg-[var(--panel-3)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--dim)] hover:border-[var(--accent-edge)] hover:text-[var(--text)]',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <AgentIcon role={r} size={16} />
                    <span>{meta.label}</span>
                  </div>
                  <span className="text-micro font-mono">
                    {isAlreadyIn ? (
                      <span className="text-[var(--good)] flex items-center gap-1">
                        <Check size={10} /> Active {canRemove ? '(Click to remove)' : ''}
                      </span>
                    ) : (
                      <span className="text-[var(--faint)]">+ Click to add</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="pt-2 border-t border-[var(--border-soft)] text-center">
            <button
              type="button"
              onClick={() => {
                setShowAddAgentModal(false)
                navigate('/projects/default/agents')
              }}
              className="text-[12px] text-[var(--accent)] hover:underline font-medium cursor-pointer"
            >
              Need per-agent tasks and custom ordering? Open the full builder →
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AIAssistantInterface
