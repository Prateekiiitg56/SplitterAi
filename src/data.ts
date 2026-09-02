/* ── Domain types ─────────────────────────────────────────────── */

export type AgentRole = 'planner' | 'coder' | 'auditor' | 'tester'
export type SubtaskStatus = 'pending' | 'running' | 'success' | 'error'
export type RunStatus = 'idle' | 'planning' | 'executing' | 'done' | 'error'
export type AgentStatus = 'active' | 'idle' | 'error'

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

export interface AgentInfo {
  role: AgentRole
  status: AgentStatus
  currentTask?: string
  model?: string
  subtaskId?: string
  stepsCompleted: number
  totalRuns: number
  successRate: number
  lastActive?: string
  logs: LogEntry[]
  subtasks: Subtask[]
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

export const ROLE_META: Record<AgentRole, { label: string; color: string; bg: string; desc: string }> = {
  planner: { label: 'Planner', color: '#7C3AED', bg: '#7C3AED14', desc: 'Decomposes tasks into subtasks and assigns them to workers' },
  coder:   { label: 'Coder',   color: '#1A73E8', bg: '#1A73E814', desc: 'Writes, edits, and runs code using sandboxed tools' },
  auditor: { label: 'Auditor', color: '#E8710A', bg: '#E8710A14', desc: 'Reviews code for bugs, security issues, and quality' },
  tester:  { label: 'Tester',  color: '#0E9F6E', bg: '#0E9F6E14', desc: 'Writes and runs tests, verifies correctness' },
}

export const STATUS_META: Record<SubtaskStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#5F6368', bg: '#5F636814' },
  running: { label: 'Running', color: '#1A73E8', bg: '#1A73E814' },
  success: { label: 'Done',    color: '#0E9F6E', bg: '#0E9F6E14' },
  error:   { label: 'Failed',  color: '#D93025', bg: '#D9302514' },
}

/* ── Mock: agents ─────────────────────────────────────────────── */

export const mockAgents: AgentInfo[] = [
  {
    role: 'planner',
    status: 'idle',
    stepsCompleted: 1,
    totalRuns: 8,
    successRate: 100,
    lastActive: '10:42 AM',
    model: 'gemini/gemini-2.5-flash',
    logs: [
      { id: 'pl1', timestamp: '10:41:58', type: 'model_request', role: 'planner', model: 'gemini/gemini-2.5-flash', message: 'Planning task decomposition…' },
      { id: 'pl2', timestamp: '10:42:00', type: 'plan_generated', role: 'planner', message: 'Plan: 5 subtasks in 2 groups (3 parallel → 2 parallel)' },
    ],
    subtasks: [],
  },
  {
    role: 'coder',
    status: 'active',
    currentTask: 'Create factorial.py — compute factorial of numbers 1-12',
    model: 'groq/llama-3.3-70b-versatile',
    subtaskId: 'sub-3',
    stepsCompleted: 14,
    totalRuns: 24,
    successRate: 92,
    lastActive: 'now',
    logs: [
      { id: 'c1', timestamp: '10:42:01', type: 'subtask_start', role: 'coder', subtaskId: 'sub-1', model: 'gemini/gemini-2.5-flash', message: 'Starting: Create fizzbuzz.py' },
      { id: 'c2', timestamp: '10:42:02', type: 'model_fallback', role: 'coder', subtaskId: 'sub-3', model: 'groq/llama-3.3-70b-versatile', message: 'gemini rate-limited → groq fallback' },
      { id: 'c3', timestamp: '10:42:03', type: 'tool_call', role: 'coder', subtaskId: 'sub-1', message: 'write_file("fizzbuzz.py", …)', detail: 'def fizzbuzz(n):\n    for i in range(1, n+1):\n        if i % 15 == 0: print("FizzBuzz")\n        elif i % 3 == 0: print("Fizz")\n        elif i % 5 == 0: print("Buzz")\n        else: print(i)' },
      { id: 'c4', timestamp: '10:42:03', type: 'tool_result', role: 'coder', subtaskId: 'sub-1', message: 'write_file → success (238 bytes)' },
      { id: 'c5', timestamp: '10:42:05', type: 'tool_call', role: 'coder', subtaskId: 'sub-1', message: 'run_shell("python fizzbuzz.py")' },
      { id: 'c6', timestamp: '10:42:05', type: 'tool_result', role: 'coder', subtaskId: 'sub-1', message: 'run_shell → exit 0' },
      { id: 'c7', timestamp: '10:42:06', type: 'tool_call', role: 'coder', subtaskId: 'sub-3', message: 'write_file("factorial.py", …)' },
      { id: 'c8', timestamp: '10:42:08', type: 'subtask_end', role: 'coder', subtaskId: 'sub-1', message: 'fizzbuzz.py ✓' },
    ],
    subtasks: [
      { id: 'sub-1', role: 'coder', group: 1, instruction: 'Create fizzbuzz.py', status: 'success', model: 'gemini/gemini-2.5-flash', durationMs: 7200, steps: 3, output: 'Created fizzbuzz.py — verified output.' },
      { id: 'sub-2', role: 'coder', group: 1, instruction: 'Create fibonacci.py', status: 'success', model: 'gemini/gemini-2.5-flash', durationMs: 5100, steps: 2, output: 'Created fibonacci.py — iterative approach.' },
      { id: 'sub-3', role: 'coder', group: 1, instruction: 'Create factorial.py', status: 'running', model: 'groq/llama-3.3-70b-versatile', steps: 2, startedAt: '10:42:01' },
    ],
  },
  {
    role: 'auditor',
    status: 'active',
    currentTask: 'Review all three scripts for code quality and PEP 8',
    model: 'gemini/gemini-2.5-flash',
    subtaskId: 'sub-5',
    stepsCompleted: 3,
    totalRuns: 9,
    successRate: 100,
    lastActive: 'now',
    logs: [
      { id: 'a1', timestamp: '10:42:10', type: 'subtask_start', role: 'auditor', subtaskId: 'sub-5', model: 'gemini/gemini-2.5-flash', message: 'Starting: Code review' },
      { id: 'a2', timestamp: '10:42:12', type: 'tool_call', role: 'auditor', subtaskId: 'sub-5', message: 'read_file("fizzbuzz.py")' },
      { id: 'a3', timestamp: '10:42:13', type: 'tool_result', role: 'auditor', subtaskId: 'sub-5', message: 'read_file → 238 bytes' },
    ],
    subtasks: [
      { id: 'sub-5', role: 'auditor', group: 2, instruction: 'Review all three scripts for code quality and PEP 8', status: 'running', model: 'gemini/gemini-2.5-flash', steps: 1, startedAt: '10:42:10' },
    ],
  },
  {
    role: 'tester',
    status: 'active',
    currentTask: 'Run all three scripts and verify output',
    model: 'groq/llama-3.3-70b-versatile',
    subtaskId: 'sub-4',
    stepsCompleted: 5,
    totalRuns: 11,
    successRate: 82,
    lastActive: 'now',
    logs: [
      { id: 't1', timestamp: '10:42:10', type: 'subtask_start', role: 'tester', subtaskId: 'sub-4', model: 'groq/llama-3.3-70b-versatile', message: 'Starting: Run and verify scripts' },
      { id: 't2', timestamp: '10:42:11', type: 'tool_call', role: 'tester', subtaskId: 'sub-4', message: 'run_shell("python fizzbuzz.py | head -20")' },
      { id: 't3', timestamp: '10:42:12', type: 'sandbox_block', role: 'tester', subtaskId: 'sub-4', message: 'Blocked: run_shell("cat /etc/passwd") — path escapes sandbox' },
      { id: 't4', timestamp: '10:42:13', type: 'tool_call', role: 'tester', subtaskId: 'sub-4', message: 'run_shell("python fibonacci.py")' },
    ],
    subtasks: [
      { id: 'sub-4', role: 'tester', group: 2, instruction: 'Run all three scripts and verify output', status: 'running', model: 'groq/llama-3.3-70b-versatile', steps: 2, startedAt: '10:42:10' },
    ],
  },
]

/* ── Mock: sessions ───────────────────────────────────────────── */

export const mockSessions: SessionEntry[] = [
  { id: 's1', workspace: 'D:/projects/webapp', task: 'Create fizzbuzz, fibonacci, and factorial scripts', status: 'executing', createdAt: '10:41 AM', subtaskCount: 5 },
  { id: 's2', workspace: 'D:/projects/webapp', task: 'Fix auth middleware for expired JWT tokens', status: 'done', createdAt: '9:15 AM', subtaskCount: 3 },
  { id: 's3', workspace: 'D:/projects/api-server', task: 'Add rate limiting to /api/v1 endpoints', status: 'done', createdAt: 'Yesterday', subtaskCount: 2 },
  { id: 's4', workspace: 'D:/projects/webapp', task: 'Audit login page for XSS vulnerabilities', status: 'done', createdAt: 'Yesterday', subtaskCount: 1 },
  { id: 's5', workspace: 'D:/projects/cli-tool', task: 'Write unit tests for the argument parser', status: 'error', createdAt: 'Aug 31', subtaskCount: 2 },
]
