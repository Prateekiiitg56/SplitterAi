/**
 * Central Configuration for SplitterAI Frontend.
 *
 * Single source of truth for API endpoints, WebSocket URL, and Default Workspace.
 */

export const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
export const WS_URL: string = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
export const DEFAULT_WORKSPACE: string = import.meta.env.VITE_DEFAULT_WORKSPACE || './workspace_output'

const SECRET_KEY = 'splitterai_shared_secret'

/** Matches the backend's SHARED_SECRET. From the build env, or saved in Settings for this browser. */
export function getSharedSecret(): string {
  try {
    return localStorage.getItem(SECRET_KEY) || import.meta.env.VITE_SHARED_SECRET || ''
  } catch {
    return import.meta.env.VITE_SHARED_SECRET || ''
  }
}

export function setSharedSecret(secret: string): void {
  try {
    if (secret) localStorage.setItem(SECRET_KEY, secret)
    else localStorage.removeItem(SECRET_KEY)
  } catch {
    /* storage unavailable */
  }
}

/** A project's id in URLs is its folder name, for both generated and imported projects. */
export const projectIdOf = (workspace: string): string =>
  workspace.split(/[/\\]/).filter(Boolean).pop() || 'default'
