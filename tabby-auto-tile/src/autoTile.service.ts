import { Injectable } from '@angular/core'
import { debounceTime } from 'rxjs'
import { AppService, BaseTabComponent, ConfigService, SplitTabComponent } from 'tabby-core'

import { TilePreset, tilingStride } from './layout'

@Injectable({ providedIn: 'root' })
export class AutoTileService {
    private lastLeaves = new Set<BaseTabComponent>()

    constructor (
        private app: AppService,
        private config: ConfigService,
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

        // `explodeTab` keeps the first pane inside `into`, so it counts too
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
