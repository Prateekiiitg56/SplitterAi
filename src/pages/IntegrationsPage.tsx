import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GitBranch,
  Plug,
  Server,
  Plus,
  CheckCircle2,
  XCircle,
  Key,
  Database,
  Box,
  Sparkles,
  Code2,
  RefreshCw,
  Eye,
  EyeOff,
  Sliders,
  ExternalLink,
  FileText,
} from 'lucide-react'

interface MCPServer {
  id: string
  name: string
  transport: 'stdio' | 'sse'
  status: 'active' | 'lazy' | 'disconnected'
  description: string
  toolsCount: number
  category: string
}

const DEFAULT_MCP_SERVERS: MCPServer[] = [
  {
    id: 'filesystem',
    name: 'Filesystem MCP Server',
    transport: 'stdio',
    status: 'active',
    description: 'Local workspace file viewing, editing, recursive tree, and directory search.',
    toolsCount: 12,
    category: 'Core Storage',
  },
  {
    id: 'blender',
    name: 'Blender 3D MCP Server',
    transport: 'stdio',
    status: 'lazy',
    description: 'PolyHaven asset downloader, Blender script execution, and viewport screenshots.',
    toolsCount: 22,
    category: '3D & Graphics',
  },
  {
    id: 'game-asset-gen',
    name: 'Game Asset Gen MCP',
    transport: 'stdio',
    status: 'active',
    description: 'OpenAI, Gemini, and Fal.ai image, texture, and character sheet generator.',
    toolsCount: 10,
    category: 'Generative AI',
  },
  {
    id: 'threejs-devtools',
    name: 'Three.js DevTools MCP',
    transport: 'stdio',
    status: 'active',
    description: 'Scene inspection, material tuning, postprocessing effects, and canvas rendering.',
    toolsCount: 42,
    category: 'Developer Tools',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL Database MCP',
    transport: 'sse',
    status: 'disconnected',
    description: 'Inspect relational DB schemas, run migrations, and execute parameterized queries.',
    toolsCount: 8,
    category: 'Database',
  },
]

export default function IntegrationsPage() {
  let navigate = (path: string) => { window.location.href = path }
  try {
    const nav = useNavigate()
    if (typeof nav === 'function') navigate = nav
  } catch { /* fallback */ }

  const { mcpServers, toggleMCPServer, addMCPServer } = useUI()

  const [githubConnected, setGithubConnected] = useState(false)
  const [githubToken, setGithubToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState('Prateekiiitg56/SplitterAi')
  const [syncing, setSyncing] = useState(false)

  // Custom MCP Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMcpName, setNewMcpName] = useState('')
  const [newMcpCommand, setNewMcpCommand] = useState('')

  const handleSyncRepos = () => {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 1200)
  }

  const handleToggleMcp = (id: string) => {
    toggleMCPServer(id)
  }

  const handleAddMcpServer = () => {
    if (!newMcpName.trim()) return
    addMCPServer(newMcpName, newMcpCommand)
    setNewMcpName('')
    setNewMcpCommand('')
    setShowAddModal(false)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0C10] text-white font-sans p-8 select-none">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Plug size={22} className="text-[#9D8CFC]" />
              <h1 className="text-[26px] font-bold text-white tracking-tight">
                Integrations & MCP Protocol Hub
              </h1>
            </div>
            <p className="text-[13.5px] text-neutral-400 max-w-[80ch] leading-relaxed">
              Connect GitHub repositories, manage Model Context Protocol (MCP) servers, and configure AI tool providers for SplitterAI multi-agent workers.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>Add MCP Server</span>
          </button>
        </div>

        {/* ── 1. GITHUB WORKSPACE INTEGRATION ─────────────────────── */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#141824] p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#101218] border border-white/10 flex items-center justify-center text-[#9D8CFC]">
                <GitBranch size={22} />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-white">GitHub Integration</h2>
                <p className="text-[12.5px] text-neutral-400">
                  Enable automatic repository cloning, pull request creation, and issue syncing for agent subtasks.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11.5px] font-semibold ${
                  githubConnected
                    ? 'bg-[#30A46C]/20 border border-[#30A46C]/40 text-[#30A46C]'
                    : 'bg-red-500/20 border border-red-500/40 text-red-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${githubConnected ? 'bg-[#30A46C]' : 'bg-red-400'}`} />
                {githubConnected ? 'Connected (@Prateekiiitg56)' : 'Disconnected'}
              </span>

              <button
                onClick={() => setGithubConnected(!githubConnected)}
                className="px-3.5 py-1.5 rounded-lg border border-white/10 text-[12.5px] font-medium text-neutral-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
              >
                {githubConnected ? 'Disconnect' : 'Connect Account'}
              </button>
            </div>
          </div>

          {githubConnected && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
              {/* Connected Repositories Selector */}
              <div>
                <label className="text-[12px] font-semibold text-neutral-400 block mb-1.5">
                  Active Workspace Repository
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 rounded-xl bg-[#101218] border border-white/10 flex items-center justify-between text-[13px] font-mono text-white">
                    <span className="flex items-center gap-2">
                      <GitBranch size={14} className="text-[#9D8CFC]" />
                      <span>{selectedRepo}</span>
                    </span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded bg-[#6E56CF]/20 text-[#9D8CFC] font-semibold">
                      Main Branch
                    </span>
                  </div>

                  <button
                    onClick={handleSyncRepos}
                    disabled={syncing}
                    className="p-2.5 rounded-xl border border-white/10 bg-[#101218] text-neutral-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                    title="Sync GitHub Repositories"
                  >
                    <RefreshCw size={16} className={syncing ? 'animate-spin text-[#9D8CFC]' : ''} />
                  </button>
                </div>
              </div>

              {/* Personal Access Token Field */}
              <div>
                <label className="text-[12px] font-semibold text-neutral-400 block mb-1.5">
                  Personal Access Token (PAT)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 rounded-xl bg-[#101218] border border-white/10 flex items-center justify-between text-[13px] font-mono text-white">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={githubToken}
                      onChange={(e) => {
                        setGithubToken(e.target.value)
                        setGithubConnected(Boolean(e.target.value.trim()))
                      }}
                      placeholder="Enter GitHub PAT (e.g. ghp_...)"
                      className="w-full bg-transparent outline-none placeholder:text-neutral-600 font-mono text-[13px]"
                    />
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="text-neutral-500 hover:text-white cursor-pointer ml-2"
                    >
                      {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── 2. MODEL CONTEXT PROTOCOL (MCP) SERVERS GRID ────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-white tracking-tight flex items-center gap-2">
                <Server size={18} className="text-[#9D8CFC]" />
                <span>Model Context Protocol (MCP) Servers</span>
              </h2>
              <p className="text-[12.5px] text-neutral-400 mt-0.5">
                Standardized tool capabilities loaded dynamically by SplitterAI agent workers.
              </p>
            </div>

            <span className="text-[12px] font-mono text-neutral-400">
              {mcpServers.filter((s) => s.status !== 'disconnected').length} of {mcpServers.length} Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {mcpServers.map((server) => {
              const isConnected = server.status !== 'disconnected'
              return (
                <div
                  key={server.id}
                  className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 flex flex-col justify-between gap-4 hover:border-white/[0.16] transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#6E56CF]/15 border border-[#6E56CF]/30 flex items-center justify-center text-[#9D8CFC]">
                        {server.id === 'filesystem' && <FileText size={18} />}
                        {server.id === 'blender' && <Box size={18} />}
                        {server.id === 'game-asset-gen' && <Sparkles size={18} />}
                        {server.id === 'threejs-devtools' && <Code2 size={18} />}
                        {server.id === 'postgres' && <Database size={18} />}
                        {server.id.startsWith('custom') && <Plug size={18} />}
                      </div>

                      <div>
                        <h3 className="text-[14.5px] font-bold text-white">{server.name}</h3>
                        <span className="text-[11px] font-mono text-neutral-500">
                          {server.category} · {server.toolsCount} registered tools
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider ${
                        server.status === 'active'
                          ? 'bg-[#30A46C]/20 text-[#30A46C] border border-[#30A46C]/40'
                          : server.status === 'lazy'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-white/[0.06] text-neutral-500 border border-white/10'
                      }`}
                    >
                      {server.status}
                    </span>
                  </div>

                  <p className="text-[12.5px] text-neutral-300 leading-relaxed">
                    {server.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                    <span className="text-[11px] font-mono text-neutral-500">
                      Transport: <strong className="text-neutral-300">{server.transport}</strong>
                    </span>

                    <button
                      onClick={() => handleToggleMcp(server.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${
                        isConnected
                          ? 'bg-white/[0.06] hover:bg-red-500/20 text-neutral-300 hover:text-red-400 border border-white/10'
                          : 'bg-[#6E56CF] hover:bg-[#5E46BF] text-white'
                      }`}
                    >
                      {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 3. API KEY VAULT SECTION ───────────────────────────── */}
        <section className="rounded-2xl border border-white/[0.08] bg-[#141824] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Key size={18} className="text-[#9D8CFC]" />
              <h2 className="text-[16px] font-bold text-white">AI Provider Key Vault</h2>
            </div>
            <span className="text-[11.5px] font-mono text-neutral-500">
              Loaded dynamically from .env environment
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              {
                provider: 'Google Gemini API',
                model: 'gemini-3.5-flash / pro',
                rawKey: import.meta.env.VITE_GEMINI_API_KEY,
              },
              {
                provider: 'xAI Grok API',
                model: 'grok-2-beta / grok-vision',
                rawKey: import.meta.env.VITE_XAI_GROK_API_KEY,
              },
              {
                provider: 'OpenRouter (Super)',
                model: 'nvidia/nemotron-3-super-120b-a12b:free',
                rawKey: import.meta.env.VITE_OPENROUTER_SUPER_KEY,
              },
              {
                provider: 'OpenRouter (Ultra)',
                model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                rawKey: import.meta.env.VITE_OPENROUTER_ULTRA_KEY,
              },
            ].map((item) => {
              const hasKey = Boolean(item.rawKey)
              const masked = hasKey
                ? `${item.rawKey.slice(0, 8)}...${item.rawKey.slice(-4)}`
                : 'Not Configured'
              return (
                <div
                  key={item.provider}
                  className="p-4 rounded-xl border border-white/[0.08] bg-[#101218] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-bold text-white">{item.provider}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        hasKey
                          ? 'bg-[#30A46C]/20 text-[#30A46C] border border-[#30A46C]/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {hasKey ? 'Active Key' : 'Missing'}
                    </span>
                  </div>

                  <p className="text-[11px] font-mono text-neutral-400 truncate">
                    {item.model}
                  </p>

                  <div className="text-[11.5px] font-mono text-neutral-300 pt-1 border-t border-white/[0.05]">
                    {masked}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </div>

      {/* ── ADD MCP SERVER MODAL ────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#141824] rounded-2xl border border-white/10 p-6 w-full max-w-[500px] space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
                <Plus size={16} className="text-[#9D8CFC]" />
                Register Custom MCP Server
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-semibold text-neutral-400 block mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  value={newMcpName}
                  onChange={(e) => setNewMcpName(e.target.value)}
                  placeholder="e.g. Docker Container MCP Server"
                  className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-[13px] text-white outline-none focus:border-[#6E56CF]"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-neutral-400 block mb-1">
                  Command / Transport URL
                </label>
                <input
                  type="text"
                  value={newMcpCommand}
                  onChange={(e) => setNewMcpCommand(e.target.value)}
                  placeholder="e.g. npx -y @modelcontextprotocol/server-docker"
                  className="w-full p-2.5 rounded-xl bg-[#101218] border border-white/10 text-[13px] font-mono text-white outline-none focus:border-[#6E56CF]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-[13px] font-semibold text-neutral-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMcpServer}
                className="px-4 py-2 rounded-xl bg-[#6E56CF] hover:bg-[#5E46BF] text-white text-[13px] font-semibold cursor-pointer"
              >
                Connect Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
