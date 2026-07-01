let enabled = false

export function setDebugEnabled (value: boolean): void {
    enabled = value
}

export function dlog (message: string): void {
    if (!enabled) {
        return
    }
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs')
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const os = require('os')
        let id = '?'
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            id = String(require('@electron/remote').getCurrentWindow().id)
        } catch {
            // ignore
        }
        fs.appendFileSync(os.homedir() + '/tabby-mosaic-debug.log', `${new Date().toISOString()} [win ${id}] ${message}\n`)
    } catch {
        // ignore
    }
}
