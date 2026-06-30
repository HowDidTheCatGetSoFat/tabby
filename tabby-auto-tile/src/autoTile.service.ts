import { Injectable, NgZone } from '@angular/core'
import { debounceTime } from 'rxjs'
import { AppService, BaseTabComponent, ConfigService, NotificationsService, PartialProfile, Profile, ProfilesService, SelectorService, SplitContainer, SplitTabComponent, TabRecoveryService, TranslateService } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'

import { ipcRenderer } from './ipc'
import { TilePreset, tilingStride } from './layout'

@Injectable({ providedIn: 'root' })
export class AutoTileService {
    private lastLeaves = new Set<BaseTabComponent>()

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
            if (this.config.store.autoTile.rearrangeOnChange && leaves.length > 1) {
                this.tile(this.config.store.autoTile.preset)
            }
        })

        // Receive a tab torn out from another window and rebuild it here.
        ipcRenderer.on('host:open-tab', (_event, token) => this.zone.run(async () => {
            const params = await this.tabRecovery.recoverTab(token)
            if (params) {
                this.app.openNewTab(params)
            }
        }))

        // Gather: export this window's tabs to a target window, keeping local
        // PTYs alive, then let the main process close this window.
        ipcRenderer.on('host:export-tabs', (_event, targetId) => this.zone.run(async () => {
            const tokens: unknown[] = []
            for (const tab of [...this.app.tabs]) {
                const token = await this.tabRecovery.getFullRecoveryToken(tab, { includeState: true })
                if (!token) {
                    continue
                }
                const leaves = tab instanceof SplitTabComponent ? tab.getAllTabs() : [tab]
                for (const leaf of leaves) {
                    if (leaf instanceof BaseTerminalTabComponent) {
                        await leaf.releaseSession()
                    }
                }
                tokens.push(JSON.parse(JSON.stringify(token)))
            }
            ipcRenderer.send('app:relay-tabs', { targetId, tokens })
        }))
    }

    tileWindows (preset: TilePreset): void {
        ipcRenderer.send('app:tile-windows', preset, this.config.store.autoTile.tileAcrossMonitors)
    }

    cascadeWindows (): void {
        ipcRenderer.send('app:cascade-windows')
    }

    closeOtherWindows (): void {
        ipcRenderer.send('app:close-other-windows')
    }

    gatherWindows (): void {
        ipcRenderer.send('app:gather-windows')
    }

    async switchWindow (): Promise<void> {
        const windows = (await ipcRenderer.invoke('app:list-windows')) as { id: number, title: string, current: boolean }[] | undefined
        if (!windows || windows.length < 2) {
            return
        }
        const options = windows.map(w => ({
            name: w.title,
            description: w.current ? this.translate.instant('Current window') : '',
            callback: () => ipcRenderer.send('app:focus-window', w.id),
        }))
        await this.selector.show(this.translate.instant('Switch window'), options)
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
            if (tab instanceof SplitTabComponent) {
                children.push(...tab.getAllTabs())
            } else {
                children.push(tab)
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
                    await leaf.releaseSession()
                }
            }
            if (paneParent) {
                paneParent.removeTab(target)
            } else {
                this.app.closeTab(target, false)
            }
            // The token may hold config proxies that structured clone (IPC)
            // cannot serialize, so round-trip it through JSON first.
            const tile = this.config.store.autoTile.tileWindowsOnMove ? this.config.store.autoTile.preset : null
            ipcRenderer.send('app:new-window-with-tab', { token: JSON.parse(JSON.stringify(token)), tile })
        } catch (error) {
            this.notifications.error('Could not move the tab to a new window')
            console.error('auto-tile: move to new window failed', error)
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
        const leaves: BaseTabComponent[] = []
        for (const tab of this.app.tabs) {
            if (tab instanceof SplitTabComponent) {
                leaves.push(...tab.getAllTabs())
            } else {
                leaves.push(tab)
            }
        }
        return leaves
    }

    private isSameSet (leaves: BaseTabComponent[]): boolean {
        return leaves.length === this.lastLeaves.size && leaves.every(x => this.lastLeaves.has(x))
    }
}
