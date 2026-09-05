# AgentCLI

A personal, model-agnostic multi-agent system that takes a high-level task, breaks it into subtasks, and runs those subtasks through specialist AI agents — each backed by a **free** LLM with its own API key.

Independent subtasks run in parallel. Dependent subtasks run in sequence. The system is triggerable via CLI, an HTTP webhook (for n8n), and later, voice.

**Analogy:** A manager (Planner) hands out tickets to specialist workers (Coder / Auditor / Tester). Workers whose tickets don't touch the same files work simultaneously. Workers whose tickets depend on another ticket's output wait their turn. A final step combines everyone's output into one result.

---

## Table of Contents

- [Goals](#goals)
- [Architecture](#architecture)
- [Core Concepts](#core-concepts)
- [Data Model](#data-model)
- [Functional Requirements](#functional-requirements)
- [Non-Functional Requirements](#non-functional-requirements)
- [API Surface](#api-surface)
- [Tech Stack](#tech-stack)
- [Dashboard UI](#dashboard-ui)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Milestones](#milestones)
- [Risks & Open Questions](#risks--open-questions)
- [License](#license)

---

## Goals

- Let one person direct a small "team" of AI agents to build/audit/test software faster than one agent working serially.
- Use only **free-tier hosted models** — no local model hosting, no GPU requirement.
- Give each agent role its own API key so parallel agents don't share one rate-limit bucket.
- Be triggerable from **n8n** (via webhook) so it can be a node in a larger automation workflow.
- Be safe by default: agents can only read/write/execute inside an explicit workspace folder.
- Support both **automatic planning** (planner agent decomposes the task) and **manual planning** (user writes the subtask list themselves).

### Non-Goals (explicitly out of scope for v1)

- Training or fine-tuning any model.
- Hosting/serving model weights locally.
- Full OS-level control (screen control, arbitrary desktop apps).
- Multi-user / team accounts — this is a single-operator personal tool.
- Guaranteeing correctness of generated code — the Auditor/Tester roles reduce risk but do not eliminate human review.

---

## Architecture

```
User (CLI / n8n webhook / future voice)
              │
              ▼
        ┌───────────┐
        │  Planner   │  → produces Plan: [{id, role, group, instruction}, ...]
        └─────┬─────┘
              ▼
        ┌───────────────┐
        │  Orchestrator   │  groups subtasks, runs group N before group N+1
        └─────┬─────────┘
              │  (within a group: ThreadPoolExecutor, one thread per subtask)
     ┌────────┼────────┬─────────────┐
     ▼        ▼        ▼             ▼
 ┌───────┐ ┌───────┐ ┌────────┐  ┌────────┐
 │ Coder │ │ Coder │ │Auditor │  │ Tester │   ← each: own API key, own model chain,
 │ agent │ │ agent │ │ agent  │  │ agent  │      own ReAct loop, sandboxed tools
 └───┬───┘ └───┬───┘ └────┬───┘  └────┬───┘
     └─────────┴──────────┴────────────┘
                    │
                    ▼
           Shared Workspace (sandboxed filesystem)
                    │
                    ▼
        Combined Results → returned to user / n8n
```

---

## Core Concepts

| Concept | Definition |
| :--- | :--- |
| **Task** | The high-level goal given by the user, e.g. "Build a portfolio website with home/about/contact pages." |
| **Plan** | An ordered list of Subtasks, produced by the Planner (or written manually). |
| **Subtask** | One unit of work: `{id, role, group, instruction}`. Has exactly one owning role and one instruction. |
| **Group** | Subtasks sharing a group number run **in parallel**; groups execute in ascending order, so group 2 never starts before group 1 fully finishes. |
| **Role** | A specialist agent type: `planner`, `coder`, `auditor`, `tester` (extensible). Each role has its own model fallback chain and its own API key. |
| **Sandbox / Workspace** | A single root folder each agent's file/shell tools are restricted to. No agent can read/write/execute outside it. |
| **Model Chain** | An ordered list of models to try for a given call; falls through to the next on error/rate-limit/timeout. |

---

## Data Model

```
Subtask:
  id: str
  role: "planner" | "coder" | "auditor" | "tester"
  group: int            # execution order + parallelism grouping
  instruction: str

Plan:
  subtasks: list[Subtask]

RunResult:
  subtasks: list[Subtask]
  results: dict[subtask_id -> final_text_output]

Session (SQLite):
  workspace: str (PK)
  messages_json: str    # full chat/tool-call history
  updated_at: timestamp
```

---

## Functional Requirements

### Model Router

| ID | Requirement |
| :--- | :--- |
| FR-1 | Given a list of models and an optional API key, attempt each model in order until one succeeds. |
| FR-2 | Support Gemini, xAI Grok, and OpenRouter free-tier models via a single unified interface (litellm). |
| FR-3 | Accept a per-call API key override so different agent roles use different accounts/keys. |
| FR-4 | On total failure (all models fail), raise a distinct error the caller can handle gracefully. |

### Planner

| ID | Requirement |
| :--- | :--- |
| FR-5 | Given a natural-language task, produce a JSON plan: `[{id, role, group, instruction}]`. |
| FR-6 | Mark subtasks as the same group **only** when genuinely independent (no shared files/state). Default to sequential when unsure. |
| FR-7 | On planner failure or malformed output, fall back to a single-subtask plan (whole task → one `coder` subtask). |
| FR-8 | Support **manual plan mode**: user supplies the subtask list directly, bypassing the planner. |

### Worker Agents (Coder / Auditor / Tester)

| ID | Requirement |
| :--- | :--- |
| FR-9 | Each role runs the same core ReAct loop (plan → tool call → observe → repeat) with role-specific system prompt and model chain. |
| FR-10 | Tool access: file read/write, list dir, sandboxed shell exec, code search. (Future: role-specific restrictions.) |
| FR-11 | Loop capped at a configurable max step count to prevent runaway agents. |

### Orchestrator

| ID | Requirement |
| :--- | :--- |
| FR-12 | Execute plan subtasks: same-group subtasks run concurrently; groups run in sequence. |
| FR-13 | Each concurrent subtask gets isolated message history — no shared context between parallel agents. |
| FR-14 | Collect each subtask's final output into a combined result object. |
| FR-15 | Cap max concurrent agents (configurable) to control cost/rate-limit exposure. |
| FR-16 | One subtask's failure must not silently kill sibling subtasks — capture error per-subtask and continue. |

### Sandboxing

| ID | Requirement |
| :--- | :--- |
| FR-17 | All file and shell tools resolve paths against a workspace root; any path that escapes the root is rejected. |
| FR-18 | Shell commands run with a timeout; output truncated to a safe size before feeding back to the model. |
| FR-19 | (Phase 2) Shell execution upgradeable to a container/VM sandbox for stronger isolation. |

### Session / Memory

| ID | Requirement |
| :--- | :--- |
| FR-20 | Conversation history persists per-workspace in SQLite so sessions can resume after restart. |
| FR-21 | Support explicit reset of a workspace's session history. |

### Interfaces

| ID | Requirement |
| :--- | :--- |
| FR-22 | CLI: run a single task, run interactively, run in `--multi` (multi-agent) mode. |
| FR-23 | HTTP webhook (`POST /run`) accepting `{task, workspace}`, returning combined plan + results. |
| FR-24 | (Phase 2) Voice input: local STT transcribes a command into the same task pipeline. |

### Per-Role API Keys

| ID | Requirement |
| :--- | :--- |
| FR-25 | Each role reads its API key from a dedicated env var (e.g. `CODER_API_KEY`); falls back to the provider's shared default key. |

---

## Non-Functional Requirements

| ID | Requirement |
| :--- | :--- |
| NFR-1 | **Cost:** Must run entirely on free-tier API quotas by default; no required paid infrastructure. |
| NFR-2 | **Latency:** Parallel groups should measurably reduce wall-clock time vs. serial execution — verify with benchmarks. |
| NFR-3 | **Safety:** No agent action may touch the filesystem outside its assigned workspace, under any circumstances. |
| NFR-4 | **Resilience:** A single model/provider outage must not crash the whole run — router falls through; orchestrator isolates per-subtask failures. |
| NFR-5 | **Observability:** Every step (which model answered, which tool ran, what it returned) is visible in real time. |
| NFR-6 | **Extensibility:** Adding a new role or model to a chain should be a config change, not a code change. |

---

## API Surface

### `POST /run`

**Request:**
```json
{
  "task": "Build a portfolio website with home/about/contact pages",
  "workspace": "/abs/path"
}
```

**Response:**
```json
{
  "subtasks": [
    { "id": "t1", "role": "coder", "group": 1, "instruction": "..." },
    { "id": "t2", "role": "auditor", "group": 2, "instruction": "..." }
  ],
  "results": {
    "t1": "created index.html ...",
    "t2": "audit passed, no issues found"
  }
}
```

### `GET /health`

```json
{ "status": "ok" }
```

### Also implemented (not part of the original v1 spec, but live in `backend/server.py`)

| Endpoint | Purpose |
| :--- | :--- |
| `POST /plan` | Generate a plan without executing it (plan‑review‑confirm flow in the dashboard). |
| `POST /chat` | Direct single-agent conversational chat (Home Console single-agent mode). |
| `GET /sessions` | Recent workspace sessions, for the sidebar. |
| `GET /agents` | Per-role model chain + status. |
| `GET /agents/{role}` | Detail view for one agent role. |
| `GET /agents/quota` | Real per-provider usage vs. free-tier limits, sourced from router call logs. |
| `GET /files?workspace=` | Sandboxed recursive file tree for a workspace. |
| `GET /integrations` | List connected integrations (GitHub, MCP, generic). |
| `POST /integrations/connect` | Validate + persist a new integration (SQLite-backed). |
| `POST /integrations/disconnect` | Revoke and delete a stored integration. |
| `POST /integrations/reconfigure` | Update an integration's allowed agent roles. |
| `WS /ws` | Real-time event stream (NFR-5) — model calls, tool calls, plan/group/subtask lifecycle, completion. |

If `SHARED_SECRET` is set in `.env`, all of the above (except `/health`) require it via an `X-API-Key` header or `?token=` query param — see [Risks & Open Questions](#risks--open-questions).

---

## Tech Stack

### Dashboard (Frontend)

| Technology | Purpose |
| :--- | :--- |
| [React 19](https://react.dev/) | Component framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Vite](https://vitejs.dev/) | Build tooling & dev server |
| [TailwindCSS v4](https://tailwindcss.com/) | Utility-first styling |
| [Three.js](https://threejs.org/) | Interactive 3D background animation |
| [Lucide React](https://lucide.dev/) | Icon system |
| [React Router v7](https://reactrouter.com/) | Client-side routing |

### Backend (Agent Engine)

| Technology | Purpose |
| :--- | :--- |
| Python 3.11+ | Runtime |
| [litellm](https://github.com/BerriAI/litellm) | Unified LLM interface (Gemini / xAI Grok / OpenRouter) |
| SQLite | Session + integration persistence (`~/.agentcli/sessions.db`) |
| [FastAPI](https://fastapi.tiangolo.com/) + [uvicorn](https://www.uvicorn.org/) | HTTP + WebSocket server (`backend/server.py`) |
| [click](https://click.palletsprojects.com/) | CLI entry point (`backend/cli.py`) |
| `asyncio.Semaphore` / `asyncio.gather` | Parallel subtask execution within groups |

---

## Dashboard UI

The React dashboard is the visual control center for the agent system. It provides:

- **Home Console** (`/`) — Task submission, Planner → Worker DAG visualization, execution status, recent runs.
- **Run Execution** (`/run`) — Real-time subtask progress, log streaming, and execution DAG view.
- **Agent Detail** (`/agent/:role`) — Per-agent configuration, metrics, subtask history, and model assignment.

### Design System

SplitterAI uses a dark, high-density cold-blue developer console interface (Linear/Vercel/VS Code style). See [design.md](design.md) for the full specification.

| Token | Hex | Usage |
| :--- | :--- | :--- |
| `--bg` | `#070A10` | App base background |
| `--panel` | `#0F1420` | Surface cards & panels |
| `--panel-2` | `#151B29` | Input fields, node backgrounds & dropdowns |
| `--border` | `#232B3D` | Default borders |
| `--accent` | `#48B4FF` | Primary active accent, CTAs & focus rings |
| `--good` | `#4DCFB8` | Completed / success status |
| `--bad` | `#FF6E82` | Failed / error status |
| `--wait` | `#8B93FF` | Queued / waiting status |

---

## Project Structure

```text
SplitterAi/
├── backend/                                 # Agent Engine (Python / FastAPI)
│   ├── agentcli/
│   │   ├── config.py                        # Model chains, per-role API key resolution (FR-25)
│   │   ├── schemas.py                       # Pydantic models — Subtask, Plan, RunResult, LogEntry...
│   │   ├── router.py                        # Model router with fallback chain (FR-1..4) + usage metrics
│   │   ├── planner.py                       # Task → Plan decomposition (FR-5..8)
│   │   ├── worker.py                        # Per-role ReAct loop (FR-9..11)
│   │   ├── orchestrator.py                  # Grouped parallel execution (FR-12..16)
│   │   ├── sandbox.py                       # Path-restricted workspace security (FR-17)
│   │   ├── tools.py                         # read_file / write_file / list_directory / run_shell / search_code
│   │   ├── session.py                       # SQLite session persistence (FR-20/21)
│   │   ├── integrations_store.py            # SQLite-backed integration persistence
│   │   └── prompts.py                       # Role-specific system prompts
│   ├── server.py                            # FastAPI app — REST + WebSocket (see API Surface)
│   ├── cli.py                               # `agentcli` command-line interface (FR-22)
│   └── requirements.txt
├── src/                                      # Dashboard (React / Vite)
│   ├── components/
│   │   ├── ui/ai-assistant-interface.tsx    # Home Console — task composer + plan-confirm modal
│   │   ├── Sidebar.tsx                      # Collapsible navigation rail + active sessions
│   │   ├── TopBar.tsx / PageHeader.tsx       # Header chrome
│   │   ├── PlanView.tsx                     # Multi-agent subtask DAG visualization
│   │   ├── LogStream.tsx                    # Real-time execution log terminal
│   │   ├── TerminalPanel.tsx                # Embedded terminal-style output panel
│   │   ├── FileExplorer.tsx                 # Sandboxed workspace file tree
│   │   ├── SplitCanvas.tsx / scene/splitScene.ts   # Home Console's WebGL background scene
│   │   ├── Badges.tsx                       # Shared status & role badges
│   │   ├── ErrorBoundary.tsx                # Per-route error boundary (see App.tsx)
│   │   └── primitives/                      # Button, Modal, Panel, Field, Row, Glyph, EmptyState
│   ├── pages/                                # Projects/Agents/Flow/Integrations routes (see App.tsx)
│   ├── context/                             # AppContext (execution state), UIContext (view state)
│   ├── hooks/                                # useSessions, useAgentRunner, useAgentDetail,
│   │                                         # useWorkspaceFiles, useIntegrations, useMCPServers
│   ├── lib/api.ts                           # REST client + AgentWebSocket (talks to backend/server.py)
│   ├── config.ts                            # API_BASE / WS_URL / DEFAULT_WORKSPACE (VITE_ env vars)
│   ├── data.ts                              # Static role/status metadata + available model list
│   ├── types/index.ts                       # Canonical shared TypeScript types
│   ├── App.tsx                              # Root layout, routes, providers
│   ├── index.css                            # Design system tokens & global styles
│   └── main.tsx                             # React entry point
├── .env.example                             # Single source of truth for backend + frontend env vars
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Getting Started

The dashboard (frontend) is a client for the agent engine (backend) — you need **both** running
for anything beyond the static UI to work.

### Prerequisites

- **Node.js** v18+ and **npm**
- **Python** 3.11+

### 1. Clone & configure

```bash
git clone https://github.com/Prateekiiitg56/SplitterAi.git
cd SplitterAi

# One .env for the whole project — see Configuration below.
cp .env.example .env
# then edit .env and fill in at least one provider API key
```

### 2. Backend (Agent Engine)

```bash
cd backend
pip install -r requirements.txt

# Runs on http://localhost:8000, WebSocket at ws://localhost:8000/ws
python server.py
```

The CLI is also available from the same directory: `python cli.py "Build a REST API with Express"`
(see `python cli.py --help` for `interactive`, `sessions`, and `reset`).

### 3. Frontend (Dashboard)

```bash
# from the project root, in a second terminal
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. It talks to the backend at the `VITE_API_BASE` /
`VITE_WS_URL` configured in `.env` (defaults to `http://localhost:8000` / `ws://localhost:8000/ws`).

> **Note on `node_modules`:** if you're working from a zip/export of this repo rather than a fresh
> `git clone`, delete any bundled `node_modules/` and run `npm install` yourself. Vite 8's bundler
> (`rolldown`) ships platform-specific native binaries as optional dependencies — a `node_modules`
> copied from a different OS/architecture will fail to build with a "Cannot find native binding"
> error until you reinstall on your own machine.

### Available Scripts (frontend)

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Compile TypeScript and build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |

---

## Configuration

There is **one `.env` file, at the project root** (`SplitterAi/.env`, copied from `.env.example`).
`backend/server.py` and `backend/cli.py` both load it explicitly by absolute path, so it doesn't
matter which directory you launch the server or CLI from. `VITE_`-prefixed variables in the same
file are picked up by the frontend build (Vite inlines them into the browser bundle — never put a
secret behind a `VITE_` prefix).

### Environment Variables (Backend — Agent Engine)

```bash
# Provider keys (server-side only). At least one is required.
GEMINI_API_KEY=your_gemini_key
GEMINI_API_KEY_ALT=your_alt_gemini_key      # optional second Gemini key/account
XAI_GROK_API_KEY=your_xai_grok_key
OPENROUTER_SUPER_KEY=your_openrouter_key    # used for nemotron-3-super
OPENROUTER_ULTRA_KEY=your_openrouter_key    # used for nemotron-3-ultra

# Per-role API keys (optional — override the provider key above so
# parallel agents don't share one rate-limit bucket). Leave blank to
# fall back to the provider key resolved from the model name (FR-25).
PLANNER_API_KEY=
CODER_API_KEY=
AUDITOR_API_KEY=
TESTER_API_KEY=

# Execution limits
MAX_STEPS=25              # Max ReAct loop steps per agent
MAX_CONCURRENT_AGENTS=4   # Max parallel subtasks within a group
SHELL_TIMEOUT=30          # Shell command timeout in seconds
OUTPUT_MAX_BYTES=10240    # Shell/tool output truncation size

# Optional server hardening
SHARED_SECRET=            # if set, all endpoints except /health require it
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
```

See `backend/agentcli/config.py` (`DEFAULT_MODEL_CHAINS`, `ROLE_API_KEY_ENVVARS`,
`PROVIDER_KEY_ENVVARS`) for exactly how each variable is resolved — it's the source of truth if
this section ever drifts again.

### Model Chains (per role)

Each role has an ordered fallback chain of models. If the first model fails (rate limit, error, timeout), the router tries the next:

```
planner:  gemini/gemini-3.5-flash → openrouter/nvidia/nemotron-3-ultra-550b-a55b:free
coder:    openrouter/nvidia/nemotron-3-super-120b-a12b:free → xai/grok-2-beta → gemini/gemini-3.5-flash
auditor:  xai/grok-2-beta → gemini/gemini-3.5-flash
tester:   openrouter/nvidia/nemotron-3-super-120b-a12b:free → xai/grok-2-beta
```

Note: **Groq is no longer used anywhere in the code** — an earlier revision of this README described
a Groq-based chain, but the current provider set is Gemini, xAI Grok, and OpenRouter (Nemotron).

---

## Milestones

- [x] Single-agent ReAct loop + sandboxed tools + model router with fallback
- [x] Multi-role config (per-role model chain + API key)
- [x] Planner (auto-decomposition) + Orchestrator (grouped parallel execution)
- [x] n8n webhook endpoint
- [x] Manual plan mode (`--plan file.json` on the CLI, `plan_file` on `POST /run`, `load_manual_plan`)
- [ ] Container-based shell sandbox (Phase 2 hardening)
- [ ] Voice input (local STT) wired into the task pipeline
- [ ] Email/Calendar tools (Gmail API, Google Calendar API) as new roles/tools
- [ ] "Stuck detector" — abort a subtask early if it repeats the same failing tool call N times

---

## Risks & Open Questions

| Risk | Mitigation |
| :--- | :--- |
| **Free-tier rate limits** are the binding constraint | Per-role API keys distribute load; model router falls through on rate limit |
| **Weaker free models loop or hallucinate tool calls** | MAX_STEPS cap + per-subtask isolation; future "stuck detector" |
| **Parallel agents editing overlapping files** | Planner groups only independent subtasks; manual plan mode is the escape hatch |
| **Shell sandbox is path-restricted, not process-isolated** | Phase 2 containerization planned; current mitigation is path validation + timeouts |
| **n8n webhook has no auth in v1** | Must not be exposed beyond localhost/private network without adding a shared-secret check |

---

## License

This project is open-source and available under the [MIT License](LICENSE).
