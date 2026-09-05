import ProjectTabShell from './ProjectTabShell'
import { ROLE_META } from '../data'
import type { AgentRole } from '../types'
import { useNavigate } from 'react-router-dom'
import { Users, ArrowRight, ShieldCheck, Code, Cpu, TestTube } from 'lucide-react'

export default function ProjectAgentsPage() {
  const navigate = useNavigate()

  const projectAgents: { role: AgentRole; name: string; desc: string; icon: any }[] = [
    { role: 'planner', name: 'Task Planner Agent', desc: 'Decomposes complex user prompt into DAG workflow subtasks', icon: Cpu },
    { role: 'coder', name: 'Python/JS Coder Agent', desc: 'Executes sandboxed file operations and writes codebase logic', icon: Code },
    { role: 'auditor', name: 'Code Quality & Audit Agent', desc: 'Audits code changes for PEP 8 and OWASP security compliance', icon: ShieldCheck },
    { role: 'tester', name: 'Testing & Verification Agent', desc: 'Writes unit tests and runs verification suites', icon: TestTube },
  ]

  return (
    <ProjectTabShell>
      <div className="flex-1 overflow-y-auto p-8 text-[var(--text)] space-y-6">
        <div>
          <h2 className="text-[20px] font-bold text-[var(--text)] tracking-tight flex items-center gap-2.5">
            <Users size={20} className="text-[var(--accent)]" />
            <span>Assigned Project Agents</span>
          </h2>
          <p className="text-[13px] text-[var(--dim)] mt-0.5">
            Worker agents configured for this workspace project.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {projectAgents.map((a) => {
            const meta = ROLE_META[a.role]
            return (
              <div
                key={a.role}
                className="rounded-panel border border-[var(--border-soft)] bg-[var(--panel)] p-6 flex flex-col justify-between gap-5 hover:border-[var(--border)] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-control flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: `${meta.color}22` }}
                  >
                    <a.icon size={20} style={{ color: meta.color }} />
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[var(--good-quiet)] text-[var(--good)] border border-[var(--good-quiet)]">
                    Ready
                  </span>
                </div>

                <div>
                  <h3 className="text-[16px] font-bold text-[var(--text)]">{a.name}</h3>
                  <p className="text-[13px] text-[var(--dim)] mt-1 leading-relaxed">{a.desc}</p>
                </div>

                <button
                  onClick={() => navigate(`/agents/${a.role}`)}
                  className="flex items-center justify-between pt-4 border-t border-[var(--border-soft)] text-[13px] font-semibold text-[var(--accent)] hover:brightness-110 transition-colors cursor-pointer"
                >
                  <span>Open Agent Workspace</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </ProjectTabShell>
  )
}
