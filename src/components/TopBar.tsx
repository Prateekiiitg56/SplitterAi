import { useLocation, useNavigate } from 'react-router-dom'

interface TopBarProps {
  workspace?: string
  runStatus?: string
  multiMode?: boolean
  onToggleMulti?: () => void
  subtasks?: any[]
}

export default function TopBar({ workspace = 'D:/projects/webapp' }: TopBarProps) {
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch (e) { /* fallback */ }

  const location = useLocation()
  const getBreadcrumb = () => {
    const path = location.pathname
    if (path === '/') return { parent: 'SplitterAi', current: 'Home' }
    if (path === '/run') return { parent: 'SplitterAi', current: 'Runs' }
    if (path.startsWith('/agent/')) {
      const role = path.split('/').pop() ?? ''
      return { parent: 'Agents', current: role.charAt(0).toUpperCase() + role.slice(1) }
    }
    return { parent: 'SplitterAi', current: 'Home' }
  }
  const breadcrumb = getBreadcrumb()

  /* TopBar is now invisible on Home — breadcrumb is inline in the page.
     On sub-pages it renders a thin breadcrumb-only header. */
  if (location.pathname === '/') return null

  return (
    <header
      className="flex items-center h-12 px-6 flex-shrink-0 border-b"
      style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
    >
      <nav className="text-[13px]" style={{ color: 'var(--color-text-2)' }}>
        <span className="cursor-pointer hover:underline" onClick={() => navigate('/')}>
          {breadcrumb.parent}
        </span>
        <span className="mx-1.5" style={{ color: 'var(--color-text-3)' }}>/</span>
        <span style={{ color: 'var(--color-text-1)', fontWeight: 500 }}>{breadcrumb.current}</span>
      </nav>
    </header>
  )
}
