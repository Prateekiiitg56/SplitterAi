import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import {
  House,
  TerminalWindow,
  FolderSimple,
  Robot,
  Network,
  PlugsConnected,
  Sparkle,
  Play,
  Layout,
  CheckSquareOffset,
  UsersThree,
  TreeStructure,
  GitBranch,
} from '@phosphor-icons/react'

/**
 * shellNav — the single source of truth for the shell's navigation model.
 */

export type ShellIcon = ComponentType<IconProps>

export interface ActivityItem {
  to: string
  label: string
  icon: ShellIcon
  /** Any pathname starting with one of these marks the item active. */
  matches: string[]
}

export const ACTIVITY_ITEMS: ActivityItem[] = [
  { to: '/home', label: 'Home', icon: House, matches: ['/home'] },
  { to: '/console', label: 'Workspace', icon: TerminalWindow, matches: ['/console'] },
  { to: '/projects', label: 'Projects', icon: FolderSimple, matches: ['/projects', '/run'] },
  { to: '/agents', label: 'AI Agents', icon: Robot, matches: ['/agents', '/agent/'] },
  { to: '/flow', label: 'Workflow Map', icon: Network, matches: ['/flow'] },
  { to: '/integrations', label: 'Connected Tools', icon: PlugsConnected, matches: ['/integrations'] },
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
  overview: { label: 'Overview', icon: Layout },
  flow: { label: 'Workflow Map', icon: Network },
  tasks: { label: 'Tasks', icon: CheckSquareOffset },
  agents: { label: 'AI Agents', icon: UsersThree },
  files: { label: 'Files', icon: TreeStructure },
  activity: { label: 'Activity', icon: GitBranch },
}

/**
 * Derives the tab + breadcrumb for a pathname. Unknown routes fall back to a
 * neutral SplitterAI tab rather than rendering an empty strip.
 */
export function getShellChrome(pathname: string): ShellChrome {
  const parts = pathname.split('/').filter(Boolean)

  if (parts.length === 0 || parts[0] === 'home') {
    return { label: 'Welcome', icon: Sparkle, crumbs: ['SplitterAI', 'Home'] }
  }

  if (parts[0] === 'console') {
    return { label: 'Workspace', icon: TerminalWindow, crumbs: ['SplitterAI', 'Workspace'] }
  }

  if (parts[0] === 'projects') {
    if (parts.length === 1) {
      return { label: 'Projects', icon: FolderSimple, crumbs: ['SplitterAI', 'Projects'] }
    }
    const projectId = parts[1]
    const sub = parts[2] ?? 'overview'
    const meta = PROJECT_TAB_LABELS[sub] ?? { label: sub, icon: FolderSimple }
    return {
      label: projectId,
      icon: FolderSimple,
      crumbs: ['SplitterAI', 'Projects', projectId, meta.label],
    }
  }

  if (parts[0] === 'agents') {
    if (parts.length === 1) {
      return { label: 'AI Agents', icon: Robot, crumbs: ['SplitterAI', 'AI Agents'] }
    }
    return { label: parts[1], icon: Robot, crumbs: ['SplitterAI', 'AI Agents', parts[1]] }
  }

  if (parts[0] === 'agent') {
    const role = parts[1] ?? 'agent'
    return { label: role, icon: Robot, crumbs: ['SplitterAI', 'Agents', role] }
  }

  if (parts[0] === 'flow') {
    return { label: 'Workflow Map', icon: Network, crumbs: ['SplitterAI', 'Workflow Map'] }
  }

  if (parts[0] === 'integrations') {
    return { label: 'Connected Tools', icon: PlugsConnected, crumbs: ['SplitterAI', 'Connected Tools'] }
  }

  if (parts[0] === 'run') {
    return { label: 'Run', icon: Play, crumbs: ['SplitterAI', 'Run'] }
  }

  return { label: parts[parts.length - 1], icon: Sparkle, crumbs: ['SplitterAI', ...parts] }
}
