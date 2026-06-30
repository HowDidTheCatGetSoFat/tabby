import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, TranslateService } from 'tabby-core'

import { AutoTileService } from './autoTile.service'
import { gridIcon } from './icons'

/** @hidden */
@Injectable()
export class ButtonProvider extends ToolbarButtonProvider {
    constructor (
        private autoTile: AutoTileService,
        private translate: TranslateService,
    ) {
        super()
    }

    provide (): ToolbarButton[] {
        return [
            {
                icon: gridIcon,
                title: this.translate.instant('Tile all tabs'),
                weight: 5,
                click: () => this.autoTile.tile('grid'),
            },
        ]
    }
}
