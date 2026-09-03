import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Search, Plus, Trash2, Edit2, X } from 'lucide-react'
import type { SessionEntry } from '../types'
import { StatusBadge } from '../components/Badges'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { sessions: initialSessions, sessionsLoading, sessionsError, refetchSessions } = useApp()

  const [localSessions, setLocalSessions] = useState<SessionEntry[] | null>(null)
  const sessions = localSessions !== null ? localSessions : initialSessions

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editingSession, setEditingSession] = useState<SessionEntry | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const filtered = sessions.filter((s) => {
    const matchesSearch =
      (s.task || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.workspace || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
        ? s.status === 'done' || s.status === 'success' || s.status === 'completed'
        : statusFilter === 'working'
        ? s.status === 'working' || s.status === 'running' || s.status === 'planning'
        : statusFilter === 'failed'
        ? s.status === 'error' || s.status === 'failed'
        : true

    return matchesSearch && matchesStatus
  })

  const saveRename = () => {
    if (!editingSession || !renameValue.trim()) return
    const updated = sessions.map((s) =>
      s.id === editingSession.id ? { ...s, task: renameValue.trim() } : s
    )
    setLocalSessions(updated)
    setEditingSession(null)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = sessions.filter((s) => s.id !== id)
    setLocalSessions(updated)
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-[var(--bg)] text-[var(--text)] font-sans select-none overflow-hidden relative z-10">
      
      {/* Generic Topbar */}
      <div className="topbar h-[48px] border-b border-[var(--border-soft)] flex items-center justify-between px-5 bg-[var(--bg)] flex-shrink-0">
        <div className="topbar-left flex items-center gap-2.5">
          <span className="topbar-title font-semibold text-[14px]">Projects</span>
          <span className="topbar-crumb font-mono text-[11.5px] text-[var(--faint)]">/ workspace</span>
        </div>

        <div className="topbar-right flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="btn-primary text-[var(--accent)] font-medium text-[12px] px-3 py-1.5 rounded-md border border-[var(--border)] flex items-center gap-1.5 hover:border-[var(--accent)] transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>New project</span>
          </button>
        </div>
      </div>

      {/* Page Body */}
      <div className="page-body flex-1 overflow-y-auto p-6">
        
        {/* Search & Filter Row */}
        <div className="search-row flex items-center gap-2.5 mb-4">
          <div className="search-box flex-1 max-w-[320px] flex items-center gap-2 border border-[var(--border-soft)] rounded-md px-2.5 py-1.5 bg-[var(--panel)] text-[var(--faint)]">
            <Search size={13} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects…"
              className="bg-transparent border-none outline-none text-[var(--text)] text-[12px] w-full placeholder:text-[var(--faint)] font-sans"
            />
          </div>

          <button
            onClick={() => setStatusFilter(statusFilter === 'all' ? 'working' : statusFilter === 'working' ? 'completed' : statusFilter === 'completed' ? 'failed' : 'all')}
            className="chip-filter border border-[var(--border-soft)] text-[var(--dim)] hover:text-[var(--text)] hover:border-[var(--border)] text-[11.5px] px-2.5 py-1.5 rounded-md font-mono capitalize transition-colors cursor-pointer"
          >
            Status: {statusFilter} ▾
          </button>
        </div>

        {/* Global Loading / Error State */}
        {sessionsLoading ? (
          <div className="p-8 text-center text-[var(--dim)] font-mono text-[12px]">Loading workspace projects...</div>
        ) : sessionsError ? (
          <div className="p-4 rounded-md border border-[var(--bad)] bg-[var(--bad-dim)] text-[var(--bad)] text-[12px] flex items-center justify-between">
            <span>⚠️ {sessionsError}</span>
            <button onClick={() => refetchSessions()} className="underline font-bold">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-[var(--border-soft)] rounded-[var(--radius)] p-12 text-center text-[var(--dim)] space-y-3 bg-[var(--panel)]">
            <p className="text-[14px] font-semibold text-[var(--text)]">No projects found</p>
            <p className="text-[12px] text-[var(--faint)] font-mono">Create a new project from Home or clear search filters.</p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary inline-flex items-center gap-1.5 text-[var(--accent)] font-medium text-[12px] px-3.5 py-1.5 rounded-md border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer"
            >
              <Plus size={13} />
              <span>Create Project</span>
            </button>
          </div>
        ) : (
          /* Projects Table */
          <div className="table border border-[var(--border-soft)] rounded-[var(--radius)] overflow-hidden bg-[var(--panel)]">
            
            {/* Table Head */}
            <div className="trow head grid grid-cols-[2.2fr_1fr_0.8fr_1fr_0.4fr] items-center px-4 py-2.5 border-b border-[var(--border-soft)] text-[var(--faint)] font-mono text-[10px] tracking-wider uppercase font-bold">
              <div>PROJECT</div>
              <div>STATUS</div>
              <div>AGENTS</div>
              <div>LAST ACTIVE</div>
              <div>ACTIONS</div>
            </div>

            {/* Table Rows */}
            {filtered.map((s) => {
              const projName = s.task || s.workspace.split(/[/\\]/).pop() || 'Untitled Project'
              const projPath = s.workspace || '~/dev/splitter-ai'
              const agentCount = s.subtask_count || 4

              return (
                <div
                  key={s.id}
                  onClick={() => navigate(`/projects/${s.id || 'default'}`)}
                  className="trow grid grid-cols-[2.2fr_1fr_0.8fr_1fr_0.4fr] items-center px-4 py-3 border-b border-[var(--border-soft)] text-[12.5px] hover:bg-[var(--panel-2)] cursor-pointer transition-colors last:border-b-0"
                >
                  <div>
                    <div className="tproj-name font-medium text-[var(--text)]">{projName}</div>
                    <div className="tproj-path text-[var(--faint)] font-mono text-[10.5px] mt-0.5">{projPath}</div>
                  </div>

                  <div>
                    <StatusBadge status={s.status || 'working'} />
                  </div>

                  <div className="tmeta text-[var(--dim)] font-mono text-[11.5px]">
                    {agentCount} agents
                  </div>

                  <div className="tmeta text-[var(--dim)] font-mono text-[11.5px]">
                    {s.created_at ? new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingSession(s)
                        setRenameValue(projName)
                      }}
                      className="text-[var(--faint)] hover:text-[var(--text)] p-1 transition-colors cursor-pointer"
                      title="Rename"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(s.id, e)}
                      className="text-[var(--faint)] hover:text-[var(--bad)] p-1 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius)] p-5 max-w-[400px] w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
              <h3 className="text-[14.5px] font-semibold text-[var(--text)]">Rename Project</h3>
              <button onClick={() => setEditingSession(null)} className="text-[var(--faint)] hover:text-[var(--text)]">
                <X size={15} />
              </button>
            </div>

            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-[13px] text-[var(--text)] outline-none focus:border-[var(--accent)] font-sans"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSession(null)}
                className="px-3 py-1.5 rounded border border-[var(--border)] text-[12px] text-[var(--dim)] hover:text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                onClick={saveRename}
                className="px-4 py-1.5 rounded bg-[var(--accent)] text-[var(--bg)] font-semibold text-[12px]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
