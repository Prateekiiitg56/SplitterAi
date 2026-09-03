import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  Folder,
  Search,
  ArrowUpRight,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  MoreVertical,
  Edit2,
  Trash2,
  Filter,
  ArrowUpDown,
  X,
  Users,
} from 'lucide-react'
import type { SessionEntry } from '../types'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { sessions: initialSessions, sessionsLoading, sessionsError, refetchSessions } = useApp()

  // Local state for search, filter, sort, rename, and local session list modifications
  const [localSessions, setLocalSessions] = useState<SessionEntry[] | null>(null)
  const sessions = localSessions !== null ? localSessions : initialSessions

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'lastActive' | 'name' | 'status'>('lastActive')
  const [editingSession, setEditingSession] = useState<SessionEntry | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  // 1. Search & Status Filtering
  const filtered = sessions.filter((s) => {
    const matchesSearch =
      (s.task || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.workspace || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
        ? s.status === 'done' || s.status === 'success' || s.status === 'completed'
        : statusFilter === 'executing'
        ? s.status === 'executing' || s.status === 'running' || s.status === 'planning'
        : statusFilter === 'failed'
        ? s.status === 'error' || s.status === 'failed'
        : true

    return matchesSearch && matchesStatus
  })

  // 2. Sorting
  const sortedSessions = [...filtered].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.task || a.workspace).localeCompare(b.task || b.workspace)
    }
    if (sortBy === 'status') {
      return (a.status || '').localeCompare(b.status || '')
    }
    // Default: Last active / newest first
    return (b.createdAt || '').localeCompare(a.createdAt || '')
  })

  // 3. Actions
  const handleRename = (session: SessionEntry) => {
    setEditingSession(session)
    setRenameValue(session.task || session.workspace.split(/[/\\]/).pop() || 'Project')
    setActiveMenuId(null)
  }

  const saveRename = () => {
    if (!editingSession || !renameValue.trim()) return
    const updated = sessions.map((s) =>
      s.id === editingSession.id ? { ...s, task: renameValue.trim() } : s
    )
    setLocalSessions(updated)
    setEditingSession(null)
  }

  const handleDelete = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id)
    setLocalSessions(updated)
    setActiveMenuId(null)
  }

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-[#121723] overflow-y-auto p-8 text-white relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 select-none">
        <div>
          <h1 className="text-[24px] font-bold text-white tracking-tight flex items-center gap-3">
            <Folder className="text-[#9D8CFC]" size={24} />
            <span>Workspace Projects</span>
          </h1>
          <p className="text-[13px] text-neutral-400 mt-1">
            Manage, filter, and inspect multi-agent execution project runs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setLocalSessions(null)
              refetchSessions()
            }}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-neutral-300 transition-colors cursor-pointer"
            title="Refresh project list"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <Play size={13} />
            <span>New Agent Run</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Status Filter, Sort */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 flex-1 max-w-[500px]">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#101218] border border-white/10 text-[13px] text-white focus-within:border-[#9D8CFC] transition-colors flex-1">
            <Search size={15} className="text-neutral-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by project name or task..."
              className="w-full bg-transparent outline-none placeholder:text-neutral-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-neutral-500 hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#101218] border border-white/10 text-[12.5px] font-medium text-neutral-300">
            <Filter size={13} className="text-neutral-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer pr-2"
            >
              <option value="all" className="bg-[#141824]">All Statuses</option>
              <option value="completed" className="bg-[#141824]">Completed / Done</option>
              <option value="executing" className="bg-[#141824]">Executing / Running</option>
              <option value="failed" className="bg-[#141824]">Error / Failed</option>
            </select>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#101218] border border-white/10 text-[12.5px] font-medium text-neutral-300">
          <ArrowUpDown size={13} className="text-neutral-500" />
          <span className="text-neutral-500">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-transparent text-white outline-none cursor-pointer"
          >
            <option value="lastActive" className="bg-[#141824]">Last Active</option>
            <option value="name" className="bg-[#141824]">Project Name</option>
            <option value="status" className="bg-[#141824]">Status</option>
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      {sessionsLoading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#141824] p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-white/[0.04] animate-pulse w-full" />
          ))}
        </div>
      ) : sessionsError ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-300 space-y-3 max-w-[600px]">
          <div className="flex items-center gap-2 font-bold text-[15px]">
            <AlertTriangle size={18} />
            <span>Failed to Load Projects</span>
          </div>
          <p className="text-[13px] text-amber-300/80">{sessionsError}</p>
          <button
            onClick={() => refetchSessions()}
            className="px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[12px] font-semibold cursor-pointer transition-colors"
          >
            Retry Fetch
          </button>
        </div>
      ) : sortedSessions.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-12 text-center text-neutral-400 max-w-[600px] space-y-3 mx-auto my-8">
          <Folder size={36} className="mx-auto opacity-30 text-neutral-400" />
          <h3 className="text-[16px] font-bold text-white">No projects yet — start one from Home</h3>
          <p className="text-[13px] text-neutral-400 leading-relaxed">
            {searchTerm || statusFilter !== 'all'
              ? 'No project runs match your search/filter criteria.'
              : 'Launch your first multi-agent task run to populate the workspace project registry.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Play size={13} />
            <span>Start First Run</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#141824] overflow-hidden shadow-sm">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#101218] text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                <th className="py-3.5 px-5 font-semibold">Project Name & Task</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Agent Count</th>
                <th className="py-3.5 px-4 font-semibold">Last Active Time</th>
                <th className="py-3.5 px-5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {sortedSessions.map((s, idx) => {
                const colors = ['#5B8DEF', '#39C08A', '#E8A23D', '#9B6BE0']
                const color = colors[idx % colors.length]
                const wsName = (s.workspace || 'SplitterAi').split(/[/\\]/).pop() || 'Project'
                const isDone = s.status === 'done' || s.status === 'success' || s.status === 'completed'
                const isError = s.status === 'error' || s.status === 'failed'

                return (
                  <tr key={s.id || idx} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Name & Task */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold text-white shadow-2xs flex-shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {wsName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-[340px]">
                            {s.task || wsName}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono truncate max-w-[340px]">
                            {s.workspace}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold border ${
                          isDone
                            ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
                            : isError
                            ? 'bg-red-400/10 text-red-400 border-red-400/20'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}
                      >
                        <CheckCircle2 size={12} />
                        <span className="capitalize">{s.status || 'done'}</span>
                      </span>
                    </td>

                    {/* Agent Count */}
                    <td className="py-4 px-4 font-mono text-neutral-300">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[12px]">
                        <Users size={12} className="text-neutral-500" />
                        <span>{s.subtaskCount || 4} Agents</span>
                      </span>
                    </td>

                    {/* Last Active Time */}
                    <td className="py-4 px-4 font-mono text-[12px] text-neutral-400">
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} className="text-neutral-500" />
                        <span>{s.createdAt || 'Just now'}</span>
                      </span>
                    </td>

                    {/* Actions Menu */}
                    <td className="py-4 px-5 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/projects/${s.id || 'default'}`)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[12px] font-semibold transition-colors cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowUpRight size={13} />
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === s.id ? null : s.id)}
                            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {activeMenuId === s.id && (
                            <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-white/10 bg-[#101218] shadow-xl p-1 z-50 text-left">
                              <button
                                onClick={() => handleRename(s)}
                                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-[12px] text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                              >
                                <Edit2 size={13} />
                                <span>Rename</span>
                              </button>
                              <button
                                onClick={() => handleDelete(s.id)}
                                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-[12px] text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>Archive/Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rename Modal */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl border border-white/10 bg-[#141824] p-6 max-w-[420px] w-full space-y-4 shadow-2xl">
            <h3 className="text-[16px] font-bold text-white">Rename Project Task</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveRename() }}
              className="w-full p-3 rounded-xl bg-[#101218] border border-white/10 text-[13.5px] text-white outline-none focus:border-[#9D8CFC]"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingSession(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-[13px] font-medium text-neutral-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveRename}
                className="px-5 py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
