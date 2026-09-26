import { useState, useRef, useMemo } from 'react'
import { StatusBadge, AgentIcon } from '../components/Badges'
import { useApp } from '../context/AppContext'
import { ROLE_META } from '../data'
import { Upload, GitBranch } from 'lucide-react'
import type { AgentRole, Subtask } from '../types'
import { importN8nWorkflow } from '../lib/api'
import ProjectTabShell from './ProjectTabShell'
import { Button } from '../components/primitives/Button'

type FlowStatus = 'working' | 'completed' | 'failed' | 'pending'

interface FlowNodeData {
  id: string
  title: string
  role: string
  agentRole: AgentRole
  status: FlowStatus
  task: string
  steps: number
  color: string
  x: number
  y: number
  group: number
}

const NODE_W = 190
const NODE_H = 110
const COL_GAP = 260
const ROW_GAP = 130
const PAD = 0 // .flow-canvas already pads the graph

const toFlowStatus = (s: string | undefined): FlowStatus => {
  switch (s) {
    case 'running':
    case 'working':
      return 'working'
    case 'success':
    case 'completed':
    case 'done':
      return 'completed'
    case 'error':
    case 'failed':
      return 'failed'
    default:
      return 'pending'
  }
}

/** Planner root plus one column per execution group, laid out from the live plan. */
function buildGraph(subtasks: Subtask[], goal: string, planning: boolean) {
  const nodes: Record<string, FlowNodeData> = {}
  const edges: [string, string][] = []
  if (!subtasks.length && !planning) return { nodes, edges }

  const groupOf = (st: Subtask) => st.group || 1
  const groups = [...new Set(subtasks.map(groupOf))].sort((a, b) => a - b)
  const tallest = Math.max(1, ...groups.map((g) => subtasks.filter((st) => groupOf(st) === g).length))

  nodes.planner = {
    id: 'planner',
    title: 'Main Goal',
    role: 'planner',
    agentRole: 'planner',
    status: planning ? 'working' : 'completed',
    task: goal || (planning ? 'Planning…' : 'Current run'),
    steps: 0,
    color: 'var(--role-planner)',
    x: 0,
    y: ((tallest - 1) * ROW_GAP) / 2,
    group: 0,
  }

  groups.forEach((g, col) => {
    const inGroup = subtasks.filter((st) => groupOf(st) === g)
    const offset = ((tallest - inGroup.length) * ROW_GAP) / 2
    // Each group waits on the previous one; the planner feeds the first.
    const parents = col === 0 ? ['planner'] : subtasks.filter((p) => groupOf(p) === groups[col - 1]).map((p) => p.id)
    inGroup.forEach((st, row) => {
      const role = (st.role as AgentRole) || 'coder'
      nodes[st.id] = {
        id: st.id,
        title: `${ROLE_META[role]?.label || role} · ${st.id}`,
        role,
        agentRole: role,
        status: toFlowStatus(st.status),
        task: st.instruction,
        steps: st.steps || 0,
        color: ROLE_META[role]?.color || 'var(--accent)',
        x: (col + 1) * COL_GAP,
        y: offset + row * ROW_GAP,
        group: g,
      }
      parents.forEach((pid) => edges.push([pid, st.id]))
    })
  })

  return { nodes, edges }
}

export default function FlowPage() {
  const { executeTaskWithPlan, currentWorkspace, subtasks, logs, runStatus, taskTitle } = useApp()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const graph = useMemo(
    () => buildGraph(subtasks, taskTitle, runStatus === 'planning'),
    [subtasks, taskTitle, runStatus],
  )

  // User drag positions, layered over the computed layout.
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({})
  const nodes = useMemo(() => {
    const out: Record<string, FlowNodeData> = {}
    for (const n of Object.values(graph.nodes)) {
      const o = offsets[n.id]
      out[n.id] = o ? { ...n, x: o.x, y: o.y } : n
    }
    return out
  }, [graph.nodes, offsets])

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
    setOffsets((prev) => ({
      ...prev,
      [draggingId]: {
        x: Math.max(0, dragStartRef.current.nodeX + dx),
        y: Math.max(0, dragStartRef.current.nodeY + dy),
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

  const svgPaths = graph.edges.map(([fromId, toId]) => {
    const from = nodes[fromId]
    const to = nodes[toId]
    const p1 = { x: from.x + PAD + NODE_W, y: from.y + PAD + 40 }
    const p2 = { x: to.x + PAD, y: to.y + PAD + 40 }
    const dx = Math.max(60, (p2.x - p1.x) * 0.5)
    const stroke = from.status === 'working' ? 'var(--accent)' : from.status === 'completed' ? 'var(--good)' : 'var(--border)'
    return {
      id: `${fromId}-${toId}`,
      path: `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`,
      stroke,
    }
  })

  // The SVG and sizer cover the whole graph, not just the visible canvas, so edges don't clip on scroll.
  const extent = Object.values(nodes).reduce(
    (acc, n) => ({ w: Math.max(acc.w, n.x + NODE_W + PAD * 2), h: Math.max(acc.h, n.y + NODE_H + PAD * 2) }),
    { w: 0, h: 0 },
  )

  // Handle n8n JSON file selection. The runner owns the resulting subtasks; the map re-derives from them.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    setImportError(null)

    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const res = await importN8nWorkflow(json)

      const title = res.task || file.name.replace(/\.json$/i, '')
      setOffsets({})
      setSelectedNodeId(null)

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
    } finally {
      input.value = ''
    }
  }

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] ?? null : null
  const selectedActivity = selectedNode
    ? logs
        .filter((l) => (selectedNode.id === 'planner' ? l.role === 'planner' && !l.subtaskId : l.subtaskId === selectedNode.id))
        .slice(-20)
    : []
  const hasGraph = Object.keys(nodes).length > 0

  return (
    <ProjectTabShell>
      <div className="flex flex-1 flex-col min-w-0 min-h-0 bg-transparent select-none overflow-hidden">
        {importError && (
          <div role="alert" className="p-3 m-3 border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta flex items-center justify-between rounded-panel">
            <span>
              <strong>Import Error:</strong> {importError}
            </span>
            <button type="button" onClick={() => setImportError(null)} aria-label="Dismiss import error" className="font-bold hover:underline">
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
            {hasGraph ? (
              <div className="relative" style={{ width: extent.w, height: extent.h }}>
                {/* SVG Connecting Lines */}
                <svg className="flow-svg-lines" aria-hidden="true">
                  {svgPaths.map((sp) => (
                    <path
                      key={sp.id}
                      d={sp.path}
                      fill="none"
                      stroke={sp.stroke}
                      strokeWidth="2"
                      strokeDasharray={sp.stroke === 'var(--accent)' ? '6,6' : undefined}
                    />
                  ))}
                </svg>

                {/* Nodes */}
                {Object.values(nodes).map((node) => {
                  const isSelected = selectedNodeId === node.id
                  return (
                    <div
                      key={node.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`${node.title}, ${node.status}`}
                      onPointerDown={(e) => handlePointerDown(node.id, e)}
                      onPointerUp={(e) => handlePointerUp(node.id, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedNodeId(node.id)
                        }
                      }}
                      className={`fnode ${isSelected ? 'selected' : ''}`}
                      style={{ left: node.x + PAD, top: node.y + PAD }}
                    >
                      <div className="fn-top">
                        <span style={{ color: node.color, display: 'inline-flex' }}>
                          <AgentIcon role={node.agentRole} size={13} />
                        </span>
                        <span className="fn-title">{node.title}</span>
                      </div>
                      <div className="fn-task">{node.task}</div>
                      <StatusBadge status={node.status} size="sm" />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center text-meta text-[var(--faint)]">
                <GitBranch size={22} aria-hidden="true" />
                <p className="m-0 text-[var(--text-2)]">No workflow yet</p>
                <p className="m-0 max-w-[320px]">
                  Confirm a plan from the Workspace or import an n8n workflow to see agents and their dependencies here.
                </p>
              </div>
            )}
          </div>

          {/* Right Inspector Panel */}
          <div className="flow-side">
            <div className="flex items-center justify-between mb-4">
              <h2 className="m-0 text-[13px] font-semibold text-[var(--text)]">Agent Details</h2>
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
                Import Workflow
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
                <div className="sub">{selectedNode.group ? `Step ${selectedNode.group} Agent` : 'Orchestrator'}</div>

                <div className="space-y-1 mb-4">
                  <div className="kv-row">
                    <span className="k">Agent ID</span>
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
                  {selectedNode.id !== 'planner' && (
                    <div className="kv-row">
                      <span className="k">Steps</span>
                      <span className="v">{selectedNode.steps}</span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <div className="k text-micro font-mono uppercase mb-1">Current Task</div>
                  <div className="p-2.5 rounded bg-[var(--bg-inset)] border border-[var(--border-soft)] text-meta text-[var(--text-2)] font-sans leading-relaxed break-words">
                    {selectedNode.task}
                  </div>
                </div>

                <div>
                  <div className="k text-micro font-mono uppercase mb-2">Activity Log</div>
                  <div className="space-y-1.5 font-mono text-micro">
                    {selectedActivity.length === 0 && <div className="text-[var(--faint)]">No activity yet.</div>}
                    {selectedActivity.map((log) => (
                      <div key={log.id} className="flex gap-2 p-1.5 rounded bg-[var(--panel)] border border-[var(--border-soft)]">
                        <span className="text-[var(--faint)] flex-shrink-0">{log.timestamp}</span>
                        <span className="text-[var(--text)] min-w-0 break-words">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-6 text-[var(--faint)] text-meta font-mono">
                {hasGraph ? 'Select any agent on the map to see its details.' : 'Agent details appear here once a workflow exists.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProjectTabShell>
  )
}
