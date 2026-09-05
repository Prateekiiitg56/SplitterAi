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
} from 'lucide-react'
import { useIntegrations } from '../hooks/useIntegrations'
import { StatusBadge } from '../components/Badges'
import type { AgentRole, Integration } from '../types'
import { ROLE_META } from '../data'

export default function IntegrationsPage() {
  const { integrations, loading, error, connectingId, connect, disconnect, reconfigure } = useIntegrations()

  const [showConnectGithubModal, setShowConnectGithubModal] = useState(false)
  const [showConnectMcpModal, setShowConnectMcpModal] = useState(false)
  const [reconfigureTarget, setReconfigureTarget] = useState<Integration | null>(null)

  const [ghRepo, setGhRepo] = useState('Prateekiiitg56/SplitterAi')
  const [ghToken, setGhToken] = useState('')
  const [ghRoles, setGhRoles] = useState<AgentRole[]>(['coder', 'auditor'])

  const [mcpName, setMcpName] = useState('')
  const [mcpUrl, setMcpUrl] = useState('')
  const [mcpToken, setMcpToken] = useState('')
  const [mcpRoles, setMcpRoles] = useState<AgentRole[]>(['planner', 'coder', 'auditor', 'tester'])

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
    <div className="flex-1 flex flex-col min-w-0 h-full bg-[var(--bg)] text-[var(--text)] font-sans select-none overflow-hidden relative z-10">
      
      {/* Topbar */}
      <div className="topbar h-[48px] border-b border-[var(--border-soft)] flex items-center justify-between px-5 bg-[var(--bg)] flex-shrink-0">
        <div className="topbar-left flex items-center gap-2.5">
          <span className="topbar-title font-semibold text-[14px]">Integrations</span>
        </div>

        <div className="topbar-right flex items-center gap-2">
          <button
            onClick={() => {
              setFormError(null)
              setShowConnectGithubModal(true)
            }}
            className="btn-ghost text-[12px] px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--dim)] hover:text-[var(--text)] hover:border-[var(--faint)] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <GitBranch size={13} />
            <span>Connect GitHub</span>
          </button>

          <button
            onClick={() => {
              setFormError(null)
              setShowConnectMcpModal(true)
            }}
            className="btn-primary text-[var(--accent)] font-medium text-[12px] px-3 py-1.5 rounded-md border border-[var(--border)] hover:border-[var(--accent)] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={13} />
            <span>Add MCP Server</span>
          </button>
        </div>
      </div>

      {/* Page Body */}
      <div className="page-body flex-1 overflow-y-auto p-6 space-y-6">
        
        {error && (
          <div className="p-3.5 rounded border border-[var(--bad)] bg-[var(--bad-dim)] text-[var(--bad)] text-[12px]">
            ⚠️ <strong>Error:</strong> {error}
          </div>
        )}

        {/* Connected Section */}
        <div className="space-y-3">
          <div className="section-sub font-mono text-[10px] text-[var(--faint)] tracking-wider uppercase font-bold">
            CONNECTED INTEGRATIONS ({integrations.length})
          </div>

          {loading ? (
            <div className="p-6 border border-[var(--border-soft)] rounded-[var(--radius)] bg-[var(--panel)] text-center text-[var(--dim)] font-mono text-[12px] flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
              <span>Loading workspace integrations...</span>
            </div>
          ) : integrations.length === 0 ? (
            <div className="border border-[var(--border-soft)] rounded-[var(--radius)] p-8 text-center bg-[var(--panel)] space-y-2">
              <p className="text-[13.5px] font-semibold text-[var(--text)]">No integrations connected</p>
              <p className="text-[12px] text-[var(--faint)] font-mono">
                Connect GitHub or an MCP server to give agents more tools to work with during autonomous task execution.
              </p>
            </div>
          ) : (
            <div className="int-grid grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
              {integrations.map((item) => (
                <div key={item.id} className="int-card border border-[var(--border-soft)] rounded-[var(--radius)] p-4 bg-[var(--panel)] flex flex-col justify-between gap-3">
                  <div className="int-card-top flex items-center gap-2.5">
                    <div className="int-icon w-8 h-8 rounded-md border border-[var(--border)] flex items-center justify-center flex-shrink-0 text-[var(--accent)]">
                      {item.type === 'github' ? <GitBranch size={15} /> : <Server size={15} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="int-name font-medium text-[12.5px] text-[var(--text)] truncate">{item.name}</div>
                      <div className="int-meta text-[11px] text-[var(--faint)] font-mono truncate">
                        {item.config?.repo || item.config?.url || 'Connected'}
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="int-desc text-[12px] text-[var(--dim)] line-clamp-2 leading-relaxed">
                    Allowed Agent Roles: {(item.allowedRoles || ['planner', 'coder', 'auditor', 'tester']).join(', ')}
                  </div>

                  <div className="int-actions flex items-center gap-3 pt-2 border-t border-[var(--border-soft)] text-[11.5px]">
                    <button
                      onClick={() => setReconfigureTarget(item)}
                      className="text-[var(--dim)] hover:text-[var(--text)] cursor-pointer flex items-center gap-1"
                    >
                      <Settings size={12} />
                      <span>Reconfigure</span>
                    </button>
                    <button
                      onClick={() => disconnect(item.id)}
                      className="text-[var(--bad)] hover:underline cursor-pointer flex items-center gap-1 ml-auto"
                    >
                      <Trash2 size={12} />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catalog Section */}
        <div className="space-y-3">
          <div className="section-sub font-mono text-[10px] text-[var(--faint)] tracking-wider uppercase font-bold">
            AVAILABLE INTEGRATION CATALOG
          </div>

          <div className="int-grid grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {/* GitHub */}
            <div className="int-card border border-[var(--border-soft)] rounded-[var(--radius)] p-4 bg-[var(--panel)] flex flex-col justify-between gap-3">
              <div>
                <div className="int-card-top flex items-center gap-2.5 mb-2">
                  <div className="int-icon w-8 h-8 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                    <GitBranch size={15} />
                  </div>
                  <div>
                    <div className="int-name font-medium text-[12.5px] text-[var(--text)]">GitHub Connector</div>
                    <div className="int-meta text-[11px] text-[var(--faint)] font-mono">Code & PRs</div>
                  </div>
                </div>
                <div className="int-desc text-[12px] text-[var(--dim)] leading-relaxed">
                  Grant agents scoped read/write access to repositories, branches, and PR workflows.
                </div>
              </div>

              <button
                onClick={() => {
                  setFormError(null)
                  setShowConnectGithubModal(true)
                }}
                className="btn-ghost text-[11.5px] py-1.5 border border-[var(--border)] rounded text-[var(--dim)] hover:text-[var(--text)] cursor-pointer w-full text-center"
              >
                Configure GitHub
              </button>
            </div>

            {/* Custom MCP */}
            <div className="int-card border border-[var(--border-soft)] rounded-[var(--radius)] p-4 bg-[var(--panel)] flex flex-col justify-between gap-3">
              <div>
                <div className="int-card-top flex items-center gap-2.5 mb-2">
                  <div className="int-icon w-8 h-8 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                    <Server size={15} />
                  </div>
                  <div>
                    <div className="int-name font-medium text-[12.5px] text-[var(--text)]">Custom MCP Server</div>
                    <div className="int-meta text-[11px] text-[var(--faint)] font-mono">Model Context Protocol</div>
                  </div>
                </div>
                <div className="int-desc text-[12px] text-[var(--dim)] leading-relaxed">
                  Connect standard SSE/HTTP MCP server endpoints with automated validation.
                </div>
              </div>

              <button
                onClick={() => {
                  setFormError(null)
                  setShowConnectMcpModal(true)
                }}
                className="btn-primary text-[var(--accent)] text-[11.5px] py-1.5 border border-[var(--border)] hover:border-[var(--accent)] rounded cursor-pointer w-full text-center"
              >
                Add MCP Server
              </button>
            </div>

            {/* PostgreSQL */}
            <div className="int-card border border-[var(--border-soft)] rounded-[var(--radius)] p-4 bg-[var(--panel)] flex flex-col justify-between gap-3">
              <div>
                <div className="int-card-top flex items-center gap-2.5 mb-2">
                  <div className="int-icon w-8 h-8 rounded-md border border-[var(--border)] flex items-center justify-center text-[var(--accent)]">
                    <Database size={15} />
                  </div>
                  <div>
                    <div className="int-name font-medium text-[12.5px] text-[var(--text)]">PostgreSQL DB MCP</div>
                    <div className="int-meta text-[11px] text-[var(--faint)] font-mono">Database Tools</div>
                  </div>
                </div>
                <div className="int-desc text-[12px] text-[var(--dim)] leading-relaxed">
                  Relational DB schema inspection, SQL queries, and migration execution.
                </div>
              </div>

              <button
                onClick={() => {
                  setMcpName('PostgreSQL Database MCP')
                  setMcpUrl('http://localhost:5432/mcp')
                  setShowConnectMcpModal(true)
                }}
                className="btn-ghost text-[11.5px] py-1.5 border border-[var(--border)] rounded text-[var(--dim)] hover:text-[var(--text)] cursor-pointer w-full text-center"
              >
                Connect Database
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Connect Modal */}
      {showConnectGithubModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius)] p-5 max-w-[420px] w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
              <h3 className="text-[14.5px] font-semibold text-[var(--text)] flex items-center gap-2">
                <GitBranch size={15} className="text-[var(--accent)]" />
                Connect GitHub Repository
              </h3>
              <button onClick={() => setShowConnectGithubModal(false)} className="text-[var(--faint)] hover:text-[var(--text)]">
                <X size={15} />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-[var(--bad-dim)] border border-[var(--bad)] text-[var(--bad)] text-[11.5px]">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[11.5px] font-mono text-[var(--faint)] block mb-1">Target Repo (org/repo)</label>
                <input
                  type="text"
                  value={ghRepo}
                  onChange={(e) => setGhRepo(e.target.value)}
                  className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-[12.5px] font-mono text-[var(--text)] outline-none"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-mono text-[var(--faint)] block mb-1">Access Token</label>
                <input
                  type="password"
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-[12.5px] font-mono text-[var(--text)] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
              <button
                onClick={() => setShowConnectGithubModal(false)}
                className="px-3 py-1.5 rounded border border-[var(--border)] text-[12px] text-[var(--dim)] hover:text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectGithub}
                className="px-4 py-1.5 rounded bg-[var(--accent)] text-[var(--bg)] font-semibold text-[12px]"
              >
                Authorize & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MCP Connect Modal */}
      {showConnectMcpModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-[var(--radius)] p-5 max-w-[420px] w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
              <h3 className="text-[14.5px] font-semibold text-[var(--text)] flex items-center gap-2">
                <Server size={15} className="text-[var(--accent)]" />
                Connect MCP Server
              </h3>
              <button onClick={() => setShowConnectMcpModal(false)} className="text-[var(--faint)] hover:text-[var(--text)]">
                <X size={15} />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-[var(--bad-dim)] border border-[var(--bad)] text-[var(--bad)] text-[11.5px]">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[11.5px] font-mono text-[var(--faint)] block mb-1">Server Name</label>
                <input
                  type="text"
                  value={mcpName}
                  onChange={(e) => setMcpName(e.target.value)}
                  placeholder="e.g. Asana Workflow MCP"
                  className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-[12.5px] text-[var(--text)] outline-none"
                />
              </div>

              <div>
                <label className="text-[11.5px] font-mono text-[var(--faint)] block mb-1">Server URL</label>
                <input
                  type="text"
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  placeholder="http://localhost:8008/mcp"
                  className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-[12.5px] font-mono text-[var(--text)] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
              <button
                onClick={() => setShowConnectMcpModal(false)}
                className="px-3 py-1.5 rounded border border-[var(--border)] text-[12px] text-[var(--dim)] hover:text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectMcp}
                className="px-4 py-1.5 rounded bg-[var(--accent)] text-[var(--bg)] font-semibold text-[12px]"
              >
                Validate & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
