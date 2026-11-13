// SRC / MID / TGT: the left, middle and right column (MID exists only with three columns).
export type ExpandMode = 'NONE' | 'AWAITING' | 'SRC' | 'MID' | 'TGT'

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
    const v = JSON.parse(raw) as Partial<Record<keyof DisplaySettings, unknown>> | null
    if (!v || typeof v !== 'object') return { ...DEFAULTS }
    // Validate every field: a corrupted value (e.g. fontSize "abc") used to
    // render the whole book with font-size NaN.
    const expandModes: ExpandMode[] = ['NONE', 'SRC', 'MID', 'TGT']
    return {
      dark: typeof v.dark === 'boolean' ? v.dark : DEFAULTS.dark,
      fontSize: typeof v.fontSize === 'number' && Number.isFinite(v.fontSize)
        ? Math.max(12, Math.min(24, Math.round(v.fontSize)))
        : DEFAULTS.fontSize,
      columnsSwapped: typeof v.columnsSwapped === 'boolean' ? v.columnsSwapped : DEFAULTS.columnsSwapped,
      expandMode: expandModes.includes(v.expandMode as ExpandMode) ? (v.expandMode as ExpandMode) : DEFAULTS.expandMode
    }
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