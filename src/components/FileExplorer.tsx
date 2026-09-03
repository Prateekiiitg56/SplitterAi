import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  FolderSearch,
  Search,
  X,
  Code,
  Sparkles,
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
          className="flex items-center gap-1.5 w-full h-7 hover:bg-white/[0.04] rounded text-neutral-300 transition-colors cursor-pointer group"
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
        >
          {open ? (
            <ChevronDown size={12} className="text-neutral-500 flex-shrink-0" />
          ) : (
            <ChevronRight size={12} className="text-neutral-500 flex-shrink-0" />
          )}
          {open ? (
            <FolderOpen size={14} className="text-amber-400 flex-shrink-0" />
          ) : (
            <Folder size={14} className="text-amber-400 flex-shrink-0" />
          )}
          <span className="text-[12.5px] font-medium truncate text-white flex-1 text-left">
            {node.name}
          </span>
          {node.children && (
            <span className="text-[10px] font-mono text-neutral-500 pr-2">{node.children.length}</span>
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
          ? 'bg-[#2B2358] text-white border border-[#48398C]'
          : 'hover:bg-white/[0.04] text-neutral-300 border border-transparent'
      }`}
      style={{ paddingLeft: `${depth * 12 + 18}px` }}
    >
      <FileCode2 size={13} className={isSelected ? 'text-[#9D8CFC]' : 'text-neutral-400 flex-shrink-0'} />
      
      <span className="text-[12px] font-mono truncate flex-1 text-left">{node.name}</span>

      {/* Modified / Agent attribution badge */}
      {agentAssigned && (
        <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {agentAssigned}
        </span>
      )}

      {node.size && (
        <span className="text-[10px] font-mono text-neutral-500 flex-shrink-0">
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
    <div className="flex flex-col h-full select-none bg-[#101218] border-t border-white/[0.08] text-white font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between h-9 px-3.5 border-b border-white/[0.08] flex-shrink-0 bg-[#0E121C]">
        <div className="flex items-center gap-2">
          <Folder size={13} className="text-amber-400" />
          <span className="text-[10.5px] font-mono uppercase font-bold tracking-wider text-neutral-300">
            SANDBOXED FILES
          </span>
        </div>
        <span className="text-[10px] font-mono text-neutral-500 truncate max-w-[110px]" title={workspace}>
          {workspace.split(/[/\\]/).pop()}
        </span>
      </div>

      {/* Tree Search Bar */}
      <div className="p-2 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#141824] border border-white/10 text-[12px]">
          <Search size={13} className="text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspace files..."
            className="w-full bg-transparent outline-none text-white placeholder:text-neutral-500 font-mono text-[11.5px]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-neutral-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-6 text-neutral-500 text-[12px]">
            <Loader2 size={15} className="animate-spin text-[#9D8CFC]" />
            <span>Reading workspace files...</span>
          </div>
        ) : error ? (
          <div className="p-3 text-[11px] text-amber-400 space-y-1">
            <p className="font-semibold">⚠️ File Tree Error</p>
            <p className="text-neutral-400 text-[10px]">{error}</p>
          </div>
        ) : fileTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-neutral-500 gap-2">
            <FolderSearch size={24} className="opacity-30 text-neutral-400" />
            <p className="text-[13px] font-bold text-white">No files yet</p>
            <p className="text-[11px] text-neutral-500 leading-relaxed max-w-[200px]">
              Files created or modified by agent workers will appear here in real-time.
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
        <div className="p-2.5 border-t border-white/[0.08] bg-[#0E121C] text-[11px] font-mono flex items-center justify-between text-neutral-300 flex-shrink-0">
          <div className="truncate pr-2">
            <span className="text-[#9D8CFC] font-bold block truncate">{selectedFile.name}</span>
            <span className="text-neutral-500 text-[10px] truncate block">{selectedFile.path || selectedFile.name}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-white/5 text-neutral-400 text-[10px] flex-shrink-0 font-bold">
            {selectedFile.size || '1KB'}
          </span>
        </div>
      )}
    </div>
  )
}
