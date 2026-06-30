import type { IpcRenderer } from 'electron'

// Lazily resolve Electron's ipcRenderer so the plugin still loads outside
// Electron (e.g. tabby-web), where the window features simply no-op.
let resolved = false
let cached: IpcRenderer | null = null

function resolve (): IpcRenderer | null {
    if (!resolved) {
        resolved = true
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            cached = require('electron').ipcRenderer
        } catch {
            cached = null
        }
    }
    return cached
}

export const ipcRenderer = {
    send (channel: string, ...args: unknown[]): void {
        resolve()?.send(channel, ...args)
    },

    on (channel: string, listener: (...a: any[]) => void): void {
        resolve()?.on(channel, listener)
    },

    async invoke (channel: string, ...args: unknown[]): Promise<unknown> {
        return resolve()?.invoke(channel, ...args)
    },
}
