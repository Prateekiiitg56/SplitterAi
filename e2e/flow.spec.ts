import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

// Section 9 of SPLITTERAI_FIX_PROMPT.md, step by step. Screenshots go to e2e-screenshots/<mode>-NN-name.png.
const MODE = process.env.E2E_MODE === 'real' ? 'real' : 'fake'
const API = 'http://localhost:8000'
const python = process.platform === 'win32' ? '.venv/Scripts/python' : '.venv/bin/python'
mkdirSync('e2e-screenshots', { recursive: true })

let shotCount = 0
async function shot(page: Page, name: string) {
  shotCount += 1
  await page.screenshot({ path: `e2e-screenshots/${MODE}-${String(shotCount).padStart(2, '0')}-${name}.png`, fullPage: false })
}

const pill = (page: Page) => page.locator('.run-pill')
const log = (page: Page) => page.locator('.term')
const preview = (page: Page) => page.frameLocator('iframe[title="Project preview"]')

/** Console message -> plan proposal -> optional edits -> Launch. Returns the project id from the URL. */
async function planAndLaunch(page: Page, task: string, edit?: (page: Page) => Promise<void>) {
  await page.goto('/console')
  await page.getByLabel('Chat message input').fill(task)
  await page.getByLabel('Send message').click()
  await expect(page.getByText("Here's how I'll split this")).toBeVisible()
  if (edit) await edit(page)
  await page.getByRole('button', { name: /Launch build/ }).click()
  await page.waitForURL(/\/projects\/(?!default)[^/]+$/)
  return page.url().split('/projects/')[1]
}

async function waitDone(page: Page) {
  await expect(pill(page)).toHaveText(/Completed|Finished, not verified|Failed/)
}

test('1. backend down and no LLM key banners', async ({ page }) => {
  await page.route('**/health', (route) => route.abort())
  await page.goto('/console')
  await expect(page.getByRole('alert')).toContainText('Backend unreachable')
  await shot(page, 'backend-unreachable')
  await page.unroute('**/health')
  await page.route('**/health', (route) => route.fulfill({ json: {
    status: 'ok', version: '0.1.0', uptime_s: 1, supabase_enabled: false, llm_ready: false, llm_keys: { gemini: false },
    fake_llm: false, sandbox: { mode: 'wsl-bwrap', available: true }, auth_required: false, max_concurrent_agents: 4,
  } }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('No LLM key configured')
  await shot(page, 'no-llm-key')
})

test.describe.serial('SplitterAI end-to-end', () => {
  let todo: Page
  let todoId = ''
  let primes: Page
  let reactId = ''

  test('2-4. a task becomes a plan, is edited and launches into its own project; tabs do not mix', async ({ browser }) => {
    todo = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    todoId = await planAndLaunch(todo, 'make a todo app with dark mode', async (page) => {
      await shot(page, 'plan-proposal')
      const instruction = page.getByLabel(/Instruction for coder subtask/).first()
      await instruction.fill('Implement: make a todo app with dark mode (one index.html, items can be toggled)')
      const removeTester = page.getByLabel('Remove Tester')
      if (await removeTester.count()) await removeTester.click()
      await shot(page, 'plan-edited')
    })
    expect(todoId).toMatch(/^make-a-todo-app/)
    await expect(log(todo)).toContainText('Using user-confirmed plan')
    await shot(todo, 'project-page-live-log')

    // A second tab with a different run: each page shows only its own run's events.
    primes = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    const primesId = await planAndLaunch(primes, 'write a python script that prints the first 20 primes')
    expect(primesId).toMatch(/^write-a-python/)
    await expect(log(primes)).toContainText('Using user-confirmed plan')
    await expect(log(todo)).not.toContainText('primes')
    await expect(log(primes)).not.toContainText('todo')
    await shot(primes, 'second-tab-own-log')
  })

  test('5. refresh mid-run resumes from GET /runs/{id}; cancel stops a run', async ({ browser }) => {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    await planAndLaunch(page, 'make a landing page for a bakery')
    await expect(pill(page)).toHaveText(/Running|Planning/)
    await page.reload()
    await expect(log(page)).toContainText('Using user-confirmed plan')
    await expect(pill(page)).toHaveText(/Running|Planning/)
    await shot(page, 'after-refresh-mid-run')
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(pill(page)).toHaveText('Cancelled')
    await expect(log(page)).toContainText('Run cancelled')
    await shot(page, 'cancelled')
  })

  test('6. the finished todo app opens in the preview and works', async () => {
    await waitDone(todo)
    await expect(todo.getByText(/verification (pass|fail)|not verified/)).toBeVisible()
    const frame = preview(todo)
    await frame.locator('#new-todo').fill('buy milk')
    await frame.locator('#new-todo').press('Enter')
    await expect(frame.locator('#list li')).toHaveText(/buy milk/)
    await frame.locator('#list input[type=checkbox]').check()
    await expect(frame.locator('#list li')).toHaveClass(/done/)
    await frame.locator('#theme').click()
    await expect(frame.locator('body')).toHaveClass(/dark/)
    await expect(frame.locator('#clear-completed')).toHaveCount(0) // only the follow-up adds it
    await shot(todo, 'todo-preview-working')
    const href = await todo.getByRole('link', { name: /Open in new tab/ }).getAttribute('href')
    const res = await todo.request.get(href!)
    expect(res.status()).toBe(200)
    expect(await res.text()).toContain('new-todo')
  })

  test('7. a follow-up runs in the same folder and the preview updates', async () => {
    await todo.locator('#ov-task').fill('add a clear-completed button')
    await todo.getByRole('button', { name: /^Run$/ }).click()
    await expect(pill(todo)).toHaveText(/Running|Planning/)
    await waitDone(todo)
    expect(todo.url()).toContain(`/projects/${todoId}`)
    await expect(log(todo)).toContainText('read_file')
    await expect(preview(todo).locator('#clear-completed')).toBeVisible()
    await shot(todo, 'follow-up-preview')
  })

  test('8. a python script opens in the file viewer and Run shows its output', async () => {
    await waitDone(primes)
    await expect(primes.getByText('primes.py').first()).toBeVisible()
    await primes.getByRole('button', { name: 'Run primes.py' }).click()
    await expect(primes.getByRole('log', { name: 'Run output' })).toContainText('[2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71]')
    await shot(primes, 'primes-run-output')
  })

  test('9. a react counter is built with vite and the preview works', async ({ page }) => {
    test.setTimeout(900_000)
    reactId = await planAndLaunch(page, 'build a react counter with vite')
    await expect(pill(page)).toHaveText(/Completed|Finished, not verified|Failed/, { timeout: 840_000 })
    await expect(log(page)).toContainText('Build succeeded')
    const frame = preview(page)
    await frame.locator('#inc').click()
    await expect(frame.locator('#count')).toHaveText('1')
    await shot(page, 'react-counter-preview')
  })

  test('10. an uploaded zip becomes the current project, previews and takes a follow-up', async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), 'splitter-zip-'))
    const zipPath = join(dir, 'uploaded-site.zip')
    writeFileSync(join(dir, 'index.html'), '<!DOCTYPE html><title>Uploaded</title><h1 id="hello">Uploaded site</h1>')
    execFileSync(python, ['-c', `import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],'w'); z.write(sys.argv[2],'index.html'); z.close()`, zipPath, join(dir, 'index.html')])
    await page.goto('/console')
    await page.getByLabel('Attach file or add agent').click()
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /Upload workspace/ }).click()
    await (await chooser).setFiles(zipPath)
    await page.waitForURL(/\/projects\/(?!default)[^/]+$/)
    await expect(preview(page).locator('#hello')).toHaveText('Uploaded site')
    await shot(page, 'uploaded-project')
    await page.locator('#ov-task').fill('add a clear-completed button')
    await page.getByRole('button', { name: /^Run$/ }).click()
    await expect(pill(page)).toHaveText(/Running|Planning/)
    await waitDone(page)
    await expect(log(page)).toContainText('wrote index.html')
    await shot(page, 'uploaded-project-follow-up')
  })

  test('11. export downloads the project without node_modules or .splitter', async ({ request }) => {
    test.skip(!reactId, 'needs the react project from step 9')
    const res = await request.get(`${API}/workspaces/export`, { params: { workspace: `./workspace_output/${reactId}` } })
    expect(res.status()).toBe(200)
    const dir = mkdtempSync(join(tmpdir(), 'splitter-export-'))
    const zipPath = join(dir, 'export.zip')
    writeFileSync(zipPath, await res.body())
    const names = execFileSync(python, ['-c', 'import zipfile,sys; print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))', zipPath]).toString()
    expect(names).toContain('package.json')
    expect(names).toContain('src/App.jsx')
    expect(names).not.toMatch(/node_modules|\.splitter/)
  })

  test('12a. an MCP server over stdio shows its real tools and an agent calls one', async ({ page }) => {
    test.setTimeout(600_000)
    await page.goto('/integrations')
    await page.getByRole('button', { name: 'Add MCP Server' }).click()
    await page.getByRole('textbox', { name: 'Tool Name' }).fill('Everything')
    await page.getByRole('textbox', { name: 'Server', exact: true }).fill('stdio://npx -y @modelcontextprotocol/server-everything')
    await page.getByRole('button', { name: 'Connect Tool' }).click()
    await expect(page.getByText(/[1-9]\d* tools ·/)).toBeVisible({ timeout: 180_000 })
    await shot(page, 'mcp-connected')
    const run = await planAndLaunch(page, 'use the mcp echo tool to say hello')
    expect(run).toBeTruthy()
    await waitDone(page)
    await expect(log(page)).toContainText('mcp__everything__echo')
    await shot(page, 'mcp-tool-called')
  })

  test('12b. GitHub: repo list loads and Push creates a branch', async ({ page }) => {
    test.skip(!process.env.E2E_GITHUB_TOKEN, 'set E2E_GITHUB_TOKEN (and E2E_GITHUB_REPO) to run against GitHub')
    await page.goto('/integrations')
    await page.getByRole('button', { name: 'Connect GitHub' }).click()
    await page.getByLabel('Access Token').fill(process.env.E2E_GITHUB_TOKEN!)
    await page.getByLabel(/Default repository/).fill(process.env.E2E_GITHUB_REPO || '')
    await page.getByRole('button', { name: 'Connect GitHub' }).last().click()
    await expect(page.getByText(/GitHub \(/)).toBeVisible()
    await shot(page, 'github-connected')
    await page.goto(`/projects/${todoId}`)
    await page.getByRole('button', { name: 'Push to GitHub' }).click()
    await page.getByLabel('Branch').fill(`splitter/e2e-${Date.now()}`)
    await page.getByRole('button', { name: 'Push' }).click()
    await expect(page.getByText(/Pushed .* to /)).toBeVisible({ timeout: 120_000 })
    await shot(page, 'github-pushed')
    await page.getByRole('button', { name: 'Done' }).click()
    await page.getByRole('button', { name: 'Deploy' }).first().click()
    await page.getByRole('dialog').getByRole('button', { name: 'Deploy' }).click()
    await expect(page.getByText(/Deployed to https:\/\/.*github\.io/)).toBeVisible({ timeout: 180_000 })
    await shot(page, 'github-pages-deployed')
  })

  test('14. an agent trying to read ../../.env is blocked and logged', async ({ page }) => {
    test.skip(MODE === 'real', 'scripted with the fake model')
    await planAndLaunch(page, 'show me ../../.env')
    await waitDone(page)
    await expect(log(page)).toContainText('Blocked: run_shell')
    await shot(page, 'sandbox-block')
  })
})

test('13. with SHARED_SECRET the dashboard works after saving it, and requests without it get 401', async ({ page, request }) => {
  const secret = process.env.E2E_SHARED_SECRET
  test.skip(!secret, 'run with E2E_SHARED_SECRET (the backend then starts with SHARED_SECRET)')
  expect((await request.get(`${API}/sessions`)).status()).toBe(401)
  expect((await request.get(`${API}/sessions`, { headers: { 'X-API-Key': secret! } })).status()).toBe(200)
  await page.goto('/settings')
  await page.getByLabel('SHARED_SECRET of the backend').fill(secret!)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Shared secret required: yes')).toBeVisible()
  await planAndLaunch(page, 'make a todo app with dark mode')
  await waitDone(page)
  await expect(preview(page).locator('#new-todo')).toBeVisible()
  await shot(page, 'shared-secret-run')
})
