import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  Play,
  Check,
  Plus,
  Loader2,
  Send,
  Upload,
  FileJson,
  Bot,
  ArrowRight,
  Plug,
} from 'lucide-react'
import { AVAILABLE_MODELS, ROLE_META } from '../data'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import type { AgentRole, Subtask } from '../types'
import { sendChatMessage, planTask, uploadWorkspace, importN8nWorkflow } from '../lib/api'
import { AgentIcon } from '../components/Badges'
import { DEFAULT_WORKSPACE } from '../config'
import { Modal } from '../components/primitives/Modal'
import { Button } from '../components/primitives/Button'
import { useScore } from '../lib/motion'
import { cx } from '../lib/cx'
import { useIntegrations } from '../hooks/useIntegrations'
import { ModelFusionIcon } from '../components/BrandIcons'

/* ── Types ──────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string
  sender: 'user' | 'agent'
  role?: AgentRole
  text: string
  timestamp: string
}

const ROLES: AgentRole[] = ['planner', 'coder', 'auditor', 'tester']

/* ── Framer motion variants ─────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

/* ── Component ──────────────────────────────────────────────────── */

export default function ConsolePage() {
  const navigate = useNavigate()
  const score = useScore()
  const { sessions, sessionsLoading, refetchSessions, executeTaskWithPlan } = useApp()
  const { selectedModel, setSelectedModel } = useUI()
  const { integrations } = useIntegrations()

  /* Chat state */
  const [selectedAgentRole, setSelectedAgentRole] = useState<AgentRole>('planner')
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [sessionAgents, setSessionAgents] = useState<AgentRole[]>(['planner'])
  const [showAddAgentModal, setShowAddAgentModal] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [isPlanning, setIsPlanning] = useState(false)
  const [draftPlan, setDraftPlan] = useState<{ taskTitle: string; subtasks: Subtask[] } | null>(null)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)

  const hasMessages = chatMessages.length > 0

  /* Body class for portal-rendered modals */
  useEffect(() => {
    document.body.classList.add('console-bolt-active')
    return () => { document.body.classList.remove('console-bolt-active') }
  }, [])

  /* Auto-scroll chat */
  useEffect(() => {
    if (hasMessages) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length, isSending, hasMessages])

  /* Auto-resize textarea */
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [inputValue])

  /* Close model dropdown on outside click */
  useEffect(() => {
    if (!modelDropdownOpen) return
    const handler = () => setModelDropdownOpen(false)
    window.addEventListener('click', handler, { once: true })
    return () => window.removeEventListener('click', handler)
  }, [modelDropdownOpen])

  /* Close attach menu on outside click */
  useEffect(() => {
    if (!attachMenuOpen) return
    const handler = () => setAttachMenuOpen(false)
    window.addEventListener('click', handler, { once: true })
    return () => window.removeEventListener('click', handler)
  }, [attachMenuOpen])

  /* ── Handlers (identical to ai-assistant-interface) ──────────── */

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

  const selectedMeta = ROLE_META[selectedAgentRole] || ROLE_META.planner
  const activeAgentName = selectedMeta.label

  const handleSend = async (overrideText?: string) => {
    const textToSubmit = (overrideText || inputValue).trim()
    if (!textToSubmit || isSending) return

    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text: textToSubmit, timestamp: ts }

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
          id: `agent-err-${Date.now()}`, sender: 'agent', role: 'planner',
          text: `Plan generation failed: ${err?.message || 'Could not reach the backend planner.'}`, timestamp: ts,
        }
        setChatMessages((prev) => [...prev, errorMsg])
      } finally { setIsPlanning(false) }
      return
    }

    setIsSending(true)
    try {
      const historyPayload = chatMessages.map((m) => ({ sender: m.sender, text: m.text }))
      const resp = await sendChatMessage(selectedAgentRole, textToSubmit, selectedModel.id, historyPayload)
      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`, sender: 'agent', role: selectedAgentRole,
        text: resp.reply, timestamp: resp.timestamp || ts,
      }
      setChatMessages((prev) => [...prev, agentMsg])
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `agent-err-${Date.now()}`, sender: 'agent', role: selectedAgentRole,
        text: `API error (${activeAgentName}): ${err?.message || 'Failed to connect to the model.'}`, timestamp: ts,
      }
      setChatMessages((prev) => [...prev, errorMsg])
    } finally { setIsSending(false) }
  }

  const handleAddAgentToSession = (role: AgentRole) => {
    if (!sessionAgents.includes(role)) setSessionAgents([...sessionAgents, role])
    setShowAddAgentModal(false)
  }

  const handleRemoveAgentFromSession = (role: AgentRole) => {
    if (sessionAgents.length <= 1) return
    const updated = sessionAgents.filter((r) => r !== role)
    setSessionAgents(updated)
    if (selectedAgentRole === role && updated.length > 0) setSelectedAgentRole(updated[0])
  }

  const handleConfirmAndLaunch = async () => {
    if (!draftPlan) return
    const planToExecute = draftPlan
    setDraftPlan(null)
    navigate('/projects/default')
    await executeTaskWithPlan(planToExecute.taskTitle, planToExecute.subtasks, DEFAULT_WORKSPACE, selectedModel.id)
  }

  const handleStartFromScratch = useCallback(() => {
    setChatMessages([])
    setInputValue('')
    setDraftPlan(null)
    setIsPlanning(false)
    setIsSending(false)
  }, [])

  /* Attach handlers */
  const handleUploadWorkspace = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        await uploadWorkspace(file)
        refetchSessions()
      } catch (err: any) {
        alert(`Upload failed: ${err?.message}`)
      }
    }
    input.click()
  }, [refetchSessions])

  const handleImportN8n = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const json = JSON.parse(text)
        const plan = await importN8nWorkflow(json)
        const subtasks: Subtask[] = plan.subtasks.map((st, idx) => ({
          id: st.id || `st-${idx + 1}`,
          role: st.role as AgentRole,
          group: st.group,
          instruction: st.instruction,
          status: 'pending' as const,
          steps: 0,
        }))
        setDraftPlan({ taskTitle: plan.task, subtasks })
      } catch (err: any) {
        alert(`Import failed: ${err?.message}`)
      }
    }
    input.click()
  }, [])

  /* ── Input card ───────────────────────────────────────────────── */

  function renderInputCard() {
    return (
      <div className={cx(
        'w-full rounded-2xl border backdrop-blur-xl shadow-lg transition-colors',
        'bg-[#1e1e22]/90 border-white/[0.10] hover:border-white/[0.16]',
        hasMessages ? 'max-w-[720px]' : 'max-w-[680px]',
      )}>
        {/* Textarea */}
        <div className="px-5 pt-4 pb-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            rows={1}
            placeholder="Describe what you want to build or split..."
            className="block w-full bg-transparent border-none text-[14px] text-white/90 font-sans resize-none outline-none min-h-[28px] leading-relaxed placeholder:text-white/25"
            aria-label="Chat message input"
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          {/* Left controls */}
          <div className="flex items-center gap-1.5">
            {/* Attach menu */}
            <div className="relative">
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={(e) => { e.stopPropagation(); setAttachMenuOpen((v) => !v) }}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
                aria-label="Attach file or add agent"
              >
                <Plus size={16} />
              </motion.button>

              <AnimatePresence>
                {attachMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 2 }}
                    transition={score.transition.base}
                    className="absolute left-0 bottom-full mb-2 w-[200px] rounded-xl border border-white/[0.10] bg-[#1a1a1e] shadow-lg p-1 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => { handleUploadWorkspace(); setAttachMenuOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <Upload size={14} /> Upload workspace (.zip)
                    </button>
                    <button
                      type="button"
                      onClick={() => { handleImportN8n(); setAttachMenuOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <FileJson size={14} /> Import n8n workflow
                    </button>
                    <div className="border-t border-white/[0.06] my-0.5" />
                    <button
                      type="button"
                      onClick={() => { setShowAddAgentModal(true); setAttachMenuOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <Bot size={14} /> Add agent
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Model selector */}
            <div className="relative">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => { e.stopPropagation(); setModelDropdownOpen((v) => !v) }}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/[0.04] px-3 border border-white/[0.08] text-[11.5px] text-white/50 hover:bg-white/[0.07] hover:text-white/80 hover:border-white/[0.14] transition-all"
                aria-label="Select model"
              >
                <ModelFusionIcon size={14} />
                <span className="max-w-[8rem] truncate">{selectedModel.label}</span>
                <ChevronDown size={12} className="opacity-50" />
              </motion.button>

              <AnimatePresence>
                {modelDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 2 }}
                    transition={score.transition.base}
                    className="absolute left-0 bottom-full mb-2 w-[260px] rounded-xl border border-white/[0.10] bg-[#1a1a1e] shadow-lg p-1 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {AVAILABLE_MODELS.map((m) => {
                      const isSel = selectedModel.id === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setSelectedModel(m); setModelDropdownOpen(false) }}
                          className={cx(
                            'flex items-center justify-between w-full px-3 py-2 rounded-lg text-[12px] text-left transition-colors',
                            isSel ? 'bg-[#1488fc]/10 text-white font-medium' : 'text-white/55 hover:bg-white/[0.06] hover:text-white',
                          )}
                        >
                          <span className="truncate">{m.label}</span>
                          {isSel && <Check size={13} className="text-[#1488fc] shrink-0 ml-2" />}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: send */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isSending}
            className={cx(
              'flex items-center justify-center gap-2 rounded-xl font-semibold text-[12.5px] transition-all h-9 shrink-0',
              inputValue.trim() && !isSending
                ? 'bg-[#1488fc] text-white hover:brightness-110 shadow-md px-4'
                : 'bg-white/[0.06] text-white/25 cursor-not-allowed w-9',
            )}
            aria-label="Send message"
          >
            {inputValue.trim() && !isSending && !hasMessages ? (
              <>Split now <ArrowRight size={14} /></>
            ) : (
              <Send size={14} className="ml-0.5" />
            )}
          </motion.button>
        </div>
      </div>
    )
  }

  /* ── Agent pills ──────────────────────────────────────────────── */

  function renderAgentPills() {
    return (
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {sessionAgents.map((r) => {
          const meta = ROLE_META[r]
          const isActive = selectedAgentRole === r
          return (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedAgentRole(r)}
              className={cx(
                'flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[12px] font-medium transition-all',
                isActive
                  ? 'bg-white/[0.12] text-white border border-white/[0.18] shadow-sm'
                  : 'bg-white/[0.04] text-white/50 border border-transparent hover:text-white/80 hover:bg-white/[0.07]',
              )}
            >
              <AgentIcon role={r} size={13} />
              <span>{meta.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => setShowAddAgentModal(true)}
          className="flex items-center gap-1 h-8 px-3 rounded-full text-[11px] text-white/35 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
          aria-label="Add agent"
        >
          <Plus size={13} /> Add
        </button>
      </div>
    )
  }

  /* ── Integration chips ────────────────────────────────────────── */

  function renderIntegrationChips() {
    if (integrations.length === 0) return null
    return (
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-[11px] text-white/30">or start from</span>
        <button
          type="button"
          onClick={handleImportN8n}
          className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.07] transition-colors"
        >
          <FileJson size={12} /> n8n workflow
        </button>
        <button
          type="button"
          onClick={handleUploadWorkspace}
          className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.07] transition-colors"
        >
          <Upload size={12} /> Workspace zip
        </button>
        <span className="text-white/15 mx-1">·</span>
        {integrations.slice(0, 4).map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => navigate('/integrations')}
            className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.07] transition-colors"
          >
            <Plug size={11} />
            <span className="truncate max-w-[80px]">{app.name}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => navigate('/integrations')}
          className="text-[11px] text-[#1488fc]/80 hover:text-[#1488fc] transition-colors font-medium"
        >
          Manage
        </button>
      </div>
    )
  }

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="console-bolt relative flex-1 flex flex-col h-full min-h-full overflow-hidden font-sans">
        {/* Ray background */}
        <div className="ray-bg absolute inset-0 pointer-events-none" />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto relative z-10">
          <AnimatePresence mode="wait">
            {!hasMessages ? (
              /* ── Hero state ───────────────────────────────────── */
              <motion.div
                key="hero"
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                variants={staggerContainer}
                className="min-h-full flex flex-col items-center justify-center px-4 sm:px-8 pb-24 pt-16"
              >
                {/* Heading */}
                <motion.div variants={fadeUp} className="text-center mb-6">
                  <h1 className="text-[2.5rem] sm:text-[3rem] font-bold text-white tracking-tight mb-2 leading-[1.1]">
                    What will you{' '}
                    <span className="bg-gradient-to-b from-[#4da5fc] via-[#4da5fc] to-white bg-clip-text text-transparent italic">
                      split
                    </span>
                    {' '}today?
                  </h1>
                  <p className="text-[15px] sm:text-[16px] text-[#8a8a8f] font-medium max-w-[520px] mx-auto leading-relaxed">
                    Describe a task. SplitterAI divides it across planner, coder, auditor and tester agents.
                  </p>
                </motion.div>

                {/* Agent pills */}
                <motion.div variants={fadeUp} className="mb-5">
                  {renderAgentPills()}
                </motion.div>

                {/* Input card */}
                <motion.div variants={fadeUp} className="w-full flex justify-center mb-6">
                  {renderInputCard()}
                </motion.div>

                {/* Integration chips */}
                <motion.div variants={fadeUp}>
                  {renderIntegrationChips()}
                </motion.div>
              </motion.div>
            ) : (
              /* ── Chat state ───────────────────────────────────── */
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col min-h-full"
              >
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
                  <div className="max-w-[720px] mx-auto space-y-4">
                    {chatMessages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={cx('flex gap-3', msg.sender === 'user' ? 'justify-end' : 'justify-start')}
                      >
                        {msg.sender === 'agent' && (
                          <span className="mt-1 shrink-0 w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/60">
                            <AgentIcon role={msg.role || selectedAgentRole} size={14} />
                          </span>
                        )}
                        <div
                          className={cx(
                            'max-w-[80%] px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed',
                            msg.sender === 'user'
                              ? 'bg-[#1488fc] text-white font-medium rounded-br-lg'
                              : 'bg-[#1e1e22] text-white/90 border border-white/[0.08] rounded-bl-lg',
                          )}
                        >
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}

                    {isSending && (
                      <div className="flex items-center gap-2.5 text-[12px] text-white/40">
                        <Loader2 size={14} className="animate-spin text-[#1488fc]" />
                        <span>{activeAgentName} ({selectedModel.label}) is typing…</span>
                      </div>
                    )}
                    {isPlanning && (
                      <div className="flex items-center gap-2.5 text-[12px] text-white/40">
                        <Loader2 size={14} className="animate-spin text-[#1488fc]" />
                        <span>Planning task split across agents…</span>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Docked input (chat state) */}
        {hasMessages && (
          <div className="shrink-0 relative z-10 px-4 sm:px-8 pb-5 pt-2 flex justify-center">
            <div className="w-full max-w-[720px]">
              {/* Agent pills row */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">{renderAgentPills()}</div>
              </div>
              {renderInputCard()}
              {/* Compact integration chips */}
              {integrations.length > 0 && (
                <div className="mt-2 flex items-center gap-2 justify-center flex-wrap">
                  {integrations.slice(0, 3).map((app) => (
                    <span
                      key={app.id}
                      className="flex items-center gap-1 text-[10px] text-white/25"
                    >
                      <Plug size={9} /> {app.name}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => navigate('/integrations')}
                    className="text-[10px] text-[#1488fc]/60 hover:text-[#1488fc] transition-colors"
                  >
                    Manage
                  </button>
                </div>
              )}
            </div>
          </div>
        )}


      {/* ── Plan-and-confirm dialog ─────────────────────────────── */}
      <Modal
        open={!!draftPlan}
        onClose={() => setDraftPlan(null)}
        title="Multi-agent split proposed"
        description="Review how the task divides before launching. Each subtask runs as its own worker."
        width={520}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setDraftPlan(null)}>Cancel</Button>
            <Button variant="primary" size="md" icon={<Play size={13} />} onClick={handleConfirmAndLaunch}>
              Start project & launch
            </Button>
          </>
        }
      >
        {draftPlan && (
          <div className="space-y-2">
            <p className="font-mono text-[11px] text-[var(--faint)] tabular-nums">
              {draftPlan.subtasks.length} subtasks · {draftPlan.taskTitle}
            </p>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto">
              {draftPlan.subtasks.map((st, idx) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg bg-[var(--panel-2)] border border-[var(--border-soft)]"
                >
                  <span className="truncate flex-1 text-[12px] text-[var(--text)]">
                    <span className="font-mono text-[11px] text-[var(--faint)] mr-2 tabular-nums">{idx + 1}</span>
                    {st.instruction}
                  </span>
                  <span className={cx(
                    'shrink-0 font-mono text-[10px] font-medium',
                    st.role === 'planner' && 'text-[var(--role-planner)]',
                    st.role === 'coder' && 'text-[var(--role-coder)]',
                    st.role === 'auditor' && 'text-[var(--role-reviewer)]',
                    st.role === 'tester' && 'text-[var(--role-runner)]',
                  )}>
                    {st.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add-agent dialog ───────────────────────────────────── */}
      <Modal
        open={showAddAgentModal}
        onClose={() => setShowAddAgentModal(false)}
        title="Add an agent"
        description="Bring another worker into this session. Your next split runs across every agent here."
        width={460}
        footer={<Button variant="ghost" size="md" onClick={() => setShowAddAgentModal(false)}>Done</Button>}
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
                    if (isAlreadyIn) { if (canRemove) handleRemoveAgentFromSession(r) }
                    else handleAddAgentToSession(r)
                  }}
                  className={cx(
                    'flex flex-col items-center justify-between gap-1.5 rounded-xl border p-3 cursor-pointer',
                    'text-[12px] font-medium capitalize transition-all',
                    isAlreadyIn
                      ? 'border-[var(--accent-edge)] bg-[var(--panel-3)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--panel-2)] text-[var(--dim)] hover:border-[var(--accent-edge)] hover:text-[var(--text)]',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <AgentIcon role={r} size={16} />
                    <span>{meta.label}</span>
                  </div>
                  <span className="text-[10px] font-mono">
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
              onClick={() => { setShowAddAgentModal(false); navigate('/projects/default/agents') }}
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
