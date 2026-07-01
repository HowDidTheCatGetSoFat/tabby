import { Injectable, Inject, NgZone } from '@angular/core'
import { debounceTime } from 'rxjs'
import { AppService, BaseTabComponent, BOOTSTRAP_DATA, BootstrapData, ConfigService, NotificationsService, PartialProfile, Profile, ProfilesService, RecoveryToken, SelectorService, SplitContainer, SplitTabComponent, TabRecoveryService, TranslateService } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'

import { ipcRenderer } from './ipc'
import { TilePreset, tilingStride } from './layout'
import { releaseSessionKeepingPty } from './session'
import * as windowManager from './windows'
import { WindowBounds } from './windows'
import { clearTabbyRecovery, readSession, writeOwnEntry } from './sessionStore'
import { dlog, setDebugEnabled } from './debug'

const PENDING_WINDOW_TTL = 15000

interface PendingWindow {
    tokens: unknown[]
    bounds: WindowBounds | null
    before: Set<number>
    at: number
}

@Injectable({ providedIn: 'root' })
export class MosaicService {
    private lastLeaves = new Set<BaseTabComponent>()
    private pendingWindows: PendingWindow[] = []

    constructor (
        private app: AppService,
        private config: ConfigService,
        private profiles: ProfilesService,
        private tabRecovery: TabRecoveryService,
        private notifications: NotificationsService,
        private selector: SelectorService,
        private translate: TranslateService,
        private zone: NgZone,
        @Inject(BOOTSTRAP_DATA) private bootstrapData: BootstrapData,
    ) {
        this.app.tabsChanged$.pipe(debounceTime(250)).subscribe(() => {
            const leaves = this.currentLeaves()
            // Tiling only reparents existing terminals, so the leaf set is
            // unchanged by it. A changed set means a terminal was opened or
            // closed, which is the only case we react to.
            if (this.isSameSet(leaves)) {
                return
            }
            this.lastLeaves = new Set(leaves)
            if (this.config.store.mosaic.rearrangeOnChange && leaves.length > 1) {
                this.tile(this.config.store.mosaic.preset)
            }
        })

        // Receive a tab torn out from another window and rebuild it here.
        ipcRenderer.on('host:open-tab', (_event, token) => this.zone.run(async () => {
            const params = await this.tabRecovery.recoverTab(token)
            if (params) {
                this.app.openNewTab(params)
            }
        }))

        // Gather: another window asked us to hand our tabs to it. Serialize
        // every tab, release local PTYs (keeping them alive), send them across
        // and close this window.
        ipcRenderer.on('host:export-tabs', (_event, targetId) => this.zone.run(async () => {
            for (const tab of [...this.app.tabs]) {
                const token = await this.tabRecovery.getFullRecoveryToken(tab, { includeState: true })
                if (!token) {
                    continue
                }
                const leaves = tab instanceof SplitTabComponent ? tab.getAllTabs() : [tab]
                for (const leaf of leaves) {
                    if (leaf instanceof BaseTerminalTabComponent) {
                        releaseSessionKeepingPty(leaf)
                    }
                }
                windowManager.sendToWindow(targetId, 'host:open-tab', JSON.parse(JSON.stringify(token)))
            }
            ipcRenderer.send('window-close')
        }))

        // Close-other-windows asks each other window to close itself, since a
        // window can only close through its own process.
        ipcRenderer.on('mosaic:close-self', () => this.zone.run(() => ipcRenderer.send('window-close')))

        // A freshly opened window announces itself; if we are waiting to hand a
        // torn-out tab to a new window, send it now.
        ipcRenderer.on('mosaic:window-ready', (_event, windowId) => this.zone.run(() => this.onWindowReady(windowId)))

        // Announce readiness once the config store has loaded, so a window that
        // opened us can hand over its pending tab. Announcing earlier would let
        // the tab arrive before profile defaults exist and fail to recover.
        this.config.ready$.subscribe(() => {
            setDebugEnabled(this.config.store.mosaic.debugLog)
            this.config.changed$.subscribe(() => setDebugEnabled(this.config.store.mosaic.debugLog))
            dlog('ready: restoreWindows=' + this.config.store.mosaic.restoreWindows + ' isMain=' + this.bootstrapData.isMainWindow)
            if (this.config.store.mosaic.restoreWindows && this.bootstrapData.isMainWindow) {
                // Runs before the built-in restore (a synchronous subscriber
                // beats its promise microtask), so clearing here suppresses the
                // duplicate single-window restore.
                clearTabbyRecovery()
                void this.restoreSession()
            }
            windowManager.sendToOtherWindows('mosaic:window-ready', windowManager.currentWindowId())
        })

        // Persist this window's tabs and geometry for a managed restart. The
        // interval also catches window moves, which do not raise tabsChanged$.
        this.app.tabsChanged$.pipe(debounceTime(1000)).subscribe(() => void this.persistSession())
        setInterval(() => void this.persistSession(), 10000)
    }

    tileWindows (preset: TilePreset): void {
        windowManager.tileWindows(preset, this.config.store.mosaic.tileAcrossMonitors)
    }

    cascadeWindows (): void {
        windowManager.cascadeWindows()
    }

    closeOtherWindows (): void {
        windowManager.sendToOtherWindows('mosaic:close-self')
    }

    gatherWindows (): void {
        const id = windowManager.currentWindowId()
        if (id !== null) {
            windowManager.sendToOtherWindows('host:export-tabs', id)
        }
    }

    async switchWindow (): Promise<void> {
        const windows = windowManager.listWindows()
        if (windows.length < 2) {
            return
        }
        const options = windows.map(w => ({
            name: w.title,
            description: w.current ? this.translate.instant('Current window') : '',
            callback: () => windowManager.focusWindow(w.id),
        }))
        await this.selector.show(this.translate.instant('Switch window'), options)
    }

    private onWindowReady (windowId: number | null): void {
        if (windowId === null) {
            return
        }
        // Only hand tabs to a window that did not exist when the move or restore
        // started, and drop entries whose window never came up so they cannot
        // surface in an unrelated window later.
        const now = Date.now()
        this.pendingWindows = this.pendingWindows.filter(p => now - p.at < PENDING_WINDOW_TTL)
        const pending = this.pendingWindows.find(p => !p.before.has(windowId))
        if (pending) {
            this.pendingWindows = this.pendingWindows.filter(p => p !== pending)
            dlog('onWindowReady ' + windowId + ': delivering ' + pending.tokens.length + ' tab(s), bounds=' + !!pending.bounds)
            for (const token of pending.tokens) {
                windowManager.sendToWindow(windowId, 'host:open-tab', token)
            }
            if (pending.bounds) {
                // Restored window: it carries its own position, never re-tile.
                windowManager.setWindowBounds(windowId, pending.bounds)
                return
            }
        }
        // A window opened (a moved-out tab or a plain new window). One window
        // arranges them so the layout is not applied several times over.
        if (this.config.store.mosaic.tileWindowsOnOpen && windowManager.isLeaderWindow()) {
            windowManager.tileWindows(this.config.store.mosaic.preset, this.config.store.mosaic.tileAcrossMonitors)
        }
    }

    private async persistSession (): Promise<void> {
        if (!this.config.store.mosaic.restoreWindows) {
            return
        }
        const id = windowManager.currentWindowId()
        if (id === null) {
            return
        }
        const tokens: unknown[] = []
        for (const tab of this.app.tabs) {
            const token = await this.tabRecovery.getFullRecoveryToken(tab, { includeState: true })
            if (token) {
                tokens.push(JSON.parse(JSON.stringify(token)))
            }
        }
        writeOwnEntry(id, windowManager.listWindows().map(w => w.id), {
            order: id,
            bounds: windowManager.currentBounds(),
            tokens,
        })
    }

    private async restoreSession (): Promise<void> {
        const entries = readSession()
        dlog('restoreSession: entries=' + entries.length)
        if (entries.length === 0) {
            return
        }
        const [first, ...rest] = entries
        for (const token of first.tokens) {
            const params = await this.tabRecovery.recoverTab(token as RecoveryToken)
            if (params) {
                this.app.openNewTab(params)
            }
        }
        const ownId = windowManager.currentWindowId()
        if (ownId !== null && first.bounds) {
            windowManager.setWindowBounds(ownId, first.bounds)
        }

        const before = new Set(windowManager.listWindows().map(w => w.id))
        const at = Date.now()
        for (const entry of rest) {
            this.pendingWindows.push({ tokens: entry.tokens, bounds: entry.bounds, before, at })
            ipcRenderer.send('app:new-window')
        }
    }

    tile (preset: TilePreset): void {
        const into = this.app.activeTab
        if (!(into instanceof SplitTabComponent)) {
            return
        }

        this.lastLeaves = new Set(this.currentLeaves())
        this.app.explodeTab(into)

        const children: BaseTabComponent[] = []
        for (const tab of this.app.tabs) {
            if (tab === into) {
                continue
            }
            // Only tile terminal panes; leave special tabs (Settings, the
            // welcome page, etc.) as their own top-level tabs.
            if (tab instanceof SplitTabComponent) {
                children.push(...tab.getAllTabs())
            }
        }

        this.arrange(into, children, preset)
    }

    async openGroupTiled (profiles: PartialProfile<Profile>[], preset: TilePreset): Promise<void> {
        const opened: BaseTabComponent[] = []
        for (const profile of profiles) {
            const tab = await this.profiles.openNewTabForProfile(profile)
            if (tab) {
                opened.push(tab)
            }
        }

        const into = opened[0]
        if (!(into instanceof SplitTabComponent)) {
            return
        }

        const children: BaseTabComponent[] = []
        for (const tab of opened.slice(1)) {
            if (tab instanceof SplitTabComponent) {
                children.push(...tab.getAllTabs())
            } else {
                children.push(tab)
            }
        }

        this.arrange(into, children, preset)
    }

    async moveTabToNewWindow (tab: BaseTabComponent): Promise<void> {
        const parent = this.app.getParentTab(tab)
        dlog('moveTabToNewWindow: targetIsSplit=' + (tab instanceof SplitTabComponent) + ' parentPanes=' + (parent ? parent.getAllTabs().length : 'none'))
        if (parent && parent.getAllTabs().length > 1) {
            // The tab is one pane of a tiled tab: move just that pane.
            await this.detachToNewWindow(tab, parent)
            return
        }
        // Move the whole top-level tab.
        const top = this.app.tabs.includes(tab) ? tab : parent ?? tab
        if (this.app.tabs.length < 2) {
            this.notifications.error('Open another tab before moving this one to a new window')
            return
        }
        await this.detachToNewWindow(top, null)
    }

    untile (tab: BaseTabComponent): void {
        const top = this.app.tabs.includes(tab) ? tab : this.app.getParentTab(tab)
        if (top instanceof SplitTabComponent && top.getAllTabs().length > 1) {
            this.app.explodeTab(top)
        }
    }

    untileActive (): void {
        if (this.app.activeTab) {
            this.untile(this.app.activeTab)
        }
    }

    untilePane (tab: BaseTabComponent): void {
        const parent = this.app.getParentTab(tab)
        if (parent instanceof SplitTabComponent && parent.getAllTabs().length > 1) {
            // Pull the live pane out of its split into its own top-level tab.
            parent.removeTab(tab)
            this.app.wrapAndAddTab(tab)
        }
    }

    moveActiveTabToNewWindow (): void {
        const tab = this.app.activeTab
        if (tab) {
            void this.moveTabToNewWindow(tab)
        }
    }

    private async detachToNewWindow (target: BaseTabComponent, paneParent: SplitTabComponent | null): Promise<void> {
        try {
            const token = await this.tabRecovery.getFullRecoveryToken(target, { includeState: true })
            if (!token) {
                this.notifications.error('This tab cannot be moved to a new window')
                return
            }
            const leaves = target instanceof SplitTabComponent ? target.getAllTabs() : [target]
            dlog('detachToNewWindow: pane=' + !!paneParent + ' targetIsSplit=' + (target instanceof SplitTabComponent) + ' leaves=' + leaves.length + ' tokenType=' + (token as { type?: string }).type)
            for (const leaf of leaves) {
                if (leaf instanceof BaseTerminalTabComponent) {
                    releaseSessionKeepingPty(leaf)
                }
            }
            if (paneParent) {
                paneParent.removeTab(target)
            } else {
                this.app.closeTab(target, false)
            }
            // The token may hold config proxies that structured clone (IPC)
            // cannot serialize, so round-trip it through JSON first. It is sent
            // once the new window reports itself ready (see onWindowReady).
            this.pendingWindows.push({
                tokens: [JSON.parse(JSON.stringify(token))],
                bounds: null,
                before: new Set(windowManager.listWindows().map(w => w.id)),
                at: Date.now(),
            })
            ipcRenderer.send('app:new-window')
        } catch (error) {
            this.notifications.error('Could not move the tab to a new window')
            console.error('mosaic: move to new window failed', error)
        }
    }

    private arrange (into: SplitTabComponent, children: BaseTabComponent[], preset: TilePreset): void {
        if (preset === 'master') {
            void this.arrangeMasterStack(into, children)
            return
        }
        // `into` keeps one pane already, so it counts towards the layout
        const stride = tilingStride(children.length + 1, preset)
        let column = 1
        let previous: BaseTabComponent|null = null
        for (const child of children) {
            into.add(child, column ? previous : null, column ? 'r' : 'b')
            previous = child
            column = (column + 1) % stride
        }

        into.equalize()
        this.app.selectTab(into)
    }

    private async arrangeMasterStack (into: SplitTabComponent, children: BaseTabComponent[]): Promise<void> {
        // The pane already in `into` is the master; stack the rest beside it.
        let previous: BaseTabComponent|null = null
        for (const child of children) {
            await into.add(child, previous, previous ? 'b' : 'r')
            previous = child
        }
        if (into.root.children.length === 2) {
            into.root.ratios = [0.62, 0.38]
            const stack = into.root.children[1]
            if (stack instanceof SplitContainer) {
                stack.ratios = stack.children.map(() => 1 / stack.children.length)
            }
        }
        into.layout()
        this.app.selectTab(into)
    }

    private currentLeaves (): BaseTabComponent[] {
        // Only terminal panes count; special tabs (Settings, etc.) are ignored
        // so opening or closing them never triggers an auto re-tile.
        const leaves: BaseTabComponent[] = []
        for (const tab of this.app.tabs) {
            if (tab instanceof SplitTabComponent) {
                leaves.push(...tab.getAllTabs())
            }
        }
        return leaves
    }

    private isSameSet (leaves: BaseTabComponent[]): boolean {
        return leaves.length === this.lastLeaves.size && leaves.every(x => this.lastLeaves.has(x))
    }
}
