import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ fetchFileContent: vi.fn(), runProjectFile: vi.fn() }))
vi.mock('../lib/api', () => api)

import { FileViewer } from './FileViewer'

describe('FileViewer Run', () => {
  it('shows output lines while the script runs, then its exit code', async () => {
    api.fetchFileContent.mockResolvedValue({ path: 'primes.py', size: 10, binary: false, truncated: false, content: 'print(2)' })
    let release: () => void = () => {}
    api.runProjectFile.mockImplementation(async (_w: string, _p: string, onEvent: (e: any) => void) => {
      onEvent({ command: 'python "primes.py"' })
      onEvent({ line: '2' })
      await new Promise<void>((resolve) => { release = resolve })
      onEvent({ line: '3' })
      onEvent({ exit_code: 0 })
    })
    render(<FileViewer workspace="./workspace_output/p" path="primes.py" />)
    fireEvent.click(await screen.findByLabelText('Run primes.py'))

    const output = await screen.findByRole('log', { name: 'Run output' })
    expect(output.textContent).toContain('2')
    expect(output.textContent).toContain('running')
    expect(output.textContent).not.toContain('exit 0')

    release()
    expect(await screen.findByText(/exit 0/)).toBeTruthy()
    expect(output.textContent).toContain('3')
  })
})
