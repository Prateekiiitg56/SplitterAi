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
      <div className="flex-1 overflow-y-auto p-8 text-white space-y-6">
        <div>
          <h2 className="text-[20px] font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users size={20} className="text-[#9D8CFC]" />
            <span>Assigned Project Agents</span>
          </h2>
          <p className="text-[13px] text-neutral-400 mt-0.5">
            Worker agents configured for this workspace project.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {projectAgents.map((a) => {
            const meta = ROLE_META[a.role]
            return (
              <div
                key={a.role}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col justify-between gap-5 hover:border-white/[0.14] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: `${meta.color}22` }}
                  >
                    <a.icon size={20} style={{ color: meta.color }} />
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                    Ready
                  </span>
                </div>

                <div>
                  <h3 className="text-[16px] font-bold text-white">{a.name}</h3>
                  <p className="text-[13px] text-neutral-400 mt-1 leading-relaxed">{a.desc}</p>
                </div>

                <button
                  onClick={() => navigate(`/agents/${a.role}`)}
                  className="flex items-center justify-between pt-4 border-t border-white/[0.06] text-[13px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
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
