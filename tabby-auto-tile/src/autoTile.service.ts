import { Injectable, NgZone } from '@angular/core'
import { ipcRenderer } from 'electron'
import { debounceTime } from 'rxjs'
import { AppService, BaseTabComponent, ConfigService, NotificationsService, PartialProfile, Profile, ProfilesService, SplitTabComponent, TabRecoveryService } from 'tabby-core'
import { BaseTerminalTabComponent } from 'tabby-terminal'

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
    }

    tileWindows (preset: TilePreset): void {
        ipcRenderer.send('app:tile-windows', preset)
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
            ipcRenderer.send('app:new-window-with-tab', JSON.parse(JSON.stringify(token)))
        } catch (error) {
            this.notifications.error('Could not move the tab to a new window')
            console.error('auto-tile: move to new window failed', error)
        }
    }

    private arrange (into: SplitTabComponent, children: BaseTabComponent[], preset: TilePreset): void {
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
