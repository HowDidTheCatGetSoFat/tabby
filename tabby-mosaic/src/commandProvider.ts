/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Injectable } from '@angular/core'
import { Command, CommandLocation, CommandProvider, ConfigService, ProfilesService, SelectorService, TranslateService } from 'tabby-core'

import { MosaicService } from './mosaic.service'
import { gridIcon } from './icons'

/** @hidden */
@Injectable()
export class MosaicCommandProvider extends CommandProvider {
    constructor (
        private profiles: ProfilesService,
        private selector: SelectorService,
        private config: ConfigService,
        private mosaic: MosaicService,
        private translate: TranslateService,
    ) {
        super()
    }

    async provide (): Promise<Command[]> {
        return [
            {
                id: 'mosaic:open-group',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Open profile group tiled'),
                icon: gridIcon,
                run: async () => this.openGroup(),
            },
            {
                id: 'mosaic:tile-windows',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Tile windows'),
                icon: gridIcon,
                run: async () => this.mosaic.tileWindows(this.config.store.mosaic.preset),
            },
            {
                id: 'mosaic:move-window',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Move tab to new window'),
                icon: gridIcon,
                run: async () => this.mosaic.moveActiveTabToNewWindow(),
            },
            {
                id: 'mosaic:cascade-windows',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Cascade windows'),
                icon: gridIcon,
                run: async () => this.mosaic.cascadeWindows(),
            },
            {
                id: 'mosaic:window-switcher',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Switch window'),
                icon: gridIcon,
                run: async () => this.mosaic.switchWindow(),
            },
            {
                id: 'mosaic:close-other-windows',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Close other windows'),
                icon: gridIcon,
                run: async () => this.mosaic.closeOtherWindows(),
            },
            {
                id: 'mosaic:gather-windows',
                locations: [CommandLocation.StartPage],
                label: this.translate.instant('Gather all windows into this one'),
                icon: gridIcon,
                run: async () => this.mosaic.gatherWindows(),
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
                callback: () => this.mosaic.openGroupTiled(group.profiles!, this.config.store.mosaic.preset),
            }))
        if (options.length) {
            await this.selector.show(this.translate.instant('Open profile group tiled'), options)
        }
    }
}
