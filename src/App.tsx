import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import AgentPage from './pages/AgentPage'
import AgentsOverviewPage from './pages/AgentsOverviewPage'
import IntegrationsPage from './pages/IntegrationsPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectOverviewPage from './pages/ProjectOverviewPage'
import ProjectTasksPage from './pages/ProjectTasksPage'
import ProjectAgentsPage from './pages/ProjectAgentsPage'
import ProjectFilesPage from './pages/ProjectFilesPage'
import ProjectActivityPage from './pages/ProjectActivityPage'
import { AIAssistantInterface } from './components/ui/ai-assistant-interface'
import { AppProvider, useApp } from './context/AppContext'
import { UIProvider, useUI } from './context/UIContext'

import FlowPage from './pages/FlowPage'
import Landing from './pages/Landing'
import ErrorBoundary from './components/ErrorBoundary'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import DownloadAppModal from './components/DownloadAppModal'
import ConstellationBackground from './components/ConstellationBackground'

/**
 * Layout — the main app shell.
 */
function Layout() {
  const location = useLocation()
  const [downloadModalOpen, setDownloadModalOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { sessions } = useApp()
  const { selectedSessionId, setSelectedSessionId } = useUI()

  // Auto-collapse the sidebar to icon-only below the tablet breakpoint so it
  // never squeezes the content area on narrow viewports; the manual toggle
  // still overrides this once the user has touched it.
  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 900px)')
    setSidebarCollapsed(mq.matches)
    const handleChange = (e: MediaQueryListEvent) => setSidebarCollapsed(e.matches)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  return (
    <div className="app-shell flex h-screen w-screen p-0 overflow-hidden relative">
      <ConstellationBackground />
      {mounted && (
        <Sidebar
          collapsed={sidebarCollapsed}
          sessions={sessions}
          selectedSession={selectedSessionId || ''}
          onSelectSession={setSelectedSessionId}
          currentPath={location.pathname}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      )}

      <div className="main-col flex flex-col flex-1 h-full w-full overflow-hidden relative z-10">
        <div className="flex-1 overflow-hidden relative flex flex-col h-full">
          <ErrorBoundary key={location.pathname}>
            <Routes>
              {/* Console */}
              <Route path="/console" element={<AIAssistantInterface />} />

              {/* Projects & Runs */}
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:projectId" element={<ProjectOverviewPage />} />
              <Route path="/projects/:projectId/flow" element={<FlowPage />} />
              <Route path="/projects/:projectId/tasks" element={<ProjectTasksPage />} />
              <Route path="/projects/:projectId/agents" element={<ProjectAgentsPage />} />
              <Route path="/projects/:projectId/files" element={<ProjectFilesPage />} />
              <Route path="/projects/:projectId/activity" element={<ProjectActivityPage />} />

              {/* Agents */}
              <Route path="/agents" element={<AgentsOverviewPage />} />
              <Route path="/agents/:agentId" element={<AgentPage />} />
              <Route path="/agent/:role" element={<AgentPage />} />

              {/* Flow & Integrations */}
              <Route path="/flow" element={<FlowPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/run" element={<ProjectOverviewPage />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </div>

      <DownloadAppModal isOpen={downloadModalOpen} onClose={() => setDownloadModalOpen(false)} />
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()

  // The landing page is the default entry point and remains standalone.
  if (location.pathname === '/' || location.pathname === '/welcome') {
    return <Landing />
  }

  return <Layout />
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <UIProvider>
          <AppRoutes />
        </UIProvider>
      </AppProvider>
    </BrowserRouter>
  )
}