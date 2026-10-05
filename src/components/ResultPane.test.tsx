import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ fetchProjectInfo: vi.fn() }))

vi.mock('../lib/api', () => ({
  fetchProjectInfo: api.fetchProjectInfo,
  previewUrl: (id: string) => `http://localhost:8000/preview/${id}/`,
}))
vi.mock('./FileExplorer', () => ({
  default: ({ openFile, modifiedFiles }: any) => (
    <div>
      explorer open={String(openFile)} changed={modifiedFiles.join(',')}
    </div>
  ),
}))

import { ResultPane } from './ResultPane'

describe('ResultPane', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the preview for a finished web project, built from the backend project id', async () => {
    api.fetchProjectInfo.mockResolvedValue({ project_id: 'upload-abc', workspace: '/imports/upload-abc', entry: { kind: 'web', path: 'index.html' } })
    const { rerender } = render(<ResultPane workspace="/imports/upload-abc" runStatus="executing" changedFiles={[]} />)
    expect(api.fetchProjectInfo).not.toHaveBeenCalled()
    rerender(<ResultPane workspace="/imports/upload-abc" runStatus="done" changedFiles={['index.html']} />)
    const frame = await screen.findByTitle('Project preview')
    expect(frame.getAttribute('src')).toBe('http://localhost:8000/preview/upload-abc/')
    expect(screen.getByText(/Open in new tab/).getAttribute('href')).toBe('http://localhost:8000/preview/upload-abc/')
  })

  it('opens the entry file for a script project and highlights changed files', async () => {
    api.fetchProjectInfo.mockResolvedValue({ project_id: 'primes', workspace: './workspace_output/primes', entry: { kind: 'file', path: 'primes.py' } })
    render(<ResultPane workspace="./workspace_output/primes" runStatus="done" changedFiles={['primes.py']} />)
    await waitFor(() => expect(screen.getByText(/explorer open=primes.py changed=primes.py/)).toBeTruthy())
    expect(screen.queryByTitle('Project preview')).toBeNull()
  })
})

describe('ResultPane tab choice', () => {
  it('keeps the tab the user picked when the project info arrives', async () => {
    let resolve: (v: any) => void = () => {}
    api.fetchProjectInfo.mockReturnValue(new Promise((r) => { resolve = r }))
    render(<ResultPane workspace="/imports/repo-1" runStatus="idle" changedFiles={[]} />)
    screen.getByRole('tab', { name: /Files/ }).click()
    resolve({ project_id: 'repo-1', workspace: '/imports/repo-1', entry: { kind: 'web', path: 'index.html' } })
    await waitFor(() => expect(api.fetchProjectInfo).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByTitle('Project preview')).toBeNull()
    expect(screen.getByText(/explorer open=/)).toBeTruthy()
  })
})
