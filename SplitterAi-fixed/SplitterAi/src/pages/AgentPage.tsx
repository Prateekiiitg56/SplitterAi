import { useParams, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, FileText, ChevronRight, RefreshCw } from 'lucide-react'
import { ROLE_META } from '../data'
import type { AgentRole, LogEntry, AgentStatus } from '../types'
import { AgentIcon, StatusBadge } from '../components/Badges'
import { Modal } from '../components/primitives/Modal'
import { Button } from '../components/primitives/Button'
import { useAgentDetail } from '../hooks/useAgentDetail'
import { useWorkspaceFiles } from '../hooks/useWorkspaceFiles'
import { useUI } from '../context/UIContext'
import { useApp } from '../context/AppContext'
import { DEFAULT_WORKSPACE } from '../config'

export function AgentPage() {
  const { agentId, role: routeRole } = useParams<{ agentId?: string; role?: string }>()
  const effectiveRole = (agentId || routeRole || 'coder') as AgentRole

  const navigate = useNavigate()
  const { selectedRole, setSelectedRole } = useUI()
  const { logs: globalLogs, subtasks, runStatus, taskTitle } = useApp()

  useEffect(() => {
    if (effectiveRole && effectiveRole !== selectedRole) {
      setSelectedRole(effectiveRole)
    }
  }, [effectiveRole, selectedRole, setSelectedRole])

  const { agentData, loading, error } = useAgentDetail(selectedRole)
  const { fileTree: workspaceFiles } = useWorkspaceFiles(DEFAULT_WORKSPACE)

  const logEndRef = useRef<HTMLDivElement>(null)
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [localStatusOverride, setLocalStatusOverride] = useState<AgentStatus | null>(null)

  const meta = ROLE_META[selectedRole] || ROLE_META.coder

  const agentLogs = (globalLogs && globalLogs.length > 0)
    ? globalLogs.filter((l) => !l.role || l.role === selectedRole)
    : (agentData?.logs || [])

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
    <div className="flex-1 flex flex-col min-w-0 h-full bg-[var(--bg)] text-[var(--text)] font-sans select-none overflow-hidden relative z-10">
      
      {/* Topbar */}
      <div className="topbar h-[48px] border-b border-[var(--border-soft)] flex items-center justify-between px-5 bg-[var(--bg)] flex-shrink-0">
        <div className="topbar-left flex items-center gap-3">
          <button
            onClick={() => navigate('/agents')}
            className="icon-btn w-7 h-7 rounded-md flex items-center justify-center text-[var(--faint)] hover:text-[var(--text)] hover:bg-[var(--panel-2)] transition-colors cursor-pointer"
            title="Back to Agents"
          >
            <ArrowLeft size={14} />
          </button>
          <span className="topbar-title font-semibold text-[14px]">Agent Workspace</span>
          <span className="topbar-crumb font-mono text-[11.5px] text-[var(--faint)]">/ {meta.label}</span>
        </div>

        {/* Role Tabs */}
        <div className="topbar-right flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[var(--panel)] border border-[var(--border-soft)] p-0.5 rounded-md">
            {(['coder', 'auditor', 'tester', 'planner'] as AgentRole[]).map((r) => {
              const isSel = selectedRole === r
              return (
                <button
                  key={r}
                  onClick={() => {
                    setSelectedRole(r)
                    navigate(`/agents/${r}`)
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11.5px] font-medium transition-colors cursor-pointer capitalize ${
                    isSel ? 'bg-[var(--panel-2)] text-[var(--text)] font-bold' : 'text-[var(--dim)] hover:text-[var(--text)]'
                  }`}
                >
                  <AgentIcon role={r} size={12} />
                  <span>{r}</span>
                </button>
              )
            })}
          </div>

          <StatusBadge status={agentStatus} />
        </div>
      </div>

      {/* Page Body Grid */}
      <div className="page-body flex-1 overflow-hidden p-5">
        <div className="aw-grid grid grid-cols-[1.4fr_1fr] gap-3.5 h-full">
          
          {/* Left Panel: Activity Stream */}
          <div className="panel border border-[var(--border-soft)] rounded-[var(--radius)] flex flex-col overflow-hidden bg-[var(--panel)]">
            <div className="panel-head flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border-soft)] font-mono text-[10px] tracking-wider text-[var(--faint)] uppercase font-bold">
              <span>LIVE ACTIVITY STREAM ({agentLogs.length})</span>
              <span>{meta.label} Worker</span>
            </div>

            <div className="panel-body p-3.5 overflow-y-auto flex-1 font-sans">
              {loading ? (
                <div className="p-4 text-center font-mono text-[12px] text-[var(--dim)]">Loading activity...</div>
              ) : error ? (
                <div className="p-3 text-[12px] text-[var(--bad)] border border-[var(--bad)] rounded bg-[var(--bad-dim)]">
                  ⚠️ Error: {error}
                </div>
              ) : agentLogs.length === 0 ? (
                <div className="p-8 text-center text-[var(--faint)] font-mono text-[12px] space-y-1">
                  <p>No activity events recorded yet for {meta.label}.</p>
                  <p className="text-[11px]">Events will stream in real-time when a task is launched.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {agentLogs.map((log, idx) => (
                    <div
                      key={log.id || idx}
                      className="activity-item flex gap-3 text-[12px] py-1.5 border-b border-[var(--border-soft)] last:border-b-0"
                    >
                      <div className="activity-time font-mono text-[10.5px] text-[var(--faint)] whitespace-nowrap pt-0.5">
                        {log.timestamp}
                      </div>
                      <div className="activity-text text-[var(--dim)] flex-1 leading-relaxed">
                        <strong className="text-[var(--text)] font-semibold uppercase text-[10.5px] font-mono mr-1.5 text-[var(--accent)]">
                          [{log.type}]
                        </strong>
                        {log.message}
                      </div>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Workspace Files & Context */}
          <div className="panel border border-[var(--border-soft)] rounded-[var(--radius)] flex flex-col overflow-hidden bg-[var(--panel)]">
            <div className="panel-head flex items-center justify-between px-3.5 py-2.5 border-b border-[var(--border-soft)] font-mono text-[10px] tracking-wider text-[var(--faint)] uppercase font-bold">
              <span>MODIFIED FILES & CONTEXT</span>
              <span>Workspace Files</span>
            </div>

            <div className="panel-body p-3.5 overflow-y-auto flex-1 font-mono text-[12px]">
              {workspaceFiles.length === 0 ? (
                <div className="p-6 text-center text-[var(--faint)] italic">No workspace files indexed</div>
              ) : (
                <div className="space-y-1">
                  {workspaceFiles.slice(0, 15).map((f) => (
                    <div
                      key={f.path || f.name}
                      onClick={() => setSelectedFilePath(f.path || null)}
                      className="file-row flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[var(--panel-2)] cursor-pointer text-[var(--dim)] transition-colors"
                    >
                      <FileText size={12} className="text-[var(--faint)] flex-shrink-0" />
                      <span className="truncate">{f.name || f.path}</span>
                      {f.modifiedBy && <span className="mod ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent)]" title={`Modified by ${f.modifiedBy}`} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Code Inspector */}
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
        <div className="p-3 bg-[var(--bg-inset)] border border-[var(--border-soft)] rounded-control font-mono text-[11.5px] text-[var(--text)] max-h-[300px] overflow-y-auto">
          <code>// Inspected file context: {selectedFilePath}</code>
        </div>
      </Modal>
    </div>
  )
}

export default AgentPage
