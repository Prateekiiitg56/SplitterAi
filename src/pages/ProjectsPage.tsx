import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Search, Plus, Trash2, Edit2, Upload, FileArchive, Loader2 } from 'lucide-react'
import type { SessionEntry } from '../types'
import { StatusBadge } from '../components/Badges'
import { Modal } from '../components/primitives/Modal'
import { Button } from '../components/primitives/Button'
import { TextField } from '../components/primitives/Field'
import { uploadWorkspace } from '../lib/api'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { setCurrentWorkspace, sessions: initialSessions, sessionsLoading, sessionsError, refetchSessions } = useApp()

  const [localSessions, setLocalSessions] = useState<SessionEntry[] | null>(null)
  const sessions = localSessions !== null ? localSessions : initialSessions

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editingSession, setEditingSession] = useState<SessionEntry | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = sessions.filter((s) => {
    const matchesSearch =
      (s.task || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.workspace || '').toLowerCase().includes(searchTerm.toLowerCase())

    const stStr = (s.status as string) || ''
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'completed'
        ? stStr === 'done' || stStr === 'success' || stStr === 'completed'
        : statusFilter === 'working'
        ? stStr === 'working' || stStr === 'running' || stStr === 'planning' || stStr === 'executing'
        : statusFilter === 'failed'
        ? stStr === 'error' || stStr === 'failed'
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

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setUploadError('Please select a valid .zip file.')
      return
    }
    setUploadError(null)
    setSelectedZipFile(file)
  }

  const handleUploadProject = async () => {
    if (!selectedZipFile) return
    setIsUploading(true)
    setUploadError(null)
    try {
      const result = await uploadWorkspace(selectedZipFile)
      setCurrentWorkspace(result.workspace)
      await refetchSessions()
      setIsImportModalOpen(false)
      setSelectedZipFile(null)
      setIsUploading(false)
      navigate('/projects/default')
    } catch (err: any) {
      setIsUploading(false)
      setUploadError(err.message || 'Failed to upload and extract project zip.')
    }
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
            onClick={() => {
              setSelectedZipFile(null)
              setUploadError(null)
              setIsImportModalOpen(true)
            }}
            className="btn-secondary text-[var(--dim)] hover:text-[var(--text)] font-medium text-[12px] px-3 py-1.5 rounded-md border border-[var(--border-soft)] hover:border-[var(--border)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload size={13} />
            <span>Import project</span>
          </button>

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
            <p className="text-[12px] text-[var(--faint)] font-mono">Import an existing repository or create a new project from Home.</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => {
                  setSelectedZipFile(null)
                  setUploadError(null)
                  setIsImportModalOpen(true)
                }}
                className="btn-secondary inline-flex items-center gap-1.5 text-[var(--text)] font-medium text-[12px] px-3.5 py-1.5 rounded-md border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer"
              >
                <Upload size={13} />
                <span>Import Project (.zip)</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="btn-primary inline-flex items-center gap-1.5 text-[var(--accent)] font-medium text-[12px] px-3.5 py-1.5 rounded-md border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer"
              >
                <Plus size={13} />
                <span>Create Project</span>
              </button>
            </div>
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
              const agentCount = s.subtaskCount || 4
              const createdAt = s.createdAt

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
                    {createdAt ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
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
      <Modal
        open={!!editingSession}
        onClose={() => setEditingSession(null)}
        title="Rename project"
        width={400}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setEditingSession(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={saveRename} disabled={!renameValue.trim()}>
              Save
            </Button>
          </>
        }
      >
        <TextField
          label="Project name"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              saveRename()
            }
          }}
        />
      </Modal>

      {/* Import Project Modal */}
      <Modal
        open={isImportModalOpen}
        onClose={() => {
          if (!isUploading) setIsImportModalOpen(false)
        }}
        title="Import existing project"
        width={460}
        footer={
          <>
            <Button
              variant="ghost"
              size="md"
              disabled={isUploading}
              onClick={() => setIsImportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!selectedZipFile || isUploading}
              onClick={handleUploadProject}
            >
              {isUploading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" />
                  Extracting...
                </span>
              ) : (
                'Import & Open'
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[12px] text-[var(--dim)] leading-relaxed">
            Upload a <strong>.zip</strong> archive of your repository. It will be safely extracted into a sandboxed server workspace.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragOver(true)
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragOver(false)
              handleFileSelect(e.dataTransfer.files?.[0])
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[var(--radius)] p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2.5 ${
              isDragOver
                ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
                : selectedZipFile
                ? 'border-[var(--good)] bg-[var(--good-dim)]'
                : 'border-[var(--border-soft)] hover:border-[var(--border)] bg-[var(--panel-2)]'
            }`}
          >
            {selectedZipFile ? (
              <>
                <FileArchive size={28} className="text-[var(--good)]" />
                <div>
                  <p className="text-[13px] font-medium text-[var(--text)]">{selectedZipFile.name}</p>
                  <p className="text-[11px] font-mono text-[var(--faint)]">
                    {(selectedZipFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <span className="text-[11px] text-[var(--accent)] underline mt-1">Click or drop another file to replace</span>
              </>
            ) : (
              <>
                <Upload size={28} className="text-[var(--faint)]" />
                <div>
                  <p className="text-[13px] font-medium text-[var(--text)]">Drag & drop your .zip file here</p>
                  <p className="text-[11px] font-mono text-[var(--faint)]">Supports single .zip archives up to 50MB</p>
                </div>
              </>
            )}
          </div>

          {uploadError && (
            <div className="p-3 rounded border border-[var(--bad)] bg-[var(--bad-dim)] text-[var(--bad)] text-[12px]">
              ⚠️ {uploadError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
