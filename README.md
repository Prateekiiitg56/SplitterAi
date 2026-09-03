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
| FR-2 | Support Gemini, OpenRouter, and Groq free-tier models via a single unified interface (litellm). |
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
| [litellm](https://github.com/BerriAI/litellm) | Unified LLM interface (Gemini / OpenRouter / Groq) |
| SQLite | Session persistence |
| FastAPI / Flask | HTTP webhook endpoint for n8n |
| ThreadPoolExecutor | Parallel subtask execution within groups |

---

## Dashboard UI

The React dashboard is the visual control center for the agent system. It provides:

- **Home Console** (`/`) — Task submission, Planner → Worker DAG visualization, execution status, recent runs.
- **Run Execution** (`/run`) — Real-time subtask progress, log streaming, and execution DAG view.
- **Agent Detail** (`/agent/:role`) — Per-agent configuration, metrics, subtask history, and model assignment.

### Design System

The interface uses a curated 5-color warm cinematic palette with a dark sidebar + light content split:

| Color | Hex | Usage |
| :--- | :--- | :--- |
| Deep Teal | `#244855` | Sidebar background, primary text, brand identity |
| Coral | `#E64833` | Primary CTA, active states, accent indicators |
| Warm Brown | `#874F41` | Secondary text, borders, metadata |
| Sage | `#90AEAD` | Muted labels, model tags, tertiary text |
| Warm Cream | `#FBE9D0` | Content canvas, sidebar text highlights |

---

## Project Structure

```text
SplitterAi/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   └── ai-assistant-interface.tsx   # Home Console — task composer + agent DAG
│   │   ├── Background3D.tsx                 # Three.js interactive 3D constellation
│   │   ├── Sidebar.tsx                      # 264px navigation rail
│   │   ├── TopBar.tsx                       # Frosted breadcrumb header
│   │   ├── PlanView.tsx                     # Multi-agent subtask DAG visualization
│   │   ├── LogStream.tsx                    # Real-time execution log terminal
│   │   ├── TaskInput.tsx                    # Task instruction input
│   │   ├── FileExplorer.tsx                 # Sandboxed workspace file tree
│   │   ├── QuotaBar.tsx                     # API rate-limit monitor
│   │   └── Badges.tsx                       # Shared status & role badges
│   ├── pages/
│   │   ├── HomePage.tsx                     # Home Console page wrapper
│   │   └── AgentPage.tsx                    # Individual agent detail page
│   ├── data.ts                              # Domain models, mock data & type definitions
│   ├── App.tsx                              # Root layout, routes, global state
│   ├── index.css                            # Design system tokens & global styles
│   └── main.tsx                             # React entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+ and **npm**

### Installation

```bash
# Clone the repository
git clone https://github.com/Prateekiiitg56/SplitterAi.git
cd SplitterAi

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Compile TypeScript and build production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |

---

## Configuration

### Environment Variables (Backend — Agent Engine)

```bash
# Per-role API keys (each agent uses its own key to avoid shared rate limits)
PLANNER_API_KEY=your_gemini_key
CODER_API_KEY=your_openrouter_key
AUDITOR_API_KEY=your_groq_key
TESTER_API_KEY=your_gemini_key_2

# Fallback (used if per-role key is not set)
GEMINI_API_KEY=your_default_gemini_key
OPENROUTER_API_KEY=your_default_openrouter_key
GROQ_API_KEY=your_default_groq_key

# Execution limits
MAX_STEPS=25              # Max ReAct loop steps per agent
MAX_CONCURRENT_AGENTS=4   # Max parallel subtasks within a group
SHELL_TIMEOUT=30          # Shell command timeout in seconds
```

### Model Chains (per role)

Each role has an ordered fallback chain of models. If the first model fails (rate limit, error, timeout), the router tries the next:

```
planner:  gemini/gemini-2.5-flash → openrouter/google/gemini-2.0-flash-exp:free
coder:    groq/llama-3.1-70b-versatile → openrouter/meta-llama/llama-3.1-70b-instruct:free
auditor:  gemini/gemini-2.5-flash → groq/llama-3.1-70b-versatile
tester:   groq/llama-3.1-70b-versatile → gemini/gemini-2.5-flash
```

---

## Milestones

- [x] Single-agent ReAct loop + sandboxed tools + model router with fallback
- [x] Multi-role config (per-role model chain + API key)
- [x] Planner (auto-decomposition) + Orchestrator (grouped parallel execution)
- [x] n8n webhook endpoint
- [ ] Manual plan mode (user hand-writes the subtask list)
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
