import { Injectable } from '@angular/core'
import { ToolbarButtonProvider, ToolbarButton, TranslateService } from 'tabby-core'

import { AutoTileService } from './autoTile.service'

const gridIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>'

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
