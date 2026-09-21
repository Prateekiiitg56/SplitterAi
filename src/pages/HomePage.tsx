import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Plug,
  Folder,
  Upload,
  Plus,
  Bot,
  Loader2,
} from 'lucide-react'
import { cx } from '../lib/cx'
import { useApp } from '../context/AppContext'
import { useIntegrations } from '../hooks/useIntegrations'
import { useCountUp, useMountedFill } from '../lib/useCountUp'
import { IdeCard, IdeProgress, SectionRow } from '../components/shell/IdeSurfaces'
import { StatusBadge } from '../components/Badges'
import { Button } from '../components/primitives/Button'
import { EmptyState } from '../components/primitives/EmptyState'
import type { SessionEntry } from '../types'

/**
 * HomePage — the workspace landing view, built from home.html.
 *
 * Every number on this page is derived from data the app already loads: the
 * sessions AppContext holds and the integrations useIntegrations fetches.
 * Nothing is sample data, and no new endpoint was introduced.
 *
 * This is the one page that owns its own scroll container — AppShell's content
 * wrapper stays overflow-hidden so that pages which manage their own internal
 * scrolling (Console, Flow) keep behaving exactly as they did before.
 */

/* ── Derivations ───────────────────────────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const RUNNING = new Set(['executing', 'planning'])

/** Folder name when the workspace is a path, else whatever identifies it. */
function projectName(session: SessionEntry): string {
  const fromWorkspace = (session.workspace || '').split(/[/\\]/).filter(Boolean).pop()
  return fromWorkspace || session.task || session.id
}

/**
 * Progress for a session. The backend sends `progress` for some sessions and
 * not others; when it's absent we fall back to the same status-derived
 * estimate ProjectsPage already uses (see its progressPct), so the two pages
 * can't disagree about the same project.
 */
function projectProgress(session: SessionEntry): number {
  if (typeof session.progress === 'number') {
    return Math.max(0, Math.min(100, session.progress))
  }
  if (session.status === 'done') return 100
  if (session.status === 'error') return 45
  if (session.status === 'idle') return 0
  return 78
}

function relativeTime(value?: string): string {
  if (!value) return ''
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ''

  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`

  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`
  if (hrs < 48) return 'Yesterday'

  return new Date(then).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function isToday(value?: string): boolean {
  if (!value) return false
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

/* ── Stat card ─────────────────────────────────────────────────────── */

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number
  sub: string
  tone?: 'accent' | 'bad'
  loading?: boolean
}

function StatCard({ icon, label, value, sub, tone, loading }: StatCardProps) {
  const shown = useCountUp(value)

  return (
    <IdeCard className="p-4 sm:p-5 h-full flex flex-col justify-between">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[var(--ide-text-dim)]">
          {icon}
          <span className="text-[11.5px] font-medium">{label}</span>
        </div>
        <div
          className={cx(
            'font-mono text-2xl font-semibold tabular-nums',
            tone === 'accent' && 'text-[var(--ide-accent)]',
            tone === 'bad' && 'text-[var(--ide-bad)]',
            !tone && 'text-[var(--ide-text-hi)]',
          )}
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin motion-reduce:animate-none" aria-label="Loading" />
          ) : (
            shown
          )}
        </div>
      </div>
      <div className="mt-2 text-[11px] text-[var(--ide-text-faint)] truncate">{sub}</div>
    </IdeCard>
  )
}

/* ── Recent project row ────────────────────────────────────────────── */

function RecentRow({ session, filled }: { session: SessionEntry; filled: boolean }) {
  const pct = projectProgress(session)
  const tone = session.status === 'done' ? 'good' : session.status === 'error' ? 'bad' : 'accent'
  const name = projectName(session)

  return (
    <Link
      to={`/projects/${session.id || 'default'}`}
      className="flex items-center gap-3 px-3.5 py-[11px] rounded-panel min-w-0
                 transition-colors duration-[var(--d-quick)] ease-standard
                 hover:bg-[var(--ide-raised)]"
    >
      <span
        aria-hidden="true"
        className="w-[30px] h-[30px] rounded-[7px] flex-shrink-0 inline-flex items-center justify-center
                   bg-[var(--ide-raised)] border border-[var(--ide-border)] text-[var(--ide-text-dim)]"
      >
        <Folder size={14} />
      </span>

      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[var(--ide-text-hi)] truncate">{name}</div>
        <div className="mt-px font-mono text-[10.5px] text-[var(--ide-text-faint)] truncate">
          {session.workspace || session.task}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3.5 flex-shrink-0">
        <StatusBadge status={session.status} size="sm" />
        <IdeProgress
          value={pct}
          tone={tone}
          from={filled ? undefined : 0}
          className="w-[90px] hidden sm:block"
          label={`${name} progress`}
        />
        <span className="text-[11px] text-[var(--ide-text-faint)] hidden md:block">
          {relativeTime(session.createdAt)}
        </span>
      </div>
    </Link>
  )
}

/* ── Quickstart ────────────────────────────────────────────────────── */

const QUICKSTART = [
  {
    to: '/projects',
    icon: Plus,
    title: 'New project',
    detail: 'Point agents at a fresh repo or workspace folder.',
  },
  {
    to: '/agents',
    icon: Bot,
    title: 'Launch an agent',
    detail: 'Run a single scoped worker without a full pipeline.',
  },
  {
    to: '/integrations',
    icon: Plug,
    title: 'Connect a tool',
    detail: 'Give agents access to GitHub, a database, or an MCP server.',
  },
] as const

/* ── Page ──────────────────────────────────────────────────────────── */

export default function HomePage() {
  const navigate = useNavigate()
  const { sessions, sessionsLoading } = useApp()
  const { integrations, loading: integrationsLoading } = useIntegrations()
  const filled = useMountedFill()

  const greeting = useMemo(() => getGreeting(), [])

  const stats = useMemo(() => {
    const running = sessions.filter((s) => RUNNING.has(s.status))
    const completedToday = sessions.filter((s) => s.status === 'done' && isToday(s.createdAt))
    const failed = sessions.filter((s) => s.status === 'error')
    const connected = integrations.filter((i) => i.status === 'connected')

    return {
      running,
      completedToday,
      failed,
      connected,
      subtasksToday: completedToday.reduce((sum, s) => sum + (s.subtaskCount || 0), 0),
    }
  }, [sessions, integrations])

  const recent = useMemo(() => {
    return [...sessions]
      .sort((a, b) => {
        const at = new Date(a.createdAt || 0).getTime()
        const bt = new Date(b.createdAt || 0).getTime()
        return (Number.isNaN(bt) ? 0 : bt) - (Number.isNaN(at) ? 0 : at)
      })
      .slice(0, 5)
  }, [sessions])

  const heroLine = sessionsLoading
    ? 'Loading your workspace…'
    : stats.running.length > 0
      ? `${stats.running.length} ${stats.running.length === 1 ? 'project is' : 'projects are'} running right now.`
      : sessions.length > 0
        ? 'Nothing is running. Pick up where you left off below.'
        : 'No projects yet — point an agent at a workspace to get started.'

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="w-full max-w-[1200px] mx-auto px-6 sm:px-8 py-5 sm:py-6">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--ide-text-hi)] mb-1.5">
              {greeting}, Prateek
            </h1>
            <p className="text-[12.5px] text-[var(--ide-text-dim)]">{heroLine}</p>
          </div>
          <div className="flex items-center gap-3.5 flex-shrink-0 ml-auto">
            {/* Import lives on Projects — that's where the zip-upload modal is. */}
            <Button
              variant="ghost"
              size="sm"
              icon={<Upload size={13} aria-hidden="true" />}
              onClick={() => navigate('/projects')}
            >
              Import
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={13} aria-hidden="true" />}
              onClick={() => navigate('/console')}
            >
              New project
            </Button>
          </div>
        </div>

        {/* ── Stats ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Zap size={13} aria-hidden="true" />}
            label="Running now"
            value={stats.running.length}
            tone="accent"
            loading={sessionsLoading && sessions.length === 0}
            sub={
              stats.running.length === 0
                ? 'All agents idle'
                : `across ${stats.running.length} ${stats.running.length === 1 ? 'workspace' : 'workspaces'}`
            }
          />
          <StatCard
            icon={<CheckCircle2 size={13} aria-hidden="true" />}
            label="Completed today"
            value={stats.completedToday.length}
            loading={sessionsLoading && sessions.length === 0}
            sub={
              stats.subtasksToday > 0 ? `${stats.subtasksToday} subtasks total` : 'No runs finished yet'
            }
          />
          <StatCard
            icon={<AlertTriangle size={13} aria-hidden="true" />}
            label="Needs attention"
            value={stats.failed.length}
            tone={stats.failed.length > 0 ? 'bad' : undefined}
            loading={sessionsLoading && sessions.length === 0}
            sub={
              stats.failed.length === 0
                ? 'Nothing failing'
                : `${projectName(stats.failed[0])} · failed`
            }
          />
          <StatCard
            icon={<Plug size={13} aria-hidden="true" />}
            label="Integrations"
            value={stats.connected.length}
            loading={integrationsLoading && integrations.length === 0}
            sub={
              stats.connected.length === 0
                ? 'None connected'
                : stats.connected
                    .slice(0, 2)
                    .map((i) => i.name)
                    .join(', ')
            }
          />
        </div>

        {/* ── Recent projects ──────────────────────────────────────── */}
        <SectionRow
          title="Recent projects"
          action={sessions.length > 0 ? { label: 'View all', to: '/projects' } : undefined}
        />

        <div className="flex flex-col gap-1.5">
          {sessionsLoading && sessions.length === 0 && (
            <div className="flex items-center gap-2 px-3.5 py-[11px] text-[12.5px] text-[var(--ide-text-dim)]">
              <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Loading projects…
            </div>
          )}

          {!sessionsLoading && recent.length === 0 && (
            <IdeCard>
              <EmptyState
                className="py-9 px-6 gap-2.5"
                icon={<Folder size={26} aria-hidden="true" />}
                title="No projects yet"
                detail="Start a run from the Console and it will show up here with its live progress."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus size={13} aria-hidden="true" />}
                    onClick={() => navigate('/console')}
                  >
                    New project
                  </Button>
                }
              />
            </IdeCard>
          )}

          {recent.map((session) => (
            <RecentRow key={session.id} session={session} filled={filled} />
          ))}
        </div>

        {/* ── Quickstart ───────────────────────────────────────────── */}
        <SectionRow title="Start something new" className="mt-8" />

        <div className="grid grid-cols-1 min-[900px]:grid-cols-3 gap-4">
          {QUICKSTART.map(({ to, icon: Icon, title, detail }) => (
            <Link key={to} to={to} className="rounded-panel h-full">
              <IdeCard interactive className="p-4 sm:p-5 h-full flex flex-col justify-between">
                <div>
                  <Icon size={18} className="text-[var(--ide-accent)] mb-3" aria-hidden="true" />
                  <div className="text-[13px] font-semibold text-[var(--ide-text-hi)] mb-1.5">
                    {title}
                  </div>
                  <div className="text-[11.5px] leading-[1.55] text-[var(--ide-text-dim)]">{detail}</div>
                </div>
              </IdeCard>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
