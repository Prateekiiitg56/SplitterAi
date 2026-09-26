import { lazy, Suspense } from 'react'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom'
import AgentPage from './pages/AgentPage'
import AgentsOverviewPage from './pages/AgentsOverviewPage'
import IntegrationsPage from './pages/IntegrationsPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectOverviewPage from './pages/ProjectOverviewPage'
import ProjectTasksPage from './pages/ProjectTasksPage'
import ProjectAgentsPage from './pages/ProjectAgentsPage'
import ProjectFilesPage from './pages/ProjectFilesPage'
import ProjectActivityPage from './pages/ProjectActivityPage'
import HomePage from './pages/HomePage'
import ConsolePage from './pages/ConsolePage'
import { AppProvider } from './context/AppContext'
import { UIProvider } from './context/UIContext'

import FlowPage from './pages/FlowPage'
import ErrorBoundary from './components/ErrorBoundary'
import { AppShell } from './components/shell/AppShell'
import { EmptyState } from './components/primitives/EmptyState'

// Landing is the only three.js consumer; loading it lazily keeps ~0.5 MB of WebGL code off dashboard routes.
const Landing = lazy(() => import('./pages/Landing'))

/**
 * Layout — the authenticated app, inside the Cursor-style shell.
 *
 * The title bar, activity bar, explorer, chat panel and status bar all live in
 * AppShell now; what used to be Sidebar + main-col here is gone. The routing
 * table below is unchanged apart from the new /home entry, and ErrorBoundary
 * still remounts per pathname — but it now sits *inside* the shell, so a page
 * that throws no longer takes the chrome down with it.
 *
 * The sidebar-collapse state that used to live here moved into AppShell, which
 * owns the equivalent explorer/chat toggles. selectedSessionId is untouched in
 * UIContext; only the old Sidebar ever read or wrote it.
 */
function Layout() {
  const location = useLocation()

  return (
    <AppShell>
      <ErrorBoundary key={location.pathname}>
        <Routes>
          {/* Home */}
          <Route path="/home" element={<HomePage />} />

          {/* Console */}
          <Route path="/console" element={<ConsolePage />} />

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
          <Route
            path="*"
            element={
              <EmptyState
                className="flex-1"
                title={<span role="heading" aria-level={1}>Page not found</span>}
                detail={`Nothing lives at ${location.pathname}.`}
                action={<Link to="/home" className="text-[12px] text-[var(--ide-accent)] underline">Go to Home</Link>}
              />
            }
          />
        </Routes>
      </ErrorBoundary>
    </AppShell>
  )
}

function AppRoutes() {
  const location = useLocation()

  // The landing page is the default entry point and remains standalone.
  if (location.pathname === '/' || location.pathname === '/welcome') {
    return (
      <Suspense fallback={null}>
        <Landing />
      </Suspense>
    )
  }


  return <Layout />
}

export default function App() {
  return (
    // reducedMotion="user": framer-motion drops transform/layout animation for
    // visitors with prefers-reduced-motion, keeping only opacity fades.
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AppProvider>
          <UIProvider>
            <AppRoutes />
          </UIProvider>
        </AppProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}