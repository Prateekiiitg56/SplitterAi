import { useState } from 'react'
import {
  ChevronRight,
  Folder,
  FolderOpen,
  Loader2,
  FolderSearch,
  Search,
  X,
  FileCode2,
  FileText,
  FileJson,
  FileSpreadsheet,
  Lock,
  Eye,
  FileCheck
} from 'lucide-react'
import { DEFAULT_WORKSPACE } from '../config'
import { useWorkspaceFiles } from '../hooks/useWorkspaceFiles'
import type { FileNode } from '../types'
import { EmptyState } from './primitives/EmptyState'

interface FileExplorerProps {
  workspace?: string
  onSelectFile?: (file: FileNode) => void
  modifiedFiles?: string[]
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'py':
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
      return <FileCode2 size={13} className="text-[#38bdf8] flex-shrink-0" />
    case 'json':
    case 'yaml':
    case 'yml':
      return <FileJson size={13} className="text-[#fbbf24] flex-shrink-0" />
    case 'md':
    case 'txt':
    case 'log':
      return <FileText size={13} className="text-[#c084fc] flex-shrink-0" />
    case 'csv':
      return <FileSpreadsheet size={13} className="text-emerald-400 flex-shrink-0" />
    default:
      return <FileCode2 size={13} className="text-[var(--faint)] flex-shrink-0" />
  }
}

function TreeNode({
  node,
  depth = 0,
  selectedPath,
  onSelect,
  searchQuery,
  modifiedFiles = [],
}: {
  node: FileNode
  depth?: number
  selectedPath: string | null
  onSelect: (node: FileNode) => void
  searchQuery: string
  modifiedFiles?: string[]
}) {
  const [open, setOpen] = useState(depth === 0 || Boolean(searchQuery))
  const isDir = node.type === 'dir' || node.type === 'folder'
  const isSelected = selectedPath === (node.path || node.name)
  const isModified = modifiedFiles.some(f => f.includes(node.name) || (node.path && f.includes(node.path)))

  // Search matching
  const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase())

  if (isDir) {
    const hasMatchingChildren =
      node.children?.some(
        c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.type === 'dir'
      ) ?? false

    if (searchQuery && !matchesSearch && !hasMatchingChildren) return null

    return (
      <div>
        <button
          onClick={() => setOpen(p => !p)}
          className="flex items-center gap-1.5 w-full h-7 rounded text-[var(--dim)] hover:bg-[var(--panel-2)] hover:text-[var(--text)] transition-colors cursor-pointer group relative"
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          {/* Depth Vertical Guide Line */}
          {depth > 0 && (
            <span
              className="absolute left-0 top-0 bottom-0 border-l border-[var(--border)]"
              style={{ left: `${(depth - 1) * 14 + 12}px` }}
            />
          )}

          <ChevronRight
            size={12}
            className={`text-[var(--faint)] flex-shrink-0 transition-transform duration-150 ${
              open ? 'rotate-90' : ''
            }`}
          />
          {open ? (
            <FolderOpen size={14} className="text-[var(--accent)] flex-shrink-0" />
          ) : (
            <Folder size={14} className="text-[var(--dim)] flex-shrink-0" />
          )}
          <span className="text-meta font-mono font-medium truncate text-[var(--text)] flex-1 text-left">
            {node.name}
          </span>
          {node.children && (
            <span className="text-micro font-mono text-[var(--faint)] pr-2">{node.children.length}</span>
          )}
        </button>

        {(open || Boolean(searchQuery)) &&
          node.children?.map(child => (
            <TreeNode
              key={child.path || child.name}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              searchQuery={searchQuery}
              modifiedFiles={modifiedFiles}
            />
          ))}
      </div>
    )
  }

  if (searchQuery && !matchesSearch) return null

  return (
    <div className="relative">
      {/* Depth Vertical Guide Line */}
      {depth > 0 && (
        <span
          className="absolute left-0 top-0 bottom-0 border-l border-[var(--border)]"
          style={{ left: `${(depth - 1) * 14 + 12}px` }}
        />
      )}

      <button
        onClick={() => onSelect(node)}
        className={`flex items-center gap-1.5 w-full h-7 rounded transition-colors cursor-pointer group px-1.5 relative ${
          isSelected
            ? 'bg-[var(--accent-quiet)] text-[var(--text)] border border-[var(--accent-edge)] font-semibold'
            : 'hover:bg-[var(--panel-2)] text-[var(--dim)] hover:text-[var(--text)] border border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 14 + 16}px` }}
        title={node.path || node.name}
      >
        {getFileIcon(node.name)}

        <span className="text-micro font-mono truncate flex-1 text-left">{node.name}</span>

        {/* Modified in run indicator dot */}
        {isModified && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0"
            title="Modified in current run"
          />
        )}

        {node.size && (
          <span className="text-micro font-mono text-[var(--faint)] flex-shrink-0 group-hover:hidden">
            {typeof node.size === 'number' ? `${node.size}B` : node.size}
          </span>
        )}

        <span className="hidden group-hover:flex items-center gap-1 text-micro text-[var(--accent)] font-mono flex-shrink-0">
          <Eye size={10} /> Preview
        </span>
      </button>
    </div>
  )
}

export default function FileExplorer({
  workspace = DEFAULT_WORKSPACE,
  onSelectFile,
  modifiedFiles = []
}: FileExplorerProps) {
  const { fileTree, loading, error } = useWorkspaceFiles(workspace)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const handleSelect = (file: FileNode) => {
    setSelectedFile(file)
    setPreviewOpen(true)
    onSelectFile?.(file)
  }

  return (
    <div className="flex flex-col h-full select-none bg-[var(--panel)] text-[var(--text)] font-sans border-r border-[var(--border)] relative">
      {/* Header Bar with Sandboxed Lock Indicator */}
      <div className="flex items-center justify-between h-10 px-3.5 border-b border-[var(--border)] flex-shrink-0 bg-[var(--panel-2)]">
        <div className="flex items-center gap-2">
          <Lock size={12} className="text-[var(--accent)]" />
          <span className="text-micro font-mono font-bold tracking-wide text-[var(--text)] uppercase">
            Sandboxed Root
          </span>
        </div>
        <span className="text-micro font-mono text-[var(--faint)] truncate max-w-[120px]" title={workspace}>
          {workspace.split(/[/\\]/).pop()}
        </span>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg)]">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] text-meta focus-within:border-[var(--accent)] transition-colors">
          <Search size={13} className="text-[var(--faint)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter files in workspace..."
            className="w-full bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--faint)] font-mono text-micro"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[var(--faint)] hover:text-[var(--text)] cursor-pointer">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 font-mono">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-[var(--faint)] text-micro">
            <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
            <span>Scanning directory...</span>
          </div>
        ) : error ? (
          <div className="p-3 text-micro text-[var(--bad)] space-y-1 bg-[rgba(239,68,68,0.05)] rounded border border-[var(--bad-quiet)]">
            <p className="font-semibold">Failed to load workspace</p>
            <p className="text-[var(--faint)] text-micro">{error}</p>
          </div>
        ) : fileTree.length === 0 ? (
          <EmptyState
            icon={<FolderSearch size={24} />}
            title="Empty Workspace"
            detail="Files created or modified by agent workers appear here in real time."
          />
        ) : (
          fileTree.map(node => (
            <TreeNode
              key={node.path || node.name}
              node={node}
              selectedPath={selectedFile?.path || selectedFile?.name || null}
              onSelect={handleSelect}
              searchQuery={searchQuery}
              modifiedFiles={modifiedFiles}
            />
          ))
        )}
      </div>

      {/* File Preview Slide-Over Drawer */}
      {previewOpen && selectedFile && (
        <div className="absolute inset-x-0 bottom-0 top-10 bg-[var(--panel)] border-t border-[var(--border)] shadow-2xl flex flex-col z-30 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--panel-2)]">
            <div className="flex items-center gap-2 min-w-0">
              {getFileIcon(selectedFile.name)}
              <span className="font-mono text-meta font-semibold text-[var(--text)] truncate">
                {selectedFile.name}
              </span>
            </div>
            <button
              onClick={() => setPreviewOpen(false)}
              className="text-[var(--faint)] hover:text-[var(--text)] p-1 rounded hover:bg-[var(--panel)] cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto bg-[var(--bg-inset)] font-mono text-micro">
            <div className="text-micro text-[var(--faint)] uppercase tracking-wider mb-2 flex items-center gap-1">
              <FileCheck size={11} className="text-[var(--accent)]" /> Read-only Sandbox Preview
            </div>
            <div className="p-3 rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--text-2)] whitespace-pre-wrap leading-relaxed">
              {selectedFile.content ? (
                selectedFile.content
              ) : (
                <div className="text-[var(--faint)] italic">
                  File content preview for <span className="text-[var(--accent)]">{selectedFile.name}</span>. Click to open in main editor panel.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
