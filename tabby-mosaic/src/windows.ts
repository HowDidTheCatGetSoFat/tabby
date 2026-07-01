import type * as Remote from '@electron/remote'
import type { BrowserWindow } from 'electron'

import { TilePreset } from './layout'
import { dlog } from './debug'

export interface WindowInfo {
    id: number
    title: string
    current: boolean
}

export interface WindowBounds {
    x: number
    y: number
    width: number
    height: number
}

// Lazily resolve @electron/remote so the plugin still loads outside Electron
// (e.g. tabby-web), where every window operation simply no-ops.
let resolved = false
let cached: typeof Remote | null = null

function remote (): typeof Remote | null {
    if (!resolved) {
        resolved = true
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            cached = require('@electron/remote')
        } catch {
            cached = null
        }
    }
    return cached
}

function currentId (): number | null {
    const win = remote()?.getCurrentWindow()
    return win ? win.id : null
}

function liveWindows (): BrowserWindow[] {
    const api = remote()
    if (!api) {
        return []
    }
    return api.BrowserWindow.getAllWindows().filter(w => !w.isDestroyed() && w.isVisible())
}

function present (win: BrowserWindow): void {
    win.show()
    win.focus()
    win.moveTop()
}

function place (win: BrowserWindow, area: WindowBounds): void {
    if (win.isMaximized()) {
        win.unmaximize()
    }
    if (win.isFullScreen()) {
        win.setFullScreen(false)
    }
    win.setBounds(area)
}

export function currentWindowId (): number | null {
    return currentId()
}

export function listWindows (): WindowInfo[] {
    const id = currentId()
    return liveWindows().map(w => ({
        id: w.id,
        title: w.getTitle(),
        current: w.id === id,
    }))
}

export function focusWindow (id: number): void {
    const win = remote()?.BrowserWindow.fromId(id)
    if (win && !win.isDestroyed()) {
        present(win)
    }
}

export function tileWindows (preset: TilePreset | undefined, acrossMonitors: boolean): void {
    const api = remote()
    if (!api) {
        return
    }
    const windows = liveWindows()
    if (windows.length < 2) {
        return
    }

    const groups: { windows: BrowserWindow[], area: WindowBounds }[] = []
    if (acrossMonitors) {
        const displays = api.screen.getAllDisplays()
        displays.forEach((display, di) => {
            groups.push({
                windows: windows.filter((_, wi) => wi % displays.length === di),
                area: display.workArea,
            })
        })
    } else {
        const focused = windows.find(w => w.isFocused()) ?? windows[0]
        groups.push({ windows, area: api.screen.getDisplayMatching(focused.getBounds()).workArea })
    }

    for (const group of groups) {
        if (group.windows.length === 0) {
            continue
        }
        let columns = Math.ceil(Math.sqrt(group.windows.length))
        if (preset === 'columns') {
            columns = group.windows.length
        } else if (preset === 'rows') {
            columns = 1
        }
        const rows = Math.ceil(group.windows.length / columns)
        group.windows.forEach((win, index) => {
            const column = index % columns
            const row = Math.floor(index / columns)
            place(win, {
                x: Math.round(group.area.x + column * group.area.width / columns),
                y: Math.round(group.area.y + row * group.area.height / rows),
                width: Math.round(group.area.width / columns),
                height: Math.round(group.area.height / rows),
            })
        })
    }
}

export function cascadeWindows (): void {
    const api = remote()
    if (!api) {
        return
    }
    const windows = liveWindows()
    if (windows.length < 2) {
        return
    }
    const focused = windows.find(w => w.isFocused()) ?? windows[0]
    const area = api.screen.getDisplayMatching(focused.getBounds()).workArea
    const width = Math.round(area.width * 0.6)
    const height = Math.round(area.height * 0.7)
    const offset = 36
    windows.forEach((win, index) => {
        place(win, { x: area.x + index * offset, y: area.y + index * offset, width, height })
    })
    present(focused)
}

export function isLeaderWindow (): boolean {
    const id = currentId()
    if (id === null) {
        return false
    }
    const ids = liveWindows().map(w => w.id)
    return ids.length > 0 && id === Math.min(...ids)
}

export function currentBounds (): WindowBounds | null {
    const win = remote()?.getCurrentWindow()
    return win ? win.getBounds() : null
}

export function setWindowBounds (id: number, bounds: WindowBounds): void {
    const win = remote()?.BrowserWindow.fromId(id)
    if (win && !win.isDestroyed()) {
        place(win, bounds)
    }
}

export function sendToWindow (id: number, channel: string, payload?: unknown): void {
    const win = remote()?.BrowserWindow.fromId(id)
    dlog('sendToWindow id=' + id + ' channel=' + channel + ' found=' + (win ? 'yes' : 'no'))
    if (win && !win.isDestroyed()) {
        win.webContents.send(channel, payload)
    }
}

export function sendToOtherWindows (channel: string, payload?: unknown): void {
    const id = currentId()
    const others = liveWindows().filter(w => w.id !== id)
    dlog('sendToOtherWindows channel=' + channel + ' remote=' + (remote() ? 'yes' : 'no') + ' others=' + others.length + ' ids=[' + others.map(w => w.id).join(',') + ']')
    for (const win of others) {
        win.webContents.send(channel, payload)
    }
}
