import React, { createContext, useContext, useState } from 'react'
import { AVAILABLE_MODELS } from '../data'
import { useMCPServers } from '../hooks/useMCPServers'
import type { AgentRole, ModelOption, ExecutionMode, MCPServer } from '../types'
import { Layers, Zap, Search, ShieldCheck } from 'lucide-react'

export const executionModes: ExecutionMode[] = [
  { id: 'Planning', label: 'Planning Mode', desc: 'Decomposes task into DAG graph of parallel workers', icon: Layers },
  { id: 'Fast Execution', label: 'Fast Execution', desc: 'Direct single-agent tool execution without graph', icon: Zap },
  { id: 'Deep Research', label: 'Deep Research', desc: 'Multi-source search & architecture synthesis', icon: Search },
  { id: 'Code Audit', label: 'Code Audit', desc: 'PEP 8 quality & OWASP security vulnerability audit', icon: ShieldCheck },
]

interface UIContextType {
  sidebarCollapsed: boolean
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  toggleSidebar: () => void
  selectedSessionId: string
  setSelectedSessionId: React.Dispatch<React.SetStateAction<string>>
  selectedRole: AgentRole
  setSelectedRole: React.Dispatch<React.SetStateAction<AgentRole>>
  selectedModel: ModelOption
  setSelectedModel: React.Dispatch<React.SetStateAction<ModelOption>>
  selectedMode: ExecutionMode
  setSelectedMode: React.Dispatch<React.SetStateAction<ExecutionMode>>
  logFilter: string | null
  setLogFilter: React.Dispatch<React.SetStateAction<string | null>>
  multiMode: boolean
  setMultiMode: React.Dispatch<React.SetStateAction<boolean>>
  mcpServers: MCPServer[]
  toggleMCPServer: (id: string) => void
  addMCPServer: (name: string, command: string) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState('s1')
  const [selectedRole, setSelectedRole] = useState<AgentRole>('coder')
  const [selectedModel, setSelectedModel] = useState<ModelOption>(AVAILABLE_MODELS[0])
  const [selectedMode, setSelectedMode] = useState<ExecutionMode>(executionModes[0])
  const [logFilter, setLogFilter] = useState<string | null>(null)
  const [multiMode, setMultiMode] = useState(true)

  const { mcpServers, toggleMCPServer, addMCPServer } = useMCPServers()

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev)

  return (
    <UIContext.Provider
      value={{
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        selectedSessionId,
        setSelectedSessionId,
        selectedRole,
        setSelectedRole,
        selectedModel,
        setSelectedModel,
        selectedMode,
        setSelectedMode,
        logFilter,
        setLogFilter,
        multiMode,
        setMultiMode,
        mcpServers,
        toggleMCPServer,
        addMCPServer,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
