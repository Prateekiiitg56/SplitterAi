import { useState } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'

export interface FileNode {
  name: string
  type: 'file' | 'folder'
  children?: FileNode[]
  size?: string
  modified?: string
}

export const mockFileTree: FileNode[] = [
  {
    name: 'src', type: 'folder', children: [
      { name: 'main.py', type: 'file', size: '1.2 KB', modified: '10:42 AM' },
      { name: 'utils.py', type: 'file', size: '845 B', modified: '9:15 AM' },
      {
        name: 'tests', type: 'folder', children: [
          { name: 'test_main.py', type: 'file', size: '2.1 KB', modified: '10:42 AM' },
          { name: 'test_utils.py', type: 'file', size: '1.5 KB', modified: '9:15 AM' },
        ]
      },
    ]
  },
  { name: 'fizzbuzz.py', type: 'file', size: '238 B', modified: '10:42 AM' },
  { name: 'fibonacci.py', type: 'file', size: '195 B', modified: '10:42 AM' },
  { name: 'factorial.py', type: 'file', size: '310 B', modified: '10:42 AM' },
  { name: 'requirements.txt', type: 'file', size: '45 B', modified: 'Yesterday' },
  { name: 'README.md', type: 'file', size: '1.8 KB', modified: 'Yesterday' },
  { name: '.gitignore', type: 'file', size: '120 B', modified: 'Aug 31' },
]

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(depth === 0)

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex items-center gap-1.5 w-full h-7 hover:bg-zinc-100/70 rounded text-zinc-700 transition-colors cursor-pointer group"
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          {open ? <ChevronDown size={12} className="text-zinc-400 flex-shrink-0" /> : <ChevronRight size={12} className="text-zinc-400 flex-shrink-0" />}
          {open ? <FolderOpen size={14} className="text-amber-600 flex-shrink-0" /> : <Folder size={14} className="text-amber-600 flex-shrink-0" />}
          <span className="text-[12.5px] font-medium truncate" style={{ color: 'var(--color-text-1)' }}>
            {node.name}
          </span>
        </button>
        {open && node.children?.map((child) => (
          <TreeNode key={child.name} node={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <button
      className="flex items-center gap-1.5 w-full h-7 hover:bg-zinc-100/70 rounded transition-colors cursor-pointer group"
      style={{ paddingLeft: `${depth * 14 + 20}px` }}
    >
      <File size={13} className="text-zinc-400 flex-shrink-0" />
      <span className="text-[12.5px] font-mono truncate flex-1 text-left" style={{ color: 'var(--color-text-2)' }}>
        {node.name}
      </span>
      {node.size && (
        <span className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity pr-2 flex-shrink-0">
          {node.size}
        </span>
      )}
    </button>
  )
}

interface FileExplorerProps {
  files: FileNode[]
  workspace: string
}

export default function FileExplorer({ files, workspace }: FileExplorerProps) {
  return (
    <div className="flex flex-col h-full select-none" style={{ background: 'var(--color-surface)' }}>
      <div className="flex items-center justify-between h-9 px-3 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <span className="t-micro">Workspace Files</span>
        <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[90px]" title={workspace}>
          {workspace.split('/').pop()}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {files.map((node) => (
          <TreeNode key={node.name} node={node} />
        ))}
      </div>
    </div>
  )
}
