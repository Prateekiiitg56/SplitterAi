import React from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Background3D from './components/Background3D'
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

function Layout() {
  const location = useLocation()
  const { sessions } = useApp()
  const { sidebarCollapsed, toggleSidebar, selectedSessionId, setSelectedSessionId } = useUI()

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-[#0C1019] p-4 overflow-hidden relative">
      <Background3D />
      <div className="app-frame flex flex-1 h-full w-full max-w-[1760px] bg-[#121723] rounded-2xl border border-[#242C42] shadow-2xl overflow-hidden relative z-10">
        <Sidebar
          collapsed={sidebarCollapsed}
          sessions={sessions}
          selectedSession={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          onToggleCollapse={toggleSidebar}
          workspace={DEFAULT_WORKSPACE}
          currentPath={location.pathname}
        />

        <Routes>
          {/* Home Route */}
          <Route path="/" element={<AIAssistantInterface />} />

          {/* Projects & Runs Routes */}
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectOverviewPage />} />
          <Route path="/projects/:projectId/tasks" element={<ProjectTasksPage />} />
          <Route path="/projects/:projectId/agents" element={<ProjectAgentsPage />} />
          <Route path="/projects/:projectId/files" element={<ProjectFilesPage />} />
          <Route path="/projects/:projectId/activity" element={<ProjectActivityPage />} />

          {/* Agents Management Routes */}
          <Route path="/agents" element={<AgentsOverviewPage />} />
          <Route path="/agents/:agentId" element={<AgentPage />} />
          <Route path="/agent/:role" element={<AgentPage />} /> {/* Backwards compatibility */}

          {/* Integrations & Run Compatibility */}
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/run" element={<ProjectOverviewPage />} /> {/* Backwards compatibility */}
        </Routes>
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
