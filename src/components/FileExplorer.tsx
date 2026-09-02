import { useState } from 'react'
import {
  ChevronRight, ChevronDown, File, Folder, FolderOpen,
} from 'lucide-react'

export interface FileNode {
  name: string
  type: 'file' | 'folder'
  children?: FileNode[]
  size?: string
  modified?: string
}

// Mock workspace file tree
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

const EXT_COLORS: Record<string, string> = {
  py: '#3572A5',
  js: '#F7DF1E',
  ts: '#3178C6',
  md: '#083FA1',
  txt: '#5F6368',
  json: '#292929',
  yaml: '#CB171E',
  yml: '#CB171E',
  gitignore: '#F05032',
}

function getFileColor(name: string): string {
  const ext = name.split('.').pop() ?? ''
  return EXT_COLORS[ext] ?? '#5F6368'
}

function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(depth === 0)

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex items-center gap-1 w-full h-7 hover:bg-hover-bg rounded transition-colors cursor-pointer group"
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
        >
          {open ? <ChevronDown size={12} className="text-text-secondary flex-shrink-0" /> : <ChevronRight size={12} className="text-text-secondary flex-shrink-0" />}
          {open ? <FolderOpen size={14} className="text-star-yellow flex-shrink-0" /> : <Folder size={14} className="text-star-yellow flex-shrink-0" />}
          <span className="text-[12px] text-text-primary truncate ml-0.5" style={{ fontWeight: 500 }}>
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
      className="flex items-center gap-1.5 w-full h-7 hover:bg-hover-bg rounded transition-colors cursor-pointer group"
      style={{ paddingLeft: `${depth * 14 + 22}px` }}
    >
      <File size={13} style={{ color: getFileColor(node.name) }} className="flex-shrink-0" />
      <span className="text-[12px] text-text-primary truncate flex-1 text-left">
        {node.name}
      </span>
      {node.size && (
        <span className="text-[10px] text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity pr-2 flex-shrink-0"
          style={{ fontFamily: 'var(--font-mono)' }}>
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center h-9 px-3 border-b border-border flex-shrink-0">
        <span className="text-[11px] text-text-secondary uppercase tracking-wide"
          style={{ fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
          Files
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-text-secondary truncate max-w-[120px]"
          style={{ fontFamily: 'var(--font-mono)' }}
          title={workspace}>
          {workspace.split('/').pop()}
        </span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {files.map((node) => (
          <TreeNode key={node.name} node={node} />
        ))}
      </div>
    </div>
  )
}
