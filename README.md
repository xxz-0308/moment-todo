<p align="center">
  <img src="https://img.shields.io/badge/version-2.0-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/platform-Windows-6366f1?style=flat-square" />
  <img src="https://img.shields.io/badge/built%20with-Electron-9feaf9?style=flat-square" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square" />
</p>

# Moment

A beautiful, fast todo app for Windows — now with **LAN team collaboration**. Built with Electron, React, and attention to detail.

<p align="center">
  <i>Dark by default. Glassmorphism UI. Micro-interactions everywhere. Team sync over LAN.</i>
</p>

## Features

### Personal
- **Glassmorphism design** — 4-layer frosted glass material system, dark & light mode
- **Natural date input** — type "buy groceries tomorrow" and the date is parsed automatically
- **Smart sorting** — auto-sort by priority → due date, or switch to manual drag-and-drop
- **Keyboard-first** — `Ctrl+N` quick add, `Ctrl+K` search, `Ctrl+Z` undo, `Space` complete
- **Multi-select** — `Ctrl+Click` to batch select, change priority, or delete
- **Pin tasks** — keep important items at the top
- **Sound feedback** — subtle audio cues for complete, delete, pin, drag, and undo (adjustable volume)
- **Stats dashboard** — weekly completion bar chart + category distribution pie chart (filterable by active/completed/all)
- **Undo system** — 30-second undo window for deletes, completes, edits, and list deletions
- **Auto-backup** — keeps last 7 database copies in `Documents/Moment/backups/`
- **System tray** — minimize to tray, never accidentally quit

### Team (NEW in v2.0)
- **LAN real-time sync** — one machine runs as server, others connect via WebSocket
- **Manual IP connection** — enter server address once, auto-reconnect on restart
- **Scope separation** — personal tasks stay local, team tasks sync via server
- **Assign tasks** — assign team tasks to members with desktop notifications
- **Reconnect summary** — see what changed while you were offline
- **Halo member view** — glass-panel team roster with online/offline indicators
- **Quit warning** — server warns before shutting down with connected clients
- **Multi-instance testing** — `--data-suffix=client` flag for local multi-window testing

## Install

Download the latest installer from [Releases](https://github.com/xxz-0308/moment-todo/releases).

Or build from source:

```bash
git clone https://github.com/xxz-0308/moment-todo.git
cd moment-todo
npm install
npm run dev          # dev mode (Vite + Electron)
npm run build        # production build
npm run package      # build Windows installer
```

### Team Mode Quick Start

1. **Server**: Settings → Network → enter your name → select "服务端" → click "启动服务端"
2. **Clients**: Settings → Network → enter name → select "客户端" → enter the server IP → click "连接"
3. Switch to team mode via the sidebar `[个人] [团队]` tabs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 33 |
| UI | React 19, Tailwind CSS 3, Framer Motion 11 |
| State | Zustand 5 |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Database | sql.js (WASM SQLite) |
| Network | ws (WebSocket) |
| Build | Vite 6, esbuild |
| Package | electron-builder |

## Keyboard Shortcuts

| Keys | Action |
|------|--------|
| `Ctrl + N` | Quick add task |
| `Ctrl + K` | Search tasks |
| `Space` | Toggle complete |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + T` | Toggle dark/light theme |
| `Ctrl + 1/2/3` | Switch view (Today / Upcoming / Completed) |
| `Ctrl + Click` | Multi-select tasks |
| `Delete` | Delete selected task |
| `ESC` | Close panel / deselect |

## Project Structure

```
electron/         # Electron main process, preload, WebSocket server/client
src/
  main.tsx        # React entry
  App.tsx         # Root layout + team event wiring
  store/index.ts  # Zustand — app state, undo, scope routing
  db/index.ts     # Database CRUD layer
  lib/            # team-store (Zustand slice for team sync)
  hooks/          # useKeyboard, useSound, parseDate
  components/     # UI components (15+)
```

## License

MIT
