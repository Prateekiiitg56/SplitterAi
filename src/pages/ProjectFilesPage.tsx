import ProjectTabShell from './ProjectTabShell'
import FileExplorer from '../components/FileExplorer'
import { useApp } from '../context/AppContext'

export default function ProjectFilesPage() {
  const { currentWorkspace } = useApp()
  return (
    <ProjectTabShell>
      <div className="files-wrap flex-1 min-h-0 min-w-0">
        <FileExplorer workspace={currentWorkspace} />
      </div>
    </ProjectTabShell>
  )
}
