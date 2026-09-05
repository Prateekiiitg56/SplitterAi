import { useState, useRef, useEffect } from 'react'
import { StatusBadge, AgentIcon } from '../components/Badges'
import { useApp } from '../context/AppContext'
import { X, Layers } from 'lucide-react'
import type { AgentRole } from '../types'

interface FlowNodeData {
  id: string
  title: string
  role: string
  agentRole: AgentRole
  status: 'working' | 'completed' | 'idle' | 'failed'
  task: string
  progress: number
  color: string
  x: number
  y: number
  activity: [string, string][]
}

export default function FlowPage() {
  const { subtasks } = useApp()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Default flow nodes matching splitterai_redesign.html
  const [nodes, setNodes] = useState<Record<string, FlowNodeData>>({
    master: {
      id: 'master',
      title: 'Master Prompt',
      role: 'orchestrator input',
      agentRole: 'planner',
      status: 'completed',
      task: 'Task Instruction: Build authentication system with JWT',
      progress: 100,
      color: 'var(--accent)',
      x: 40,
      y: 180,
      activity: [['10:00', 'Task decomposed into 5 parallel subtasks']],
    },
    alpha: {
      id: 'alpha',
      title: 'Coder — Alpha',
      role: 'backend engineer',
      agentRole: 'coder',
      status: 'working',
      task: 'Implementing JWT authentication endpoint',
      progress: 82,
      color: 'var(--accent)',
      x: 320,
      y: 40,
      activity: [
        ['10:31', 'Reading auth.config.ts'],
        ['10:34', 'Creating /api/login endpoint'],
        ['10:36', 'Running auth.test.ts'],
      ],
    },
    delta: {
      id: 'delta',
      title: 'Coder — Delta',
      role: 'frontend engineer',
      agentRole: 'coder',
      status: 'working',
      task: 'Building login & signup UI form components',
      progress: 64,
      color: 'var(--accent)',
      x: 320,
      y: 200,
      activity: [
        ['10:29', 'Scaffolding LoginForm.tsx'],
        ['10:33', 'Wiring form validation'],
        ['10:35', 'Styling error states'],
      ],
    },
    echo: {
      id: 'echo',
      title: 'Coder — Echo',
      role: 'database engineer',
      agentRole: 'coder',
      status: 'completed',
      task: 'User schema and migration script applied',
      progress: 100,
      color: 'var(--good)',
      x: 320,
      y: 360,
      activity: [
        ['10:10', 'Designed users table schema'],
        ['10:18', 'Wrote migration script'],
        ['10:22', 'Applied migration — done'],
      ],
    },
    auditor: {
      id: 'auditor',
      title: 'Auditor — Beta',
      role: 'code reviewer',
      agentRole: 'auditor',
      status: 'idle',
      task: 'Queued — will review code diffs once Coder finishes',
      progress: 0,
      color: 'var(--faint)',
      x: 320,
      y: 520,
      activity: [['—', 'Not started yet']],
    },
    tester: {
      id: 'tester',
      title: 'Tester — Gamma',
      role: 'test engineer',
      agentRole: 'tester',
      status: 'idle',
      task: 'Waiting on backend & frontend implementation',
      progress: 0,
      color: 'var(--faint)',
      x: 620,
      y: 120,
      activity: [['—', 'Not started yet']],
    },
    done: {
      id: 'done',
      title: 'Merge & Deploy',
      role: 'pipeline output',
      agentRole: 'planner',
      status: 'idle',
      task: 'Final project build verification',
      progress: 0,
      color: 'var(--faint)',
      x: 900,
      y: 280,
      activity: [['—', 'Pending upstream execution']],
    },
  })

  // Graph edges
  const edges: [string, string][] = [
    ['master', 'alpha'],
    ['master', 'delta'],
    ['master', 'echo'],
    ['master', 'auditor'],
    ['alpha', 'tester'],
    ['delta', 'tester'],
    ['echo', 'tester'],
    ['tester', 'done'],
    ['auditor', 'done'],
  ]

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
  }, [nodes])

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-[var(--bg)] text-[var(--text)] font-sans select-none overflow-hidden relative z-10">
      
      {/* Topbar */}
      <div className="topbar h-[48px] border-b border-[var(--border-soft)] flex items-center justify-between px-5 bg-[var(--bg)] flex-shrink-0">
        <div className="topbar-left flex items-center gap-2.5">
          <span className="topbar-title font-semibold text-[14px]">Agent Flow Canvas</span>
        </div>

        <div className="topbar-right flex items-center gap-3 text-[11px] font-mono text-[var(--faint)]">
          <span>Click node to open detail drawer • Drag to reposition</span>
        </div>
      </div>

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

            return (
              <div
                key={node.id}
                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                onPointerDown={(e) => handlePointerDown(node.id, e)}
                onPointerUp={(e) => handlePointerUp(node.id, e)}
                className={`flow-node absolute w-[184px] border rounded-[8px] bg-[var(--panel)] p-3 cursor-grab select-none shadow-[0_6px_20px_rgba(0,0,0,0.35)] transition-colors ${
                  isSelected ? 'border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]' : 'border-[var(--border-soft)] hover:border-[var(--border)]'
                }`}
              >
                {/* Ports */}
                <div className="flow-port in absolute left-[-5px] top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[var(--border)] border-2 border-[var(--panel)]" />
                <div className="flow-port out absolute right-[-5px] top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[var(--border)] border-2 border-[var(--panel)]" />

                {/* Node Top */}
                <div className="flow-node-top flex items-center gap-2 mb-2">
                  <div className="flow-node-avatar w-6 h-6 rounded-md border border-[var(--border)] flex items-center justify-center flex-shrink-0 text-[var(--accent)]">
                    <AgentIcon role={node.agentRole} size={12} />
                  </div>
                  <div className="min-w-0">
                    <div className="flow-node-name font-medium text-[12px] text-[var(--text)] truncate">{node.title}</div>
                    <div className="flow-node-role font-mono text-[10px] text-[var(--faint)] truncate">{node.role}</div>
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

        {/* Slide-out Detail Drawer */}
        <div
          className={`flow-drawer absolute top-3.5 right-3.5 bottom-3.5 w-[300px] bg-[var(--panel)] border border-[var(--border-soft)] rounded-[var(--radius)] flex flex-col overflow-hidden shadow-2xl transition-transform duration-200 z-20 ${
            selectedNode ? 'translate-x-0' : 'translate-x-[120%]'
          }`}
        >
          {selectedNode && (
            <>
              <div className="flow-drawer-head flex items-center justify-between p-3.5 border-b border-[var(--border-soft)]">
                <div>
                  <h3 className="flow-drawer-title text-[14px] font-semibold text-[var(--text)]">{selectedNode.title}</h3>
                  <div className="flow-drawer-role font-mono text-[10.5px] text-[var(--faint)]">{selectedNode.role}</div>
                </div>
                <button onClick={() => setSelectedNodeId(null)} className="text-[var(--faint)] hover:text-[var(--text)] cursor-pointer">
                  <X size={15} />
                </button>
              </div>

              <div className="flow-drawer-body p-4 overflow-y-auto flex-1 space-y-4">
                <div>
                  <div className="flow-drawer-section-label font-mono text-[10px] text-[var(--faint)] tracking-wider uppercase font-bold mb-1.5">
                    CURRENT TASK
                  </div>
                  <p className="text-[12.5px] text-[var(--text)] leading-relaxed">{selectedNode.task}</p>
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
