import ProjectTabShell from './ProjectTabShell'
import FileExplorer from '../components/FileExplorer'
import { useApp } from '../context/AppContext'

export default function ProjectFilesPage() {
  const { currentWorkspace } = useApp()
  return (
    <ProjectTabShell>
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg)]">
        <FileExplorer workspace={currentWorkspace} />
      </div>
    </ProjectTabShell>
  )
}
