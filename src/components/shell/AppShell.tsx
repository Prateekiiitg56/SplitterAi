import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TitleBar } from './TitleBar'
import { ActivityBar } from './ActivityBar'
import { ExplorerSidebar } from './ExplorerSidebar'
import { ShellExplorer } from './ShellExplorer'
import { EditorTabs, Breadcrumb } from './EditorTabs'
import { ChatPanel } from './ChatPanel'
import { StatusBar } from './StatusBar'
import { getShellChrome } from './shellNav'
import DownloadAppModal from '../DownloadAppModal'

/**
 * AppShell — the Cursor-style chrome every authenticated route renders inside.
 *
 * Replaces the old Sidebar-plus-content layout. Structure, top to bottom:
 *
 *   TitleBar          34px  traffic lights, command palette, panel toggles
 *   ├ ActivityBar     48px  route rail
 *   ├ ExplorerSidebar 260px contextual tree (ShellExplorer decides what)
 *   ├ content              EditorTabs 36px / Breadcrumb 26px / the route
 *   └ ChatPanel       250px composer shell
 *   StatusBar         22px  workspace, live count, model
 *
 * Only layout lives here. No page data is fetched, transformed or held; the
 * routes rendered as `children` keep every hook and handler they already had.
 *
 * The `.ide-shell` class does one important thing beyond setting the surface:
 * it rebinds --accent to the Cursor blue for everything inside, so the shared
 * primitives adopt it without being edited. Landing renders outside this
 * component and keeps the original accent.
 */

/** Beyond this many tabs the oldest is dropped, as an editor would. */
const MAX_TABS = 8

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

  const [mounted, setMounted] = useState(false)
  const [explorerCollapsed, setExplorerCollapsed] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [downloadModalOpen, setDownloadModalOpen] = useState(false)
  const [tabs, setTabs] = useState<string[]>([location.pathname])

  // Same responsive rule the old Layout used for the sidebar: collapse the
  // explorer below the tablet breakpoint so it never squeezes the content area.
  // The chat panel needs more room than the explorer, so it folds earlier.
  useEffect(() => {
    setMounted(true)

    const explorerMq = window.matchMedia('(max-width: 900px)')
    const chatMq = window.matchMedia('(max-width: 1180px)')

    setExplorerCollapsed(explorerMq.matches)
    setChatCollapsed(chatMq.matches)

    const onExplorerChange = (e: MediaQueryListEvent) => setExplorerCollapsed(e.matches)
    const onChatChange = (e: MediaQueryListEvent) => setChatCollapsed(e.matches)

    explorerMq.addEventListener('change', onExplorerChange)
    chatMq.addEventListener('change', onChatChange)
    return () => {
      explorerMq.removeEventListener('change', onExplorerChange)
      chatMq.removeEventListener('change', onChatChange)
    }
  }, [])

  // Visiting a route opens a tab for it. Navigation stays the source of truth —
  // the tab strip only ever reflects where the router has been.
  useEffect(() => {
    setTabs((prev) =>
      prev.includes(location.pathname)
        ? prev
        : [...prev, location.pathname].slice(-MAX_TABS),
    )
  }, [location.pathname])

  const closeTab = (path: string) => {
    const next = tabs.filter((p) => p !== path)
    setTabs(next)
    if (path === location.pathname) {
      navigate(next[next.length - 1] ?? '/home')
    }
  }

  const chrome = getShellChrome(location.pathname)

  return (
    <div className="ide-shell flex flex-col h-screen w-screen overflow-hidden">
      <TitleBar
        title="SplitterAI workspace"
        explorerCollapsed={explorerCollapsed}
        onToggleExplorer={() => setExplorerCollapsed((c) => !c)}
        chatCollapsed={chatCollapsed}
        onToggleChat={() => setChatCollapsed((c) => !c)}
      />

      <div className="flex-1 min-h-0 flex">
        <ActivityBar
          pathname={location.pathname}
          onOpenDownload={() => setDownloadModalOpen(true)}
        />

        {mounted && (
          <ExplorerSidebar
            collapsed={explorerCollapsed}
            onToggle={() => setExplorerCollapsed((c) => !c)}
          >
            <ShellExplorer pathname={location.pathname} />
          </ExplorerSidebar>
        )}

        <div className="flex-1 min-w-0 flex flex-col bg-[var(--ide-editor)]">
          <EditorTabs
            tabs={tabs}
            activePath={location.pathname}
            onSelect={(path) => navigate(path)}
            onClose={closeTab}
          />
          <Breadcrumb crumbs={chrome.crumbs} />
          {/* Pages own their own scrolling, exactly as they did under the old
              layout — this stays overflow-hidden so nothing double-scrolls. */}
          <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">{children}</div>
        </div>

        {mounted && (
          <ChatPanel
            collapsed={chatCollapsed}
            onToggle={() => setChatCollapsed((c) => !c)}
          />
        )}
      </div>

      <StatusBar />

      <DownloadAppModal isOpen={downloadModalOpen} onClose={() => setDownloadModalOpen(false)} />
    </div>
  )
}
