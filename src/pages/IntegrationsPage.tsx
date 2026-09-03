import { useState } from 'react'
import {
  Plug,
  GitBranch,
  Server,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  AlertTriangle,
  Database,
  Slack,
  Figma,
  ExternalLink,
  Loader2,
  Shield,
} from 'lucide-react'
import { useIntegrations } from '../hooks/useIntegrations'
import { StatusBadge } from '../components/Badges'
import type { AgentRole, Integration } from '../types'
import { ROLE_META } from '../data'

export default function IntegrationsPage() {
  const { integrations, loading, error, connectingId, connect, disconnect, reconfigure } = useIntegrations()

  // Modal states
  const [showConnectGithubModal, setShowConnectGithubModal] = useState(false)
  const [showConnectMcpModal, setShowConnectMcpModal] = useState(false)
  const [reconfigureTarget, setReconfigureTarget] = useState<Integration | null>(null)

  // GitHub Modal form state
  const [ghRepo, setGhRepo] = useState('Prateekiiitg56/SplitterAi')
  const [ghToken, setGhToken] = useState('')
  const [ghRoles, setGhRoles] = useState<AgentRole[]>(['coder', 'auditor'])

  // MCP Modal form state
  const [mcpName, setMcpName] = useState('')
  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpToken, setMcpToken] = useState('')
  const [mcpRoles, setMcpRoles] = useState<AgentRole[]>(['planner', 'coder', 'auditor', 'tester'])

  // Form error
  const [formError, setFormError] = useState<string | null>(null)

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

  const handleToggleRoleScope = (role: AgentRole) => {
    if (!reconfigureTarget) return
    const current = reconfigureTarget.allowedRoles || []
    const updated = current.includes(role) ? current.filter((r) => r !== role) : [...current, role]
    setReconfigureTarget({ ...reconfigureTarget, allowedRoles: updated })
  }

  const handleSaveReconfigure = async () => {
    if (!reconfigureTarget) return
    await reconfigure(reconfigureTarget.id, reconfigureTarget.allowedRoles || [])
    setReconfigureTarget(null)
  }

  const toggleRoleSelect = (role: AgentRole, list: AgentRole[], setter: (val: AgentRole[]) => void) => {
    if (list.includes(role)) setter(list.filter((r) => r !== role))
    else setter([...list, role])
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#090A0F] text-white font-sans p-8 select-none relative z-10">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Plug size={22} className="text-[#9D8CFC]" />
              <h1 className="text-[26px] font-bold text-white tracking-tight">
                Integrations & Connector Hub
              </h1>
            </div>
            <p className="text-[13.5px] text-neutral-400 max-w-[80ch] leading-relaxed">
              Connect external services and Model Context Protocol (MCP) servers to grant agent workers expanded execution capabilities across workspaces.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setFormError(null)
                setShowConnectGithubModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141824] hover:bg-[#1A2032] border border-white/10 text-white text-[13px] font-semibold transition-all cursor-pointer"
            >
              <GitBranch size={15} className="text-indigo-400" />
              <span>Connect GitHub</span>
            </button>

            <button
              onClick={() => {
                setFormError(null)
                setShowConnectMcpModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <Plus size={15} />
              <span>Add MCP Server</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[13px] flex items-center justify-between">
            <span>⚠️ <strong>Error loading integrations:</strong> {error}</span>
          </div>
        )}

        {/* ── 1. CONNECTED INTEGRATIONS SECTION ──────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-white tracking-tight flex items-center gap-2">
              <Plug size={18} className="text-emerald-400" />
              <span>Connected Integrations ({integrations.length})</span>
            </h2>
            <span className="text-[12px] font-mono text-neutral-400">Account & Workspace Scoped</span>
          </div>

          {loading ? (
            <div className="p-8 rounded-2xl border border-white/[0.08] bg-[#141824] flex items-center justify-center gap-2 text-neutral-400 text-[13px]">
              <Loader2 size={18} className="animate-spin text-[#9D8CFC]" />
              <span>Loading workspace integrations...</span>
            </div>
          ) : integrations.length === 0 ? (
            /* Empty State */
            <div className="rounded-2xl border border-white/[0.08] bg-[#141824] p-10 text-center space-y-3 max-w-[640px] mx-auto my-4">
              <Plug size={36} className="mx-auto text-neutral-600" />
              <h3 className="text-[16px] font-bold text-white">No integrations connected</h3>
              <p className="text-[13px] text-neutral-400 leading-relaxed">
                Connect GitHub or an MCP server to give agents more tools to work with during autonomous task execution.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowConnectGithubModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#101218] border border-white/10 text-white text-[13px] font-semibold hover:border-white/20 transition-colors"
                >
                  Connect GitHub Repo
                </button>
                <button
                  onClick={() => setShowConnectMcpModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#6E56CF] text-white text-[13px] font-semibold hover:bg-[#5E46BF] transition-colors"
                >
                  Add MCP Server
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {integrations.map((item) => {
                const isConnecting = connectingId === item.name || item.status === 'connecting'
                const isError = item.status === 'error'

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-white/[0.16] transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#101218] border border-white/10 flex items-center justify-center text-[#9D8CFC]">
                          {item.type === 'github' ? <GitBranch size={20} /> : <Server size={20} />}
                        </div>

                        <div>
                          <h3 className="text-[15.5px] font-bold text-white">{item.name}</h3>
                          <p className="text-[11.5px] font-mono text-neutral-400 truncate max-w-[240px]">
                            {item.config?.repo || item.config?.url || item.config?.description || 'Connected Service'}
                          </p>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <StatusBadge status={isConnecting ? 'working' : isError ? 'failed' : item.status} />
                    </div>

                    {/* Error inline display */}
                    {isError && item.lastError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[12px] flex items-center justify-between">
                        <span className="truncate pr-2 font-mono">⚠️ {item.lastError}</span>
                        <button
                          onClick={() => disconnect(item.id)}
                          className="text-[11px] font-bold underline cursor-pointer text-red-300 hover:text-white"
                        >
                          Reconnect
                        </button>
                      </div>
                    )}

                    {/* Scoped Roles Badges */}
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                      <span className="text-[10px] font-mono uppercase font-bold text-neutral-500 block">
                        ALLOWED AGENT ROLES:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(item.allowedRoles || ['planner', 'coder', 'auditor', 'tester']).map((r) => {
                          const meta = ROLE_META[r]
                          return (
                            <span
                              key={r}
                              className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded capitalize"
                              style={{ color: meta?.color || '#9D8CFC', backgroundColor: `${meta?.color || '#9D8CFC'}18` }}
                            >
                              {r}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-[12px]">
                      <span className="text-[11px] font-mono text-neutral-500">
                        Connected: {item.connectedAt || 'Just now'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setReconfigureTarget(item)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <Settings size={12} />
                          <span>Reconfigure</span>
                        </button>

                        <button
                          onClick={() => disconnect(item.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Disconnect</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── 2. AVAILABLE CATALOG SECTION ───────────────────────── */}
        <section className="space-y-4 pt-4 border-t border-white/[0.08]">
          <h2 className="text-[18px] font-bold text-white tracking-tight flex items-center gap-2">
            <Server size={18} className="text-[#9D8CFC]" />
            <span>Available Integration Catalog</span>
          </h2>

          <div className="grid grid-cols-3 gap-4">
            {/* GitHub Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <GitBranch size={18} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white">GitHub Connector</h3>
                    <span className="text-[10.5px] font-mono text-indigo-300">Code & Pull Requests</span>
                  </div>
                </div>
                <p className="text-[12.5px] text-neutral-400 leading-relaxed">
                  Grant agents scoped read/write access to specific repositories, branches, and PR workflows.
                </p>
              </div>

              <button
                onClick={() => {
                  setFormError(null)
                  setShowConnectGithubModal(true)
                }}
                className="w-full py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-[12.5px] font-semibold transition-colors cursor-pointer"
              >
                Configure GitHub
              </button>
            </div>

            {/* Custom MCP Server Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Server size={18} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white">Custom MCP Server</h3>
                    <span className="text-[10.5px] font-mono text-purple-300">Model Context Protocol</span>
                  </div>
                </div>
                <p className="text-[12.5px] text-neutral-400 leading-relaxed">
                  Add standard SSE/HTTP MCP server endpoints with automated connection validation handshakes.
                </p>
              </div>

              <button
                onClick={() => {
                  setFormError(null)
                  setShowConnectMcpModal(true)
                }}
                className="w-full py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[12.5px] font-semibold transition-colors cursor-pointer"
              >
                Add MCP Server
              </button>
            </div>

            {/* PostgreSQL DB Connector */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Database size={18} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white">PostgreSQL DB MCP</h3>
                    <span className="text-[10.5px] font-mono text-blue-300">Database Tools</span>
                  </div>
                </div>
                <p className="text-[12.5px] text-neutral-400 leading-relaxed">
                  Relational DB schema inspection, SQL query execution, and migration execution for auditor agents.
                </p>
              </div>

              <button
                onClick={() => {
                  setMcpName('PostgreSQL Database MCP')
                  setMcpUrl('http://localhost:5432/mcp')
                  setShowConnectMcpModal(true)
                }}
                className="w-full py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white text-[12.5px] font-semibold transition-colors cursor-pointer"
              >
                Connect Database
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── GITHUB CONNECT MODAL ────────────────────────────────── */}
      {showConnectGithubModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141824] rounded-2xl border border-white/10 p-6 w-full max-w-[480px] space-y-4 shadow-2xl">
            <h3 className="text-[17px] font-bold text-white flex items-center gap-2">
              <GitBranch size={18} className="text-[#9D8CFC]" />
              <span>Connect GitHub Repository</span>
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[12px]">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold text-neutral-400 block mb-1">Target Repository (org/repo)</label>
                <input
                  type="text"
                  value={ghRepo}
                  onChange={(e) => setGhRepo(e.target.value)}
                  placeholder="e.g. Prateekiiitg56/SplitterAi"
                  className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-[13px] text-white font-mono outline-none focus:border-[#9D8CFC]"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-neutral-400 block mb-1">Personal Access Token (Stored Server-Side)</label>
                <input
                  type="password"
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-[13px] text-white font-mono outline-none focus:border-[#9D8CFC]"
                />
                <span className="text-[10.5px] text-neutral-500 mt-1 block">Tokens are stored securely server-side and never exposed to client state.</span>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-neutral-400 block mb-1">Allowed Agent Roles</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['planner', 'coder', 'auditor', 'tester'] as AgentRole[]).map((r) => {
                    const isSel = ghRoles.includes(r)
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRoleSelect(r, ghRoles, setGhRoles)}
                        className={`p-2 rounded-xl text-[11.5px] font-bold capitalize border transition-colors cursor-pointer ${
                          isSel
                            ? 'border-[#9D8CFC] bg-[#6E56CF]/20 text-white'
                            : 'border-white/10 bg-[#101218] text-neutral-500'
                        }`}
                      >
                        {r}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConnectGithubModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-[13px] font-medium text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectGithub}
                className="px-4 py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold cursor-pointer shadow-md"
              >
                Authorize & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MCP CONNECT MODAL ───────────────────────────────────── */}
      {showConnectMcpModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141824] rounded-2xl border border-white/10 p-6 w-full max-w-[480px] space-y-4 shadow-2xl">
            <h3 className="text-[17px] font-bold text-white flex items-center gap-2">
              <Server size={18} className="text-[#9D8CFC]" />
              <span>Connect MCP Server</span>
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[12px]">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold text-neutral-400 block mb-1">Server Name</label>
                <input
                  type="text"
                  value={mcpName}
                  onChange={(e) => setMcpName(e.target.value)}
                  placeholder="e.g. Asana Workflow MCP Server"
                  className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-[13px] text-white outline-none focus:border-[#9D8CFC]"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-neutral-400 block mb-1">Server URL (Validated via Handshake)</label>
                <input
                  type="text"
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  placeholder="e.g. http://localhost:8008/mcp or sse://..."
                  className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-[13px] text-white font-mono outline-none focus:border-[#9D8CFC]"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-neutral-400 block mb-1">Allowed Agent Roles</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['planner', 'coder', 'auditor', 'tester'] as AgentRole[]).map((r) => {
                    const isSel = mcpRoles.includes(r)
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRoleSelect(r, mcpRoles, setMcpRoles)}
                        className={`p-2 rounded-xl text-[11.5px] font-bold capitalize border transition-colors cursor-pointer ${
                          isSel
                            ? 'border-[#9D8CFC] bg-[#6E56CF]/20 text-white'
                            : 'border-white/10 bg-[#101218] text-neutral-500'
                        }`}
                      >
                        {r}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConnectMcpModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-[13px] font-medium text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectMcp}
                className="px-4 py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold cursor-pointer shadow-md"
              >
                Validate & Connect Server
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECONFIGURE MODAL ───────────────────────────────────── */}
      {reconfigureTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#141824] rounded-2xl border border-white/10 p-6 w-full max-w-[440px] space-y-4 shadow-2xl">
            <h3 className="text-[17px] font-bold text-white flex items-center gap-2">
              <Settings size={18} className="text-[#9D8CFC]" />
              <span>Reconfigure {reconfigureTarget.name}</span>
            </h3>

            <div className="space-y-3">
              <span className="text-[12px] font-semibold text-neutral-400 block">Agent Role Tool Access Permissions</span>
              <div className="grid grid-cols-2 gap-2">
                {(['planner', 'coder', 'auditor', 'tester'] as AgentRole[]).map((r) => {
                  const meta = ROLE_META[r]
                  const hasAccess = (reconfigureTarget.allowedRoles || []).includes(r)
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleToggleRoleScope(r)}
                      className={`p-3 rounded-xl border flex items-center justify-between text-[12.5px] font-semibold capitalize transition-all cursor-pointer ${
                        hasAccess
                          ? 'border-[#9D8CFC] bg-[#6E56CF]/20 text-white'
                          : 'border-white/10 bg-[#101218] text-neutral-400'
                      }`}
                    >
                      <span>{meta.label} Role</span>
                      <span className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-[#9D8CFC]' : 'bg-neutral-600'}`} />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReconfigureTarget(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-[13px] font-medium text-neutral-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReconfigure}
                className="px-4 py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold cursor-pointer shadow-md"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
