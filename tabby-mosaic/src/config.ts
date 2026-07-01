import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class MosaicConfigProvider extends ConfigProvider {
    defaults = {
        mosaic: {
            rearrangeOnChange: false,
            tileWindowsOnOpen: false,
            tileAcrossMonitors: false,
            preset: 'grid',
            paneBar: 'hover',
            paneBarAnimationMs: 150,
            restoreWindows: true,
            debugLog: false,
        },
        hotkeys: {
            'mosaic-grid': [],
            'mosaic-columns': [],
            'mosaic-rows': [],
            'mosaic-master': [],
            'mosaic-windows': [],
            'mosaic-move-window': [],
            'mosaic-cascade-windows': [],
            'mosaic-window-switcher': [],
            'mosaic-close-other-windows': [],
            'mosaic-gather-windows': [],
        },
    }

    platformDefaults = { }
}
