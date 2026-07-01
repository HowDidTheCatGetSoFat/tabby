import { WindowBounds } from './windows'

export interface WindowSessionEntry {
    order: number
    bounds: WindowBounds | null
    tokens: unknown[]
}

const KEY = 'mosaic.session'

export function readSession (): WindowSessionEntry[] {
    try {
        const raw = window.localStorage.getItem(KEY)
        if (!raw) {
            return []
        }
        const map = JSON.parse(raw) as Record<string, WindowSessionEntry>
        return Object.values(map).sort((a, b) => a.order - b.order)
    } catch {
        return []
    }
}

export function writeOwnEntry (windowId: number, liveIds: number[], entry: WindowSessionEntry): void {
    try {
        const raw = window.localStorage.getItem(KEY)
        const map = (raw ? JSON.parse(raw) : {}) as Record<string, WindowSessionEntry>
        const live = new Set(liveIds)
        // Keep only entries for windows that are still open, then set our own.
        const kept: Record<string, WindowSessionEntry> = {}
        for (const [key, value] of Object.entries(map)) {
            if (live.has(Number(key))) {
                kept[key] = value
            }
        }
        kept[String(windowId)] = entry
        window.localStorage.setItem(KEY, JSON.stringify(kept))
    } catch {
        // ignore
    }
}

// Tabby restores the last window's tabs from its own key; clear it so the
// managed session does not produce duplicates in the main window.
export function clearTabbyRecovery (): void {
    try {
        window.localStorage.removeItem('tabsRecovery')
    } catch {
        // ignore
    }
}
