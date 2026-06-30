import { NgModule } from '@angular/core'
import { ConfigProvider, HotkeyProvider, HotkeysService, TabContextMenuItemProvider, ToolbarButtonProvider } from 'tabby-core'

import { AutoTileService } from './autoTile.service'
import { AutoTileConfigProvider } from './config'
import { AutoTileHotkeyProvider } from './hotkeys'
import { AutoTileContextMenu } from './contextMenu'
import { ButtonProvider } from './buttonProvider'

@NgModule({
    providers: [
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: ConfigProvider, useClass: AutoTileConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: AutoTileHotkeyProvider, multi: true },
        { provide: TabContextMenuItemProvider, useClass: AutoTileContextMenu, multi: true },
    ],
})
export default class AutoTileModule { // eslint-disable-line @typescript-eslint/no-extraneous-class
    private constructor (
        hotkeys: HotkeysService,
        autoTile: AutoTileService,
    ) {
        hotkeys.hotkey$.subscribe(hotkey => {
            if (hotkey === 'auto-tile-grid') {
                autoTile.tile('grid')
            }
            if (hotkey === 'auto-tile-columns') {
                autoTile.tile('columns')
            }
            if (hotkey === 'auto-tile-rows') {
                autoTile.tile('rows')
            }
        })
    }
}
