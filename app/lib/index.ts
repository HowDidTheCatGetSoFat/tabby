import { app, ipcMain, Menu, dialog } from 'electron'

// set userData Path on portable version
import './portable'

// set defaults of environment variables
import 'dotenv/config'
process.env.TABBY_PLUGINS ??= ''
process.env.TABBY_CONFIG_DIRECTORY ??= app.getPath('userData')


import 'v8-compile-cache'
import 'source-map-support/register'
import './sentry'
import './lru'
import { parseArgs } from './cli'
import { Application } from './app'
import electronDebug from 'electron-debug'
import { loadConfig } from './config'


const argv = parseArgs(process.argv, process.cwd())

// eslint-disable-next-line @typescript-eslint/init-declarations
let configStore: any

try {
    configStore = loadConfig()
} catch (err) {
    dialog.showErrorBox('Could not read config', err.message)
    app.exit(1)
}

process.mainModule = module

const application = new Application(configStore)

// Register tabby:// URL scheme
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('tabby', process.execPath, [process.argv[1]])
    }
} else {
    app.setAsDefaultProtocolClient('tabby')
}

ipcMain.on('app:new-window', () => {
    application.newWindow()
})

ipcMain.on('app:tile-windows', (_event, preset) => {
    application.tileWindows(preset)
})

ipcMain.on('app:cascade-windows', () => {
    application.cascadeWindows()
})

ipcMain.handle('app:list-windows', event => {
    return application.listWindows(event.sender)
})

ipcMain.on('app:focus-window', (_event, id) => {
    application.focusWindow(id)
})

ipcMain.on('app:close-other-windows', event => {
    application.closeOtherWindows(event.sender)
})

ipcMain.on('app:gather-windows', event => {
    application.gatherWindows(event.sender)
})

ipcMain.on('app:relay-tabs', (event, payload) => {
    application.relayTabs(payload.targetId, payload.tokens, event.sender)
})

ipcMain.on('app:new-window-with-tab', async (_event, payload) => {
    const window = await application.newWindow()
    window.send('host:open-tab', payload.token)
    if (payload.tile) {
        application.tileWindows(payload.tile)
    }
})

process.on('uncaughtException' as any, err => {
    console.log(err)
    application.broadcast('uncaughtException', err)
})

if (argv.d) {
    electronDebug({
        isEnabled: true,
        showDevTools: true,
        devToolsMode: 'undocked',
    })
}

app.on('activate', async () => {
    if (!application.hasWindows()) {
        application.newWindow()
    } else {
        application.focus()
    }
})

// Handle URL scheme on macOS
app.on('open-url', async (event, url) => {
    event.preventDefault()
    console.log('Received open-url event:', url)
    if (!application.hasWindows()) {
        process.argv.push(url)
    } else {
        await app.whenReady()
        application.handleSecondInstance([url], process.cwd())
    }
})

app.on('second-instance', async (_event, newArgv, cwd) => {
    application.handleSecondInstance(newArgv, cwd)
})

if (!app.requestSingleInstanceLock()) {
    app.quit()
    app.exit(0)
}

app.on('ready', async () => {
    if (process.platform === 'darwin') {
        app.dock.setMenu(Menu.buildFromTemplate([
            {
                label: 'New window',
                click () {
                    this.app.newWindow()
                },
            },
        ]))
    }

    application.init()

    const window = await application.newWindow({ hidden: argv.hidden })
    await window.ready
    window.passCliArguments(process.argv, process.cwd(), false)
    window.focus()
})
