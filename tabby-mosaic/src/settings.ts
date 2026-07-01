import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'

import { MosaicSettingsTabComponent } from './settingsTab.component'

/** @hidden */
@Injectable()
export class MosaicSettingsTabProvider extends SettingsTabProvider {
    id = 'mosaic'
    icon = 'window-restore'
    title = 'Mosaic'

    getComponentType (): any {
        return MosaicSettingsTabComponent
    }
}
