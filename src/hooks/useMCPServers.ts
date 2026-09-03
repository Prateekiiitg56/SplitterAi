import { useState, useEffect } from 'react'
import type { MCPServer } from '../types'

export const DEFAULT_MCP_SERVERS: MCPServer[] = [
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
]

export function useMCPServers() {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>(() => {
    try {
      const saved = localStorage.getItem('splitter_mcp_servers')
      if (saved) return JSON.parse(saved)
    } catch { /* fallback */ }
    return DEFAULT_MCP_SERVERS
  })

  useEffect(() => {
    try {
      localStorage.setItem('splitter_mcp_servers', JSON.stringify(mcpServers))
    } catch { /* fallback */ }
  }, [mcpServers])

  const toggleMCPServer = (id: string) => {
    setMcpServers((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextStatus = s.status === 'disconnected' ? 'active' : 'disconnected'
          return { ...s, status: nextStatus }
        }
        return s
      })
    )
  }

  const addMCPServer = (name: string, command: string) => {
    if (!name.trim()) return
    const newServer: MCPServer = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      transport: 'stdio',
      status: 'active',
      description: command ? `Custom stdio server: ${command}` : 'User-configured custom MCP server',
      toolsCount: 5,
      category: 'Custom Extensions',
    }
    setMcpServers((prev) => [...prev, newServer])
  }

  return { mcpServers, toggleMCPServer, addMCPServer }
}
