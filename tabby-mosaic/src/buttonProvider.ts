import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, TranslateService } from 'tabby-core'

import { MosaicService } from './mosaic.service'
import { showLayoutMenu } from './layoutMenu'
import { cascadeIcon, columnsIcon, gridIcon, masterIcon, rowsIcon, tabsMenuIcon, windowsColumnsIcon, windowsGridIcon, windowsMenuIcon, windowsRowsIcon } from './icons'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private mosaic: MosaicService,
        private translate: TranslateService,
    ) {
        super()
    }

    provide (): ToolbarButton[] {
        return [
            {
                icon: tabsMenuIcon,
                title: this.translate.instant('Tile tabs'),
                weight: 5,
                click: () => this.openTabMenu(),
            },
            {
                icon: windowsMenuIcon,
                title: this.translate.instant('Tile windows'),
                weight: 6,
                click: () => this.openWindowMenu(),
            },
        ]
    }

    private openTabMenu (): void {
        showLayoutMenu('tabs', this.translate.instant('Tile tabs'), [
            { icon: gridIcon, label: this.translate.instant('Grid'), run: () => this.mosaic.tile('grid') },
            { icon: columnsIcon, label: this.translate.instant('Columns'), run: () => this.mosaic.tile('columns') },
            { icon: rowsIcon, label: this.translate.instant('Rows'), run: () => this.mosaic.tile('rows') },
            { icon: masterIcon, label: this.translate.instant('Master stack'), run: () => this.mosaic.tile('master') },
        ])
    }

    private openWindowMenu (): void {
        showLayoutMenu('windows', this.translate.instant('Tile windows'), [
            { icon: windowsGridIcon, label: this.translate.instant('Grid'), run: () => this.mosaic.tileWindows('grid') },
            { icon: windowsColumnsIcon, label: this.translate.instant('Columns'), run: () => this.mosaic.tileWindows('columns') },
            { icon: windowsRowsIcon, label: this.translate.instant('Rows'), run: () => this.mosaic.tileWindows('rows') },
            { icon: cascadeIcon, label: this.translate.instant('Cascade'), run: () => this.mosaic.cascadeWindows() },
        ])
    }
}
