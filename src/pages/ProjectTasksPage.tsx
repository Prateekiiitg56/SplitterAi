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
    <ProjectTabShell>
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-transparent text-[var(--text)] font-sans select-none overflow-hidden">
        {/* Tasks Header Bar */}
        <div className="tasks-head">
          <div>
            <div className="th-title">
              <CheckSquare size={15} />
              <span>Subtasks & Execution Steps</span>
            </div>
            <div className="th-sub">
              {taskTitle ? `Task: "${taskTitle}"` : 'Decomposed parallel worker task nodes.'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="mode-toggle" role="group" aria-label="Task view mode">
              <button
                type="button"
                onClick={() => setActiveTab('dag')}
                className={activeTab === 'dag' ? 'active' : ''}
              >
                DAG Graph
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={activeTab === 'list' ? 'active' : ''}
              >
                List View
              </button>
            </div>

            <span className="count-pill">{subtasks.length} Subtasks</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 min-w-0 p-4 overflow-y-auto">
          {activeTab === 'dag' ? (
            <PlanView
              subtasks={subtasks}
              runStatus={runStatus}
              task={taskTitle || (subtasks.length ? 'Current run' : '')}
              selectedSubtask={selectedSubtask}
              onSelectSubtask={setSelectedSubtask}
            />
          ) : (
            <div className="task-list">
              {subtasks.length === 0 ? (
                <div className="empty-state">
                  <Clock size={30} />
                  <div className="es-title">No subtasks decomposed yet</div>
                  <div className="es-detail">Submit a master task prompt from Home or Project Overview to view generated steps.</div>
                </div>
              ) : (
                subtasks.map((st) => {
                  return (
                    <div key={st.id} className="task-row">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span className="tc-id" style={{ fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px' }}>
                            {st.id}
                          </span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--faint)' }}>
                            Group {st.group}
                          </span>
                          <StatusBadge status={st.status || 'pending'} />
                        </div>

                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', lineHeight: 1.5 }}>
                          {st.instruction}
                        </p>

                        {st.output && (
                          <div className="tr-out">
                            <span style={{ color: 'var(--faint)', display: 'block', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>
                              Output:
                            </span>
                            {st.output}
                          </div>
                        )}
                      </div>

                      <div className="tr-right">
                        <span className="m">
                          <Cpu size={12} />
                          {st.model || 'gemini-3.5-flash'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--faint)' }}>
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
