import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge, AgentIcon } from '../components/Badges'
import { useApp } from '../context/AppContext'
import { ROLE_META } from '../data'
import { Upload, AlertTriangle, GitBranch, Bot, Cpu, Layers } from 'lucide-react'
import type { AgentRole, Subtask } from '../types'
import { importN8nWorkflow } from '../lib/api'
import ProjectTabShell from './ProjectTabShell'
import { Button } from '../components/primitives/Button'

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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('alpha')
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
      color: 'var(--role-planner)',
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
      color: 'var(--role-coder)',
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
      color: 'var(--role-coder)',
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
      color: 'var(--role-auditor)',
      x: 620,
      y: 120,
      group: 3,
      activity: [['—', 'Not started yet']],
    },
  })

  // Graph edges
  const [edges] = useState<[string, string][]>([
    ['master', 'alpha'],
    ['master', 'delta'],
    ['alpha', 'auditor'],
    ['delta', 'auditor'],
  ])

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

      const p1 = { x: from.x + 190, y: from.y + 40 }
      const p2 = { x: to.x, y: to.y + 40 }
      const dx = Math.max(60, (p2.x - p1.x) * 0.5)

      const pathStr = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`
      const strokeColor = from.status === 'working' ? 'var(--accent)' : from.status === 'completed' ? 'var(--good)' : 'var(--border)'

      return {
        id: `${fromId}-${toId}`,
        path: pathStr,
        className: strokeColor,
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
      const groupCount: Record<number, number> = {}

      res.subtasks.forEach((st) => {
        const g = st.group || 1
        const indexInGroup = groupCount[g] || 0
        groupCount[g] = indexInGroup + 1

        const posX = 40 + (g - 1) * 260
        const posY = 60 + indexInGroup * 140
        const roleStr = (st.role as AgentRole) || 'coder'

        newNodes[st.id] = {
          id: st.id,
          title: `${roleStr.toUpperCase()} — ${st.id}`,
          role: roleStr,
          agentRole: roleStr,
          status: 'idle',
          task: st.instruction,
          progress: 0,
          color: ROLE_META[roleStr]?.color || 'var(--accent)',
          x: posX,
          y: posY,
          group: g,
          activity: [['—', 'Imported from n8n JSON']],
        }
      })

      setNodes(newNodes)
      setSelectedNodeId(Object.keys(newNodes)[0] || null)

      const planSubtasks: Subtask[] = res.subtasks.map((s) => ({
        id: s.id,
        role: (s.role as AgentRole) || 'coder',
        group: s.group || 1,
        instruction: s.instruction,
        status: 'pending',
        steps: 0,
      }))

      await executeTaskWithPlan(title, planSubtasks, currentWorkspace)
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse or import n8n workflow file.')
    }
  }

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null

  return (
    <ProjectTabShell>
      <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-transparent select-none overflow-hidden">
        {importError && (
          <div className="p-3 m-3 border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta flex items-center justify-between rounded-panel">
            <span>
              <strong>Import Error:</strong> {importError}
            </span>
            <button onClick={() => setImportError(null)} className="font-bold hover:underline">
              ✕
            </button>
          </div>
        )}

        <div className="flow-wrap">
          {/* Canvas Area */}
          <div
            className="flow-canvas"
            onPointerMove={handlePointerMove}
            onPointerUp={() => setDraggingId(null)}
          >
            {/* SVG Connecting Lines */}
            <svg className="flow-svg-lines">
              {svgPaths.map((sp) => (
                <path
                  key={sp.id}
                  d={sp.path}
                  fill="none"
                  stroke={sp.className}
                  strokeWidth="2"
                  strokeDasharray={sp.className === 'var(--accent)' ? '6,6' : undefined}
                />
              ))}
            </svg>

            {/* Nodes */}
            {Object.values(nodes).map((node) => {
              const isSelected = selectedNodeId === node.id
              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => handlePointerDown(node.id, e)}
                  onPointerUp={(e) => handlePointerUp(node.id, e)}
                  className={`fnode ${isSelected ? 'selected' : ''}`}
                  style={{ left: node.x, top: node.y }}
                >
                  <div className="fn-top">
                    <span style={{ color: node.color, display: 'inline-flex' }}>
                      <AgentIcon role={node.agentRole} size={13} />
                    </span>
                    <span className="fn-title">{node.title}</span>
                  </div>
                  <div className="fn-task">{node.task}</div>
                  <div className="fn-progress-track">
                    <div className="fn-progress-fill" style={{ width: `${node.progress}%`, backgroundColor: node.color }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right Inspector Panel */}
          <div className="flow-side">
            <div className="flex items-center justify-between mb-4">
              <h3 className="m-0">Node Inspector</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<Upload size={12} />}
                onClick={() => fileInputRef.current?.click()}
              >
                Import n8n
              </Button>
            </div>

            {selectedNode ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color: selectedNode.color, display: 'inline-flex' }}>
                    <AgentIcon role={selectedNode.agentRole} size={16} />
                  </span>
                  <h3 className="m-0 text-title">{selectedNode.title}</h3>
                </div>
                <div className="sub">Group {selectedNode.group} Worker Node</div>

                <div className="space-y-1 mb-4">
                  <div className="kv-row">
                    <span className="k">Node ID</span>
                    <span className="v">{selectedNode.id}</span>
                  </div>
                  <div className="kv-row">
                    <span className="k">Role</span>
                    <span className="v uppercase">{selectedNode.role}</span>
                  </div>
                  <div className="kv-row">
                    <span className="k">Status</span>
                    <span className="v">
                      <StatusBadge status={selectedNode.status} size="sm" />
                    </span>
                  </div>
                  <div className="kv-row">
                    <span className="k">Progress</span>
                    <span className="v">{selectedNode.progress}%</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="k text-micro font-mono uppercase mb-1">Instruction Task</div>
                  <div className="p-2.5 rounded bg-[var(--bg-inset)] border border-[var(--border-soft)] text-meta text-[var(--text-2)] font-sans leading-relaxed">
                    {selectedNode.task}
                  </div>
                </div>

                <div>
                  <div className="k text-micro font-mono uppercase mb-2">Node Activity Log</div>
                  <div className="space-y-1.5 font-mono text-micro">
                    {selectedNode.activity.map(([time, msg], i) => (
                      <div key={i} className="flex gap-2 p-1.5 rounded bg-[var(--panel)] border border-[var(--border-soft)]">
                        <span className="text-[var(--faint)]">{time}</span>
                        <span className="text-[var(--text)]">{msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-6 text-[var(--faint)] text-meta font-mono">
                Click any node on the graph canvas to inspect its parameters.
              </div>
            )}
          </div>
        </div>
      </div>
    </ProjectTabShell>
  )
}