import ProjectTabShell from './ProjectTabShell'
import FileExplorer from '../components/FileExplorer'
import { DEFAULT_WORKSPACE } from '../config'

export default function ProjectFilesPage() {
  return (
    <ProjectTabShell>
      <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg)]">
        <FileExplorer workspace={DEFAULT_WORKSPACE} />
      </div>
    </ProjectTabShell>
  )
}
