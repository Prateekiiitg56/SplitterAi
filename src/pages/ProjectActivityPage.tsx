import ProjectTabShell from './ProjectTabShell'
import LogStream from '../components/LogStream'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'

export default function ProjectActivityPage() {
  const { logs } = useApp()
  const { logFilter, setLogFilter } = useUI()

  const filteredLogs = logFilter ? logs.filter((l) => l.subtaskId === logFilter || !l.subtaskId) : logs

  return (
    <ProjectTabShell>
      <div className="activity-wrap flex-1 min-h-0 min-w-0 overflow-y-auto">
        <LogStream logs={filteredLogs} filter={logFilter} onClearFilter={() => setLogFilter(null)} />
      </div>
    </ProjectTabShell>
  )
}
