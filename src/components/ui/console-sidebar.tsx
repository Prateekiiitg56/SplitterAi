import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { animate, stagger, createTimeline } from 'animejs'
import {
  Plus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  ArrowUpRight,
  Menu,
  X,
  RefreshCw,
  MessageSquare,
} from 'lucide-react'
import { ACTIVITY_ITEMS, isActivityItemActive } from '../shell/shellNav'
import { StatusDot } from '../Badges'
import { cx } from '../../lib/cx'
import type { SessionEntry } from '../../types'

/* ── Constants ──────────────────────────────────────────────────── */

const GITHUB_URL = 'https://github.com/Prateekiiitg56/SplitterAi'
const SIDEBAR_W = 210
const RAIL_W = 64

/* ── Date grouping ──────────────────────────────────────────────── */

type DateGroup = 'Today' | 'Yesterday' | 'Previous 7 days' | 'Older'

function getDateGroup(dateStr: string): DateGroup {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'Older'
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)

  if (d >= today) return 'Today'
  if (d >= yesterday) return 'Yesterday'
  if (d >= weekAgo) return 'Previous 7 days'
  return 'Older'
}

const GROUP_ORDER: DateGroup[] = ['Today', 'Yesterday', 'Previous 7 days', 'Older']

/* ── Anime.js button hover hook ─────────────────────────────────── */

function useAnimeButtonHover(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const enter = () => {
      animate(el, {
        scale: 1.04,
        duration: 180,
        ease: 'outExpo',
      })
    }
    const leave = () => {
      animate(el, {
        scale: 1,
        duration: 250,
        ease: 'outExpo',
      })
    }
    const down = () => {
      animate(el, {
        scale: 0.96,
        duration: 100,
        ease: 'inOutQuad',
      })
    }
    const up = () => {
      animate(el, {
        scale: 1.04,
        duration: 150,
        ease: 'outExpo',
      })
    }

    el.addEventListener('mouseenter', enter)
    el.addEventListener('mouseleave', leave)
    el.addEventListener('mousedown', down)
    el.addEventListener('mouseup', up)
    return () => {
      el.removeEventListener('mouseenter', enter)
      el.removeEventListener('mouseleave', leave)
      el.removeEventListener('mousedown', down)
      el.removeEventListener('mouseup', up)
    }
  }, [ref])
}

/* ── Props ──────────────────────────────────────────────────────── */

interface ConsoleSidebarProps {
  sessions: SessionEntry[]
  sessionsLoading: boolean
  onRefreshSessions: () => void
  onNewSession: () => void
  onOpenDownload: () => void
  activeSessionId?: string
}

/* ── Component ──────────────────────────────────────────────────── */

export default function ConsoleSidebar({
  sessions,
  sessionsLoading,
  onRefreshSessions,
  onNewSession,
  onOpenDownload,
  activeSessionId,
}: ConsoleSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  /* Refs for anime.js */
  const sidebarRef = useRef<HTMLElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const navListRef = useRef<HTMLElement>(null)
  const sessionListRef = useRef<HTMLDivElement>(null)
  const newSessionBtnRef = useRef<HTMLButtonElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  /* Button hover animations */
  useAnimeButtonHover(newSessionBtnRef)
  useAnimeButtonHover(hamburgerRef)

  /* ── Sidebar collapse animation ───────────────────────────────── */
  useEffect(() => {
    const el = sidebarRef.current
    if (!el) return

    animate(el, {
      width: collapsed ? RAIL_W : SIDEBAR_W,
      duration: 280,
      ease: 'outExpo',
    })
  }, [collapsed])

  /* ── Stagger nav items on mount ───────────────────────────────── */
  useEffect(() => {
    const nav = navListRef.current
    if (!nav) return

    const items = nav.querySelectorAll('[data-nav-item]')
    if (items.length === 0) return

    animate(items, {
      opacity: [0, 1],
      translateX: [-12, 0],
      duration: 350,
      ease: 'outExpo',
      delay: stagger(40, { start: 100 }),
    })
  }, [collapsed]) // Re-trigger when switching from rail to full

  /* ── Stagger session items when they change ───────────────────── */
  useEffect(() => {
    const list = sessionListRef.current
    if (!list || collapsed) return

    const items = list.querySelectorAll('[data-session-row]')
    if (items.length === 0) return

    animate(items, {
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 300,
      ease: 'outQuad',
      delay: stagger(25, { start: 60 }),
    })
  }, [sessions, searchQuery, collapsed])

  /* ── Mobile drawer animation ──────────────────────────────────── */
  const openMobileDrawer = useCallback(() => {
    setMobileOpen(true)
    // Wait for React to render, then animate
    requestAnimationFrame(() => {
      const drawer = drawerRef.current
      const scrim = scrimRef.current
      if (!drawer || !scrim) return

      const tl = createTimeline({ defaults: { ease: 'outExpo' } })
      tl.add(scrim, {
        opacity: [0, 1],
        duration: 250,
      }, 0)
      tl.add(drawer, {
        translateX: [-SIDEBAR_W, 0],
        duration: 380,
      }, 0)

      // Stagger nav items inside drawer
      const navItems = drawer.querySelectorAll('[data-nav-item]')
      if (navItems.length > 0) {
        tl.add(navItems, {
          opacity: [0, 1],
          translateX: [-16, 0],
          duration: 300,
          delay: stagger(35),
        }, 120)
      }
    })
  }, [])

  const closeMobileDrawer = useCallback(() => {
    const drawer = drawerRef.current
    const scrim = scrimRef.current
    if (!drawer || !scrim) {
      setMobileOpen(false)
      return
    }

    const tl = createTimeline({
      defaults: { ease: 'inQuad' },
      onComplete: () => setMobileOpen(false),
    })
    tl.add(drawer, {
      translateX: [0, -SIDEBAR_W],
      duration: 250,
    }, 0)
    tl.add(scrim, {
      opacity: [1, 0],
      duration: 200,
    }, 50)
  }, [])

  /* Close mobile drawer on Esc */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) closeMobileDrawer()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mobileOpen, closeMobileDrawer])

  /* Filtered + grouped sessions */
  const grouped = useMemo(() => {
    const q = searchQuery.toLowerCase()
    const filtered = q
      ? sessions.filter((s) => (s.task || '').toLowerCase().includes(q))
      : sessions

    const map = new Map<DateGroup, SessionEntry[]>()
    for (const s of filtered) {
      const g = getDateGroup(s.createdAt)
      const list = map.get(g) || []
      list.push(s)
      map.set(g, list)
    }
    return map
  }, [sessions, searchQuery])

  const handleNavClick = useCallback((to: string, el?: HTMLElement) => {
    /* Animate the clicked nav item with a quick pulse */
    if (el) {
      animate(el, {
        scale: [1, 0.95, 1],
        duration: 200,
        ease: 'inOutQuad',
      })
    }
    navigate(to)
    if (mobileOpen) closeMobileDrawer()
  }, [navigate, mobileOpen, closeMobileDrawer])

  /* ── Refresh spin animation ───────────────────────────────────── */
  const handleRefresh = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget
    animate(btn.querySelector('svg')!, {
      rotate: [0, 360],
      duration: 600,
      ease: 'outExpo',
    })
    onRefreshSessions()
  }, [onRefreshSessions])

  /* ── New session button pulse ─────────────────────────────────── */
  const handleNewSession = useCallback(() => {
    const btn = newSessionBtnRef.current
    if (btn) {
      animate(btn, {
        scale: [1, 0.92, 1.05, 1],
        duration: 350,
        ease: 'outExpo',
      })
    }
    onNewSession()
  }, [onNewSession])

  /* ── Sidebar content renderer ─────────────────────────────────── */
  const isRail = collapsed

  function renderContent(inDrawer = false) {
    const showFull = inDrawer || !collapsed

    return (
      <div className="flex flex-col h-full select-none">
        {/* Logo + collapse */}
        <div className={cx(
          'flex items-center border-b border-white/[0.06] shrink-0',
          showFull ? 'gap-3 px-4 py-3.5' : 'flex-col gap-2 px-2 py-3.5',
        )}>
          <img
            src="/splitterai-logo.png"
            alt="SplitterAI"
            className="h-7 w-7 object-contain shrink-0"
          />
          {showFull && (
            <span className="font-semibold text-[13px] text-white/90 tracking-tight flex-1 whitespace-nowrap overflow-hidden">
              SplitterAI
            </span>
          )}
          {!inDrawer && (
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
          {inDrawer && (
            <button
              type="button"
              onClick={closeMobileDrawer}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* New session */}
        <div className={cx('shrink-0', showFull ? 'px-3 pt-3 pb-1' : 'px-2 pt-3 pb-1')}>
          <button
            ref={inDrawer ? undefined : newSessionBtnRef}
            type="button"
            onClick={handleNewSession}
            className={cx(
              'flex items-center justify-center gap-2 rounded-full font-semibold transition-colors cursor-pointer',
              'bg-[#1488fc] text-white hover:brightness-110',
              showFull ? 'w-full h-9 text-[12.5px] px-4' : 'w-10 h-10 mx-auto',
            )}
            aria-label="New session"
            style={{ willChange: 'transform' }}
          >
            <Plus size={15} />
            {showFull && <span>New session</span>}
          </button>
        </div>

        {/* Search */}
        {showFull && (
          <div className="px-3 pt-2 pb-1 shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions…"
                className="w-full h-8 rounded-full bg-white/[0.05] border border-white/[0.08] pl-8 pr-3 text-[12px] text-white/80 placeholder:text-white/25 outline-none focus:border-[#1488fc]/50 focus:bg-white/[0.07] transition-colors"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav
          ref={inDrawer ? undefined : navListRef}
          className={cx(
            'shrink-0 border-b border-white/[0.06]',
            showFull ? 'px-2 py-2' : 'px-1.5 py-2',
          )}
        >
          {ACTIVITY_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActivityItemActive(item, location.pathname)
            return (
              <button
                key={item.to}
                data-nav-item
                type="button"
                onClick={(e) => handleNavClick(item.to, e.currentTarget)}
                className={cx(
                  'flex items-center gap-2.5 rounded-lg transition-colors w-full cursor-pointer',
                  showFull ? 'px-3 py-2 text-[12.5px]' : 'px-0 py-2 justify-center',
                  active
                    ? 'bg-white/[0.08] text-white font-medium'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]',
                )}
                title={collapsed && !inDrawer ? item.label : undefined}
                aria-label={item.label}
                style={{ willChange: 'transform, opacity' }}
              >
                <Icon size={16} className="shrink-0" />
                {showFull && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Session history */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {showFull ? (
            <div ref={inDrawer ? undefined : sessionListRef} className="px-2 py-2">
              {/* Header */}
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-white/35">
                  History
                </span>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="p-1 rounded text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                  aria-label="Refresh sessions"
                  title="Refresh"
                >
                  <RefreshCw size={11} />
                </button>
              </div>

              {sessions.length === 0 && !sessionsLoading && (
                <p className="px-2 py-6 text-center text-[11px] text-white/25">
                  Your sessions will appear here.
                </p>
              )}

              {sessionsLoading && sessions.length === 0 && (
                <p className="px-2 py-6 text-center text-[11px] text-white/25">
                  Loading…
                </p>
              )}

              {GROUP_ORDER.map((group) => {
                const items = grouped.get(group)
                if (!items || items.length === 0) return null
                return (
                  <div key={group} className="mb-1.5">
                    <span className="block px-2 py-1 text-[10px] font-medium text-white/25 uppercase tracking-wider">
                      {group}
                    </span>
                    {items.map((session) => {
                      const isActive = activeSessionId === session.id
                      return (
                        <button
                          key={session.id}
                          data-session-row
                          type="button"
                          onClick={(e) => {
                            /* Animate click feedback */
                            animate(e.currentTarget, {
                              scale: [1, 0.97, 1],
                              duration: 200,
                              ease: 'inOutQuad',
                            })
                            navigate(`/projects/${session.id}`)
                            if (mobileOpen) closeMobileDrawer()
                          }}
                          className={cx(
                            'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-left transition-colors group relative cursor-pointer',
                            isActive
                              ? 'bg-white/[0.08] text-white'
                              : 'text-white/55 hover:text-white/80 hover:bg-white/[0.04]',
                          )}
                          style={{ willChange: 'transform, opacity' }}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full bg-[#1488fc]" />
                          )}
                          <MessageSquare size={13} className="shrink-0 opacity-50" />
                          <span className="truncate text-[11.5px] flex-1">
                            {session.task || 'Untitled session'}
                          </span>
                          <StatusDot status={session.status} announce={false} />
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Rail mode: just show count */
            <div className="flex flex-col items-center py-3 gap-1">
              <MessageSquare size={16} className="text-white/30" />
              <span className="text-[9px] text-white/30 font-mono">{sessions.length}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cx(
          'shrink-0 border-t border-white/[0.06]',
          showFull ? 'px-3 py-3 space-y-1.5' : 'px-2 py-3 flex flex-col items-center gap-2',
        )}>
          <button
            type="button"
            onClick={onOpenDownload}
            className={cx(
              'flex items-center gap-2 rounded-lg transition-colors w-full cursor-pointer',
              showFull ? 'px-3 py-1.5 text-[11.5px] text-white/45 hover:text-white/75 hover:bg-white/[0.04]' : 'justify-center p-2 text-white/35 hover:text-white/70',
            )}
            title="Download app"
            aria-label="Download app"
          >
            <Download size={14} />
            {showFull && <span>Download app</span>}
          </button>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(
              'flex items-center gap-2 rounded-lg transition-colors w-full',
              showFull ? 'px-3 py-1.5 text-[11.5px] text-white/45 hover:text-white/75 hover:bg-white/[0.04]' : 'justify-center p-2 text-white/35 hover:text-white/70',
            )}
            title="GitHub"
            aria-label="GitHub repository"
          >
            <ArrowUpRight size={14} />
            {showFull && <span>GitHub</span>}
          </a>
        </div>
      </div>
    )
  }

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <>
      {/* Mobile hamburger (< 640px) */}
      <button
        ref={hamburgerRef}
        type="button"
        onClick={openMobileDrawer}
        className="fixed top-3 left-3 z-50 p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white backdrop-blur-md sm:hidden cursor-pointer"
        aria-label="Open sidebar"
        style={{ willChange: 'transform' }}
      >
        <Menu size={18} />
      </button>

      {/* Desktop / tablet sidebar */}
      <aside
        ref={sidebarRef}
        className={cx(
          'hidden sm:flex flex-col shrink-0 h-full',
          'bg-[#0f0f0f]/80 backdrop-blur-xl border-r border-white/[0.08]',
          'overflow-hidden',
        )}
        style={{ width: collapsed ? RAIL_W : SIDEBAR_W, willChange: 'width' }}
      >
        {renderContent(false)}
      </aside>

      {/* Mobile drawer (< 640px) */}
      {mobileOpen && (
        <>
          {/* Scrim */}
          <div
            ref={scrimRef}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] sm:hidden"
            onClick={closeMobileDrawer}
            style={{ opacity: 0 }}
          />
          {/* Drawer */}
          <aside
            ref={drawerRef}
            className="fixed top-0 left-0 bottom-0 z-50 flex flex-col sm:hidden bg-[#0f0f0f] border-r border-white/[0.08] overflow-hidden"
            style={{ width: SIDEBAR_W, transform: `translateX(-${SIDEBAR_W}px)` }}
          >
            {renderContent(true)}
          </aside>
        </>
      )}
    </>
  )
}
