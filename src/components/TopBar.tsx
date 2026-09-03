import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, Settings, User, Activity } from 'lucide-react'

interface TopBarProps {
  workspace?: string
  runStatus?: string
  multiMode?: boolean
  onToggleMulti?: () => void
  subtasks?: any[]
}

export default function TopBar({}: TopBarProps) {
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch (e) {
    // fallback
  }

  const location = useLocation()

  const getBreadcrumb = () => {
    const path = location.pathname
    if (path === '/') return { parent: 'Home', current: 'Console' }
    if (path === '/run') return { parent: 'Home', current: 'Run Execution' }
    if (path.startsWith('/agent/')) {
      const role = path.split('/').pop() ?? ''
      return { parent: 'Agents', current: role.charAt(0).toUpperCase() + role.slice(1) }
    }
    return { parent: 'Home', current: 'Console' }
  }

  const breadcrumb = getBreadcrumb()

  return (
    <header
      className="flex items-center justify-between flex-shrink-0 select-none"
      style={{
        height: 60,
        paddingLeft: 32,
        paddingRight: 32,
        borderBottom: '1px solid rgba(135,79,65,0.08)',
        background: 'rgba(251,233,208,0.6)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px]">
        <button
          onClick={() => navigate('/')}
          className="transition-colors cursor-pointer"
          style={{ color: '#90AEAD' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#874F41' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#90AEAD' }}
        >
          {breadcrumb.parent}
        </button>
        <span style={{ color: '#90AEAD', opacity: 0.5 }}>/</span>
        <span className="font-medium" style={{ color: '#244855' }}>{breadcrumb.current}</span>
      </nav>

      {/* Right */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-[12px]" style={{ color: '#90AEAD' }}>
          <Activity size={13} style={{ color: '#2E9E6E' }} />
          <span>All systems operational</span>
        </div>

        <button
          className="p-2 rounded-lg transition-all cursor-pointer"
          style={{ color: '#90AEAD' }}
          title="Notifications"
          onMouseEnter={(e) => { e.currentTarget.style.color = '#874F41'; e.currentTarget.style.background = 'rgba(36,72,85,0.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#90AEAD'; e.currentTarget.style.background = 'transparent' }}
        >
          <Bell size={16} />
        </button>

        <button
          className="p-2 rounded-lg transition-all cursor-pointer"
          style={{ color: '#90AEAD' }}
          title="Settings"
          onMouseEnter={(e) => { e.currentTarget.style.color = '#874F41'; e.currentTarget.style.background = 'rgba(36,72,85,0.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#90AEAD'; e.currentTarget.style.background = 'transparent' }}
        >
          <Settings size={16} />
        </button>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(36,72,85,0.08)', border: '1px solid rgba(135,79,65,0.1)' }}
        >
          <User size={14} style={{ color: '#90AEAD' }} />
        </div>
      </div>
    </header>
  )
}
