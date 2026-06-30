import { Component, HostBinding } from '@angular/core'
import { ConfigService } from 'tabby-core'

/** @hidden */
@Component({
    templateUrl: './settingsTab.component.pug',
})
export class AutoTileSettingsTabComponent {
    @HostBinding('class.content-box') contentBox = true

    constructor (public config: ConfigService) { }
}
