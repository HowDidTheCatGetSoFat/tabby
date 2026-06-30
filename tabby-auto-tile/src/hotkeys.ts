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
        {
            id: 'auto-tile-master',
            name: this.translate.instant('Tile tabs as master and stack'),
        },
        {
            id: 'auto-tile-windows',
            name: this.translate.instant('Tile windows'),
        },
        {
            id: 'auto-tile-move-window',
            name: this.translate.instant('Move tab to new window'),
        },
        {
            id: 'auto-tile-cascade-windows',
            name: this.translate.instant('Cascade windows'),
        },
        {
            id: 'auto-tile-window-switcher',
            name: this.translate.instant('Switch window'),
        },
        {
            id: 'auto-tile-close-other-windows',
            name: this.translate.instant('Close other windows'),
        },
        {
            id: 'auto-tile-gather-windows',
            name: this.translate.instant('Gather all windows into this one'),
        },
    ]

    constructor (private translate: TranslateService) { super() }

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
