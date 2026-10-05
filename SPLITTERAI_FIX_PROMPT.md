# SplitterAI: Fix, Harden, Optimise and Verify - Agent Prompt

You are working on the SplitterAI repo (FastAPI + LangGraph backend in `backend/`, React 19 + Vite + Tailwind v4 dashboard in `src/`). Follow `CLAUDE.md` (simplest working solution, read before editing, no speculative features, plain ASCII). Work on branch `claude/loving-wozniak-91cq6m`. Commit in small logical commits, one per numbered section below. Do not open a PR unless asked.

The goal: when a user types a request in the dashboard, the request reliably becomes a plan, the plan runs, files land in the right project folder, the user sees live progress for that run only, and when it finishes the result opens correctly (preview for web projects, file viewer for everything else). Every integration shown in the UI must either really work or be removed.

---

## 0. Baseline first (do this before changing anything)

1. `npm ci && npx tsc --noEmit && npm run build` - record output.
2. `python -m venv .venv && .venv/bin/pip install -r backend/requirements.txt pytest pytest-asyncio && cd backend && ../.venv/bin/python -m pytest -q tests` - record output.
3. Start the app (`python backend/server.py` and `npm run dev`) and walk the flow in section 9 manually with Playwright (Chromium is at `/opt/pw-browsers`; do not run `playwright install` if it is preinstalled, use `executablePath` if versions differ). Write down every step that fails.

Current known baseline (verified): `tsc` and `vite build` pass; pytest gives 16 failures without `pytest-asyncio` and 2 failures with it (both `tests/test_web.py`, Chromium headless-shell binary missing / version mismatch).

---

## 1. Verified bugs and broken things (fix all of these)

### 1A. Test / CI / repo hygiene
- `pytest-asyncio` is not in `backend/requirements.txt`, and there is no `pytest.ini`/`pyproject` with `asyncio_mode`. 14 async tests in `test_graph.py`, `test_coordinator.py`, `test_token_savings.py`, `test_web.py` fail with "async def functions are not natively supported". Add a `backend/requirements-dev.txt` (pytest, pytest-asyncio) and `backend/pytest.ini` with `asyncio_mode = auto`.
- `.github/workflows/ci.yml` runs only 5 test files as `python backend/tests/x.py` scripts. Most test files have no `__main__` and never run in CI (`test_graph`, `test_coordinator`, `test_web`, `test_api_keys`, `test_allocation`, `test_project_manage`, `test_token_savings`). Replace with one `pytest -q backend/tests` step, install dev deps, and install Playwright Chromium (`python -m playwright install --with-deps chromium`) so `test_web.py` runs.
- `test_web.py::test_screenshots_reach_the_model_as_images` crashes with `TypeError: string indices must be integers` when the browser check fails, because the worker sends a plain-text message instead of the image list. Make the test skip cleanly when Chromium is unavailable (`pytest.importorskip` / a fixture that tries `chromium.launch()`), and make the worker never append a screenshot message when no screenshot file exists.
- `playwright>=1.45` is unpinned, so the Python package and installed browser drift apart. Pin a version and document the install command in README.
- 32 `__pycache__/*.pyc` files and `tsconfig.tsbuildinfo` are committed even though `.gitignore` lists them. `git rm -r --cached` them.
- README still calls the project "AgentCLI"; update name, setup, env vars and the run flow.

### 1B. Backend: the run pipeline
- `POST /run` (`backend/server.py` `run_task`) runs the whole multi-agent job inside one HTTP request. The frontend waits up to 15 minutes (`runTask` timeout 900000 in `src/lib/api.ts`), then aborts while the backend keeps running. A page refresh loses the run completely. There is no run id, no status endpoint, no cancel. Fix: `POST /runs` returns `{run_id, workspace}` immediately and starts the job with `asyncio.create_task`; add `GET /runs/{id}` (status + result), `POST /runs/{id}/cancel`, and keep a bounded in-memory registry of active runs (persist finished results through the existing `save_run_result`). Keep `POST /run` as a thin compatibility wrapper for n8n that awaits the job.
- WebSocket events are broadcast to every client with no run or workspace id (`make_event_emitter`, `manager.broadcast`). Two tabs or two runs mix their logs, and a `complete` event from another run overwrites the current UI. Add `run_id` and `workspace` to every LogEntry/plan/complete message and filter on the client.
- In `run_task`, an invalid `strategy` is rejected only after `generate_plan` has already spent an LLM call. Validate input before any model call.
- `make_event_emitter` uses `asyncio.get_event_loop()` + `run_coroutine_threadsafe` even when called on the loop thread; switch to `asyncio.get_running_loop()` and `loop.call_soon_threadsafe` / `create_task` as appropriate.
- `graph.py` `run_graph`: when the verifier crashes or never prints a verdict, `verdict = "unknown"` and the run is reported as `done`. A run whose final repair failed is also `done`. Treat `unknown` as not-verified (surface it as a warning status in the UI) and count a failed last repair as an error.
- `/plan` and `/run` both plan the task: the UI calls `/plan`, then `/run` with confirmed subtasks, which is fine, but `/run` without subtasks calls `generate_plan` while `/plan` calls `run_analysis` - two different planners. Use `run_analysis` in both so plans and estimates match.
- `/agents/{role}` returns hardcoded fake data (`status: idle`, `successRate: 100`, `stepsCompleted: 0`, empty logs). Compute it from `telemetry` and session history or remove the fields the UI cannot back with real data.
- `/chat` has system prompts for 4 roles only; `designer` falls back to a generic prompt. It also cannot do any work (no tools). See 1D for how chat must hand off to the run pipeline.
- `router.py`: `ROUTER_CALL_LOG` and `PLANNER_CACHE` are unbounded module-level lists/dicts (memory leak on a long-lived server). Cap them (deque / LRU with TTL). `PLANNER_CACHE` returns the same dict object the caller may mutate; return a copy.
- `router.py` transient-error detection checks `"timeout"` case-sensitively against a 200-char truncation; litellm raises `Timeout`/`APITimeoutError`. Match on exception type (`litellm.Timeout`, `litellm.RateLimitError`, `litellm.ServiceUnavailableError`, `litellm.APIConnectionError`) instead of string sniffing.
- `config.py` model ids (`gemini/gemini-3.5-flash`, `nemotron-3-ultra-550b-a55b:free`, `qwen3.8-27b:free`, etc.) are hardcoded and duplicated in `src/data.ts` `AVAILABLE_MODELS`. Verify each id against the live provider model lists (OpenRouter `/api/v1/models`, Gemini `models.list`), drop dead ones, and serve the list from a new `GET /models` endpoint so the frontend never hardcodes it.
- `.env.example` is out of sync with `config.py`: it lacks `GEMINI_API_KEY_2/3`, `OPENROUTER_KEY_BIG/REASON/VISION/CODE/FAST`, `DESIGNER_API_KEY`, `MODEL_TIMEOUT`, `STEP_TIMEOUT`, `SHARED_SECRET`, `ALLOWED_ORIGINS`, `RATE_LIMIT_PER_MINUTE`. Also the server loads `.env` from the repo root while `.env.example` lives in `backend/`. Pick one location and document it.
- On startup, if no provider key at all is set, every run fails deep inside the router. Fail fast: `/health` should report `llm_ready: false` with which keys are missing, and the UI should show it.

### 1C. Backend: sandbox and security
- `tools.run_shell` uses `shell=True` with only `cwd` set to the workspace. The "sandbox" protects file tools only; the shell can `cat ../../.env`, `cat ~/.agentcli/sessions.db`, `rm -rf ..`, read `/etc`, or curl anywhere. At minimum: run with a denylist for paths outside the workspace is not enough, so run commands under a restricted runner (bubblewrap/firejail if available, else a Docker container per workspace, else at least `os.setsid` + resource limits + an allowlist of binaries: node, npm, npx, python, pytest, ls, cat, etc.). Never expose the repo `.env`.
- The comment says "process tree termination on timeout" but `proc.kill()` only kills the shell; `npm`/`vite` children survive. Start with `start_new_session=True` and kill the process group (`os.killpg`) on timeout (use `taskkill /T` on Windows).
- `run_python` writes scripts into a shared temp dir keyed by code hash and never cleans it up.
- `Sandbox(resolve_workspace(workspace))` accepts any absolute path the client sends to `/run` and `/files`. Restrict workspaces to `PROJECTS_ROOT` and `DEFAULT_WORKSPACES_ROOT` (same rule `export_workspace` already uses).
- `/preview` has no auth while every other route checks `SHARED_SECRET`. Accept `?token=` on preview too, or serve previews on a separate origin.
- `allow_credentials=True` with `allow_headers=["*"]` is fine for localhost only; make `ALLOWED_ORIGINS` required in non-dev mode.
- Integration secrets: GitHub tokens are validated and then thrown away (see 1E). When you start storing them, encrypt at rest (Fernet key from env) and never return them from `GET /integrations`.

### 1D. Frontend: the "user asks it to do work" flow is broken
- `ConsolePage.tsx` `isMultiAgentSplitRequest` decides by keyword (`split`, `together`, `build a`, `do this`...) whether a message is real work or chat. "Make me a todo app", "write a python script that...", "fix the bug in app.js", "add dark mode" all go to `/chat`, which only returns text and writes nothing. Replace the keyword list with a backend intent classifier (`POST /intent` -> `{intent: "task" | "chat", confidence}` using the planner model with a tiny prompt, falling back to "task" for imperative requests) plus an explicit "Run as task" button on every chat reply.
- `src/components/ui/ai-assistant-interface.tsx` duplicates the ConsolePage flow (~same plan/chat/launch code) but does not pass `stack` or `strategy`. Delete the duplicate or make both use one shared hook (`useTaskComposer`).
- Every launch hardcodes `DEFAULT_WORKSPACE` and `navigate('/projects/default')`. Routes like `/projects/:projectId` exist but `projectId` is ignored, so you cannot run follow-up work on an existing project from the console, and a deep link or refresh opens the wrong project. Make `projectId` the workspace folder name, navigate to `/projects/<folder>` once the backend returns the new workspace, and let follow-up messages run in the current project's workspace.
- `handleUpload` in ConsolePage calls `uploadWorkspace(file)` and discards the returned `workspace`. Uploaded projects never become the current project, never get a session row, and cannot be previewed (preview only serves `PROJECTS_ROOT`). Open the uploaded workspace as the current project and make preview/export/files work for both roots.
- The Team/Solo toggle (`multiMode` in `UIContext`, used in `ProjectOverviewPage`) is never sent to the backend; it does nothing. Wire it to `agent_count`/strategy (Solo = 1 agent, one coder subtask) or remove it.
- `useAgentRunner.executeTask` never sets `runReport` from the result (`setRunReport(null)` unconditionally).
- `useAgentRunner` updates subtasks from both the HTTP result and the WS `complete` message; with the async run API make WS the single source of truth and use `GET /runs/{id}` to resync after reconnect or refresh.
- The same subtask-mapping block is copy-pasted 4 times in `useAgentRunner.ts`; extract one `toSubtask()` helper.
- The frontend never sends `X-API-Key` and the WS URL has no `?token=`. If `SHARED_SECRET` is set on the server, the whole dashboard breaks with 401s. Add `VITE_SHARED_SECRET` support (or a settings field stored in localStorage) to `fetchWithTimeout` and `AgentWebSocket`.

### 1E. Frontend + backend: integrations are mostly fake
- Agents never use integrations. `grep` shows nothing in `worker.py`, `tools.py`, `graph.py` reads `INTEGRATIONS_STORE` or `allowedRoles`. Connecting GitHub/MCP/Supabase changes only a list in the UI.
- GitHub connect (`/integrations/connect`) validates the token then discards it, and silently defaults the repo to `Prateekiiitg56/SplitterAi` when none is given.
- MCP connect only does an HTTP `HEAD` on the URL; there is no MCP client. `sse://` and `stdio://` are marked `pending_verification` forever.
- The "oauth_generic" branch marks any unknown type as `connected` with fake scopes.
- `src/hooks/useMCPServers.ts` ships hardcoded fake servers (Blender, Game Asset Gen, Three.js DevTools) with fake tool counts, stored in localStorage, never talking to the backend.
- `src/components/TopBar.tsx` shows a hardcoded "Provider quotas mock" (OpenAI 64%, Gemini 28%, Claude 85%) even though `/agents/quota` returns real usage.
- `TerminalPanel.tsx` looks like a terminal but just calls `executeTask(cmd)`; label it as a task prompt or make it a real (sandboxed) shell via the backend.
- `FileExplorer.tsx` preview drawer always shows "File content preview for X. Click to open in main editor panel." because there is no endpoint to read a file. Add `GET /files/content?workspace=&path=` (sandboxed, size-capped, binary-safe) and render it with syntax highlighting.

### 1F. Opening the result
- Preview button (`ProjectOverviewPage.tsx`) builds the folder with `split('workspace_output/')[1]`, which fails for uploaded workspaces and Windows paths, and uses `encodeURIComponent(folder)` which turns nested paths into `%2F`.
- Nothing opens automatically when a run finishes; the user has to find the Preview button.
- Non-web tasks (Python script, CLI tool, API) always get "Nothing to preview yet" because preview only looks for `index.html`.
- React projects preview `dist/index.html` only if the agent remembered to run `npm run build`; otherwise preview shows the raw Vite `index.html` with a broken `/src/main.jsx`.
- `/preview` treats loose files directly in `workspace_output/` as `__no_project__`, which is fine, but returns HTTP 200 HTML for a missing project; return 404 for unknown project folders.

---

## 2. Fix order

1. Section 1A (tests green locally and in CI) - everything after this must keep `pytest`, `tsc --noEmit`, `npm run build` green.
2. Async run API + run-scoped events (1B first two bullets) and the matching frontend changes (1D runner bullets).
3. Task routing in the console: intent classification, real `projectId` routing, follow-up runs on existing projects, upload -> open project.
4. Result opening (1F + section 5).
5. Sandbox/security (1C).
6. Integrations (section 4).
7. Optimisation (section 3).
8. Cleanup of fake UI (TopBar quota mock, fake MCP list, fake agent stats, Team/Solo).

Write or update a test for every bug you fix. Backend: pytest with `call_model` patched (follow the style of `tests/test_graph.py`). Frontend: add Vitest + React Testing Library for `useAgentRunner` and the console submit logic, and one Playwright e2e test for the full flow with the backend's model calls stubbed (add an env flag like `SPLITTER_FAKE_LLM=1` that makes `call_model` return scripted tool calls that write `index.html`).

---

## 3. Performance and speed

- Planning: `/plan` uses the "quality" reasoning chain for every request. For short tasks (under ~200 chars, single deliverable) use a fast model and skip analysis branches that are unused.
- Router: stop the fixed `asyncio.sleep(1)` between fallback models; on a 429 honor `Retry-After`; put a per-model circuit breaker in front of known-dead models so a run does not burn a full timeout on each one (telemetry already tracks success rate, use it).
- Pass `max_tokens` and `temperature` per role; coders writing whole files need a high cap, verifier/synthesizer need little.
- Stream model responses (`stream=True`) for chat and synthesis so the UI shows tokens as they arrive.
- Worker: `compact_history` runs on every step and re-measures the whole history with `json.dumps`; track size incrementally.
- `search_code` reads every file under the workspace on each call; use `ripgrep` when available, fall back to the Python scan.
- `/files` walks the whole tree on every poll (`useWorkspaceFiles`). Add an mtime-based cache or push file changes over the WebSocket (the worker already knows every `write_file`), and stop polling.
- `useSessions` polls `/sessions`; push session updates over the WS instead.
- Templates: `apply_template` copies files once, fine; but React projects run `npm install` per project. Cache `node_modules` via a shared npm cache dir (the shell scratch HOME is per-workspace, so the cache is never reused) or use `npm ci --prefer-offline` with a shared `npm_config_cache`.
- Frontend bundle: `vendor-three` is 517 kB and loaded for the landing page shader. Lazy-load three/gsap/animejs only on routes that use them; ship both `framer-motion` and `motion` is redundant - keep one. Same for `lucide-react` + `@phosphor-icons/react` + `simple-icons`: pick one icon set where possible. Target: main route JS under 300 kB gzip.
- SQLite: `session.py` and `integrations_store.py` open a new connection and re-run migrations on every call. Open once per process (or cache with `functools.lru_cache`) and run migrations at startup.
- Move blocking calls off the event loop: `list_sessions`, `save_run_result`, `build_tree` in `/files`, Supabase calls all run synchronously inside async routes. Wrap them in `asyncio.to_thread`.

---

## 4. Integrations that must really work

For each integration, the agent tool layer must expose it to the roles listed in `allowedRoles`, and the UI must show real status from the backend. Remove anything you cannot make real.

1. **GitHub**: store the token encrypted. Add agent tools `github_clone(repo)` (clone into a new workspace), `github_create_branch`, `github_commit_and_push`, `github_open_pr`. Add a UI action "Import from GitHub" next to zip upload and "Push to GitHub" next to export. Respect token scopes; show the real error from the GitHub API.
2. **MCP servers**: implement a real client with the official `mcp` Python SDK (stdio and streamable HTTP/SSE). On connect, run `initialize` + `tools/list`, store the tool list, show the real tool count. At run time, convert MCP tools into OpenAI function definitions, append them to `TOOL_DEFINITIONS` for allowed roles, and route calls through the client with a timeout. Replace `useMCPServers` fake data with `GET /integrations?type=mcp`.
3. **Supabase Storage**: on run completion optionally upload the project zip to the bucket and return a signed URL; show it in the run result.
4. **n8n**: `POST /workflows/import-n8n` exists; also document and test the inbound webhook (`POST /run` with `SHARED_SECRET`) and add an outbound webhook option (`callback_url` on the run request, POSTed with the result when the run ends) so n8n does not need to hold a 15-minute HTTP request.
5. **Deploy/preview**: add a one-click "Deploy" for static web projects (Netlify or Vercel API via token integration, or GitHub Pages through the GitHub integration). Optional but listed in the UI only if implemented.
6. Delete the `oauth_generic` fake branch; unknown types return 400.

Every integration needs: connect validation, encrypted storage, disconnect that really revokes/deletes, a "Test connection" button that hits the backend, and a pytest with `httpx` mocked.

---

## 5. Result opening rules (implement exactly)

When a run reaches `done` (or `error` with files written):
- Web project (index.html or dist/index.html exists): open the preview in an in-app iframe panel on the project page automatically and offer "Open in new tab". For React, if `package.json` exists and `dist/` is missing or older than `src/`, run `npm run build` in the sandbox before reporting done, and fail the verifier if the build fails.
- Python/Node script or CLI: open the file viewer on the main entry file and show a "Run" button that executes it in the sandbox and streams output to the terminal panel.
- Any project: show the file tree with changed files highlighted (the WS already knows written paths), the synthesis summary, verifier verdict and issues, plus Export zip.
- Preview URLs must be built from the backend-returned project id, never by string-splitting the path, and must work for both `workspace_output/` projects and uploaded/imported ones.

---

## 6. Things the product needs that are missing

- Cancel button for a running job (wired to `POST /runs/{id}/cancel`, which cancels the graph task and kills child processes).
- Re-run / continue: "Ask a follow-up" on a finished project runs a new task in the same workspace with the previous synthesis as context.
- Per-run history on the project page (list of runs from `sessions.db`, each with its log and result).
- Settings page: provider keys status (from `/health`), shared secret, default model, default stack, concurrency. No raw keys sent to the browser.
- Clear empty/error states when the backend is down, when no LLM key is configured, and when every model in the chain failed (show which models were tried and why, from `AllModelsFailedError.attempts`).
- Structured logging with run_id on the backend; `/health` includes version and uptime.
- A `Makefile` or `npm run dev:all` that starts backend and frontend together.

---

## 7. Do not

- Do not skip, disable or delete failing tests to get green.
- Do not add abstractions for single-use code; follow `CLAUDE.md`.
- Do not hardcode model ids, quotas, or fake stats anywhere in the frontend.
- Do not commit secrets, `.env`, `__pycache__`, `dist`, or `tsbuildinfo`.

---

## 8. Self-check before each commit

- `cd backend && pytest -q tests` - all green (including `test_web.py` with Chromium installed).
- `npx tsc --noEmit && npm run build` - green, no new chunk-size warnings for the main route.
- `npx vitest run` - green.
- Re-read the diff: any new endpoint has auth, input validation, and a test.

---

## 9. End-to-end verification (must pass, record evidence)

Run backend with `SPLITTER_FAKE_LLM=1` first, then once with a real key. Use Playwright against `npm run dev` and capture a screenshot at each step. Every step below must pass.

1. Open `/console`. Backend down -> clear "backend unreachable" banner. Backend up, no key -> "no LLM key configured" banner.
2. Type "make a todo app with dark mode" (no keyword like "build a"). It must produce a plan, not a chat reply.
3. Plan shows subtasks, roles, dependency groups and strategy estimate. Edit one subtask, remove a role, confirm.
4. You land on `/projects/<new-folder>` (not `/projects/default`). Live log shows only this run's events. Open a second tab and start a different run: logs do not mix.
5. Refresh the page mid-run: the run state and log come back from `GET /runs/{id}`. Cancel works and stops child processes.
6. On completion: preview iframe opens automatically and the todo app works (add item, toggle, dark mode). "Open in new tab" works. Verifier verdict is shown.
7. Ask a follow-up "add a clear-completed button" from the project page: it runs in the same folder, reads existing files, and the preview updates.
8. Task "write a python script that prints the first 20 primes": the file viewer opens `primes.py`, Run shows the output.
9. Task "build a react counter with vite": `dist/` is built, preview shows the working counter.
10. Upload a zip: it becomes the current project, files show, preview works, a follow-up task edits it.
11. Export zip downloads and contains the project files without `node_modules`/`.splitter`.
12. Connect GitHub with a real token: repo list loads, "Push to GitHub" creates a branch and commit. Connect an MCP server (e.g. the reference `@modelcontextprotocol/server-everything` over stdio): real tool count shows, and an agent can call one of its tools during a run (visible in the log).
13. Set `SHARED_SECRET`: dashboard still works with `VITE_SHARED_SECRET`, and requests without it get 401.
14. Agent tries `run_shell("cat ../../.env")` (scripted via fake LLM): blocked, logged as sandbox block.

When done, report: the list from section 1 with each item marked fixed / removed / not fixed (with reason), test counts before and after, bundle sizes before and after, and the e2e results with screenshots.
