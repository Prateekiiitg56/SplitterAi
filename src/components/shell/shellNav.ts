import type { ComponentType } from 'react'
import {
  Home,
  Terminal,
  Folder,
  Bot,
  Workflow,
  Plug,
  Sparkles,
  Play,
  LayoutDashboard,
  CheckSquare,
  Users,
  FolderTree,
  GitBranch,
} from 'lucide-react'

/**
 * shellNav — the single source of truth for the shell's navigation model.
 *
 * Two things live here so no component has to guess:
 *   1. ACTIVITY_ITEMS — what the activity bar shows, and which routes count as
 *      "active" for each entry. Every route the router already serves is
 *      reachable from here, so nothing that worked before becomes orphaned.
 *   2. getShellChrome() — derives the editor tab and the breadcrumb from a
 *      pathname. Pure function, no state, so the chrome can never drift out of
 *      sync with the route.
 */

/** Minimal shape shared by every lucide icon — avoids depending on a type name. */
export type ShellIcon = ComponentType<{ size?: number | string; className?: string }>

export interface ActivityItem {
  to: string
  label: string
  icon: ShellIcon
  /** Any pathname starting with one of these marks the item active. */
  matches: string[]
}

export const ACTIVITY_ITEMS: ActivityItem[] = [
  { to: '/home', label: 'Home', icon: Home, matches: ['/home'] },
  { to: '/console', label: 'Console', icon: Terminal, matches: ['/console'] },
  { to: '/projects', label: 'Projects', icon: Folder, matches: ['/projects', '/run'] },
  { to: '/agents', label: 'Agents', icon: Bot, matches: ['/agents', '/agent/'] },
  { to: '/flow', label: 'Workflow', icon: Workflow, matches: ['/flow'] },
  { to: '/integrations', label: 'Integrations', icon: Plug, matches: ['/integrations'] },
]

export function isActivityItemActive(item: ActivityItem, pathname: string): boolean {
  return item.matches.some((m) => pathname === m || pathname.startsWith(m))
}

export interface ShellChrome {
  /** Editor tab label. */
  label: string
  /** Editor tab icon. */
  icon: ShellIcon
  /** Breadcrumb segments, root first. */
  crumbs: string[]
}

const PROJECT_TAB_LABELS: Record<string, { label: string; icon: ShellIcon }> = {
  overview: { label: 'Overview', icon: LayoutDashboard },
  flow: { label: 'Flow', icon: Workflow },
  tasks: { label: 'Tasks', icon: CheckSquare },
  agents: { label: 'Agents', icon: Users },
  files: { label: 'Files', icon: FolderTree },
  activity: { label: 'Activity', icon: GitBranch },
}

/**
 * Derives the tab + breadcrumb for a pathname. Unknown routes fall back to a
 * neutral SplitterAI tab rather than rendering an empty strip.
 */
export function getShellChrome(pathname: string): ShellChrome {
  const parts = pathname.split('/').filter(Boolean)

  if (parts.length === 0 || parts[0] === 'home') {
    return { label: 'Welcome', icon: Sparkles, crumbs: ['SplitterAI', 'Home'] }
  }

  if (parts[0] === 'console') {
    return { label: 'Console', icon: Terminal, crumbs: ['SplitterAI', 'Console'] }
  }

  if (parts[0] === 'projects') {
    if (parts.length === 1) {
      return { label: 'Projects', icon: Folder, crumbs: ['SplitterAI', 'Projects'] }
    }
    const projectId = parts[1]
    const sub = parts[2] ?? 'overview'
    const meta = PROJECT_TAB_LABELS[sub] ?? { label: sub, icon: Folder }
    return {
      label: projectId,
      icon: Folder,
      crumbs: ['SplitterAI', 'Projects', projectId, meta.label],
    }
  }

  if (parts[0] === 'agents') {
    if (parts.length === 1) {
      return { label: 'Agents', icon: Bot, crumbs: ['SplitterAI', 'Agents'] }
    }
    return { label: parts[1], icon: Bot, crumbs: ['SplitterAI', 'Agents', parts[1]] }
  }

  if (parts[0] === 'agent') {
    const role = parts[1] ?? 'agent'
    return { label: role, icon: Bot, crumbs: ['SplitterAI', 'Agents', role] }
  }

  if (parts[0] === 'flow') {
    return { label: 'Flow', icon: Workflow, crumbs: ['SplitterAI', 'Workflow'] }
  }

  if (parts[0] === 'integrations') {
    return { label: 'Integrations', icon: Plug, crumbs: ['SplitterAI', 'Integrations'] }
  }

  if (parts[0] === 'run') {
    return { label: 'Run', icon: Play, crumbs: ['SplitterAI', 'Run'] }
  }

  return { label: parts[parts.length - 1], icon: Sparkles, crumbs: ['SplitterAI', ...parts] }
}
