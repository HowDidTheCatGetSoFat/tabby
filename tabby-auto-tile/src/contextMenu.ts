import { Injectable } from '@angular/core'
import { BaseTabComponent, ConfigService, MenuItemOptions, TabContextMenuItemProvider, TranslateService } from 'tabby-core'

import { AutoTileService } from './autoTile.service'
import { TilePreset } from './layout'

/** @hidden */
@Injectable()
export class AutoTileContextMenu extends TabContextMenuItemProvider {
    constructor (
        private autoTile: AutoTileService,
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
        ]
        return [
            {
                label: this.translate.instant('Tile tabs'),
                submenu: presets.map(p => ({
                    label: p.label,
                    click: () => this.autoTile.tile(p.preset),
                })) as MenuItemOptions[],
            },
            {
                label: this.translate.instant('Auto-tile layout'),
                submenu: presets.map(p => ({
                    label: p.label,
                    type: 'radio',
                    checked: this.config.store.autoTile.preset === p.preset,
                    click: () => this.setPreset(p.preset),
                })) as MenuItemOptions[],
            },
            {
                label: this.translate.instant('Auto-tile on changes'),
                type: 'checkbox',
                checked: this.config.store.autoTile.rearrangeOnChange,
                click: () => {
                    const enabled = !this.config.store.autoTile.rearrangeOnChange
                    this.config.store.autoTile.rearrangeOnChange = enabled
                    this.config.save()
                    if (enabled) {
                        this.autoTile.tile(this.config.store.autoTile.preset)
                    }
                },
            },
            {
                label: this.translate.instant('Tile windows after moving a tab out'),
                type: 'checkbox',
                checked: this.config.store.autoTile.tileWindowsOnMove,
                click: () => {
                    this.config.store.autoTile.tileWindowsOnMove = !this.config.store.autoTile.tileWindowsOnMove
                    this.config.save()
                },
            },
            {
                label: this.translate.instant('Move to new window'),
                click: () => {
                    void this.autoTile.moveTabToNewWindow(tab)
                },
            },
            {
                label: this.translate.instant('Untile tabs'),
                click: () => this.autoTile.untile(tab),
            },
            {
                label: this.translate.instant('Windows'),
                submenu: [
                    {
                        label: this.translate.instant('Tile'),
                        click: () => this.autoTile.tileWindows(this.config.store.autoTile.preset),
                    },
                    {
                        label: this.translate.instant('Cascade'),
                        click: () => this.autoTile.cascadeWindows(),
                    },
                    {
                        label: this.translate.instant('Switch window'),
                        click: () => {
                            void this.autoTile.switchWindow()
                        },
                    },
                    {
                        label: this.translate.instant('Close other windows'),
                        click: () => this.autoTile.closeOtherWindows(),
                    },
                    {
                        label: this.translate.instant('Gather all windows here'),
                        click: () => this.autoTile.gatherWindows(),
                    },
                ] as MenuItemOptions[],
            },
        ]
    }

    private setPreset (preset: TilePreset): void {
        this.config.store.autoTile.preset = preset
        this.config.save()
    }
}
