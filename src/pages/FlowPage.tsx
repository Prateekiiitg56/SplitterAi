import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge, AgentIcon } from '../components/Badges'
import { useApp } from '../context/AppContext'
import { ROLE_META } from '../data'
import { X, Layers, Upload, Play, AlertTriangle } from 'lucide-react'
import type { AgentRole, Subtask } from '../types'
import { importN8nWorkflow } from '../lib/api'

interface FlowNodeData {
  id: string
  title: string
  role: string
  agentRole: AgentRole
  status: 'working' | 'completed' | 'idle' | 'failed' | 'pending'
  task: string
  progress: number
  color: string
  x: number
  y: number
  group: number
  activity: [string, string][]
}

export default function FlowPage() {
  const navigate = useNavigate()
  const { executeTaskWithPlan, currentWorkspace } = useApp()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importedTaskTitle, setImportedTaskTitle] = useState<string>('n8n Workflow Execution')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Flow nodes state
  const [nodes, setNodes] = useState<Record<string, FlowNodeData>>({
    master: {
      id: 'master',
      title: 'Master Prompt',
      role: 'planner',
      agentRole: 'planner',
      status: 'completed',
      task: 'Task Instruction: Build authentication system with JWT',
      progress: 100,
      color: 'var(--accent)',
      x: 40,
      y: 180,
      group: 1,
      activity: [['10:00', 'Task decomposed into 5 parallel subtasks']],
    },
    alpha: {
      id: 'alpha',
      title: 'Coder — Alpha',
      role: 'coder',
      agentRole: 'coder',
      status: 'working',
      task: 'Implementing JWT authentication endpoint',
      progress: 82,
      color: 'var(--accent)',
      x: 320,
      y: 40,
      group: 2,
      activity: [
        ['10:31', 'Reading auth.config.ts'],
        ['10:34', 'Creating /api/login endpoint'],
      ],
    },
    delta: {
      id: 'delta',
      title: 'Coder — Delta',
      role: 'coder',
      agentRole: 'coder',
      status: 'working',
      task: 'Building login & signup UI form components',
      progress: 64,
      color: 'var(--accent)',
      x: 320,
      y: 200,
      group: 2,
      activity: [
        ['10:29', 'Scaffolding LoginForm.tsx'],
        ['10:33', 'Wiring form validation'],
      ],
    },
    auditor: {
      id: 'auditor',
      title: 'Auditor — Beta',
      role: 'auditor',
      agentRole: 'auditor',
      status: 'idle',
      task: 'Review code security & test suite',
      progress: 0,
      color: 'var(--faint)',
      x: 620,
      y: 120,
      group: 3,
      activity: [['—', 'Not started yet']],
    },
  })

  // Graph edges
  const [edges, setEdges] = useState<[string, string][]>([
    ['master', 'alpha'],
    ['master', 'delta'],
    ['alpha', 'auditor'],
    ['delta', 'auditor'],
  ])

  const canvasRef = useRef<HTMLDivElement>(null)
  const [svgPaths, setSvgPaths] = useState<{ id: string; path: string; className: string }[]>([])

  // Dragging logic
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; nodeX: number; nodeY: number }>({ x: 0, y: 0, nodeX: 0, nodeY: 0 })

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    setDraggingId(id)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      nodeX: nodes[id].x,
      nodeY: nodes[id].y,
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setNodes((prev) => ({
      ...prev,
      [draggingId]: {
        ...prev[draggingId],
        x: Math.max(10, dragStartRef.current.nodeX + dx),
        y: Math.max(10, dragStartRef.current.nodeY + dy),
      },
    }))
  }

  const handlePointerUp = (id: string, e: React.PointerEvent) => {
    const moved = Math.abs(e.clientX - dragStartRef.current.x) > 3 || Math.abs(e.clientY - dragStartRef.current.y) > 3
    setDraggingId(null)
    if (!moved) {
      setSelectedNodeId(id)
    }
  }

  // Recalculate SVG edge paths
  useEffect(() => {
    const updatedPaths = edges.map(([fromId, toId]) => {
      const from = nodes[fromId]
      const to = nodes[toId]
      if (!from || !to) return { id: `${fromId}-${toId}`, path: '', className: '' }

      const p1 = { x: from.x + 184, y: from.y + 40 }
      const p2 = { x: to.x, y: to.y + 40 }
      const dx = Math.max(60, (p2.x - p1.x) * 0.5)

      const pathStr = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`
      const edgeClass = from.status === 'working' ? 'active-edge' : from.status === 'completed' ? 'done-edge' : ''

      return {
        id: `${fromId}-${toId}`,
        path: pathStr,
        className: edgeClass,
      }
    })

    setSvgPaths(updatedPaths)
  }, [nodes, edges])

  // Handle n8n JSON file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)

    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res = await importN8nWorkflow(json)

      const title = res.task || file.name.replace(/\.json$/i, '')
      setImportedTaskTitle(title)

      const newNodes: Record<string, FlowNodeData> = {}
      const newEdges: [string, string][] = []

      // Group layout indexing
      const groupCount: Record<number, number> = {}

      res.subtasks.forEach((st) => {
        const g = st.group || 1
        const indexInGroup = groupCount[g] || 0
        groupCount[g] = indexInGroup + 1

        const posX = 40 + (g - 1) * 260
        const posY = 60 + indexInGroup * 140

        const roleStr = (st.role as AgentRole) || 'unassigned'
        const meta = ROLE_META[roleStr] || ROLE_META.unassigned

        newNodes[st.id] = {
          id: st.id,
          title: `${st.id.toUpperCase()} • ${meta.label}`,
          role: roleStr,
          agentRole: roleStr,
          status: 'idle',
          task: st.instruction,
          progress: 0,
          color: meta.color,
          x: posX,
          y: posY,
          group: g,
          activity: [['—', 'Imported from n8n workflow']],
        }
      })

      // Generate visual DAG edges between sequential group nodes
      const nodeKeys = Object.keys(newNodes)
      nodeKeys.forEach((id1) => {
        const n1 = newNodes[id1]
        nodeKeys.forEach((id2) => {
          const n2 = newNodes[id2]
          if (n2.group === n1.group + 1) {
            newEdges.push([id1, id2])
          }
        })
      })

      setNodes(newNodes)
      setEdges(newEdges)
      setSelectedNodeId(null)
    } catch (err: any) {
      setImportError(err.message || 'Failed to import n8n workflow JSON.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Count unassigned nodes
  const unassignedCount = Object.values(nodes).filter((n) => n.agentRole === 'unassigned').length

  // Launch confirmed plan
  const handleLaunchPlan = async () => {
    if (unassignedCount > 0) return

    const subtasksToLaunch: Subtask[] = Object.values(nodes).map((n) => ({
      id: n.id,
      role: n.agentRole === 'unassigned' ? 'coder' : n.agentRole,
      group: n.group || 1,
      instruction: n.task,
      status: 'pending',
      steps: 0,
    }))

    await executeTaskWithPlan(importedTaskTitle, subtasksToLaunch, currentWorkspace)
    navigate('/projects/default')
  }

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-[var(--bg)] text-[var(--text)] font-sans select-none overflow-hidden relative z-10">
      
      {/* Topbar */}
      <div className="topbar h-[48px] border-b border-[var(--border-soft)] flex items-center justify-between px-5 bg-[var(--bg)] flex-shrink-0">
        <div className="topbar-left flex items-center gap-2.5">
          <span className="topbar-title font-semibold text-[14px]">Agent Flow Canvas</span>
          <span className="topbar-crumb font-mono text-[11px] text-[var(--faint)]">({importedTaskTitle})</span>
        </div>

        <div className="topbar-right flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary text-[var(--dim)] hover:text-[var(--text)] text-[12px] px-3 py-1.5 rounded-md border border-[var(--border-soft)] hover:border-[var(--border)] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload size={13} />
            <span>Import n8n workflow</span>
          </button>

          <button
            onClick={handleLaunchPlan}
            disabled={unassignedCount > 0}
            className={`btn-primary text-[12px] font-medium px-3.5 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer ${
              unassignedCount > 0
                ? 'opacity-50 cursor-not-allowed border-[var(--border-soft)] text-[var(--faint)] bg-[var(--panel-2)]'
                : 'border-[var(--border)] text-[var(--accent)] hover:border-[var(--accent)]'
            }`}
          >
            <Play size={13} />
            <span>Confirm & launch plan</span>
          </button>
        </div>
      </div>

      {/* Error or Warning Banners */}
      {importError && (
        <div className="mx-5 mt-3 p-3 rounded border border-[var(--bad)] bg-[var(--bad-dim)] text-[var(--bad)] text-[12px] flex items-center justify-between flex-shrink-0">
          <span>⚠️ <strong>Import Error:</strong> {importError}</span>
          <button onClick={() => setImportError(null)} className="font-bold hover:underline">✕</button>
        </div>
      )}

      {unassignedCount > 0 && !importError && (
        <div className="mx-5 mt-3 p-2.5 rounded border border-[var(--warning)] bg-[var(--warning-dim)] text-[var(--warning)] text-[12px] flex items-center gap-2 flex-shrink-0">
          <AlertTriangle size={14} className="flex-shrink-0" />
          <span>
            <strong>Role Required:</strong> {unassignedCount} node(s) have role <code>"unassigned"</code>. Click a node to assign its role before launching.
          </span>
        </div>
      )}

      {/* Canvas Wrap */}
      <div
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        className="flow-canvas-wrap relative flex-1 overflow-auto bg-[var(--bg)] bg-[radial-gradient(circle,#161C29_1px,transparent_1px)] bg-[size:26px_26px]"
      >
        <div className="flow-canvas relative w-[1400px] h-[900px]">
          
          {/* SVG Connection Lines */}
          <svg className="flow-svg absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            {svgPaths.map((ep) => (
              <path
                key={ep.id}
                d={ep.path}
                className={`fill-none stroke-[var(--border)] stroke-[1.4] transition-all ${
                  ep.className === 'active-edge' ? 'stroke-[var(--accent)]' : ep.className === 'done-edge' ? 'stroke-[#1A3A38]' : ''
                }`}
              />
            ))}
          </svg>

          {/* Flow Nodes */}
          {Object.values(nodes).map((node) => {
            const isSelected = selectedNodeId === node.id
            const isUnassigned = node.agentRole === 'unassigned'

            return (
              <div
                key={node.id}
                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                onPointerDown={(e) => handlePointerDown(node.id, e)}
                onPointerUp={(e) => handlePointerUp(node.id, e)}
                className={`flow-node absolute w-[184px] border rounded-[8px] bg-[var(--panel)] p-3 cursor-grab select-none shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-colors ${
                  isUnassigned
                    ? 'border-[var(--warning)] bg-[var(--panel)]'
                    : isSelected
                    ? 'border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]'
                    : 'border-[var(--border-soft)] hover:border-[var(--border)]'
                }`}
              >
                {/* Ports */}
                <div className="flow-port in absolute left-[-5px] top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[var(--border)] border-2 border-[var(--panel)]" />
                <div className="flow-port out absolute right-[-5px] top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[var(--border)] border-2 border-[var(--panel)]" />

                {/* Node Top */}
                <div className="flow-node-top flex items-center gap-2 mb-2">
                  <div className={`flow-node-avatar w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 ${
                    isUnassigned ? 'border-[var(--warning)] text-[var(--warning)]' : 'border-[var(--border)] text-[var(--accent)]'
                  }`}>
                    <AgentIcon role={node.agentRole === 'unassigned' ? 'planner' : node.agentRole} size={12} />
                  </div>
                  <div className="min-w-0">
                    <div className="flow-node-name font-medium text-[12px] text-[var(--text)] truncate">{node.title}</div>
                    <div className={`flow-node-role font-mono text-[10px] truncate ${isUnassigned ? 'text-[var(--warning)] font-bold' : 'text-[var(--faint)]'}`}>
                      {node.role}
                    </div>
                  </div>
                </div>

                {/* Node Task */}
                <div className="flow-node-task text-[10.5px] text-[var(--dim)] line-clamp-2 leading-relaxed mb-2">
                  {node.task}
                </div>

                <StatusBadge status={node.status} />
              </div>
            )
          })}
        </div>

        {/* Slide-out Detail Drawer (Editable) */}
        <div
          className={`flow-drawer absolute top-3.5 right-3.5 bottom-3.5 w-[320px] bg-[var(--panel)] border border-[var(--border-soft)] rounded-[var(--radius)] flex flex-col overflow-hidden shadow-2xl transition-transform duration-200 z-20 ${
            selectedNode ? 'translate-x-0' : 'translate-x-[120%]'
          }`}
        >
          {selectedNode && (
            <>
              <div className="flow-drawer-head flex items-center justify-between p-3.5 border-b border-[var(--border-soft)]">
                <div>
                  <h3 className="flow-drawer-title text-[14px] font-semibold text-[var(--text)]">{selectedNode.title}</h3>
                  <div className="flow-drawer-role font-mono text-[10.5px] text-[var(--faint)]">Group {selectedNode.group}</div>
                </div>
                <button onClick={() => setSelectedNodeId(null)} className="text-[var(--faint)] hover:text-[var(--text)] cursor-pointer">
                  <X size={15} />
                </button>
              </div>

              <div className="flow-drawer-body p-4 overflow-y-auto flex-1 space-y-4">
                {/* Editable Agent Role */}
                <div>
                  <label className="flow-drawer-section-label font-mono text-[10px] text-[var(--faint)] tracking-wider uppercase font-bold mb-1.5 block">
                    ASSIGNED AGENT ROLE
                  </label>
                  <select
                    value={selectedNode.agentRole}
                    onChange={(e) => {
                      const newRole = e.target.value as AgentRole
                      const meta = ROLE_META[newRole] || ROLE_META.unassigned
                      setNodes((prev) => ({
                        ...prev,
                        [selectedNode.id]: {
                          ...prev[selectedNode.id],
                          agentRole: newRole,
                          role: newRole,
                          title: `${selectedNode.id.toUpperCase()} • ${meta.label}`,
                          color: meta.color,
                        },
                      }))
                    }}
                    className={`w-full bg-[var(--bg-inset)] border rounded px-2.5 py-1.5 font-mono text-[12px] cursor-pointer focus:outline-none ${
                      selectedNode.agentRole === 'unassigned' ? 'border-[var(--warning)] text-[var(--warning)] font-bold' : 'border-[var(--border)] text-[var(--text)]'
                    }`}
                  >
                    <option value="unassigned">⚠️ unassigned (role required)</option>
                    <option value="planner">planner</option>
                    <option value="coder">coder</option>
                    <option value="auditor">auditor</option>
                    <option value="tester">tester</option>
                  </select>
                </div>

                {/* Editable Instruction Task */}
                <div>
                  <label className="flow-drawer-section-label font-mono text-[10px] text-[var(--faint)] tracking-wider uppercase font-bold mb-1.5 block">
                    SUBTASK INSTRUCTION
                  </label>
                  <textarea
                    value={selectedNode.task}
                    onChange={(e) => {
                      const newTask = e.target.value
                      setNodes((prev) => ({
                        ...prev,
                        [selectedNode.id]: {
                          ...prev[selectedNode.id],
                          task: newTask,
                        },
                      }))
                    }}
                    rows={4}
                    className="w-full bg-[var(--bg-inset)] border border-[var(--border)] rounded p-2 text-[12px] text-[var(--text)] font-sans focus:outline-none focus:border-[var(--accent)] resize-none"
                  />
                </div>

                <div>
                  <div className="flow-drawer-section-label font-mono text-[10px] text-[var(--faint)] tracking-wider uppercase font-bold mb-1.5">
                    STATUS & PROGRESS
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge status={selectedNode.status} />
                    <span className="font-mono text-[11px] text-[var(--dim)]">{selectedNode.progress}%</span>
                  </div>

                  <div className="progress-track h-[3px] rounded-full bg-[var(--border-soft)] overflow-hidden">
                    <div
                      className="progress-fill h-full rounded-full transition-all duration-300"
                      style={{ width: `${selectedNode.progress}%`, backgroundColor: selectedNode.color }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flow-drawer-section-label font-mono text-[10px] text-[var(--faint)] tracking-wider uppercase font-bold mb-1.5">
                    REAL-TIME ACTIVITY
                  </div>
                  <div className="space-y-1">
                    {selectedNode.activity.map((act, i) => (
                      <div key={i} className="activity-item flex gap-2.5 text-[11.5px] py-1.5 border-b border-[var(--border-soft)] last:border-b-0">
                        <div className="activity-time font-mono text-[10.5px] text-[var(--faint)] whitespace-nowrap">{act[0]}</div>
                        <div className="activity-text text-[var(--dim)] leading-relaxed" dangerouslySetInnerHTML={{ __html: act[1] }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
