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
  AlertCircle,
} from 'lucide-react'
import { useIntegrations } from '../hooks/useIntegrations'
import { StatusBadge } from '../components/Badges'
import type { AgentRole, Integration } from '../types'
import { ROLE_META } from '../data'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/primitives/Button'
import { EmptyState } from '../components/primitives/EmptyState'
import { Panel } from '../components/primitives/Panel'

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
      
      <PageHeader
        title="Integrations"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<GitBranch size={13} />}
              onClick={() => {
                setFormError(null)
                setShowConnectGithubModal(true)
              }}
            >
              Connect GitHub
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => {
                setFormError(null)
                setShowConnectMcpModal(true)
              }}
            >
              Add MCP Server
            </Button>
          </>
        }
      />

      {/* Page Body */}
      <div className="page-body flex-1 overflow-y-auto p-6 space-y-6">
        
        {error && (
          <div className="p-3.5 rounded border border-[var(--bad)] bg-[var(--bad-quiet)] text-[var(--bad)] text-meta">
            ⚠️ <strong>Error:</strong> {error}
          </div>
        )}

        {/* Connected Section */}
        <div className="space-y-3">
          <div className="section-sub font-mono text-micro text-[var(--faint)] tracking-wider uppercase font-bold">
            CONNECTED INTEGRATIONS ({integrations.length})
          </div>

          {loading ? (
            <div className="p-6 border border-[var(--border-soft)] rounded-panel bg-[var(--panel)] text-center text-[var(--dim)] font-mono text-meta flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
              <span>Loading workspace integrations...</span>
            </div>
          ) : integrations.length === 0 ? (
            <Panel>
              <EmptyState
                icon={<Server size={32} />}
                title="No integrations connected"
                detail="Connect GitHub or an MCP server to give agents more tools to work with during autonomous task execution."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus size={13} />}
                    onClick={() => {
                      setFormError(null)
                      setShowConnectMcpModal(true)
                    }}
                  >
                    Add MCP Server
                  </Button>
                }
              />
            </Panel>
          ) : (
            <div className="int-grid grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
              {integrations.map((item) => (
                <div key={item.id} className="int-card border border-[var(--border-soft)] rounded-panel p-4 bg-[var(--panel)] flex flex-col justify-between gap-3">
                  <div className="int-card-top flex items-center gap-2.5">
                    <div className="int-icon w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--panel-2)] flex items-center justify-center flex-shrink-0 text-[var(--accent)]">
                      {item.type === 'github' ? <GitBranch size={15} /> : <Server size={15} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="int-name font-medium text-meta text-[var(--text)] truncate">{item.name}</div>
                      <div className="int-meta text-micro text-[var(--faint)] font-mono truncate">
                        {item.config?.repo || item.config?.url || 'Connected'}
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="int-desc text-meta text-[var(--dim)] line-clamp-2 leading-relaxed">
                    Allowed Agent Roles: {(item.allowedRoles || ['planner', 'coder', 'auditor', 'tester']).join(', ')}
                  </div>

                  <div className="int-actions flex items-center gap-3 pt-2 border-t border-[var(--border-soft)] text-micro">
                    <button
                      onClick={() => setReconfigureTarget(item)}
                      className="text-[var(--dim)] hover:text-[var(--text)] cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      <Settings size={12} />
                      <span>Reconfigure</span>
                    </button>
                    <button
                      onClick={() => disconnect(item.id)}
                      className="text-[var(--bad)] hover:underline cursor-pointer flex items-center gap-1 ml-auto transition-colors"
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
          <div className="section-sub font-mono text-micro text-[var(--faint)] tracking-wider uppercase font-bold">
            AVAILABLE INTEGRATION CATALOG
          </div>

          <div className="int-grid grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
            {/* GitHub */}
            <div className="int-card border border-[var(--border-soft)] rounded-panel p-4 bg-[var(--panel)] flex flex-col justify-between gap-3">
              <div>
                <div className="int-card-top flex items-center gap-2.5 mb-2.5">
                  <div className="int-icon w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--panel-2)] flex items-center justify-center text-[var(--accent)]">
                    <GitBranch size={15} />
                  </div>
                  <div>
                    <div className="int-name font-medium text-meta text-[var(--text)]">GitHub Connector</div>
                    <div className="int-meta text-micro text-[var(--faint)] font-mono">Code & PRs</div>
                  </div>
                </div>
                <div className="int-desc text-meta text-[var(--dim)] leading-relaxed">
                  Grant agents scoped read/write access to repositories, branches, and PR workflows.
                </div>
              </div>

              <button
                onClick={() => {
                  setFormError(null)
                  setShowConnectGithubModal(true)
                }}
                className="btn-ghost text-micro py-1.5 border border-[var(--border)] rounded text-[var(--dim)] hover:text-[var(--text)] cursor-pointer w-full text-center"
              >
                Configure GitHub
              </button>
            </div>

            {/* Custom MCP */}
            <div className="int-card border border-[var(--border-soft)] rounded-panel p-4 bg-[var(--panel)] flex flex-col justify-between gap-3">
              <div>
                <div className="int-card-top flex items-center gap-2.5 mb-2.5">
                  <div className="int-icon w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--panel-2)] flex items-center justify-center text-[var(--accent)]">
                    <Server size={15} />
                  </div>
                  <div>
                    <div className="int-name font-medium text-meta text-[var(--text)]">Custom MCP Server</div>
                    <div className="int-meta text-micro text-[var(--faint)] font-mono">Model Context Protocol</div>
                  </div>
                </div>
                <div className="int-desc text-meta text-[var(--dim)] leading-relaxed">
                  Connect standard SSE/HTTP MCP server endpoints with automated validation.
                </div>
              </div>

              <button
                onClick={() => {
                  setFormError(null)
                  setShowConnectMcpModal(true)
                }}
                className="btn-primary text-[var(--accent)] text-micro py-1.5 border border-[var(--border)] hover:border-[var(--accent)] rounded cursor-pointer w-full text-center"
              >
                Add MCP Server
              </button>
            </div>

            {/* PostgreSQL */}
            <div className="int-card border border-[var(--border-soft)] rounded-panel p-4 bg-[var(--panel)] flex flex-col justify-between gap-3">
              <div>
                <div className="int-card-top flex items-center gap-2.5 mb-2.5">
                  <div className="int-icon w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--panel-2)] flex items-center justify-center text-[var(--accent)]">
                    <Database size={15} />
                  </div>
                  <div>
                    <div className="int-name font-medium text-meta text-[var(--text)]">PostgreSQL DB MCP</div>
                    <div className="int-meta text-micro text-[var(--faint)] font-mono">Database Tools</div>
                  </div>
                </div>
                <div className="int-desc text-meta text-[var(--dim)] leading-relaxed">
                  Relational DB schema inspection, SQL queries, and migration execution.
                </div>
              </div>

              <button
                onClick={() => {
                  setMcpName('PostgreSQL Database MCP')
                  setMcpUrl('http://localhost:5432/mcp')
                  setShowConnectMcpModal(true)
                }}
                className="btn-ghost text-micro py-1.5 border border-[var(--border)] rounded text-[var(--dim)] hover:text-[var(--text)] cursor-pointer w-full text-center"
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
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-panel p-5 max-w-[420px] w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
              <h3 className="text-strong font-semibold text-[var(--text)] flex items-center gap-2">
                <GitBranch size={15} className="text-[var(--accent)]" />
                Connect GitHub Repository
              </h3>
              <button onClick={() => setShowConnectGithubModal(false)} className="text-[var(--faint)] hover:text-[var(--text)]">
                <X size={15} />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-[var(--bad-quiet)] border border-[var(--bad)] text-[var(--bad)] text-micro">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-micro font-mono text-[var(--faint)] block mb-1">Target Repo (org/repo)</label>
                <input
                  type="text"
                  value={ghRepo}
                  onChange={(e) => setGhRepo(e.target.value)}
                  className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-meta font-mono text-[var(--text)] outline-none"
                />
              </div>

              <div>
                <label className="text-micro font-mono text-[var(--faint)] block mb-1">Access Token</label>
                <input
                  type="password"
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-meta font-mono text-[var(--text)] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
              <button
                onClick={() => setShowConnectGithubModal(false)}
                className="px-3 py-1.5 rounded border border-[var(--border)] text-meta text-[var(--dim)] hover:text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectGithub}
                className="px-4 py-1.5 rounded bg-[var(--accent)] text-[var(--bg)] font-semibold text-meta"
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
          <div className="bg-[var(--panel)] border border-[var(--border)] rounded-panel p-5 max-w-[420px] w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
              <h3 className="text-strong font-semibold text-[var(--text)] flex items-center gap-2">
                <Server size={15} className="text-[var(--accent)]" />
                Connect MCP Server
              </h3>
              <button onClick={() => setShowConnectMcpModal(false)} className="text-[var(--faint)] hover:text-[var(--text)]">
                <X size={15} />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-[var(--bad-quiet)] border border-[var(--bad)] text-[var(--bad)] text-micro">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-micro font-mono text-[var(--faint)] block mb-1">Server Name</label>
                <input
                  type="text"
                  value={mcpName}
                  onChange={(e) => setMcpName(e.target.value)}
                  placeholder="e.g. Asana Workflow MCP"
                  className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-meta text-[var(--text)] outline-none"
                />
              </div>

              <div>
                <label className="text-micro font-mono text-[var(--faint)] block mb-1">Server URL</label>
                <input
                  type="text"
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  placeholder="http://localhost:8008/mcp"
                  className="w-full bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-meta font-mono text-[var(--text)] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
              <button
                onClick={() => setShowConnectMcpModal(false)}
                className="px-3 py-1.5 rounded border border-[var(--border)] text-meta text-[var(--dim)] hover:text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectMcp}
                className="px-4 py-1.5 rounded bg-[var(--accent)] text-[var(--bg)] font-semibold text-meta"
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
