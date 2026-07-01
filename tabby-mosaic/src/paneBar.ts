import { Injectable } from '@angular/core'
import { AppService, ConfigService, SplitTabComponent } from 'tabby-core'
import { TerminalDecorator, BaseTerminalTabComponent } from 'tabby-terminal'

import { MosaicService } from './mosaic.service'

const STYLE_ID = 'mosaic-pane-bar-styles'

/** @hidden */
@Injectable()
export class PaneBarDecorator extends TerminalDecorator {
    constructor (
        private config: ConfigService,
        private app: AppService,
        private mosaic: MosaicService,
    ) {
        super()
        this.injectStyles()
    }

    attach (tab: BaseTerminalTabComponent<any>): void {
        const host = tab.element.nativeElement as HTMLElement
        host.classList.add('mosaic-pane-host')

        const bar = document.createElement('div')
        bar.className = 'mosaic-pane-bar'

        const title = document.createElement('span')
        title.className = 'mosaic-pane-bar-title'
        bar.appendChild(title)

        const actions = document.createElement('span')
        actions.className = 'mosaic-pane-bar-actions'
        actions.appendChild(this.makeIcon('fa-window-maximize', 'Maximize', () => {
            const parent = this.app.getParentTab(tab)
            if (parent instanceof SplitTabComponent) {
                parent.maximize(parent.getMaximizedTab() === tab ? null : tab)
            }
        }))
        actions.appendChild(this.makeIcon('fa-columns', 'Split', () => {
            const parent = this.app.getParentTab(tab)
            if (parent instanceof SplitTabComponent) {
                void parent.splitTab(tab, 'r')
            }
        }))
        actions.appendChild(this.makeIcon('fa-window-restore', 'Move to new window', () => {
            void this.mosaic.moveTabToNewWindow(tab)
        }))
        actions.appendChild(this.makeIcon('fa-times', 'Close', () => {
            const parent = this.app.getParentTab(tab)
            if (parent instanceof SplitTabComponent) {
                parent.removeTab(tab)
            }
            void tab.destroy()
        }))
        bar.appendChild(actions)
        host.appendChild(bar)

        const update = (): void => this.updateBar(tab, host, bar, title)
        update()

        this.subscribeUntilDetached(tab, tab.titleChange$.subscribe(() => update()))
        this.subscribeUntilDetached(tab, this.app.tabsChanged$.subscribe(() => update()))
        this.subscribeUntilDetached(tab, this.config.changed$.subscribe(() => update()))
    }

    detach (tab: BaseTerminalTabComponent<any>): void {
        super.detach(tab)
        const host = tab.element.nativeElement as HTMLElement | undefined
        host?.querySelector('.mosaic-pane-bar')?.remove()
        host?.classList.remove('mosaic-pane-host')
    }

    private updateBar (tab: BaseTerminalTabComponent<any>, host: HTMLElement, bar: HTMLElement, title: HTMLElement): void {
        title.textContent = tab.title
        const mode = this.config.store.mosaic.paneBar
        const parent = this.app.getParentTab(tab)
        const tiled = parent instanceof SplitTabComponent && parent.getAllTabs().length > 1
        host.style.setProperty('--mosaic-bar-anim', String(this.config.store.mosaic.paneBarAnimationMs ?? 150) + 'ms')
        bar.classList.toggle('mosaic-bar-always', mode === 'always' && tiled)
        bar.classList.toggle('mosaic-bar-hover', mode === 'hover' && tiled)
        bar.classList.toggle('mosaic-bar-hidden', mode === 'off' || !tiled)
    }

    private makeIcon (faClass: string, label: string, handler: () => void): HTMLElement {
        const icon = document.createElement('i')
        icon.className = 'fa ' + faClass + ' mosaic-pane-bar-icon'
        icon.title = label
        icon.addEventListener('click', event => {
            event.preventDefault()
            event.stopPropagation()
            handler()
        })
        return icon
    }

    private injectStyles (): void {
        if (document.getElementById(STYLE_ID)) {
            return
        }
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = `
            .mosaic-pane-host { position: relative; }
            .mosaic-pane-bar {
                position: absolute; top: 0; left: 0; right: 0; height: 24px;
                display: flex; align-items: center; gap: 8px; padding: 0 8px;
                background: rgba(0, 0, 0, 0.55); color: #fff; font-size: 12px;
                z-index: 10; pointer-events: none; opacity: 0;
                transition: opacity var(--mosaic-bar-anim, 150ms) ease;
            }
            .mosaic-pane-bar-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .mosaic-pane-bar-actions { display: flex; gap: 12px; }
            .mosaic-pane-bar-icon { cursor: pointer; opacity: 0.75; pointer-events: auto; }
            .mosaic-pane-bar-icon:hover { opacity: 1; }
            .mosaic-pane-bar.mosaic-bar-always { opacity: 1; }
            .mosaic-pane-host:hover .mosaic-pane-bar.mosaic-bar-hover { opacity: 1; }
            .mosaic-pane-bar.mosaic-bar-hidden { opacity: 0 !important; }
        `
        document.head.appendChild(style)
    }
}
