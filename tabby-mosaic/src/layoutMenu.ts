const STYLE_ID = 'mosaic-layout-menu-styles'
const MENU_ID = 'mosaic-layout-menu'

export interface LayoutMenuItem {
    icon: string
    label: string
    run: () => void
}

let currentCleanup: (() => void) | null = null
let currentAnchor: string | null = null

function closeMenu (): void {
    currentCleanup?.()
    currentCleanup = null
    currentAnchor = null
    document.getElementById(MENU_ID)?.remove()
}

function injectStyles (): void {
    if (document.getElementById(STYLE_ID)) {
        return
    }
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
        .mosaic-layout-menu {
            position: fixed; z-index: 10000;
            background: rgba(28, 28, 30, 0.98); color: #eee;
            border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
            padding: 10px 12px; box-shadow: 0 10px 34px rgba(0, 0, 0, 0.5);
            opacity: 0; transform: translateY(-6px);
            transition: opacity 140ms ease, transform 140ms ease;
        }
        .mosaic-layout-menu.mosaic-menu-open { opacity: 1; transform: translateY(0); }
        .mosaic-layout-menu-title {
            font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
            color: #8a8a8a; margin-bottom: 8px;
        }
        .mosaic-layout-menu-row { display: flex; gap: 8px; }
        .mosaic-layout-menu-item {
            display: flex; flex-direction: column; align-items: center; gap: 6px;
            width: 66px; padding: 10px 6px; border: none; border-radius: 6px;
            background: rgba(255, 255, 255, 0.04); color: #d6d6d6; cursor: pointer;
            transition: background 120ms ease, color 120ms ease;
        }
        .mosaic-layout-menu-item:hover { background: rgba(255, 255, 255, 0.14); color: #fff; }
        .mosaic-layout-menu-icon { width: 22px; height: 22px; display: block; }
        .mosaic-layout-menu-icon svg { width: 22px; height: 22px; display: block; }
        .mosaic-layout-menu-label { font-size: 11px; }
    `
    document.head.appendChild(style)
}

export function showLayoutMenu (anchorKey: string, title: string, items: LayoutMenuItem[]): void {
    injectStyles()

    // Clicking the same toolbar button again closes the open panel.
    const wasOpen = currentAnchor === anchorKey
    closeMenu()
    if (wasOpen) {
        return
    }

    const anchor = document.querySelector(`[data-mosaic-anchor="${anchorKey}"]`)?.closest('button') as HTMLElement | null

    const menu = document.createElement('div')
    menu.id = MENU_ID
    menu.className = 'mosaic-layout-menu'

    const heading = document.createElement('div')
    heading.className = 'mosaic-layout-menu-title'
    heading.textContent = title
    menu.appendChild(heading)

    const row = document.createElement('div')
    row.className = 'mosaic-layout-menu-row'
    for (const item of items) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'mosaic-layout-menu-item'

        const icon = document.createElement('span')
        icon.className = 'mosaic-layout-menu-icon'
        icon.innerHTML = item.icon
        button.appendChild(icon)

        const label = document.createElement('span')
        label.className = 'mosaic-layout-menu-label'
        label.textContent = item.label
        button.appendChild(label)

        button.addEventListener('click', event => {
            event.preventDefault()
            event.stopPropagation()
            item.run()
            closeMenu()
        })
        row.appendChild(button)
    }
    menu.appendChild(row)
    document.body.appendChild(menu)

    const rect = anchor?.getBoundingClientRect()
    const width = menu.getBoundingClientRect().width
    const left = rect ? rect.left : window.innerWidth - width - 8
    menu.style.left = Math.max(8, Math.min(left, window.innerWidth - width - 8)) + 'px'
    menu.style.top = (rect ? rect.bottom + 4 : 44) + 'px'

    const onPointer = (event: MouseEvent): void => {
        const target = event.target as Node
        if (!menu.contains(target) && !(anchor?.contains(target) ?? false)) {
            closeMenu()
        }
    }
    const onKey = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
            closeMenu()
        }
    }
    document.addEventListener('mousedown', onPointer, true)
    document.addEventListener('keydown', onKey, true)
    currentAnchor = anchorKey
    currentCleanup = () => {
        document.removeEventListener('mousedown', onPointer, true)
        document.removeEventListener('keydown', onKey, true)
    }

    requestAnimationFrame(() => menu.classList.add('mosaic-menu-open'))
}
