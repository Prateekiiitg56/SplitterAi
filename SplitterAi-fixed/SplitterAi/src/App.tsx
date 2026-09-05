import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
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
import { DEFAULT_WORKSPACE } from './config'

import FlowPage from './pages/FlowPage'
import ErrorBoundary from './components/ErrorBoundary'

function Layout() {
  const location = useLocation()
  const { sessions } = useApp()
  const { sidebarCollapsed, toggleSidebar, selectedSessionId, setSelectedSessionId } = useUI()

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[var(--bg)] p-0 overflow-hidden relative">
      <div className="app flex flex-1 h-full w-full bg-[var(--bg)] overflow-hidden relative z-10">
        <Sidebar
          collapsed={sidebarCollapsed}
          sessions={sessions}
          selectedSession={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          onToggleCollapse={toggleSidebar}
          workspace={DEFAULT_WORKSPACE}
          currentPath={location.pathname}
        />

        <ErrorBoundary key={location.pathname}>
          <Routes>
            {/* Home Route */}
            <Route path="/" element={<AIAssistantInterface />} />

            {/* Projects & Runs Routes */}
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectOverviewPage />} />
            <Route path="/projects/:projectId/flow" element={<FlowPage />} />
            <Route path="/projects/:projectId/tasks" element={<ProjectTasksPage />} />
            <Route path="/projects/:projectId/agents" element={<ProjectAgentsPage />} />
            <Route path="/projects/:projectId/files" element={<ProjectFilesPage />} />
            <Route path="/projects/:projectId/activity" element={<ProjectActivityPage />} />

            {/* Agents Management Routes */}
            <Route path="/agents" element={<AgentsOverviewPage />} />
            <Route path="/agents/:agentId" element={<AgentPage />} />
            <Route path="/agent/:role" element={<AgentPage />} /> {/* Backwards compatibility */}

            {/* Flow & Integrations */}
            <Route path="/flow" element={<FlowPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/run" element={<ProjectOverviewPage />} /> {/* Backwards compatibility */}
          </Routes>
        </ErrorBoundary>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <UIProvider>
          <Layout />
        </UIProvider>
      </AppProvider>
    </BrowserRouter>
  )
}
