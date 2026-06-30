import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider, TranslateService } from 'tabby-core'

/** @hidden */
@Injectable()
export class AutoTileHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'auto-tile-grid',
            name: this.translate.instant('Tile tabs in a grid'),
        },
        {
            id: 'auto-tile-columns',
            name: this.translate.instant('Tile tabs in columns'),
        },
        {
            id: 'auto-tile-rows',
            name: this.translate.instant('Tile tabs in rows'),
        },
    ]

    constructor (private translate: TranslateService) { super() }

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
