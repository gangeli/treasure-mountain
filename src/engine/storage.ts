/** Tiny JSON persistence over localStorage; tolerant of private mode and quota errors. */
const KEY = 'treasure-mountain-v1'

export interface SaveData {
  grade: number | null
  bestScore: Record<string, number>   // per grade
  crowns: Record<string, number>      // per grade: times the crown was recovered
  settings: { sound: boolean; music: boolean; reduceMotion: boolean }
  stats: Record<string, { asked: number; right: number }> // per grade+skill
  lastRun: unknown | null
}

export const defaultSave = (): SaveData => ({
  grade: null,
  bestScore: {},
  crowns: {},
  settings: { sound: true, music: true, reduceMotion: false },
  stats: {},
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
