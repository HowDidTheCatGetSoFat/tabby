# Tabby Mosaic

Tile and manage Tabby's tabs and windows.

## Features

- Tile the open tabs of a window into a single split: grid, columns, rows or master-stack.
- Per-pane title bar with quick actions (maximize, split, untile, move to a new window, close). Shown always, on hover or off, with a configurable animation. The bar pushes the terminal down instead of covering it.
- Two toolbar buttons that open a layout picker, one for the tabs of the current window and one for all open windows.
- Untile a single pane back into its own tab, or untile a whole window at once.
- Move a tab, or a single pane, into its own window. Local shells keep running by reattaching to the same PTY.
- Window management: tile, cascade, switch between, close the others, or gather every window's tabs into the current one. On the active monitor or spread across all of them.
- Open every profile in a group at once, tiled together.
- Re-tile a window as its tabs are opened and closed, and re-tile all windows when a new one opens (both optional).
- Restore all windows with their tabs, split layout and position on the next start.

## Usage

The actions are reachable from:

- The toolbar (a tabs button and a windows button, each opening a layout picker).
- The tab context menu.
- The command palette.
- Hotkeys, unbound by default. Assign them under Settings, Hotkeys.

## Settings

Under Settings, Mosaic:

- **Default layout** used when tiling tabs and windows.
- **Re-tile on tab open/close** for the active window.
- **Tile windows when a new one opens.**
- **Tile windows across all monitors** instead of only the active one.
- **Tile title bars**: on hover, always or off, and their animation duration.
- **Restore windows on startup.**
- **Write a debug log** to `tabby-mosaic-debug.log` in your home folder, for diagnosing window management.

## Notes

- Moving a tab or pane keeps a local shell alive by handing its PTY to the new window. Remote sessions (SSH and similar) reconnect and restore their scrollback.
- A full quit stops every shell process. A restored window comes back with its tabs, layout, position and scrollback, and starts fresh processes.
- Window management relies on the Electron desktop app. It has no effect in the web build.

## License

MIT
