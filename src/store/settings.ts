export type ExpandMode = 'NONE' | 'AWAITING' | 'SRC' | 'TGT'

export interface DisplaySettings {
  dark: boolean
  fontSize: number
  columnsSwapped: boolean
  expandMode: ExpandMode
}

const KEY = 'biling_reader_settings'
const DEFAULTS: DisplaySettings = { dark: true, fontSize: 15, columnsSwapped: false, expandMode: 'NONE' }

export function loadSettings(): DisplaySettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DisplaySettings>) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(s: DisplaySettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage full / private mode — ignore */
  }
}