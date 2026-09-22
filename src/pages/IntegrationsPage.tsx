import { useState } from 'react'
import {
  GitBranch,
  Server,
  Plus,
  Trash2,
  Settings,
  Database,
  Loader2,
  X,
  AlertTriangle,
  BookOpen,
  Search,
  CheckCircle2,
  Plug,
  Lightbulb,
  RefreshCw,
  HardDrive,
  CloudCog,
  ShieldCheck,
} from 'lucide-react'
import { useIntegrations } from '../hooks/useIntegrations'
import type { AgentRole, Integration } from '../types'
import { Button } from '../components/primitives/Button'
import { PageHeader } from '../components/PageHeader'
import { TextField } from '../components/primitives/Field'
import { Modal } from '../components/primitives/Modal'

/* ── Catalog data ──────────────────────────────────────────────────── */

const CATALOG = [
  {
    id: 'supabase_storage',
    title: 'Supabase Storage',
    subtitle: 'File & Artifact Storage',
    badge: 'Storage',
    icon: HardDrive,
    description: 'Upload workspace artifacts and agent outputs to a dedicated Supabase Storage bucket for persistence across sessions.',
    features: ['Artifact persistence', 'Public URL generation', 'Cross-session storage'],
    buttonLabel: 'Connect Supabase',
  },
  {
    id: 'github',
    title: 'GitHub Connector',
    subtitle: 'Code & Repositories',
    badge: 'Recommended',
    icon: GitBranch,
    description: 'Grant agents scoped read/write access to repositories, branches, and PR workflows.',
    features: ['Repository access', 'Branch management', 'Pull request workflows'],
    buttonLabel: 'Configure GitHub',
  },
  {
    id: 'mcp',
    title: 'Custom MCP Server',
    subtitle: 'Model Context Protocol',
    badge: 'Flexible',
    icon: Server,
    description: 'Connect standard SSE/HTTP MCP server endpoints with automatic validation.',
    features: ['SSE/HTTP support', 'Automatic validation', 'Custom tool integration'],
    buttonLabel: 'Add MCP Server',
  },
  {
    id: 'postgres',
    title: 'PostgreSQL DB MCP',
    subtitle: 'Database Tools',
    badge: 'Database',
    icon: Database,
    description: 'Relational DB schema inspection, SQL queries, and migration execution.',
    features: ['Schema inspection', 'SQL query execution', 'Migration support'],
    buttonLabel: 'Connect Database',
  },
]

export default function IntegrationsPage() {
  const { integrations, loading, error, health, connect, disconnect } = useIntegrations()

  const [showConnectGithubModal, setShowConnectGithubModal] = useState(false)
  const [showConnectMcpModal, setShowConnectMcpModal] = useState(false)
  const [showConnectSupabaseModal, setShowConnectSupabaseModal] = useState(false)
  const [reconfigureTarget, setReconfigureTarget] = useState<Integration | null>(null)
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')

  const [ghRepo, setGhRepo] = useState('Prateekiiitg56/SplitterAi')
  const [ghToken, setGhToken] = useState('')
  const [ghRoles] = useState<AgentRole[]>(['coder', 'auditor'])

  const [mcpName, setMcpName] = useState('')
  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpToken, setMcpToken] = useState('')
  const [mcpRoles] = useState<AgentRole[]>(['planner', 'coder', 'auditor', 'tester'])

  const [supabaseBucket, setSupabaseBucket] = useState('workspace-artifacts')
  const [supabaseConnecting, setSupabaseConnecting] = useState(false)

  const [formError, setFormError] = useState<string | null>(null)

  /* ── Supabase already connected? ─────────────────────────────────── */
  const supabaseAlreadyConnected = integrations.some(
    (i) => i.type === 'supabase_storage' && i.status === 'connected'
  )

  const handleConnectGithub = async () => {
    if (!ghRepo.trim()) {
      setFormError('Please enter a target repository')
      return
    }
    setFormError(null)
    try {
      await connect({
        type: 'github',
        name: `GitHub (${ghRepo.trim()})`,
        repo: ghRepo.trim(),
        token: ghToken.trim() || undefined,
        allowedRoles: ghRoles,
      })
      setShowConnectGithubModal(false)
      setGhToken('')
    } catch (err: any) {
      setFormError(err?.message || 'Connection handshake failed')
    }
  }

  const handleConnectMcp = async () => {
    if (!mcpName.trim() || !mcpUrl.trim()) {
      setFormError('Please fill in server name and server URL')
      return
    }
    setFormError(null)
    try {
      await connect({
        type: 'mcp',
        name: mcpName.trim(),
        url: mcpUrl.trim(),
        token: mcpToken.trim() || undefined,
        allowedRoles: mcpRoles,
      })
      setShowConnectMcpModal(false)
      setMcpName('')
      setMcpUrl('')
      setMcpToken('')
    } catch (err: any) {
      setFormError(err?.message || 'MCP Handshake validation failed')
    }
  }

  const handleConnectSupabase = async () => {
    setFormError(null)
    setSupabaseConnecting(true)
    try {
      await connect({
        type: 'supabase_storage',
        name: 'Supabase Storage',
        allowedRoles: ['planner', 'coder', 'auditor', 'tester'] as AgentRole[],
      })
      setShowConnectSupabaseModal(false)
    } catch (err: any) {
      setFormError(err?.message || 'Supabase connection verification failed')
    } finally {
      setSupabaseConnecting(false)
    }
  }

  const handleCatalogClick = (id: string) => {
    setFormError(null)
    if (id === 'github') setShowConnectGithubModal(true)
    else if (id === 'mcp') setShowConnectMcpModal(true)
    else if (id === 'supabase_storage') setShowConnectSupabaseModal(true)
    else if (id === 'postgres') {
      setMcpName('PostgreSQL Database MCP')
      setMcpUrl('http://localhost:5432/mcp')
      setShowConnectMcpModal(true)
    }
  }

  const filteredCatalog = CATALOG.filter(
    (c) =>
      !catalogSearch ||
      c.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(catalogSearch.toLowerCase())
  )

  /* ── Helper: icon for integration type ───────────────────────────── */
  function integrationIcon(item: Integration) {
    if (item.type === 'github') return <GitBranch size={16} />
    if (item.type === 'supabase_storage') return <HardDrive size={16} />
    return <Server size={16} />
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-transparent text-[var(--text)] font-sans select-none overflow-hidden relative z-10">
      <PageHeader
        icon={<Plug size={16} />}
        title="Integrations"
        meta="/ connectors"
        actions={
          <Button variant="ghost" size="sm" icon={<BookOpen size={13} />}>
            Documentation
          </Button>
        }
      />

      {/* Page Body */}
      <div className="page-body flex-1 overflow-y-auto">
        <div className="integrations-page">
          {/* Error Banner */}
          {error && !errorDismissed && (
            <div className="mb-6 p-3 rounded-panel border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--bad)]">Backend server unreachable</div>
                  <div className="text-micro text-[var(--dim)] mt-0.5">
                    Failed to connect to <code className="font-mono text-[var(--text)]">http://localhost:8000</code>.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" icon={<RefreshCw size={12} />} onClick={() => window.location.reload()}>
                  Retry
                </Button>
                <Button variant="quiet" size="sm" icon={<X size={14} />} label="Dismiss" onClick={() => setErrorDismissed(true)} />
              </div>
            </div>
          )}

          {/* Supabase Status Banner — shown when Supabase is detected from health */}
          {health.supabase_enabled && !supabaseAlreadyConnected && (
            <div className="mb-4 p-3 rounded-panel border border-[var(--good)]/30 bg-[var(--good)]/8 text-meta flex items-center gap-3">
              <ShieldCheck size={16} className="text-[var(--good)] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[var(--text)] font-medium">Supabase detected</span>
                <span className="text-[var(--dim)] ml-2">Your backend has Supabase configured. Add it as an integration to enable artifact storage.</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowConnectSupabaseModal(true)}
              >
                Connect
              </Button>
            </div>
          )}

          {/* Connected Integrations Section */}
          <div className="section-label">Connected Integrations</div>
          {loading ? (
            <div className="p-6 flex items-center gap-2 text-[var(--dim)] font-mono text-meta">
              <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
              <span>Loading workspace integrations…</span>
            </div>
          ) : integrations.length === 0 ? (
            <div className="empty-state p-6 border border-[var(--border-soft)] rounded-panel bg-[var(--panel)] mb-6 text-center">
              <Plug size={26} className="text-[var(--ghost)] mb-2" />
              <div className="es-title">No integrations connected yet</div>
              <div className="es-detail">
                Connect GitHub, Supabase Storage, or an MCP server to grant agents access to external tools and repos.
              </div>
            </div>
          ) : (
            <div className="connected-list mb-6">
              {integrations.map((item) => (
                <div key={item.id} className="connected-row">
                  <div className="cr-glyph">
                    {integrationIcon(item)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="cr-name">{item.name}</div>
                    <div className="cr-sub">
                      {item.type === 'supabase_storage'
                        ? `Bucket: ${item.config?.bucket || 'workspace-artifacts'}`
                        : item.config?.repo || item.config?.url || 'Connected'}
                    </div>
                  </div>
                  <div className="cr-status">
                    {item.status === 'connected' ? (
                      <span className="flex items-center gap-1 text-[var(--good)] text-micro font-medium">
                        <CheckCircle2 size={11} />
                        Connected
                      </span>
                    ) : item.status === 'error' ? (
                      <span className="flex items-center gap-1 text-[var(--bad)] text-micro font-medium">
                        <AlertTriangle size={11} />
                        Error
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[var(--dim)] text-micro">
                        <Loader2 size={11} className="animate-spin" />
                        Connecting
                      </span>
                    )}
                  </div>
                  <div className="cr-roles">
                    {(item.allowedRoles || []).slice(0, 3).map((r) => (
                      <span key={r} className="role-tag">{r}</span>
                    ))}
                    {(item.allowedRoles || []).length > 3 && (
                      <span className="role-tag">+{(item.allowedRoles || []).length - 3}</span>
                    )}
                  </div>
                  <div className="cr-actions">
                    <button
                      type="button"
                      className="btn btn-ghost sm"
                      onClick={() => setReconfigureTarget(item)}
                    >
                      Configure
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet sm"
                      onClick={() => disconnect(item.id)}
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Available Integration Catalog Section */}
          <div className="section-label">Catalog</div>
          <div className="toolbar" style={{ marginBottom: '16px' }}>
            <div className="field" style={{ flex: 1 }}>
              <Search size={13} />
              <input
                type="text"
                placeholder="Search catalog…"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="catalog-grid">
            {filteredCatalog.map((card) => {
              const Icon = card.icon
              const isSupabaseCard = card.id === 'supabase_storage'
              const disabled = isSupabaseCard && supabaseAlreadyConnected
              return (
                <div key={card.id} className={`cat-card ${disabled ? 'cat-card--connected' : ''}`}>
                  <div className="cat-top">
                    <div className="cat-glyph">
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="cat-name">{card.title}</div>
                      <div className="cat-sub">{card.subtitle}</div>
                    </div>
                    <span className="cat-badge chip">{card.badge}</span>
                  </div>

                  <div className="cat-desc">{card.description}</div>

                  <div className="cat-features">
                    {card.features.map((f) => (
                      <div key={f} className="f">
                        <CheckCircle2 size={12} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  {disabled ? (
                    <div className="flex items-center gap-1.5 text-[var(--good)] text-[11px] font-medium mt-auto">
                      <CheckCircle2 size={12} />
                      Already connected
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary sm"
                      onClick={() => handleCatalogClick(card.id)}
                    >
                      {card.buttonLabel}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Bottom MCP Tip Banner */}
          <div className="mcp-tip">
            <Lightbulb size={16} />
            <div>
              <div className="mt-title">Model Context Protocol (MCP) Supported</div>
              <div className="mt-desc">
                Plug in any standard SSE/HTTP MCP server to grant agents read/write capabilities against databases, issue trackers, or cloud deployments.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Connect Modal */}
      <Modal
        open={showConnectGithubModal}
        onClose={() => setShowConnectGithubModal(false)}
        title="Connect GitHub Repository"
        width={440}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setShowConnectGithubModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleConnectGithub} disabled={!ghRepo.trim()}>
              Authorize & Connect
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 rounded border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta">
              {formError}
            </div>
          )}
          <TextField
            label="Target Repo (org/repo)"
            value={ghRepo}
            onChange={(e) => setGhRepo(e.target.value)}
            placeholder="Prateekiiitg56/SplitterAi"
          />
          <TextField
            label="Access Token"
            type="password"
            value={ghToken}
            onChange={(e) => setGhToken(e.target.value)}
            placeholder="ghp_…"
            hint="Optional: for private repositories"
          />
        </div>
      </Modal>

      {/* MCP Connect Modal */}
      <Modal
        open={showConnectMcpModal}
        onClose={() => setShowConnectMcpModal(false)}
        title="Connect MCP Server"
        width={440}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setShowConnectMcpModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleConnectMcp} disabled={!mcpName.trim() || !mcpUrl.trim()}>
              Validate & Connect
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 rounded border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta">
              {formError}
            </div>
          )}
          <TextField
            label="Server Name"
            value={mcpName}
            onChange={(e) => setMcpName(e.target.value)}
            placeholder="e.g. Asana Workflow MCP"
          />
          <TextField
            label="Server URL"
            value={mcpUrl}
            onChange={(e) => setMcpUrl(e.target.value)}
            placeholder="http://localhost:8008/mcp"
          />
          <TextField
            label="Access Token"
            type="password"
            value={mcpToken}
            onChange={(e) => setMcpToken(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </Modal>

      {/* Supabase Storage Connect Modal */}
      <Modal
        open={showConnectSupabaseModal}
        onClose={() => setShowConnectSupabaseModal(false)}
        title="Connect Supabase Storage"
        width={440}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setShowConnectSupabaseModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConnectSupabase}
              disabled={supabaseConnecting}
            >
              {supabaseConnecting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Verifying…
                </span>
              ) : (
                'Verify & Connect'
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 rounded border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta">
              {formError}
            </div>
          )}

          <div className="p-3 rounded-panel border border-[var(--border-soft)] bg-[var(--panel-2)] text-meta">
            <div className="flex items-center gap-2 mb-2">
              <CloudCog size={14} className="text-[var(--accent)]" />
              <span className="text-[var(--text)] font-medium text-[12px]">Server-Side Credentials</span>
            </div>
            <p className="text-[var(--dim)] text-[11px] leading-relaxed">
              Supabase credentials are configured in your backend <code className="font-mono text-[var(--text)]">.env</code> file.
              Clicking "Verify & Connect" will validate the connection and register it as an integration.
            </p>
          </div>

          {health.supabase_enabled ? (
            <div className="flex items-center gap-2 text-[var(--good)] text-[11.5px]">
              <ShieldCheck size={14} />
              <span>Supabase client initialized successfully</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[var(--bad)] text-[11.5px]">
              <AlertTriangle size={14} />
              <span>Supabase client not detected — check SUPABASE_URL & SUPABASE_KEY in .env</span>
            </div>
          )}

          <TextField
            label="Storage Bucket"
            value={supabaseBucket}
            onChange={(e) => setSupabaseBucket(e.target.value)}
            placeholder="workspace-artifacts"
            hint="The bucket name configured in your Supabase project"
          />
        </div>
      </Modal>

      {/* Reconfigure Modal */}
      <Modal
        open={!!reconfigureTarget}
        onClose={() => setReconfigureTarget(null)}
        title="Reconfigure Integration"
        width={440}
      >
        {reconfigureTarget && (
          <div className="space-y-3 text-meta text-[var(--dim)]">
            <p>Reconfiguration for <strong className="text-[var(--text)]">{reconfigureTarget.name}</strong> is ready.</p>
            <p className="text-micro">This allows updating tokens, scopes, and allowed roles.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}