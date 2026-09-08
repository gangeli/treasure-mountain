/** Tiny JSON persistence over localStorage; tolerant of private mode and quota errors. */
const KEY = 'treasure-mountain-v1'

export interface SaveData {
  /** The grade last chosen, so the clubhouse opens on it next time. */
  grade: number | null
  settings: { sound: boolean; music: boolean }
  /** Per-grade progress, shaped by the game layer (Profile in src/game/types.ts). */
  profiles: Record<string, unknown>
  /** The climb in progress, so closing the app mid-level resumes where it was. */
  lastRun: unknown | null
}

export const defaultSave = (): SaveData => ({
  grade: null,
  settings: { sound: true, music: true },
  profiles: {},
  lastRun: null,
})

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultSave()
    const parsed = JSON.parse(raw)
    return { ...defaultSave(), ...parsed, settings: { ...defaultSave().settings, ...(parsed.settings || {}) } }
  } catch {
    return defaultSave()
  }
}

export function writeSave(data: SaveData): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* ignore */ }
}
