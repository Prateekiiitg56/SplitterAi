# SplitterAI

A personal, model-agnostic multi-agent system that takes a high-level task, breaks it into subtasks, and runs those subtasks through specialist AI agents — each backed by a **free** LLM with its own API key.

Independent subtasks run in parallel. Dependent subtasks run in sequence. The system is triggerable via CLI, an HTTP webhook (for n8n), and later, voice.

**Analogy:** A Planner hands out tickets to specialist workers (Coder / Auditor / Tester). Workers whose tickets don't touch the same files work simultaneously. Workers whose tickets depend on another ticket's output wait their turn. A final step combines everyone's output into one result.

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
- [Deploying](#deploying)
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

### Run flow

1. The dashboard sends the console message to `POST /intent`. A task becomes a plan via `POST /plan`
   (editable in the UI); a question gets a chat reply (`POST /chat/stream`) with a "Run as task" button.
2. `POST /runs` with the confirmed subtasks returns `{run_id, workspace}` at once and starts the job in
   the background. `workspace: "./workspace_output"` means "new project" (a new folder is created);
   any other value must be an existing project folder (follow-up work, which also gets the previous
   run's summary as context).
3. Progress arrives over `WS /ws`; every message carries `run_id` and `workspace`, and the dashboard
   follows only its own run. `GET /runs/{id}` returns status, plan, log and result, so a refresh or a
   reconnect resumes the run. `POST /runs/{id}/cancel` stops it and kills its shell commands.
4. When the run ends, `GET /projects/info?workspace=` tells the dashboard what to open: the preview
   (`/preview/<project id>/`) for web projects, otherwise the main source file (with a Run button).

```json
POST /runs
{ "task": "make a todo app with dark mode", "workspace": "./workspace_output",
  "subtasks": [{ "id": "t1", "role": "coder", "group": 1, "instruction": "..." }],
  "strategy": "balanced", "agent_count": 2, "stack": "tailwind", "model": null,
  "callback_url": "https://n8n.example/webhook/..." }
-> { "run_id": "3f2a9c1d7b4e", "workspace": "./workspace_output/make-a-todo-app-1a2b3c" }
```

`POST /run` takes the same body and waits for the `RunResult` (for n8n and scripts that want one
blocking call). With `callback_url`, the `RunResult` is also POSTed there when the run ends, so n8n
does not have to hold a long HTTP request.

### Endpoints

| Endpoint | Purpose |
| :--- | :--- |
| `GET /health` | Version, uptime, `llm_ready` and per-provider key presence, sandbox status (no auth, no secrets). |
| `POST /intent` | `{intent: "task" \| "chat", confidence}` for a console message. |
| `POST /plan` | Plan + strategy estimates without executing. |
| `POST /runs`, `GET /runs/{id}`, `GET /runs?workspace=`, `POST /runs/{id}/cancel` | Background runs and run history. |
| `POST /run` | Blocking run (inbound webhook). |
| `POST /chat`, `POST /chat/stream` | Chat with one role (text only; streamed as server-sent events). |
| `GET /models` | Models the router uses, for the model pickers. |
| `GET /sessions`, `PATCH /sessions`, `DELETE /sessions` | Projects: list, rename, delete (folder included). |
| `GET /files?workspace=`, `GET /files/content?workspace=&path=` | File tree and one file's content (sandboxed, size-capped). |
| `GET /projects/info?workspace=`, `POST /projects/run-file` | What to open after a run; run a .py/.js file in the sandbox. |
| `GET /preview/<project id>/...` | Serves a project (its `dist/` when built). |
| `POST /workspaces/upload`, `GET /workspaces/export` | Import a zip as a project; download a project zip. |
| `GET /integrations`, `POST /integrations/connect`, `/test`, `/disconnect`, `/reconfigure` | GitHub, MCP and Supabase Storage connections. |
| `GET /integrations/github/repos`, `POST /integrations/github/import`, `POST /integrations/github/push` | Import a repo as a project; push a project as a branch. |
| `GET /agents`, `GET /agents/{role}`, `GET /agents/quota` | Model chains, a role's track record, per-model usage. |
| `POST /workflows/import-n8n` | Turn an n8n workflow export into a plan. |
| `WS /ws` | Run events, plus `sessions_changed` and `file_written` pushes. |

If `SHARED_SECRET` is set, everything except `/health` needs it as an `X-API-Key` header or `?token=`
(the dashboard sends it when `VITE_SHARED_SECRET` is set or it is saved on the Settings page).

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
├── Dockerfile / render.yaml                 # Backend image and its Render Blueprint (see Deploying)
├── vercel.json                              # Dashboard on Vercel (SPA fallback, asset caching)
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

# One .env for the whole project (see Configuration below)
cp .env.example .env
# then edit .env and fill in at least one provider API key
```

### 2. Backend (Agent Engine)

```bash
python -m venv .venv
. .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r backend/requirements-dev.txt

# Browser for the agents' browser_check tool and tests/test_web.py.
# playwright is pinned in requirements.txt so package and browser stay in sync.
python -m playwright install --with-deps chromium   # Windows/macOS: drop --with-deps

# Runs on http://localhost:8000, WebSocket at ws://localhost:8000/ws
python backend/server.py
```

The CLI is also available: `python backend/cli.py "Build a REST API with Express"`
(see `python backend/cli.py --help` for `interactive`, `sessions`, and `reset`).

Run the backend tests from `backend/` (`pytest.ini` sets `asyncio_mode = auto`):

```bash
cd backend && pytest -q tests
```

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
| `npm run dev:all` | Start the backend and the dashboard together |
| `npm test` | Run the frontend tests (Vitest) |
| `npm run build` | Compile TypeScript and build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |

---

## Configuration

There is **one `.env` file, at the project root** (copy `.env.example`). `backend/server.py` and
`backend/cli.py` load it by absolute path, so the start directory does not matter. `.env.example`
lists every variable the backend reads, grouped and commented: provider keys (at least one Gemini or
OpenRouter key), per-role keys, execution limits, the shell sandbox, server hardening, Supabase and
the `VITE_` values for the dashboard. Never put a secret behind a `VITE_` prefix: those are built
into the browser bundle (`VITE_SHARED_SECRET` is the one deliberate exception, for a dashboard you
host yourself).

The Settings page shows which providers have a key, whether the sandbox works and how many agents
run at once, without ever sending a key to the browser.

### Shell sandbox

Agents' shell commands run under [bubblewrap](https://github.com/containers/bubblewrap): only the
project folder (as `/workspace`), a shared npm cache and read-only system folders exist inside. The
repo, its `.env`, the session database and your home folder are not reachable. On Windows bubblewrap
runs inside a WSL distro:

```powershell
wsl --install -d Ubuntu            # or import a rootfs with wsl --import
wsl -d Ubuntu -u root -- bash -c "apt-get update && apt-get install -y bubblewrap ripgrep python-is-python3 && mkdir -p /var/cache/splitter-npm && chmod 777 /var/cache/splitter-npm"
# Node 20.19+ inside the distro (for Vite projects), e.g. the official tarball into /usr/local
```

On Linux install `bubblewrap`. Without a working sandbox, shell commands are refused unless you set
`SPLITTER_SANDBOX=none` (no isolation). `/health` reports the sandbox state.

### Model chains

Each role has an ordered fallback chain (`DEFAULT_MODEL_CHAINS` in `backend/agentcli/config.py`); the
planner and per-strategy chains are picked by capability and reliability history
(`backend/agentcli/models.py`). Ids were checked against the live OpenRouter and Gemini model lists;
`GET /models` serves them to the dashboard. Models that keep failing are skipped for a few minutes.

---

## Deploying

Free setup: the dashboard on **Vercel**, the backend on **Render**. The backend can't go on Vercel: it
keeps WebSocket connections open, keeps runs going after the request returns and writes projects to
disk. Deploy the backend first, because the dashboard needs its URL.

### 1. Backend on Render

1. Render dashboard > **New > Blueprint** > pick this repo. `render.yaml` creates the
   `splitterai-backend` web service (free plan) from the `Dockerfile`.
2. Fill in the variables it asks for:
   - `ALLOWED_ORIGINS`: the dashboard's URL, no trailing slash. Vercel's is
     `https://<vercel-project-name>.vercel.app`, so you can set it now and fix it after step 2 if it differs.
   - `GEMINI_API_KEY` and/or `OPENROUTER_API_KEY` (at least one). Add any other key from `.env.example`
     under **Environment** later.
   - `SHARED_SECRET` is generated for you. Copy it from **Environment**; the dashboard needs it.
3. When the deploy is live, open `https://<service>.onrender.com/health`: `llm_ready` should be `true`.

The server refuses to start without `ALLOWED_ORIGINS` and `SHARED_SECRET` (the image sets
`SPLITTER_ENV=production`).

What the free plan means:

- **It sleeps** after about 15 minutes without traffic; the next visit waits about a minute while it
  wakes up. A run in progress when it sleeps or redeploys is lost.
- **The disk is wiped** on every restart, sleep and deploy: generated projects and run history go with it.
  Download a project (zip) or push it to GitHub from the dashboard to keep it. Setting `SUPABASE_URL` and
  `SUPABASE_KEY` syncs sessions to Supabase.
- **No bubblewrap**, so `render.yaml` sets `SPLITTER_SANDBOX=none`: agents' shell commands run directly in
  the container. They can't reach your machine, but they can read the server's environment, including the
  provider keys.
- **512 MB of memory**: `MAX_CONCURRENT_AGENTS` is 2 and the image has no Chromium, so the agents'
  `browser_check` reports an error instead of running.

### 2. Dashboard on Vercel

1. Vercel > **Add New > Project** > import this repo. It is detected as Vite; `vercel.json` sends every
   route (`/projects/...`) to the app.
2. Add the environment variable `VITE_API_BASE=https://<service>.onrender.com`. The WebSocket URL
   (`wss://<service>.onrender.com/ws`) is derived from it. `VITE_` values are built in, so redeploy after
   changing one.
3. Deploy, open the site, go to **Settings** and paste the `SHARED_SECRET`. It is kept in that browser.
   **Don't set `VITE_SHARED_SECRET` on Vercel**: it would be built into the public JavaScript, where anyone
   can read it.

"Backend unreachable" in the dashboard means `VITE_API_BASE` is wrong, the backend is still waking up, or
the dashboard's URL is not in `ALLOWED_ORIGINS` (exact match, comma-separated; add Vercel preview URLs
there if you use them).

The project preview is embedded from the Render domain, so it needs third-party cookies: it works in
Chrome and Firefox, but Safari may show it unstyled; use "Open in new tab" there.

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
