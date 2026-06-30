import { NgModule } from '@angular/core'
import { CommandProvider, ConfigProvider, ConfigService, HotkeyProvider, HotkeysService, TabContextMenuItemProvider, ToolbarButtonProvider } from 'tabby-core'

import { AutoTileService } from './autoTile.service'
import { AutoTileConfigProvider } from './config'
import { AutoTileHotkeyProvider } from './hotkeys'
import { AutoTileContextMenu } from './contextMenu'
import { AutoTileCommandProvider } from './commandProvider'
import { ButtonProvider } from './buttonProvider'

@NgModule({
    providers: [
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: ConfigProvider, useClass: AutoTileConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: AutoTileHotkeyProvider, multi: true },
        { provide: TabContextMenuItemProvider, useClass: AutoTileContextMenu, multi: true },
        { provide: CommandProvider, useClass: AutoTileCommandProvider, multi: true },
    ],
})
export default class AutoTileModule { // eslint-disable-line @typescript-eslint/no-extraneous-class
    private constructor (
        hotkeys: HotkeysService,
        autoTile: AutoTileService,
        config: ConfigService,
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
            if (hotkey === 'auto-tile-windows') {
                autoTile.tileWindows(config.store.autoTile.preset)
            }
            if (hotkey === 'auto-tile-move-window') {
                autoTile.moveActiveTabToNewWindow()
            }
            if (hotkey === 'auto-tile-cascade-windows') {
                autoTile.cascadeWindows()
            }
            if (hotkey === 'auto-tile-window-switcher') {
                void autoTile.switchWindow()
            }
            if (hotkey === 'auto-tile-close-other-windows') {
                autoTile.closeOtherWindows()
            }
            if (hotkey === 'auto-tile-gather-windows') {
                autoTile.gatherWindows()
            }
        })
    }
}
