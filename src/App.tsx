import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
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
import DownloadAppModal from './components/DownloadAppModal'

import { AnimatedTopDock } from './shaders/animated-top-dock/AnimatedTopDock'
import './shaders/threeui.css'

/**
 * Layout — the main app shell.
 */
function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [downloadModalOpen, setDownloadModalOpen] = useState(false)
  const { selectedSessionId, setSelectedSessionId } = useUI()

  const getActiveId = () => {
    const path = location.pathname
    if (path.startsWith('/projects')) return 'projects'
    if (path.startsWith('/agents') || path.startsWith('/agent')) return 'agents'
    if (path === '/flow') return 'flow'
    if (path === '/integrations') return 'integrations'
    return 'console'
  }

  const activeId = getActiveId()

  const isConsole = location.pathname === '/console'

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[#08090d] p-0 overflow-hidden relative">
      {/* Full-page ThreeUI AnimatedTopDock Glass particle field background & interactive sidebar rail */}
      <div className={`fixed inset-0 z-20 pointer-events-none transition-opacity duration-300 ${isConsole ? 'opacity-85' : 'opacity-18'}`}>
        <AnimatedTopDock
          variant="glass"
          particles={22}
          thickness={0.115}
          dispersion={0.05}
          specular={0.85}
          rim={0.5}
          drift={1.0}
          proximity={44}
          heightGrowth={20}
          drop={11.0}
          activeId={activeId}
          onItemSelect={(id) => navigate(`/${id}`)}
          onGetAppClick={() => setDownloadModalOpen(true)}
          className="w-full h-full"
        />
      </div>

      <div className="app flex flex-col flex-1 h-full w-full overflow-hidden relative z-10">
        <TopBar />
        <div className="flex-1 overflow-hidden relative bg-[#08090d]/88 backdrop-blur-[1px]">
          <ErrorBoundary key={location.pathname}>
            <Routes>
              {/* Console / Home */}
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

  // Landing page is the root — standalone, no TopBar shell
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
