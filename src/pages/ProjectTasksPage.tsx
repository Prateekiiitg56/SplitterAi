import ProjectTabShell from './ProjectTabShell'
import { useApp } from '../context/AppContext'
import { ROLE_META, STATUS_META } from '../data'
import { CheckSquare, Clock, Cpu, FileText } from 'lucide-react'

export default function ProjectTasksPage() {
  const { subtasks, taskTitle } = useApp()

  return (
    <ProjectTabShell>
      <div className="flex-1 overflow-y-auto p-8 text-white space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-white tracking-tight flex items-center gap-2.5">
              <CheckSquare size={20} className="text-[#9D8CFC]" />
              <span>Project Subtasks & Execution Steps</span>
            </h2>
            <p className="text-[13px] text-neutral-400 mt-0.5">
              {taskTitle ? `Task: "${taskTitle}"` : 'Active plan subtask graph nodes.'}
            </p>
          </div>
          <span className="text-[12px] font-mono px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-neutral-300">
            {subtasks.length} Subtasks Configured
          </span>
        </div>

        {subtasks.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-12 text-center text-neutral-400 max-w-[600px] space-y-2">
            <Clock size={32} className="mx-auto opacity-30 text-neutral-400" />
            <h3 className="text-[15px] font-semibold text-white">No Subtasks Generated Yet</h3>
            <p className="text-[12.5px] text-neutral-500">
              Submit a task prompt from the Home page or run view to generate a parallel execution DAG.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {subtasks.map((st) => {
              const meta = ROLE_META[st.role] || { label: st.role, color: '#9D8CFC', bg: '#9D8CFC22' }
              const statusMeta = STATUS_META[st.status] || { label: st.status, color: '#9D8CFC', bg: '#9D8CFC22' }

              return (
                <div
                  key={st.id}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex items-start justify-between gap-4 hover:border-white/[0.14] transition-all"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-md text-white font-mono"
                        style={{ backgroundColor: meta.color }}
                      >
                        {st.id}
                      </span>
                      <span className="text-[11.5px] font-semibold text-neutral-300">Group {st.group}</span>
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded"
                        style={{ color: statusMeta.color, backgroundColor: statusMeta.bg }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <p className="text-[14px] font-medium text-white leading-relaxed">{st.instruction}</p>

                    {st.output && (
                      <div className="p-3 rounded-xl bg-[#101218] border border-white/10 text-[12px] font-mono text-neutral-300 max-h-[120px] overflow-y-auto">
                        <span className="text-neutral-500 block text-[10px] uppercase tracking-wider mb-1">Output:</span>
                        {st.output}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 text-[12px] font-mono text-neutral-400 flex-shrink-0">
                    <span className="flex items-center gap-1.5 text-indigo-300">
                      <Cpu size={13} />
                      {st.model || 'gemini-3.5-flash'}
                    </span>
                    <span className="flex items-center gap-1 text-neutral-500">
                      <FileText size={12} />
                      {st.steps || 0} steps
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ProjectTabShell>
  )
}
