import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, TranslateService } from 'tabby-core'

import { MosaicService } from './mosaic.service'
import { cascadeIcon, columnsIcon, gridIcon, masterIcon, rowsIcon, windowsColumnsIcon, windowsGridIcon, windowsRowsIcon } from './icons'

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
                icon: gridIcon,
                title: this.translate.instant('Tile tabs as grid'),
                weight: 5,
                click: () => this.mosaic.tile('grid'),
            },
            {
                icon: columnsIcon,
                title: this.translate.instant('Tile tabs as columns'),
                weight: 6,
                click: () => this.mosaic.tile('columns'),
            },
            {
                icon: rowsIcon,
                title: this.translate.instant('Tile tabs as rows'),
                weight: 7,
                click: () => this.mosaic.tile('rows'),
            },
            {
                icon: masterIcon,
                title: this.translate.instant('Tile tabs as master stack'),
                weight: 8,
                click: () => this.mosaic.tile('master'),
            },
            {
                icon: windowsGridIcon,
                title: this.translate.instant('Tile windows as grid'),
                weight: 9,
                click: () => this.mosaic.tileWindows('grid'),
            },
            {
                icon: windowsColumnsIcon,
                title: this.translate.instant('Tile windows as columns'),
                weight: 10,
                click: () => this.mosaic.tileWindows('columns'),
            },
            {
                icon: windowsRowsIcon,
                title: this.translate.instant('Tile windows as rows'),
                weight: 11,
                click: () => this.mosaic.tileWindows('rows'),
            },
            {
                icon: cascadeIcon,
                title: this.translate.instant('Cascade windows'),
                weight: 12,
                click: () => this.mosaic.cascadeWindows(),
            },
        ]
    }
}
