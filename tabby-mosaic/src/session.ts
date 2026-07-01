import { BaseTerminalTabComponent } from 'tabby-terminal'

interface ReleasableSession {
    pty?: { unsubscribeAll?: () => void } | null
    open?: boolean
    destroy?: () => void
}

/**
 * Detaches a terminal from its session so the tab can be closed and the
 * session adopted by another window. A local session keeps its PTY process
 * running in the main process; the renderer just stops reading it, so the
 * target window can reattach to the same PTY by id. Sessions without a PTY
 * (or whose internals differ) are torn down instead, and recovered from their
 * token in the new window.
 */
export function releaseSessionKeepingPty (tab: BaseTerminalTabComponent<any>): void {
    const session = tab.session as unknown as ReleasableSession | null
    tab.setSession(null)
    if (!session) {
        return
    }
    try {
        if (session.pty) {
            session.pty.unsubscribeAll?.()
            session.open = false
        } else {
            session.destroy?.()
        }
    } catch {
        session.destroy?.()
    }
}
