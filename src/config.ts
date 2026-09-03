/**
 * Central Configuration for SplitterAI Frontend.
 *
 * Single source of truth for API endpoints, WebSocket URL, and Default Workspace.
 */

export const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
export const WS_URL: string = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
export const DEFAULT_WORKSPACE: string = import.meta.env.VITE_DEFAULT_WORKSPACE || 'd:/CodeForces/SplitterAi'
