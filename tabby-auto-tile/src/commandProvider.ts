/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { Command, CommandLocation, CommandProvider, ConfigService, ProfilesService, SelectorService, TranslateService } from 'tabby-core'

import { AutoTileService } from './autoTile.service'
import { gridIcon } from './icons'

/** @hidden */
@Injectable()
export class AutoTileCommandProvider extends CommandProvider {
    constructor (
        private profiles: ProfilesService,
        private selector: SelectorService,
        private config: ConfigService,
        private autoTile: AutoTileService,
        private translate: TranslateService,
    ) {
        super()
    }

    async provide (): Promise<Command[]> {
        return [
            {
                id: 'auto-tile:open-group',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Open profile group tiled'),
                icon: gridIcon,
                run: async () => this.openGroup(),
            },
            {
                id: 'auto-tile:tile-windows',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Tile windows'),
                icon: gridIcon,
                run: async () => this.autoTile.tileWindows(this.config.store.autoTile.preset),
            },
            {
                id: 'auto-tile:move-window',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Move tab to new window'),
                icon: gridIcon,
                run: async () => this.autoTile.moveActiveTabToNewWindow(),
            },
            {
                id: 'auto-tile:cascade-windows',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Cascade windows'),
                icon: gridIcon,
                run: async () => this.autoTile.cascadeWindows(),
            },
            {
                id: 'auto-tile:window-switcher',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Switch window'),
                icon: gridIcon,
                run: async () => this.autoTile.switchWindow(),
            },
            {
                id: 'auto-tile:close-other-windows',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Close other windows'),
                icon: gridIcon,
                run: async () => this.autoTile.closeOtherWindows(),
            },
        ]
    }

    private async openGroup (): Promise<void> {
        const groups = await this.profiles.getProfileGroups({ includeProfiles: true })
        const options = groups
            .filter(group => (group.profiles?.length ?? 0) > 0)
            .map(group => ({
                name: group.name,
                description: `${group.profiles!.length} profiles`,
                callback: () => this.autoTile.openGroupTiled(group.profiles!, this.config.store.autoTile.preset),
            }))
        if (options.length) {
            await this.selector.show(this.translate.instant('Open profile group tiled'), options)
        }
    }
}
