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
  ArrowRight,
  CheckCircle2,
  Plug,
  Lightbulb,
  RefreshCw,
} from 'lucide-react'
import { useIntegrations } from '../hooks/useIntegrations'
import type { AgentRole, Integration } from '../types'
import IntegrationsBackground from '../components/IntegrationsBackground'

/* ── Catalog data ──────────────────────────────────────────────────── */

const CATALOG = [
  {
    id: 'github',
    title: 'GitHub Connector',
    subtitle: 'Code & Repositories',
    badge: 'Recommended',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: GitBranch,
    description: 'Grant agents scoped read/write access to repositories, branches, and PR workflows.',
    features: ['Repository access', 'Branch management', 'Pull request workflows'],
    buttonLabel: 'Configure GitHub',
    buttonIcon: GitBranch,
  },
  {
    id: 'mcp',
    title: 'Custom MCP Server',
    subtitle: 'Model Context Protocol',
    badge: 'Flexible',
    badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    icon: Server,
    description: 'Connect standard SSE/HTTP MCP server endpoints with automatic validation.',
    features: ['SSE/HTTP support', 'Automatic validation', 'Custom tool integration'],
    buttonLabel: 'Add MCP Server',
    buttonIcon: Plus,
  },
  {
    id: 'postgres',
    title: 'PostgreSQL DB MCP',
    subtitle: 'Database Tools',
    badge: 'Database',
    badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: Database,
    description: 'Relational DB schema inspection, SQL queries, and migration execution.',
    features: ['Schema inspection', 'SQL query execution', 'Migration support'],
    buttonLabel: 'Connect Database',
    buttonIcon: Database,
  },
]

/* ── Component ─────────────────────────────────────────────────────── */

export default function IntegrationsPage() {
  const { integrations, loading, error, connectingId, connect, disconnect, reconfigure } = useIntegrations()

  const [showConnectGithubModal, setShowConnectGithubModal] = useState(false)
  const [showConnectMcpModal, setShowConnectMcpModal] = useState(false)
  const [reconfigureTarget, setReconfigureTarget] = useState<Integration | null>(null)
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')

  const [ghRepo, setGhRepo] = useState('Prateekiiitg56/SplitterAi')
  const [ghToken, setGhToken] = useState('')
  const [ghRoles, setGhRoles] = useState<AgentRole[]>(['coder', 'auditor'])

  const [mcpName, setMcpName] = useState('')
  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpToken, setMcpToken] = useState('')
  const [mcpRoles, setMcpRoles] = useState<AgentRole[]>(['planner', 'coder', 'auditor', 'tester'])

  const [formError, setFormError] = useState<string | null>(null)

  const handleConnectGithub = async () => {
    if (!ghRepo.trim()) { setFormError('Please enter a target repository'); return }
    setFormError(null)
    try {
      await connect({ type: 'github', name: `GitHub (${ghRepo.trim()})`, repo: ghRepo.trim(), token: ghToken.trim() || undefined, allowedRoles: ghRoles })
      setShowConnectGithubModal(false); setGhToken('')
    } catch (err: any) { setFormError(err?.message || 'Connection handshake failed') }
  }

  const handleConnectMcp = async () => {
    if (!mcpName.trim() || !mcpUrl.trim()) { setFormError('Please fill in server name and server URL'); return }
    setFormError(null)
    try {
      await connect({ type: 'mcp', name: mcpName.trim(), url: mcpUrl.trim(), token: mcpToken.trim() || undefined, allowedRoles: mcpRoles })
      setShowConnectMcpModal(false); setMcpName(''); setMcpUrl(''); setMcpToken('')
    } catch (err: any) { setFormError(err?.message || 'MCP Handshake validation failed') }
  }

  const handleCatalogClick = (id: string) => {
    setFormError(null)
    if (id === 'github') setShowConnectGithubModal(true)
    else if (id === 'mcp') setShowConnectMcpModal(true)
    else if (id === 'postgres') {
      setMcpName('PostgreSQL Database MCP'); setMcpUrl('http://localhost:5432/mcp'); setShowConnectMcpModal(true)
    }
  }

  const filteredCatalog = CATALOG.filter(c =>
    !catalogSearch || c.title.toLowerCase().includes(catalogSearch.toLowerCase()) || c.subtitle.toLowerCase().includes(catalogSearch.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-transparent text-[var(--text)] font-sans select-none overflow-hidden relative">
      {/* Three.js ambient background — reduced opacity */}
      <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
        <IntegrationsBackground />
      </div>

      {/* ── Scrollable content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto relative z-10 flex flex-col">
        <div className="flex-1 w-full max-w-[1440px] mx-auto px-7 pt-8 pb-8">

          {/* ── § 3  Page header ──────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[28px] font-bold text-white tracking-tight leading-none">Integrations</h1>
              <p className="text-[15px] text-white/45 mt-1.5">Connect external tools and services to extend your workspace.</p>
            </div>
            <button className="flex items-center gap-2 h-9 px-4 rounded-lg border border-white/[0.12] bg-white/[0.04] text-[13px] text-white/55 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.07] transition-all flex-shrink-0">
              <BookOpen size={14} />
              <span>Learn more</span>
            </button>
          </div>

          {/* ── § 4  Error banner ─────────────────────────────────── */}
          {error && !errorDismissed && (
            <div className="flex items-center gap-3.5 px-0 py-3 mb-6 border-b border-rose-500/30">
              <AlertTriangle size={20} className="text-rose-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-rose-400">Backend server unreachable</div>
                <div className="text-[13px] text-white/45 mt-0.5">
                  Failed to connect to http://localhost:8000. Make sure <code className="font-mono text-white/60">python backend/server.py</code> is running.
                </div>
              </div>
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.12] text-[12px] text-white/70 hover:text-white hover:border-white/[0.2] transition-all flex-shrink-0">
                <RefreshCw size={13} />
                <span>Retry Connection</span>
              </button>
              <button onClick={() => setErrorDismissed(true)} className="text-white/30 hover:text-white transition-colors flex-shrink-0 p-1.5">
                <X size={16} />
              </button>
            </div>
          )}

          {/* ── § 5  Connected integrations (empty state) ─────────── */}
          <div className="mb-10">
            {loading ? (
              <div className="flex items-center gap-2 text-[13px] text-white/45 py-6">
                <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
                Loading workspace integrations...
              </div>
            ) : integrations.length === 0 ? (
              <div className="flex flex-col items-start py-4">
                <div className="flex items-center gap-3 mb-2">
                  <Plug size={22} className="text-[var(--accent)]" />
                  <div className="text-[16px] font-semibold text-white">No integrations connected yet</div>
                </div>
                <p className="text-[14px] text-white/45 max-w-[560px] leading-relaxed mb-4">
                  Connect GitHub or an MCP server to give agents access to real tools and repositories during task execution.
                </p>
                {/* Primary CTA */}
                <button
                  onClick={() => { setFormError(null); setShowConnectMcpModal(true) }}
                  className="inline-flex items-center gap-2 px-4 h-9 rounded-lg text-[13.5px] font-semibold text-white hover:brightness-110 active:scale-[0.98] transition-all"
                  style={{ background: '#1683ff' }}
                >
                  <Plus size={15} />
                  Add MCP Server
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                {integrations.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 py-2 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      {item.type === 'github' ? <GitBranch size={20} className="text-[var(--accent)]" /> : <Server size={20} className="text-[var(--accent)]" />}
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-white truncate">{item.name}</div>
                        <div className="text-[12px] text-white/35 font-mono truncate">{item.config?.repo || item.config?.url || 'Connected'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[12px]">
                      <button onClick={() => setReconfigureTarget(item)} className="text-white/40 hover:text-white flex items-center gap-1.5 transition-colors"><Settings size={12} /> Reconfigure</button>
                      <button onClick={() => disconnect(item.id)} className="text-[var(--bad)] hover:underline flex items-center gap-1.5 ml-auto transition-colors"><Trash2 size={12} /> Disconnect</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── § 7  Catalog header ───────────────────────────────── */}
          <div className="flex items-end justify-between gap-4 mb-6 border-t border-white/[0.08] pt-8">
            <div>
              <h2 className="text-[18px] font-semibold text-white tracking-tight">Available Integration Catalog</h2>
              <p className="text-[13px] text-white/35 mt-1">Connect your favorite tools and services</p>
            </div>
            <div className="relative flex-shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="h-9 w-[250px] pl-9 pr-3 rounded-lg border border-white/[0.10] bg-white/[0.04] text-[13px] text-white placeholder:text-white/30 outline-none focus:border-[var(--accent)]/60 transition-colors"
              />
            </div>
          </div>

          {/* ── § 8–12  Integration catalog items (Directly on page, no boxes) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {filteredCatalog.map((card) => {
              const Icon = card.icon
              const BtnIcon = card.buttonIcon
              return (
                <div
                  key={card.id}
                  className="flex flex-col justify-between group py-2"
                >
                  {/* Content */}
                  <div>
                    {/* Header line with Icon & Badge */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <Icon size={24} className="text-[var(--accent)] shrink-0" />
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${card.badgeColor} flex-shrink-0`}>
                        {card.badge}
                      </span>
                    </div>

                    {/* Title + subtitle */}
                    <div className="text-[16px] font-semibold text-white">{card.title}</div>
                    <div className="text-[12.5px] text-white/35 font-mono mt-0.5 mb-3">{card.subtitle}</div>

                    {/* Description */}
                    <p className="text-[13.5px] text-white/50 leading-[1.55] mb-4">{card.description}</p>

                    {/* Feature list */}
                    <div className="space-y-2 mb-6">
                      {card.features.map((f) => (
                        <div key={f} className="flex items-center gap-2.5 text-[13px]">
                          <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                          <span className="text-white/60">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Direct Action Link — No box around it */}
                  <button
                    onClick={() => handleCatalogClick(card.id)}
                    className="inline-flex items-center gap-2 text-[13.5px] font-medium text-[var(--accent)] hover:text-white transition-colors group/btn pt-2 border-t border-white/[0.06] w-full text-left"
                  >
                    <BtnIcon size={14} />
                    <span>{card.buttonLabel}</span>
                    <ArrowRight size={14} className="ml-auto text-[var(--accent)] group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── § 18  Bottom tip bar — directly on page ─────────────────── */}
        <div className="flex-shrink-0 px-7 pb-6 pt-4 border-t border-white/[0.08]">
          <div className="flex items-center justify-between gap-4 w-full max-w-[1440px] mx-auto">
            <div className="flex items-center gap-2.5 text-[13px] text-white/45 min-w-0">
              <Lightbulb size={15} className="text-amber-400 flex-shrink-0" />
              <span className="truncate">
                <strong className="text-white/60 font-medium">Tip:</strong>{' '}
                Integrations give your agents access to real tools and data, making them more powerful and useful.
              </span>
            </div>
            <a href="#" className="flex items-center gap-1.5 text-[13px] text-[var(--accent)] hover:underline flex-shrink-0 whitespace-nowrap">
              View documentation
              <ArrowRight size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* ── GitHub Connect Modal ──────────────────────────────────── */}
      {showConnectGithubModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--panel)] border border-white/[0.10] rounded-[10px] p-5 max-w-[440px] w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-[16px] font-semibold text-white flex items-center gap-2">
                <GitBranch size={16} className="text-[var(--accent)]" />
                Connect GitHub Repository
              </h3>
              <button onClick={() => setShowConnectGithubModal(false)} className="text-white/30 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-[var(--bad-quiet)] border border-[var(--bad)]/40 text-[var(--bad)] text-[13px]">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-mono text-white/35 block mb-1.5">Target Repo (org/repo)</label>
                <input type="text" value={ghRepo} onChange={(e) => setGhRepo(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-[14px] font-mono text-white outline-none focus:border-[var(--accent)]/50 transition-colors" />
              </div>
              <div>
                <label className="text-[12px] font-mono text-white/35 block mb-1.5">Access Token</label>
                <input type="password" value={ghToken} onChange={(e) => setGhToken(e.target.value)} placeholder="ghp_..."
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-[14px] font-mono text-white outline-none focus:border-[var(--accent)]/50 transition-colors" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button onClick={() => setShowConnectGithubModal(false)}
                className="px-4 py-2 rounded-lg border border-white/[0.10] text-[14px] text-white/45 hover:text-white hover:bg-white/[0.04] transition-all">
                Cancel
              </button>
              <button onClick={handleConnectGithub}
                className="px-5 py-2 rounded-lg font-semibold text-[14px] text-white hover:brightness-110 transition-all"
                style={{ background: '#1683ff' }}>
                Authorize & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MCP Connect Modal ─────────────────────────────────────── */}
      {showConnectMcpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--panel)] border border-white/[0.10] rounded-[10px] p-5 max-w-[440px] w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-[16px] font-semibold text-white flex items-center gap-2">
                <Server size={16} className="text-[var(--accent)]" />
                Connect MCP Server
              </h3>
              <button onClick={() => setShowConnectMcpModal(false)} className="text-white/30 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/[0.06]">
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-[var(--bad-quiet)] border border-[var(--bad)]/40 text-[var(--bad)] text-[13px]">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-mono text-white/35 block mb-1.5">Server Name</label>
                <input type="text" value={mcpName} onChange={(e) => setMcpName(e.target.value)} placeholder="e.g. Asana Workflow MCP"
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-[14px] text-white outline-none focus:border-[var(--accent)]/50 transition-colors" />
              </div>
              <div>
                <label className="text-[12px] font-mono text-white/35 block mb-1.5">Server URL</label>
                <input type="text" value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)} placeholder="http://localhost:8008/mcp"
                  className="w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2.5 text-[14px] font-mono text-white outline-none focus:border-[var(--accent)]/50 transition-colors" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
              <button onClick={() => setShowConnectMcpModal(false)}
                className="px-4 py-2 rounded-lg border border-white/[0.10] text-[14px] text-white/45 hover:text-white hover:bg-white/[0.04] transition-all">
                Cancel
              </button>
              <button onClick={handleConnectMcp}
                className="px-5 py-2 rounded-lg font-semibold text-[14px] text-white hover:brightness-110 transition-all"
                style={{ background: '#1683ff' }}>
                Validate & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
