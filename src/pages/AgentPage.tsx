import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Pause, Play, Square, Zap, Terminal, Loader2 } from 'lucide-react'
import { ROLE_META } from '../data'
import type { AgentRole, AgentStatus } from '../types'
import { AgentIcon, StatusBadge } from '../components/Badges'
import { Modal } from '../components/primitives/Modal'
import { Button } from '../components/primitives/Button'
import { EmptyState } from '../components/primitives/EmptyState'
import { useAgentDetail } from '../hooks/useAgentDetail'
import { useWorkspaceFiles } from '../hooks/useWorkspaceFiles'
import { useUI } from '../context/UIContext'
import { useApp } from '../context/AppContext'

export function AgentPage() {
  const { agentId, role: routeRole } = useParams<{ agentId?: string; role?: string }>()
  const effectiveRole = (agentId || routeRole || 'coder') as AgentRole

  const navigate = useNavigate()
  const { selectedRole, setSelectedRole } = useUI()
  const { currentWorkspace, logs: globalLogs, subtasks, runStatus, taskTitle } = useApp()

  useEffect(() => {
    if (effectiveRole && effectiveRole !== selectedRole) {
      setSelectedRole(effectiveRole)
    }
  }, [effectiveRole, selectedRole, setSelectedRole])

  const { agentData, loading, error } = useAgentDetail(selectedRole)
  const { fileTree: workspaceFiles } = useWorkspaceFiles(currentWorkspace)

  const logEndRef = useRef<HTMLDivElement>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [localStatusOverride, setLocalStatusOverride] = useState<AgentStatus | null>(null)

  const meta = ROLE_META[selectedRole] || ROLE_META.coder

  const agentLogs =
    globalLogs && globalLogs.length > 0
      ? globalLogs.filter((l) => !l.role || l.role === selectedRole)
      : agentData?.logs || []

  const currentSubtask = subtasks.find((st) => st.role === selectedRole)

  let agentStatus: AgentStatus = localStatusOverride || 'idle'
  if (!localStatusOverride) {
    if (currentSubtask) {
      if (currentSubtask.status === 'running' || currentSubtask.status === 'working') agentStatus = 'working'
      else if (currentSubtask.status === 'success' || currentSubtask.status === 'completed') agentStatus = 'completed'
      else if (currentSubtask.status === 'error' || currentSubtask.status === 'failed') agentStatus = 'failed'
    } else if (runStatus === 'planning' && selectedRole === 'planner') agentStatus = 'working'
    else if (runStatus === 'executing' && selectedRole === 'coder') agentStatus = 'working'
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [agentLogs.length])

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-transparent text-[var(--text)] font-sans select-none overflow-hidden relative z-10">
      <div className="agent-wrap">
        {/* Left Side Inspector */}
        <div className="agent-side">
          <div className="back-link" onClick={() => navigate('/agents')}>
            <ArrowLeft size={12} />
            <span>Back to agents</span>
          </div>

          <div className="as-glyph" style={{ color: meta.color }}>
            <AgentIcon role={selectedRole} size={20} />
          </div>
          <div className="as-name">{meta.label} Worker</div>
          <div className="as-desc">{meta.desc || 'Specialized AI task processing agent'}</div>

          <div className="as-actions">
            <Button
              variant="ghost"
              size="sm"
              style={{ flex: 1 }}
              icon={agentStatus === 'paused' ? <Play size={12} /> : <Pause size={12} />}
              onClick={() => setLocalStatusOverride(agentStatus === 'paused' ? 'working' : 'paused')}
            >
              {agentStatus === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="quiet"
              size="sm"
              icon={<Square size={12} />}
              label="Stop"
              onClick={() => setLocalStatusOverride('idle')}
              title="Stop Agent"
            />
          </div>

          <div className="as-section">
            <h4>Parameters</h4>
            <div className="kv-row">
              <span className="k">Role</span>
              <span className="v">{selectedRole}</span>
            </div>
            <div className="kv-row">
              <span className="k">Model</span>
              <span className="v">gemini-3.5-flash</span>
            </div>
            <div className="kv-row">
              <span className="k">Status</span>
              <span className="v">
                <StatusBadge status={agentStatus} size="sm" />
              </span>
            </div>
            <div className="kv-row">
              <span className="k">Group</span>
              <span className="v">{currentSubtask?.group || 1}</span>
            </div>
          </div>

          <div className="as-section">
            <h4>Modified Files</h4>
            <div className="files-touched">
              {workspaceFiles.length === 0 ? (
                <div className="ft-row">
                  <FileText size={12} />
                  <span className="text-[var(--faint)]">No files indexed</span>
                </div>
              ) : (
                workspaceFiles.slice(0, 8).map((f) => (
                  <div
                    key={f.path || f.name}
                    className="ft-row"
                    onClick={() => setSelectedFilePath(f.path || f.name)}
                  >
                    <FileText size={12} />
                    <span className="truncate">{f.name || f.path}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Main Activity Console */}
        <div className="agent-main">
          {/* Header Bar */}
          <div className="am-head">
            <div className="title">
              <Terminal size={14} />
              <span>Activity Stream — {meta.label}</span>
            </div>

            {/* Role Tabs */}
            <nav className="tab-strip" aria-label="Role selector">
              {(['coder', 'auditor', 'tester', 'planner'] as AgentRole[]).map((r) => {
                const isSel = selectedRole === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r)
                      navigate(`/agents/${r}`)
                    }}
                    className={`tab-btn ${isSel ? 'active' : ''}`}
                  >
                    <AgentIcon role={r} size={12} />
                    <span className="capitalize">{r}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Activity Console Body */}
          <div className="am-body">
            <div className="task-banner">
              <div className="tb-icon">
                <Zap size={16} />
              </div>
              <div className="tb-text">
                {currentSubtask
                  ? currentSubtask.instruction
                  : taskTitle
                  ? taskTitle
                  : 'Idle — ready for task assignment'}
              </div>
              <div className="tb-pct">
                {agentStatus === 'completed' ? '100%' : agentStatus === 'working' ? '78%' : '0%'}
              </div>
            </div>

            <div className="log-console">
              {loading ? (
                <div className="p-4 flex items-center justify-center gap-2 font-mono text-meta text-[var(--dim)]">
                  <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
                  <span>Loading activity log…</span>
                </div>
              ) : error ? (
                <div className="p-3 text-meta text-[var(--bad)] border border-[var(--bad)] rounded-control bg-[var(--bad-quiet)]">
                  <strong>Error:</strong> {error}
                </div>
              ) : agentLogs.length === 0 ? (
                <EmptyState
                  icon={<Terminal size={28} />}
                  title={`No activity recorded yet for ${meta.label}`}
                  detail="Events will stream in real time when a task is launched."
                />
              ) : (
                agentLogs.map((log, idx) => (
                  <div key={log.id || idx} className="ln">
                    <span className="ts">{log.timestamp}</span>
                    <span className={`msg ${(log.type as string) === 'execute' || log.type === 'tool_call' ? 'hl' : ''}`}>{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Code Inspector Modal */}
      <Modal
        open={!!selectedFilePath}
        onClose={() => setSelectedFilePath(null)}
        title="File inspector"
        description={selectedFilePath ? <span className="font-mono">{selectedFilePath}</span> : undefined}
        width={600}
        footer={
          <Button variant="ghost" size="md" onClick={() => setSelectedFilePath(null)}>
            Close
          </Button>
        }
      >
        <div className="p-3 bg-[var(--bg-inset)] border border-[var(--border-soft)] rounded-control font-mono text-micro text-[var(--text)] max-h-[300px] overflow-y-auto">
          <code>// Inspected file context: {selectedFilePath}</code>
        </div>
      </Modal>
    </div>
  )
}

export default AgentPage