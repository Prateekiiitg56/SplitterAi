import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  Play,
  Check,
  Plus,
  Loader2,
  Send,
  RefreshCw,
  Maximize2,
  Search,
  MessageSquare,
  Mic,
} from 'lucide-react'
import { AVAILABLE_MODELS, ROLE_META } from '../../data'
import { useApp } from '../../context/AppContext'
import { useUI } from '../../context/UIContext'
import type { AgentRole, Subtask } from '../../types'
import { sendChatMessage, planTask } from '../../lib/api'
import { AgentIcon } from '../Badges'
import { DEFAULT_WORKSPACE } from '../../config'
import { Modal } from '../primitives/Modal'
import { Button } from '../primitives/Button'
import { useScore } from '../../lib/motion'
import { cx } from '../../lib/cx'
import AgentTabStrip from '../AgentTabStrip'
import { useIntegrations } from '../../hooks/useIntegrations'
import {
  ModelFusionIcon,
} from '../BrandIcons'

/* ── Types ─────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string
  sender: 'user' | 'agent'
  role?: AgentRole
  text: string
  timestamp: string
}

const ROLES: AgentRole[] = ['planner', 'coder', 'auditor', 'tester']

/* ── Greeting helper ───────────────────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatSessionDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/* ── Component ─────────────────────────────────────────────────── */

/* ── Framer Motion Variants per Spec ──────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

export function AIAssistantInterface() {
  const navigate = useNavigate()
  const score = useScore()
  const { sessions, refetchSessions, executeTaskWithPlan } = useApp()
  const { selectedModel, setSelectedModel } = useUI()
  const { integrations } = useIntegrations()

  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole>('planner')
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

  const handleStartFromScratch = () => {
    setChatMessages([])
    setInputValue('')
    setDraftPlan(null)
    setIsPlanning(false)
    setIsSending(false)
  }

  const selectedMeta = ROLE_META[selectedAgentRole] || ROLE_META.planner
  const activeAgentName = selectedMeta.label
  const greeting = useMemo(() => getGreeting(), [])

  return (
    <div className="relative flex-1 flex flex-col h-full min-h-full text-white font-sans bg-transparent overflow-hidden">
      {/* Top Header & Agent Tab Strip */}
      <AgentTabStrip
        selectedRole={selectedAgentRole}
        sessionAgents={sessionAgents}
        onSelectRole={setSelectedAgentRole}
        onAddAgent={() => setShowAddAgentModal(true)}
        onStartFromScratch={handleStartFromScratch}
      />

      {/* Main Scrollable View */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="w-full max-w-4xl min-h-full mx-auto px-4 py-10 sm:px-8 sm:py-14 lg:ml-16 lg:mr-10 lg:max-w-4xl lg:px-10 lg:py-16 lg:translate-x-16 lg:translate-y-32">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex w-full flex-col items-center px-4 sm:px-8 lg:px-10"
          >
            {/* Greeting Hero */}
            <motion.div variants={fadeUp} className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-serif font-normal text-white tracking-tight mb-2">
                {greeting}
              </h1>
              <p className="text-sm text-white/50 font-sans">
                {activeAgentName} is ready when you are.
              </p>
            </motion.div>

            {/* Input Card Container */}
            <motion.section
              variants={fadeUp}
              className="w-full max-w-2xl self-center bg-[#111116]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden mb-6 transition-colors hover:border-white/20"
            >
              {/* Active Chat Thread */}
              <AnimatePresence initial={false}>
                {chatMessages.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={score.transition.slow}
                    className="overflow-y-auto border-b border-white/10"
                    style={{ maxHeight: 280 }}
                  >
                    <div className="px-4 py-3 space-y-3">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cx('flex gap-2.5', msg.sender === 'user' ? 'justify-end' : 'justify-start')}
                        >
                          {msg.sender === 'agent' && (
                            <span className="mt-0.5 shrink-0 text-white/60">
                              <AgentIcon role={msg.role || selectedAgentRole} size={14} />
                            </span>
                          )}
                          <div
                            className={cx(
                              'max-w-[85%] px-3.5 py-2 rounded-xl text-xs leading-relaxed',
                              msg.sender === 'user'
                                ? 'bg-white text-black font-medium'
                                : 'bg-white/10 text-white border border-white/10',
                            )}
                          >
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {isSending && (
                        <div className="flex items-center gap-2 text-[11px] font-mono text-white/50">
                          <Loader2 size={12} className="animate-spin text-amber-300" />
                          <span>{activeAgentName} ({selectedModel.label}) is typing…</span>
                        </div>
                      )}
                      {isPlanning && (
                        <div className="flex items-center gap-2 text-[11px] font-mono text-white/50">
                          <Loader2 size={12} className="animate-spin text-amber-300" />
                          <span>Planning task split across agents…</span>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Textarea Input */}
              <div className="mx-auto box-border w-full px-5 pt-3 pb-2">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  rows={1}
                  className="block box-border w-full bg-transparent border-none text-xs text-white/90 font-sans resize-none outline-none min-h-[40px] leading-relaxed placeholder:text-white/30"
                />
              </div>

              {/* Bottom Row Inside Input Box */}
              <div className="mx-auto box-border flex w-full items-center justify-between px-5 pb-3 pt-2 border-t border-white/[0.04]">
                {/* Left Controls */}
                <div className="flex items-center gap-2 text-xs">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddAgentModal(true)}
                    className="p-1 rounded text-white/40 hover:text-white transition-colors flex items-center justify-center"
                  >
                    <Plus size={15} />
                  </motion.button>

                  {/* Model selector */}
                  <div className="relative">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setModelDropdownOpen((v) => !v)}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
                    >
                      <ModelFusionIcon size={14} />
                      <span className="max-w-[9rem] truncate">{selectedModel.label}</span>
                    </motion.button>

                    <AnimatePresence>
                      {modelDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -2 }}
                          transition={score.transition.base}
                          className="absolute left-0 bottom-full mb-1.5 w-[240px] rounded-xl border border-white/10 bg-[#16161c] shadow-2xl p-1 z-50"
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
                                  'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors',
                                  isSel ? 'bg-white/15 text-white font-medium' : 'text-white/60 hover:bg-white/5 hover:text-white',
                                )}
                              >
                                <span>{m.label}</span>
                                {isSel && <Check size={12} className="text-amber-300" />}
                              </button>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-1.5 rounded-full text-white/40 hover:text-white transition-colors flex items-center justify-center"
                  >
                    <Mic size={15} />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || isSending}
                    className={cx(
                      'w-7 h-7 rounded-lg flex items-center justify-center transition-all shadow-md shrink-0',
                      inputValue.trim() && !isSending
                        ? 'bg-white text-black hover:bg-white/90'
                        : 'bg-white/20 text-white/40 cursor-not-allowed',
                    )}
                  >
                    <Send size={13} className="ml-0.5" />
                  </motion.button>
                </div>
              </div>
            </motion.section>

            {/* Previous Chats Section */}
            <motion.div variants={fadeUp} className="w-full mb-10 lg:translate-y-12">
              <div className="flex items-center justify-between mb-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white/80 tracking-tight">Previous chats</span>
                  <span className="text-white/40">({sessions.length})</span>
                </div>
                <div className="flex items-center gap-3 text-white/40">
                  <button
                    type="button"
                    onClick={() => refetchSessions()}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <RefreshCw size={12} className="shrink-0" />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/projects')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <Maximize2 size={12} className="shrink-0" />
                    <span>Expand</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                {sessions.slice(0, 4).map((session) => (
                  <motion.button
                    key={session.id}
                    type="button"
                    onClick={() => navigate('/projects/default')}
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-all text-left h-[88px] group"
                  >
                    <MessageSquare size={14} className="text-white/50 shrink-0 mt-0.5" />
                    <div className="flex flex-col justify-between min-h-16 min-w-0 flex-1">
                      <p className="text-xs text-white/80 group-hover:text-white truncate font-medium leading-tight">
                        {session.task || 'Untitled session'}
                      </p>
                      <p className="text-[10px] text-white/40 font-sans">
                        {formatSessionDate(session.createdAt)}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
              {sessions.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-white/40">
                  Your completed sessions will appear here.
                </p>
              )}
            </motion.div>

            {/* Suggested Applications Section */}
            <motion.div variants={fadeUp} className="w-full lg:translate-y-12">
              <div className="flex items-center justify-between mb-4 text-xs">
                <span className="font-semibold text-white/80 tracking-tight">Connected integrations</span>
                <div className="flex items-center gap-3 text-white/40">
                  <button
                    type="button"
                    onClick={() => navigate('/integrations')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <Search size={12} className="shrink-0" />
                    <span>Search</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/integrations')}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <Maximize2 size={12} className="shrink-0" />
                    <span>Expand</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
                {integrations.slice(0, 4).map((app) => {
                  return (
                    <motion.button
                      key={app.id}
                      type="button"
                      onClick={() => navigate('/integrations')}
                      className="flex flex-col justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 hover:bg-white/[0.07] transition-all text-left h-[108px] group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-xs font-semibold text-white/70">
                              {app.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
                              {app.name}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">
                          {app.config?.description || `${app.type.toUpperCase()} integration`}
                        </p>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
              {integrations.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-white/40">
                  No integrations connected yet. Connect one to make it available to your agents.
                </p>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Plan-and-confirm dialog ──────────────────────────────── */}
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
                  className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-control bg-[var(--panel-2)] border border-[var(--border-soft)]"
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

      {/* ── Add-agent dialog ────────────────────────────────────── */}
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
                    'flex flex-col items-center justify-between gap-1.5 rounded-control border p-3 cursor-pointer',
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
              className="text-meta text-[var(--accent)] hover:underline font-medium cursor-pointer"
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
