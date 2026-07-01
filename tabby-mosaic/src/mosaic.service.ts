import { Injectable, NgZone } from '@angular/core'
import { debounceTime } from 'rxjs'
import { AppService, BaseTabComponent, ConfigService, NotificationsService, PartialProfile, Profile, ProfilesService, SelectorService, SplitContainer, SplitTabComponent, TabRecoveryService, TranslateService } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'

import { ipcRenderer } from './ipc'
import { TilePreset, tilingStride } from './layout'
import { releaseSessionKeepingPty } from './session'
import * as windowManager from './windows'

const PENDING_DETACH_TTL = 15000

interface PendingDetach {
    token: unknown
    before: Set<number>
    at: number
}

@Injectable({ providedIn: 'root' })
export class MosaicService {
    private lastLeaves = new Set<BaseTabComponent>()
    private pendingDetach: PendingDetach[] = []

    constructor (
        private app: AppService,
        private config: ConfigService,
        private profiles: ProfilesService,
        private tabRecovery: TabRecoveryService,
        private notifications: NotificationsService,
        private selector: SelectorService,
        private translate: TranslateService,
        private zone: NgZone,
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

        // Let any window that opened us push its pending tab our way.
        windowManager.sendToOtherWindows('mosaic:window-ready', windowManager.currentWindowId())
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
        // Only hand a torn-out tab to a window that did not exist when the move
        // started, and drop tokens whose window never came up so they cannot
        // surface in an unrelated window later.
        const now = Date.now()
        this.pendingDetach = this.pendingDetach.filter(p => now - p.at < PENDING_DETACH_TTL)
        const pending = this.pendingDetach.find(p => !p.before.has(windowId))
        if (!pending) {
            return
        }
        this.pendingDetach = this.pendingDetach.filter(p => p !== pending)
        windowManager.sendToWindow(windowId, 'host:open-tab', pending.token)
        if (this.config.store.mosaic.tileWindowsOnMove) {
            windowManager.tileWindows(this.config.store.mosaic.preset, this.config.store.mosaic.tileAcrossMonitors)
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
            this.pendingDetach.push({
                token: JSON.parse(JSON.stringify(token)),
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
