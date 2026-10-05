/** Per-browser defaults (model, stack). Storage can be unavailable; the fallback then applies. */
const PREFIX = 'splitterai_pref_'

export function readPreference(name: string, fallback: string): string {
  try {
    return localStorage.getItem(PREFIX + name) ?? fallback
  } catch {
    return fallback
  }
}

export function writePreference(name: string, value: string): void {
  try {
    localStorage.setItem(PREFIX + name, value)
  } catch {
    /* not persisted */
  }
}
