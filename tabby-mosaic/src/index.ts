import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import TabbyCorePlugin, { CommandProvider, ConfigProvider, ConfigService, HotkeyProvider, HotkeysService, TabContextMenuItemProvider, ToolbarButtonProvider } from 'tabby-core'
import { SettingsTabProvider } from 'tabby-settings'

import { MosaicService } from './mosaic.service'
import { MosaicConfigProvider } from './config'
import { MosaicHotkeyProvider } from './hotkeys'
import { MosaicContextMenu } from './contextMenu'
import { MosaicCommandProvider } from './commandProvider'
import { MosaicSettingsTabProvider } from './settings'
import { MosaicSettingsTabComponent } from './settingsTab.component'
import { ButtonProvider } from './buttonProvider'

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        NgbModule,
        TabbyCorePlugin,
    ],
    providers: [
        { provide: ToolbarButtonProvider, useClass: ButtonProvider, multi: true },
        { provide: ConfigProvider, useClass: MosaicConfigProvider, multi: true },
        { provide: HotkeyProvider, useClass: MosaicHotkeyProvider, multi: true },
        { provide: TabContextMenuItemProvider, useClass: MosaicContextMenu, multi: true },
        { provide: CommandProvider, useClass: MosaicCommandProvider, multi: true },
        { provide: SettingsTabProvider, useClass: MosaicSettingsTabProvider, multi: true },
    ],
    declarations: [
        MosaicSettingsTabComponent,
    ],
})
export default class MosaicModule { // eslint-disable-line @typescript-eslint/no-extraneous-class
    private constructor (
        hotkeys: HotkeysService,
        mosaic: MosaicService,
        config: ConfigService,
    ) {
        hotkeys.hotkey$.subscribe(hotkey => {
            if (hotkey === 'mosaic-grid') {
                mosaic.tile('grid')
            }
            if (hotkey === 'mosaic-columns') {
                mosaic.tile('columns')
            }
            if (hotkey === 'mosaic-rows') {
                mosaic.tile('rows')
            }
            if (hotkey === 'mosaic-master') {
                mosaic.tile('master')
            }
            if (hotkey === 'mosaic-windows') {
                mosaic.tileWindows(config.store.mosaic.preset)
            }
            if (hotkey === 'mosaic-move-window') {
                mosaic.moveActiveTabToNewWindow()
            }
            if (hotkey === 'mosaic-cascade-windows') {
                mosaic.cascadeWindows()
            }
            if (hotkey === 'mosaic-window-switcher') {
                void mosaic.switchWindow()
            }
            if (hotkey === 'mosaic-close-other-windows') {
                mosaic.closeOtherWindows()
            }
            if (hotkey === 'mosaic-gather-windows') {
                mosaic.gatherWindows()
            }
        })
    }
}
