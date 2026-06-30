import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class AutoTileConfigProvider extends ConfigProvider {
    defaults = {
        autoTile: {
            rearrangeOnChange: false,
            tileWindowsOnMove: false,
            preset: 'grid',
        },
        hotkeys: {
            'auto-tile-grid': [],
            'auto-tile-columns': [],
            'auto-tile-rows': [],
            'auto-tile-windows': [],
            'auto-tile-move-window': [],
            'auto-tile-cascade-windows': [],
            'auto-tile-window-switcher': [],
            'auto-tile-close-other-windows': [],
            'auto-tile-gather-windows': [],
        },
    }

    platformDefaults = { }
}
