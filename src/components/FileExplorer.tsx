import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Loader2, FolderSearch } from 'lucide-react'
import { fetchFiles } from '../lib/api'
import { DEFAULT_WORKSPACE } from '../config'

export interface FileNode {
  name: string
  path?: string
  type: 'file' | 'dir' | 'folder'
  children?: FileNode[]
  size?: number | string
}

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(depth === 0)
  const isDir = node.type === 'dir' || node.type === 'folder'

  if (isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex items-center gap-1.5 w-full h-7 hover:bg-white/[0.04] rounded text-neutral-300 transition-colors cursor-pointer group"
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          {open ? <ChevronDown size={12} className="text-neutral-500 flex-shrink-0" /> : <ChevronRight size={12} className="text-neutral-500 flex-shrink-0" />}
          {open ? <FolderOpen size={14} className="text-amber-400 flex-shrink-0" /> : <Folder size={14} className="text-amber-400 flex-shrink-0" />}
          <span className="text-[12.5px] font-medium truncate text-white">
            {node.name}
          </span>
        </button>
        {open && node.children?.map((child) => (
          <TreeNode key={child.path || child.name} node={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <button
      className="flex items-center gap-1.5 w-full h-7 hover:bg-white/[0.04] rounded transition-colors cursor-pointer group"
      style={{ paddingLeft: `${depth * 14 + 20}px` }}
    >
      <File size={13} className="text-neutral-400 flex-shrink-0" />
      <span className="text-[12.5px] font-mono truncate flex-1 text-left text-neutral-300">
        {node.name}
      </span>
      {node.size && (
        <span className="text-[10px] font-mono text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity pr-2 flex-shrink-0">
          {typeof node.size === 'number' ? `${node.size} B` : node.size}
        </span>
      )}
    </button>
  )
}

import { useWorkspaceFiles } from '../hooks/useWorkspaceFiles'

export default function FileExplorer({ workspace = DEFAULT_WORKSPACE }: FileExplorerProps) {
  const { fileTree, loading, error } = useWorkspaceFiles(workspace)

  return (
    <div className="flex flex-col h-full select-none bg-[#101218] border-t border-white/[0.08]">
      <div className="flex items-center justify-between h-9 px-3.5 border-b border-white/[0.08] flex-shrink-0">
        <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-neutral-400">SANDBOXED FILES</span>
        <span className="text-[10px] font-mono text-neutral-500 truncate max-w-[120px]" title={workspace}>
          {workspace.split('/').pop()}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-4 text-neutral-500 text-[11px]">
            <Loader2 size={14} className="animate-spin text-[#9D8CFC]" />
            <span>Reading workspace...</span>
          </div>
        ) : error ? (
          <div className="p-3 text-[11px] text-amber-400 space-y-1">
            <p className="font-semibold">⚠️ File Tree Error</p>
            <p className="text-neutral-400 text-[10px]">{error}</p>
          </div>
        ) : fileTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-500 gap-1.5">
            <FolderSearch size={20} className="opacity-40" />
            <p className="text-[12px] font-medium">Workspace is empty</p>
            <p className="text-[10px] text-neutral-600">Files created by agent workers will appear here.</p>
          </div>
        ) : (
          fileTree.map((node) => (
            <TreeNode key={node.path || node.name} node={node} />
          ))
        )}
      </div>
    </div>
  )
}
