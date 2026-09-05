import { useState } from 'react'
import ProjectTabShell from './ProjectTabShell'
import { useApp } from '../context/AppContext'
import { ROLE_META } from '../data'
import { CheckSquare, Clock, Cpu, FileText } from 'lucide-react'
import { StatusBadge } from '../components/Badges'
import PlanView from '../components/PlanView'

export default function ProjectTasksPage() {
  const { subtasks, runStatus, taskTitle } = useApp()
  const [selectedSubtask, setSelectedSubtask] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'dag' | 'list'>('dag')

  return (
    <ProjectTabShell aria-label="Tasks Tab">
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg)] text-[var(--text)] font-sans select-none overflow-hidden">
        {/* Top bar header inside page */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-soft)] bg-[var(--bg)] flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--text)] tracking-tight flex items-center gap-2">
              <CheckSquare size={17} className="text-[var(--accent)]" />
              <span>Subtasks & Execution Steps</span>
            </h2>
            <p className="text-[12px] text-[var(--faint)] mt-0.5">
              {taskTitle ? `Task: "${taskTitle}"` : 'Decomposed parallel task nodes.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-control border border-[var(--border)] overflow-hidden" role="group" aria-label="Task view mode">
              <button
                type="button"
                onClick={() => setActiveTab('dag')}
                className={`h-7 px-2.5 font-mono text-[11px] transition-colors cursor-pointer ${
                  activeTab === 'dag' ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'text-[var(--dim)] hover:bg-[var(--panel)]'
                }`}
              >
                DAG Graph
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`h-7 px-2.5 font-mono text-[11px] transition-colors border-l border-[var(--border)] cursor-pointer ${
                  activeTab === 'list' ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'text-[var(--dim)] hover:bg-[var(--panel)]'
                }`}
              >
                List View
              </button>
            </div>

            <span className="text-[11.5px] font-mono px-2.5 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] text-[var(--dim)]">
              {subtasks.length} Subtasks
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 min-w-0 p-4 overflow-y-auto">
          {activeTab === 'dag' ? (
            <PlanView
              subtasks={subtasks}
              runStatus={runStatus}
              task={taskTitle}
              selectedSubtask={selectedSubtask}
              onSelectSubtask={setSelectedSubtask}
            />
          ) : (
            <div className="max-w-4xl mx-auto space-y-3">
              {subtasks.length === 0 ? (
                <div className="border border-[var(--border-soft)] rounded-[var(--r-panel)] bg-[var(--panel)] p-12 text-center text-[var(--dim)] space-y-2">
                  <Clock size={32} className="mx-auto text-[var(--faint)] opacity-50" />
                  <h3 className="text-[14px] font-semibold text-[var(--text)]">No Subtasks Decomposed</h3>
                  <p className="text-[12px] text-[var(--faint)] font-mono">
                    Submit a master task prompt from Home or Project Overview to view generated steps.
                  </p>
                </div>
              ) : (
                subtasks.map((st) => {
                  const meta = ROLE_META[st.role] || ROLE_META.coder

                  return (
                    <div
                      key={st.id}
                      className="border border-[var(--border-soft)] rounded-[var(--r-panel)] bg-[var(--panel)] p-4 flex items-start justify-between gap-4 hover:border-[var(--border)] transition-colors"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded font-mono bg-[var(--panel-2)] border border-[var(--border)] text-[var(--accent)]">
                            {st.id}
                          </span>
                          <span className="text-[11.5px] font-mono text-[var(--dim)]">Group {st.group}</span>
                          <StatusBadge status={st.status || 'pending'} />
                        </div>

                        <p className="text-[13px] font-medium text-[var(--text)] leading-relaxed">{st.instruction}</p>

                        {st.output && (
                          <div className="p-3 rounded bg-[var(--bg-inset)] border border-[var(--border)] text-[12px] font-mono text-[var(--text-2)] max-h-[120px] overflow-y-auto">
                            <span className="text-[var(--faint)] block text-[10px] uppercase tracking-wider mb-1">Output:</span>
                            {st.output}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5 text-[11.5px] font-mono text-[var(--dim)] flex-shrink-0">
                        <span className="flex items-center gap-1 text-[var(--accent)]">
                          <Cpu size={13} />
                          {st.model || 'gemini-3.5-flash'}
                        </span>
                        <span className="flex items-center gap-1 text-[var(--faint)]">
                          <FileText size={12} />
                          {st.steps || 0} steps
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </ProjectTabShell>
  )
}
