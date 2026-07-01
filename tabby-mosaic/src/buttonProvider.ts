import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, TranslateService } from 'tabby-core'

import { MosaicService } from './mosaic.service'
import { columnsIcon, gridIcon, masterIcon, rowsIcon } from './icons'

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
                title: this.translate.instant('Tile as grid'),
                weight: 5,
                click: () => this.mosaic.tile('grid'),
            },
            {
                icon: columnsIcon,
                title: this.translate.instant('Tile as columns'),
                weight: 6,
                click: () => this.mosaic.tile('columns'),
            },
            {
                icon: rowsIcon,
                title: this.translate.instant('Tile as rows'),
                weight: 7,
                click: () => this.mosaic.tile('rows'),
            },
            {
                icon: masterIcon,
                title: this.translate.instant('Tile as master stack'),
                weight: 8,
                click: () => this.mosaic.tile('master'),
            },
        ]
    }
}
