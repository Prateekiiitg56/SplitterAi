import { defineConfig } from '@playwright/test'

// End-to-end flow (README "Run flow"). By default the backend runs with the scripted fake model
// (SPLITTER_FAKE_LLM=1) so the test needs no provider keys. E2E_MODE=real reuses servers you started
// yourself with real keys in .env (start them first; nothing is launched).
const real = process.env.E2E_MODE === 'real'
const python = process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : '.venv/bin/python'

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'e2e-results',
  timeout: real ? 900_000 : 420_000,
  expect: { timeout: real ? 300_000 : 60_000 },
  workers: 1,
  use: { baseURL: 'http://localhost:5173', viewport: { width: 1440, height: 900 } },
  webServer: real
    ? undefined
    : [
        {
          command: `${python} backend/server.py`,
          url: 'http://localhost:8000/health',
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            SPLITTER_FAKE_LLM: '1',
            SPLITTER_FAKE_LLM_DELAY: '1',
            SPLITTER_DATA_DIR: `e2e/.data/${Date.now()}`, // fresh sessions DB and integrations per run
            // Local session store only: the test must not depend on (or write to) a Supabase project.
            SUPABASE_URL: '',
            SUPABASE_KEY: '',
            ...(process.env.E2E_SHARED_SECRET ? { SHARED_SECRET: process.env.E2E_SHARED_SECRET } : {}),
          },
        },
        { command: 'npx vite --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: false, timeout: 120_000 },
      ],
})
