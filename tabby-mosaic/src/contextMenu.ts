import { Injectable } from '@angular/core'
import { BaseTabComponent, ConfigService, MenuItemOptions, TabContextMenuItemProvider, TranslateService } from 'tabby-core'

import { MosaicService } from './mosaic.service'
import { TilePreset } from './layout'

/** @hidden */
@Injectable()
export class MosaicContextMenu extends TabContextMenuItemProvider {
    constructor (
        private mosaic: MosaicService,
        private config: ConfigService,
        private translate: TranslateService,
    ) {
        super()
    }

    async getItems (tab: BaseTabComponent): Promise<MenuItemOptions[]> {
        const presets: { preset: TilePreset, label: string }[] = [
            { preset: 'grid', label: this.translate.instant('Grid') },
            { preset: 'columns', label: this.translate.instant('Columns') },
            { preset: 'rows', label: this.translate.instant('Rows') },
            { preset: 'master', label: this.translate.instant('Master stack') },
        ]
        return [
            {
                label: this.translate.instant('Tile tabs'),
                submenu: presets.map(p => ({
                    label: p.label,
                    click: () => this.mosaic.tile(p.preset),
                })) as MenuItemOptions[],
            },
            {
                label: this.translate.instant('Default layout'),
                submenu: presets.map(p => ({
                    label: p.label,
                    type: 'radio',
                    checked: this.config.store.mosaic.preset === p.preset,
                    click: () => this.setPreset(p.preset),
                })) as MenuItemOptions[],
            },
            {
                label: this.translate.instant('Re-tile on tab open/close'),
                type: 'checkbox',
                checked: this.config.store.mosaic.rearrangeOnChange,
                click: () => {
                    const enabled = !this.config.store.mosaic.rearrangeOnChange
                    this.config.store.mosaic.rearrangeOnChange = enabled
                    this.config.save()
                    if (enabled) {
                        this.mosaic.tile(this.config.store.mosaic.preset)
                    }
                },
            },
            {
                label: this.translate.instant('Tile windows after moving a tab out'),
                type: 'checkbox',
                checked: this.config.store.mosaic.tileWindowsOnMove,
                click: () => {
                    this.config.store.mosaic.tileWindowsOnMove = !this.config.store.mosaic.tileWindowsOnMove
                    this.config.save()
                },
            },
            {
                label: this.translate.instant('Tile windows across all monitors'),
                type: 'checkbox',
                checked: this.config.store.mosaic.tileAcrossMonitors,
                click: () => {
                    this.config.store.mosaic.tileAcrossMonitors = !this.config.store.mosaic.tileAcrossMonitors
                    this.config.save()
                },
            },
            {
                label: this.translate.instant('Move to new window'),
                click: () => {
                    void this.mosaic.moveTabToNewWindow(tab)
                },
            },
            {
                label: this.translate.instant('Untile tabs'),
                click: () => this.mosaic.untile(tab),
            },
            {
                label: this.translate.instant('Windows'),
                submenu: [
                    {
                        label: this.translate.instant('Tile'),
                        click: () => this.mosaic.tileWindows(this.config.store.mosaic.preset),
                    },
                    {
                        label: this.translate.instant('Cascade'),
                        click: () => this.mosaic.cascadeWindows(),
                    },
                    {
                        label: this.translate.instant('Switch window'),
                        click: () => {
                            void this.mosaic.switchWindow()
                        },
                    },
                    {
                        label: this.translate.instant('Close other windows'),
                        click: () => this.mosaic.closeOtherWindows(),
                    },
                    {
                        label: this.translate.instant('Gather all windows here'),
                        click: () => this.mosaic.gatherWindows(),
                    },
                ] as MenuItemOptions[],
            },
        ]
    }

    private setPreset (preset: TilePreset): void {
        this.config.store.mosaic.preset = preset
        this.config.save()
    }
}
