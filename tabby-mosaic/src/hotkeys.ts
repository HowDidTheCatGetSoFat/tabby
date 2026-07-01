import { Injectable } from '@angular/core'
import { HotkeyDescription, HotkeyProvider, TranslateService } from 'tabby-core'

/** @hidden */
@Injectable()
export class MosaicHotkeyProvider extends HotkeyProvider {
    hotkeys: HotkeyDescription[] = [
        {
            id: 'mosaic-grid',
            name: this.translate.instant('Tile tabs in a grid'),
        },
        {
            id: 'mosaic-columns',
            name: this.translate.instant('Tile tabs in columns'),
        },
        {
            id: 'mosaic-rows',
            name: this.translate.instant('Tile tabs in rows'),
        },
        {
            id: 'mosaic-master',
            name: this.translate.instant('Tile tabs as master and stack'),
        },
        {
            id: 'mosaic-windows',
            name: this.translate.instant('Tile windows'),
        },
        {
            id: 'mosaic-move-window',
            name: this.translate.instant('Move tab to new window'),
        },
        {
            id: 'mosaic-cascade-windows',
            name: this.translate.instant('Cascade windows'),
        },
        {
            id: 'mosaic-window-switcher',
            name: this.translate.instant('Switch window'),
        },
        {
            id: 'mosaic-close-other-windows',
            name: this.translate.instant('Close other windows'),
        },
        {
            id: 'mosaic-gather-windows',
            name: this.translate.instant('Gather all windows into this one'),
        },
    ]

    constructor (private translate: TranslateService) { super() }

    async provide (): Promise<HotkeyDescription[]> {
        return this.hotkeys
    }
}
