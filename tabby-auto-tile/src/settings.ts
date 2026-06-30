import { Injectable } from '@angular/core'
import { SettingsTabProvider } from 'tabby-settings'

import { AutoTileSettingsTabComponent } from './settingsTab.component'

/** @hidden */
@Injectable()
export class AutoTileSettingsTabProvider extends SettingsTabProvider {
    id = 'auto-tile'
    icon = 'window-restore'
    title = 'Auto-tile'

    getComponentType (): any {
        return AutoTileSettingsTabComponent
    }
}
