import { useNavigate, useLocation } from 'react-router-dom'
import type { SessionEntry } from '../types'

interface SidebarProps {
  collapsed?: boolean
  sessions?: SessionEntry[]
  selectedSession: string
  onSelectSession: (id: string) => void
  workspace?: string
  currentPath: string
  onToggleCollapse?: () => void
}

export default function Sidebar({
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  const isRouteActive = (path: string) => {
    if (path === '/console') return location.pathname === '/console' || location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Primary navigation">
      <div className="sidebar-head">
        <a className="brand" onClick={() => navigate('/welcome')} aria-label="SplitterAI home">
          <span className="brand-mark">S</span>
          {!collapsed && <span className="brand-word">SplitterAI</span>}
        </a>
        {onToggleCollapse && (
          <button className="icon-btn" onClick={onToggleCollapse} aria-label="Toggle sidebar">
            <svg className="icon"><use href="#i-panel-left" /></svg>
          </button>
        )}
      </div>

      {!collapsed && (
        <button className="side-search" type="button" onClick={handleOpenCommandPalette}>
          <svg className="icon"><use href="#i-search" /></svg>
          <span>Search…</span>
          <kbd>⌘K</kbd>
        </button>
      )}

      <nav className="side-nav">
        <div className="side-group">
          <button
            type="button"
            className={`nav-item ${isRouteActive('/agents') ? 'active' : ''}`}
            onClick={() => navigate('/agents')}
          >
            <svg className="icon"><use href="#i-bot" /></svg>
            <span>Agents</span>
          </button>
          <button
            type="button"
            className={`nav-item ${isRouteActive('/console') ? 'active' : ''}`}
            onClick={() => navigate('/console')}
          >
            <svg className="icon"><use href="#i-home" /></svg>
            <span>Home</span>
          </button>
        </div>

        <div className="side-group">
          <div className="side-group-label">Workspace</div>
          <button
            type="button"
            className={`nav-item ${isRouteActive('/projects') ? 'active' : ''}`}
            onClick={() => navigate('/projects')}
          >
            <svg className="icon"><use href="#i-folder" /></svg>
            <span>Projects</span>
          </button>
          <button
            type="button"
            className={`nav-item ${isRouteActive('/flow') ? 'active' : ''}`}
            onClick={() => navigate('/flow')}
          >
            <svg className="icon"><use href="#i-repeat" /></svg>
            <span>Workflow</span>
          </button>
        </div>

        <div className="side-group">
          <div className="side-group-label">Connect</div>
          <button
            type="button"
            className={`nav-item ${isRouteActive('/integrations') ? 'active' : ''}`}
            onClick={() => navigate('/integrations')}
          >
            <svg className="icon"><use href="#i-grid" /></svg>
            <span>Apps</span>
          </button>
        </div>
      </nav>

      <div className="sidebar-foot">
        <div className="avatar-ring">
          <div className="avatar-ring-inner">PS</div>
        </div>
        {!collapsed && (
          <>
            <div className="foot-id">
              <div className="name">Prateek Singh</div>
              <div className="mail">prateek@workspace.dev</div>
            </div>
            <button className="icon-btn foot-more" aria-label="Account menu">
              <svg className="icon"><use href="#i-chevron-right" /></svg>
            </button>
          </>
        )}
      </div>
    </aside>
  )
}