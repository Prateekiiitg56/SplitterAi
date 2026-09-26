import { Folder, Terminal, Workflow, Plug, Loader2 } from 'lucide-react'
import { ExplorerSection, ExplorerRow } from './ExplorerSidebar'
import { AgentIcon } from '../Badges'
import { useApp } from '../../context/AppContext'
import { ROLE_META } from '../../data'
import type { AgentRole, SessionEntry } from '../../types'

/**
 * ShellExplorer — decides what the Explorer rail shows for the current route.
 *
 * Rule of the redesign: the tree is never sample data. Everything below comes
 * out of AppContext and ROLE_META, i.e. the same sources the content pane uses.
 *
 * Right now one tree serves every route. As each page is converted, add its
 * branch here and give it a tree built from that page's own data (subtasks for
 * the project workspace, the file tree for Files, and so on) — the container in
 * ExplorerSidebar stays untouched.
 */

/** Folder name if the workspace is a path, otherwise whatever identifies it. */
function projectLabel(session: SessionEntry): string {
  const fromWorkspace = (session.workspace || '').split(/[/\\]/).filter(Boolean).pop()
  // "." (the repo root) says nothing; fall back to the task text.
  return (fromWorkspace && fromWorkspace !== '.' ? fromWorkspace : '') || session.task || session.id
}

const AGENT_ROLES: AgentRole[] = ['planner', 'coder', 'auditor', 'tester']

export function ShellExplorer({ pathname }: { pathname: string }) {
  const { sessions, sessionsLoading, sessionsError } = useApp()

  const recent = sessions.slice(0, 6)

  return (
    <>
      <ExplorerSection label="Recent" count={sessions.length}>
        {sessionsLoading && recent.length === 0 && (
          <ExplorerRow
            icon={<Loader2 size={14} className="animate-spin motion-reduce:animate-none" />}
            label="Loading projects…"
          />
        )}
        {!sessionsLoading && recent.length === 0 && (
          <ExplorerRow
            to="/projects"
            icon={<Folder size={14} />}
            label={sessionsError ? "Couldn't load projects" : 'No projects yet'}
            title={sessionsError ?? undefined}
          />
        )}
        {recent.map((session) => {
          const to = `/projects/${session.id || 'default'}`
          return (
            <ExplorerRow
              key={session.id}
              to={to}
              icon={<Folder size={14} />}
              label={projectLabel(session)}
              title={session.workspace || session.task}
              status={session.status}
              active={pathname.startsWith(to)}
            />
          )
        })}
      </ExplorerSection>

      <ExplorerSection label="Agents" count={AGENT_ROLES.length}>
        {AGENT_ROLES.map((role) => {
          const to = `/agent/${role}`
          return (
            <ExplorerRow
              key={role}
              to={to}
              icon={<AgentIcon role={role} size={14} />}
              label={ROLE_META[role].label}
              title={ROLE_META[role].desc}
              active={pathname === to}
            />
          )
        })}
      </ExplorerSection>

      <ExplorerSection label="Shortcuts" defaultOpen={false}>
        <ExplorerRow
          to="/console"
          icon={<Terminal size={14} />}
          label="Console"
          active={pathname === '/console'}
        />
        <ExplorerRow
          to="/flow"
          icon={<Workflow size={14} />}
          label="Workflow"
          active={pathname === '/flow'}
        />
        <ExplorerRow
          to="/integrations"
          icon={<Plug size={14} />}
          label="Integrations"
          active={pathname === '/integrations'}
        />
      </ExplorerSection>
    </>
  )
}
