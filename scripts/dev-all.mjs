// npm run dev:all: backend (FastAPI on :8000) and dashboard (Vite on :5173) together; Ctrl+C stops both.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const venvPython = process.platform === 'win32' ? join('.venv', 'Scripts', 'python.exe') : join('.venv', 'bin', 'python')
const python = existsSync(venvPython) ? venvPython : 'python'

const children = [
  spawn(python, [join('backend', 'server.py')], { stdio: 'inherit' }),
  spawn('npx', ['vite'], { stdio: 'inherit', shell: process.platform === 'win32' }),
]

const stop = () => children.forEach((child) => child.kill())
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
children.forEach((child) => child.on('exit', (code) => {
  stop()
  process.exitCode = code ?? 0
}))
