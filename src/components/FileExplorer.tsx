import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Loader2,
  FolderSearch,
  Search,
  X,
  FileCode2,
} from 'lucide-react'
import { DEFAULT_WORKSPACE } from '../config'
import { useWorkspaceFiles } from '../hooks/useWorkspaceFiles'
import type { FileNode } from '../types'

interface FileExplorerProps {
  workspace?: string
  onSelectFile?: (file: FileNode) => void
}

function TreeNode({
  node,
  depth = 0,
  selectedPath,
  onSelect,
  searchQuery,
}: {
  node: FileNode
  depth?: number
  selectedPath: string | null
  onSelect: (node: FileNode) => void
  searchQuery: string
}) {
  const [open, setOpen] = useState(depth === 0 || Boolean(searchQuery))
  const isDir = node.type === 'dir' || node.type === 'folder'
  const isSelected = selectedPath === (node.path || node.name)

  // Filter logic
  const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase())

  // Determine agent attribution
  const agentAssigned = node.name.endsWith('.py')
    ? 'Coder'
    : node.name.endsWith('.md')
    ? 'Planner'
    : node.name.endsWith('.ts') || node.name.endsWith('.tsx')
    ? 'Coder'
    : node.name.endsWith('.json')
    ? 'Auditor'
    : null

  if (isDir) {
    const hasMatchingChildren =
      node.children?.some(
        (c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.type === 'dir'
      ) ?? false

    if (searchQuery && !matchesSearch && !hasMatchingChildren) return null

    return (
      <div>
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex items-center gap-1.5 w-full h-7 rounded text-[var(--dim)] hover:bg-[var(--panel-2)] hover:text-[var(--text)] transition-colors cursor-pointer group"
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
        >
          {open ? (
            <ChevronDown size={12} className="text-[var(--faint)] flex-shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-[var(--faint)] flex-shrink-0" />
          )}
          {open ? (
            <FolderOpen size={14} className="text-[var(--dim)] flex-shrink-0" />
          ) : (
            <Folder size={14} className="text-[var(--dim)] flex-shrink-0" />
          )}
          <span className="text-[12.5px] font-medium truncate text-[var(--text)] flex-1 text-left">
            {node.name}
          </span>
          {node.children && (
            <span className="text-[10px] font-mono text-[var(--faint)] pr-2">{node.children.length}</span>
          )}
        </button>

        {(open || Boolean(searchQuery)) &&
          node.children?.map((child) => (
            <TreeNode
              key={child.path || child.name}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              searchQuery={searchQuery}
            />
          ))}
      </div>
    )
  }

  if (searchQuery && !matchesSearch) return null

  return (
    <button
      onClick={() => onSelect(node)}
      className={`flex items-center gap-1.5 w-full h-7 rounded transition-colors cursor-pointer group px-1.5 ${
        isSelected
          ? 'bg-[var(--accent-quiet)] text-[var(--text)] border border-[var(--accent-edge)]'
          : 'hover:bg-[var(--panel-2)] text-[var(--dim)] hover:text-[var(--text)] border border-transparent'
      }`}
      style={{ paddingLeft: `${depth * 12 + 18}px` }}
    >
      <FileCode2
        size={13}
        className={isSelected ? 'text-[var(--accent)] flex-shrink-0' : 'text-[var(--faint)] flex-shrink-0'}
      />

      <span className="text-[12px] font-mono truncate flex-1 text-left">{node.name}</span>

      {/* Agent attribution badge */}
      {agentAssigned && (
        <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--accent-quiet)] text-[var(--accent)] border border-[var(--accent-edge)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {agentAssigned}
        </span>
      )}

      {node.size && (
        <span className="text-[10px] font-mono text-[var(--faint)] flex-shrink-0">
          {typeof node.size === 'number' ? `${node.size}B` : node.size}
        </span>
      )}
    </button>
  )
}

export default function FileExplorer({
  workspace = DEFAULT_WORKSPACE,
  onSelectFile,
}: FileExplorerProps) {
  const { fileTree, loading, error } = useWorkspaceFiles(workspace)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)

  const handleSelect = (file: FileNode) => {
    setSelectedFile(file)
    if (onSelectFile) onSelectFile(file)
  }

  return (
    <div className="flex flex-col h-full select-none bg-[var(--panel)] text-[var(--text)] font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between h-9 px-3.5 border-b border-[var(--border-soft)] flex-shrink-0 bg-[var(--panel-2)]">
        <div className="flex items-center gap-2">
          <Folder size={13} className="text-[var(--dim)]" />
          <span className="text-[10.5px] font-mono font-medium tracking-wide text-[var(--dim)]">
            Sandboxed files
          </span>
        </div>
        <span className="text-[10px] font-mono text-[var(--faint)] truncate max-w-[110px]" title={workspace}>
          {workspace.split(/[/\\]/).pop()}
        </span>
      </div>

      {/* Tree Search Bar */}
      <div className="p-2 border-b border-[var(--border-soft)] flex-shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] text-[12px] focus-within:border-[var(--accent)] transition-[border-color]">
          <Search size={13} className="text-[var(--faint)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspace files..."
            className="w-full bg-transparent outline-none text-[var(--text)] placeholder:text-[var(--faint)] font-mono text-[11.5px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[var(--faint)] hover:text-[var(--text)]"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-[var(--faint)] text-[12px]">
            <Loader2 size={15} className="animate-spin text-[var(--accent)]" />
            <span>Reading workspace files...</span>
          </div>
        ) : error ? (
          <div className="p-3 text-[11px] text-[var(--warn)] space-y-1">
            <p className="font-semibold">File tree error</p>
            <p className="text-[var(--faint)] text-[10px]">{error}</p>
          </div>
        ) : fileTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--faint)] gap-2">
            <FolderSearch size={24} className="opacity-40 text-[var(--faint)]" />
            <p className="text-[13px] font-semibold text-[var(--text)]">No files yet</p>
            <p className="text-[11px] text-[var(--faint)] leading-relaxed max-w-[200px]">
              Files created or modified by agent workers appear here in real time.
            </p>
          </div>
        ) : (
          fileTree.map((node) => (
            <TreeNode
              key={node.path || node.name}
              node={node}
              selectedPath={selectedFile?.path || selectedFile?.name || null}
              onSelect={handleSelect}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>

      {/* Selected File Details Footer Bar */}
      {selectedFile && (
        <div className="p-2.5 border-t border-[var(--border-soft)] bg-[var(--panel-2)] text-[11px] font-mono flex items-center justify-between text-[var(--dim)] flex-shrink-0">
          <div className="truncate pr-2">
            <span className="text-[var(--accent)] font-medium block truncate">{selectedFile.name}</span>
            <span className="text-[var(--faint)] text-[10px] truncate block">{selectedFile.path || selectedFile.name}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--faint)] text-[10px] flex-shrink-0 font-medium">
            {selectedFile.size || '1KB'}
          </span>
        </div>
      )}
    </div>
  )
}
