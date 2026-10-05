import { useEffect, useState } from 'react'
import { Modal } from './primitives/Modal'
import { Button } from './primitives/Button'
import { TextField } from './primitives/Field'
import { fetchGithubRepos, importGithubRepo, pushToGithub } from '../lib/api'

/** Pick one of the connected account's repositories and clone it into a new project. */
export function GithubImportDialog({ open, onClose, onImported }: {
  open: boolean
  onClose: () => void
  onImported: (workspace: string) => void
}) {
  const [repos, setRepos] = useState<Array<{ full_name: string; private: boolean }> | null>(null)
  const [repo, setRepo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setRepos(null)
    fetchGithubRepos()
      .then((list) => {
        setRepos(list)
        if (list[0]) setRepo((current) => current || list[0].full_name)
      })
      .catch((err) => setError(err?.message || 'Could not load repositories'))
  }, [open])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const { workspace } = await importGithubRepo(repo.trim())
      onImported(workspace)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Import from GitHub"
      width={440}
      footer={
        <>
          <Button variant="ghost" size="md" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="md" loading={busy} disabled={!repo.trim()} onClick={submit}>Import</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p role="alert" className="text-meta text-[var(--bad)]">{error}</p>}
        {repos && repos.length > 0 && (
          <label className="block text-meta text-[var(--dim)]">
            Repository
            <select
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="mt-1 w-full h-9 rounded-control bg-[var(--bg-inset)] border border-[var(--border)] px-2 text-[var(--text)]"
            >
              {repos.map((r) => (
                <option key={r.full_name} value={r.full_name}>{r.full_name}{r.private ? ' (private)' : ''}</option>
              ))}
            </select>
          </label>
        )}
        {!repos && !error && <p className="text-meta text-[var(--faint)]">Loading repositories…</p>}
        <TextField label="Or type owner/name" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="octocat/hello-world" />
      </div>
    </Modal>
  )
}

/** Commit the project and push it as a branch of the connected repository. */
export function GithubPushDialog({ open, onClose, workspace }: { open: boolean; onClose: () => void; workspace: string }) {
  const folder = workspace.split(/[/\\]/).filter(Boolean).pop() || 'project'
  const [branch, setBranch] = useState(`splitter/${folder}`)
  const [message, setMessage] = useState('Update from SplitterAI')
  const [repo, setRepo] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ message: string; url: string } | null>(null)

  useEffect(() => {
    if (open) {
      setError(null)
      setDone(null)
    }
  }, [open])

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      setDone(await pushToGithub(workspace, branch.trim(), message.trim(), repo.trim()))
    } catch (err: any) {
      setError(err?.message || 'Push failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Push to GitHub"
      width={440}
      footer={
        done ? (
          <Button variant="primary" size="md" onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" size="md" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="md" loading={busy} disabled={!branch.trim()} onClick={submit}>Push</Button>
          </>
        )
      }
    >
      {done ? (
        <p className="text-meta text-[var(--text-2)]">
          {done.message}{' '}
          <a href={done.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">Open on GitHub</a>
        </p>
      ) : (
        <div className="space-y-3">
          {error && <p role="alert" className="text-meta text-[var(--bad)]">{error}</p>}
          <TextField label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} />
          <TextField label="Commit message" value={message} onChange={(e) => setMessage(e.target.value)} />
          <TextField label="Repository (owner/name)" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="defaults to the connected repository" />
        </div>
      )}
    </Modal>
  )
}
