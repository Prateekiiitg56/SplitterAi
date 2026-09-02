import type { ReactNode } from 'react'

/* ── Domain types ─────────────────────────────────────────────── */

export type AgentRole = 'planner' | 'coder' | 'auditor' | 'tester'
export type SubtaskStatus = 'pending' | 'running' | 'success' | 'error'
export type RunStatus = 'idle' | 'planning' | 'executing' | 'done' | 'error'

export interface Subtask {
  id: string
  role: AgentRole
  group: number
  instruction: string
  status: SubtaskStatus
  model?: string
  output?: string
  error?: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  steps?: number
}

export interface LogEntry {
  id: string
  timestamp: string
  type: 'model_request' | 'model_response' | 'model_fallback' | 'tool_call' | 'tool_result' | 'plan_generated' | 'group_start' | 'group_end' | 'subtask_start' | 'subtask_end' | 'sandbox_block' | 'info' | 'error'
  role?: AgentRole
  subtaskId?: string
  model?: string
  message: string
  detail?: string
}

export interface SessionEntry {
  id: string
  workspace: string
  task: string
  status: RunStatus
  createdAt: string
  subtaskCount: number
}

/* ── Role metadata ────────────────────────────────────────────── */

export const ROLE_META: Record<AgentRole, { label: string; color: string; bg: string }> = {
  planner: { label: 'Planner', color: '#7C3AED', bg: '#7C3AED14' },
  coder:   { label: 'Coder',   color: '#1A73E8', bg: '#1A73E814' },
  auditor: { label: 'Auditor', color: '#E8710A', bg: '#E8710A14' },
  tester:  { label: 'Tester',  color: '#0E9F6E', bg: '#0E9F6E14' },
}

export const STATUS_META: Record<SubtaskStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#5F6368', bg: '#5F636814' },
  running: { label: 'Running', color: '#1A73E8', bg: '#1A73E814' },
  success: { label: 'Done',    color: '#0E9F6E', bg: '#0E9F6E14' },
  error:   { label: 'Failed',  color: '#D93025', bg: '#D9302514' },
}

/* ── Mock data for demo ───────────────────────────────────────── */

export const mockSubtasks: Subtask[] = [
  {
    id: 'sub-1',
    role: 'coder',
    group: 1,
    instruction: 'Create fizzbuzz.py — a script that prints FizzBuzz from 1 to 100',
    status: 'success',
    model: 'gemini/gemini-2.5-flash',
    output: 'Created fizzbuzz.py with FizzBuzz logic. Verified output for first 20 numbers.',
    startedAt: '10:42:01',
    finishedAt: '10:42:08',
    durationMs: 7200,
    steps: 3,
  },
  {
    id: 'sub-2',
    role: 'coder',
    group: 1,
    instruction: 'Create fibonacci.py — a script that prints the first 20 Fibonacci numbers',
    status: 'success',
    model: 'gemini/gemini-2.5-flash',
    output: 'Created fibonacci.py using iterative approach. Output verified.',
    startedAt: '10:42:01',
    finishedAt: '10:42:06',
    durationMs: 5100,
    steps: 2,
  },
  {
    id: 'sub-3',
    role: 'coder',
    group: 1,
    instruction: 'Create factorial.py — a script that computes factorial of numbers 1-12',
    status: 'success',
    model: 'groq/llama-3.3-70b-versatile',
    output: 'Created factorial.py with recursive implementation and input validation.',
    startedAt: '10:42:01',
    finishedAt: '10:42:09',
    durationMs: 8300,
    steps: 4,
  },
  {
    id: 'sub-4',
    role: 'tester',
    group: 2,
    instruction: 'Run all three scripts and verify their output is correct',
    status: 'running',
    model: 'groq/llama-3.3-70b-versatile',
    startedAt: '10:42:10',
    steps: 2,
  },
  {
    id: 'sub-5',
    role: 'auditor',
    group: 2,
    instruction: 'Review all three scripts for code quality, edge cases, and PEP 8 compliance',
    status: 'running',
    model: 'gemini/gemini-2.5-flash',
    startedAt: '10:42:10',
    steps: 1,
  },
]

export const mockLogs: LogEntry[] = [
  { id: 'l1',  timestamp: '10:41:58', type: 'info',           message: 'Starting multi-agent run' },
  { id: 'l2',  timestamp: '10:41:58', type: 'model_request',  role: 'planner', model: 'gemini/gemini-2.5-flash', message: 'Planning task decomposition…' },
  { id: 'l3',  timestamp: '10:42:00', type: 'plan_generated', message: 'Plan: 5 subtasks in 2 groups (3 parallel → 2 parallel)' },
  { id: 'l4',  timestamp: '10:42:01', type: 'group_start',    message: 'Group 1 — 3 parallel agents starting' },
  { id: 'l5',  timestamp: '10:42:01', type: 'subtask_start',  role: 'coder', subtaskId: 'sub-1', model: 'gemini/gemini-2.5-flash', message: 'Starting: Create fizzbuzz.py' },
  { id: 'l6',  timestamp: '10:42:01', type: 'subtask_start',  role: 'coder', subtaskId: 'sub-2', model: 'gemini/gemini-2.5-flash', message: 'Starting: Create fibonacci.py' },
  { id: 'l7',  timestamp: '10:42:01', type: 'subtask_start',  role: 'coder', subtaskId: 'sub-3', model: 'gemini/gemini-2.5-flash', message: 'Starting: Create factorial.py' },
  { id: 'l8',  timestamp: '10:42:02', type: 'model_fallback', role: 'coder', subtaskId: 'sub-3', model: 'groq/llama-3.3-70b-versatile', message: 'gemini/gemini-2.5-flash rate-limited → falling back to groq/llama-3.3-70b-versatile' },
  { id: 'l9',  timestamp: '10:42:03', type: 'tool_call',      role: 'coder', subtaskId: 'sub-1', message: 'write_file("fizzbuzz.py", …)', detail: 'def fizzbuzz(n):\n    for i in range(1, n+1):\n        if i % 15 == 0: print("FizzBuzz")\n        elif i % 3 == 0: print("Fizz")\n        elif i % 5 == 0: print("Buzz")\n        else: print(i)\n\nfizzbuzz(100)' },
  { id: 'l10', timestamp: '10:42:03', type: 'tool_result',    role: 'coder', subtaskId: 'sub-1', message: 'write_file → success (238 bytes)' },
  { id: 'l11', timestamp: '10:42:04', type: 'tool_call',      role: 'coder', subtaskId: 'sub-2', message: 'write_file("fibonacci.py", …)' },
  { id: 'l12', timestamp: '10:42:04', type: 'tool_result',    role: 'coder', subtaskId: 'sub-2', message: 'write_file → success (195 bytes)' },
  { id: 'l13', timestamp: '10:42:05', type: 'tool_call',      role: 'coder', subtaskId: 'sub-1', message: 'run_shell("python fizzbuzz.py")' },
  { id: 'l14', timestamp: '10:42:05', type: 'tool_result',    role: 'coder', subtaskId: 'sub-1', message: 'run_shell → exit 0 (stdout: 1\\n2\\nFizz\\n4\\nBuzz…)' },
  { id: 'l15', timestamp: '10:42:06', type: 'subtask_end',    role: 'coder', subtaskId: 'sub-2', message: 'fibonacci.py created and verified ✓', detail: '5.1s · 2 steps' },
  { id: 'l16', timestamp: '10:42:06', type: 'tool_call',      role: 'coder', subtaskId: 'sub-3', message: 'write_file("factorial.py", …)' },
  { id: 'l17', timestamp: '10:42:08', type: 'subtask_end',    role: 'coder', subtaskId: 'sub-1', message: 'fizzbuzz.py created and verified ✓', detail: '7.2s · 3 steps' },
  { id: 'l18', timestamp: '10:42:09', type: 'subtask_end',    role: 'coder', subtaskId: 'sub-3', message: 'factorial.py created and verified ✓', detail: '8.3s · 4 steps' },
  { id: 'l19', timestamp: '10:42:09', type: 'group_end',      message: 'Group 1 complete — all 3 subtasks succeeded' },
  { id: 'l20', timestamp: '10:42:10', type: 'group_start',    message: 'Group 2 — 2 parallel agents starting' },
  { id: 'l21', timestamp: '10:42:10', type: 'subtask_start',  role: 'tester', subtaskId: 'sub-4', model: 'groq/llama-3.3-70b-versatile', message: 'Starting: Run and verify all scripts' },
  { id: 'l22', timestamp: '10:42:10', type: 'subtask_start',  role: 'auditor', subtaskId: 'sub-5', model: 'gemini/gemini-2.5-flash', message: 'Starting: Code review all scripts' },
  { id: 'l23', timestamp: '10:42:11', type: 'tool_call',      role: 'tester', subtaskId: 'sub-4', message: 'run_shell("python fizzbuzz.py | head -20")' },
  { id: 'l24', timestamp: '10:42:12', type: 'tool_call',      role: 'auditor', subtaskId: 'sub-5', message: 'read_file("fizzbuzz.py")' },
  { id: 'l25', timestamp: '10:42:12', type: 'sandbox_block',  role: 'tester', subtaskId: 'sub-4', message: 'Blocked: run_shell("cat /etc/passwd") — path escapes sandbox' },
]

export const mockSessions: SessionEntry[] = [
  { id: 's1', workspace: 'D:/projects/webapp',    task: 'Create three independent Python scripts: fizzbuzz, fibonacci, factorial', status: 'executing', createdAt: '10:41 AM', subtaskCount: 5 },
  { id: 's2', workspace: 'D:/projects/webapp',    task: 'Fix the auth middleware to handle expired JWT tokens', status: 'done', createdAt: '9:15 AM',  subtaskCount: 3 },
  { id: 's3', workspace: 'D:/projects/api-server', task: 'Add rate limiting to the /api/v1 endpoints', status: 'done', createdAt: 'Yesterday', subtaskCount: 2 },
  { id: 's4', workspace: 'D:/projects/webapp',    task: 'Audit the login page for XSS vulnerabilities', status: 'done', createdAt: 'Yesterday', subtaskCount: 1 },
  { id: 's5', workspace: 'D:/projects/cli-tool',   task: 'Write unit tests for the argument parser module', status: 'error', createdAt: 'Aug 31',   subtaskCount: 2 },
]
