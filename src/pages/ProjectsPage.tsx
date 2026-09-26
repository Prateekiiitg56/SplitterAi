import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Search, Plus, EyeOff, Edit2, Upload, FileArchive, Loader2, Folder } from 'lucide-react'
import type { SessionEntry } from '../types'
import { StatusBadge } from '../components/Badges'
import { Modal } from '../components/primitives/Modal'
import { Button } from '../components/primitives/Button'
import { TextField, SearchField } from '../components/primitives/Field'
import { uploadWorkspace } from '../lib/api'
import { PageHeader } from '../components/PageHeader'

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
    <div className="flex-1 flex flex-col min-w-0 h-full bg-transparent text-[var(--text)] font-sans select-none overflow-hidden relative z-10">
      <PageHeader
        icon={<Folder size={16} />}
        title="Projects"
        meta="/ workspace"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<Upload size={13} />}
              onClick={() => {
                setSelectedZipFile(null)
                setUploadError(null)
                setIsImportModalOpen(true)
              }}
            >
              Import project
            </Button>
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => navigate('/console')}>
              New project
            </Button>
          </>
        }
      />

      {/* Page Body */}
      <div className="page-body flex-1 overflow-y-auto">
        <div className="projects-body">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex-1 min-w-[220px]">
              <SearchField
                label="Search projects"
                placeholder="Search projects by name or path…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'working', label: 'Running' },
                { id: 'completed', label: 'Completed' },
                { id: 'failed', label: 'Failed' },
              ].map((f) => (
                <Button
                  key={f.id}
                  variant={statusFilter === f.id ? 'primary' : 'quiet'}
                  size="sm"
                  onClick={() => setStatusFilter(f.id)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            <span className="count-pill">{filtered.length} projects</span>
          </div>

          {/* Loading / Error / Empty States */}
          {sessionsLoading ? (
            <div className="p-8 flex items-center justify-center gap-2 text-[var(--dim)] font-mono text-meta">
              <Loader2 size={14} className="animate-spin" />
              <span>Loading your projects…</span>
            </div>
          ) : sessionsError ? (
            <div className="p-4 rounded-md border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta flex items-center justify-between">
              <span>⚠️ {sessionsError}</span>
              <button onClick={() => refetchSessions()} className="underline font-bold hover:text-[var(--text)] transition-colors">
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <Folder size={30} />
              <div className="es-title">No projects match</div>
              <div className="es-detail">Try a different search term, or clear the status filter.</div>
            </div>
          ) : (
            /* Project Grid */
            <div className="project-grid">
              {filtered.map((s) => {
                const projName = s.task || s.workspace.split(/[/\\]/).pop() || 'Untitled Project'
                const projPath = s.workspace || '~/workspace/project'
                const statusStr = (s.status || 'working').toLowerCase()

                const isCompleted = statusStr === 'done' || statusStr === 'success' || statusStr === 'completed'
                const isFailed = statusStr === 'error' || statusStr === 'failed'

                // Sessions only report a final status and step count, so the bar shows
                // outcome (full green/red) rather than an invented percentage.
                const fillClass = isCompleted ? 'done' : isFailed ? 'failed' : ''
                const progressPct = isCompleted || isFailed ? 100 : 0
                const subtasksTotal = s.subtaskCount || 0

                // The backend sends a preformatted time ("01:08 AM"), not an ISO date.
                const parsed = s.createdAt ? new Date(s.createdAt) : null
                const formattedTime = !s.createdAt
                  ? 'Recently'
                  : parsed && !Number.isNaN(parsed.getTime())
                    ? parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : s.createdAt

                return (
                  <div
                    key={s.id}
                    className="project-card"
                    role="link"
                    tabIndex={0}
                    aria-label={`Open project ${projName}`}
                    onClick={() => navigate(`/projects/${s.id || 'default'}`)}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && e.key === 'Enter') navigate(`/projects/${s.id || 'default'}`)
                    }}
                  >
                    <div className="pc-top">
                      <div>
                        <div className="pc-title">{projName}</div>
                        <div className="pc-path">{projPath}</div>
                      </div>
                      <div className="pc-menu">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Rename project"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingSession(s)
                            setRenameValue(projName)
                          }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Hide project from this list"
                          title="Hide from this list (there is no server-side delete yet)"
                          onClick={(e) => handleDelete(s.id, e)}
                        >
                          <EyeOff size={13} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="pc-meta-row" style={{ marginBottom: 6 }}>
                        <StatusBadge status={s.status || 'working'} />
                        <span className="sep" />
                        <span>
                          {subtasksTotal} {subtasksTotal === 1 ? 'step' : 'steps'}
                        </span>
                      </div>
                      <div className="pc-progress-track">
                        <div className={`pc-progress-fill ${fillClass}`} style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>

                    <div className="pc-foot">
                      <span className="pc-path ml-auto">{formattedTime}</span>
                    </div>
                  </div>
                )
              })}

              <button type="button" className="new-card" onClick={() => navigate('/console')}>
                <Plus size={20} aria-hidden="true" />
                <span>New project</span>
              </button>
            </div>
          )}
        </div>
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
          <p className="text-meta text-[var(--dim)] leading-relaxed">
            Upload a <strong>.zip</strong> file of your project folder. It will be extracted and ready to use.
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
            className={`border-2 border-dashed rounded-panel p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2.5 ${
              isDragOver
                ? 'border-[var(--accent)] bg-[var(--accent-quiet)]'
                : selectedZipFile
                ? 'border-[var(--good)] bg-[var(--good-quiet)]'
                : 'border-[var(--border-soft)] hover:border-[var(--border)] bg-[var(--panel-2)]'
            }`}
          >
            {selectedZipFile ? (
              <>
                <FileArchive size={28} className="text-[var(--good)]" />
                <div>
                  <p className="text-ui font-medium text-[var(--text)]">{selectedZipFile.name}</p>
                  <p className="text-micro font-mono text-[var(--faint)]">
                    {(selectedZipFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <span className="text-micro text-[var(--accent)] underline mt-1">Click or drop another file to replace</span>
              </>
            ) : (
              <>
                <Upload size={28} className="text-[var(--faint)]" />
                <div>
                  <p className="text-ui font-medium text-[var(--text)]">Drag & drop your .zip file here</p>
                  <p className="text-micro font-mono text-[var(--faint)]">Supports single .zip archives up to 50MB</p>
                </div>
              </>
            )}
          </div>

          {uploadError && (
            <div className="p-3 rounded border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta">
              ⚠️ {uploadError}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
