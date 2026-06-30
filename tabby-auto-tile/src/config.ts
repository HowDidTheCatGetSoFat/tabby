import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class AutoTileConfigProvider extends ConfigProvider {
    defaults = {
        autoTile: {
            rearrangeOnChange: false,
            preset: 'grid',
        },
        hotkeys: {
            'auto-tile-grid': [],
            'auto-tile-columns': [],
            'auto-tile-rows': [],
            'auto-tile-windows': [],
            'auto-tile-move-window': [],
        },
    }

    platformDefaults = { }
}
