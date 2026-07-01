import { ConfigProvider } from 'tabby-core'

/** @hidden */
export class MosaicConfigProvider extends ConfigProvider {
    defaults = {
        mosaic: {
            rearrangeOnChange: false,
            tileWindowsOnMove: false,
            tileAcrossMonitors: false,
            preset: 'grid',
            paneBar: 'hover',
            paneBarAnimationMs: 150,
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
