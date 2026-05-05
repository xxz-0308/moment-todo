# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run

```bash
npm install          # Install dependencies
npm run dev          # Start dev mode (Vite + Electron)
npm run build        # Build for production
npm run build:electron  # Build Electron main/preload only
npm run build:renderer  # Build React app only
npm run package      # Build + create Windows installer
npx tsc --noEmit     # Type check without emitting
```

## Architecture

This is an Electron desktop todo app named **Moment**.

```
electron/
  main.ts       # Electron main process (window, tray, IPC, sql.js DB)
  preload.ts    # Context bridge exposing electronAPI to renderer
src/
  main.tsx      # React entry
  App.tsx       # Root layout: TitleBar + Sidebar + TaskList + DetailPanel + overlays
  db/index.ts   # DB access layer — calls window.electronAPI, wraps CRUD
  store/index.ts # Zustand store — all app state, undo stack, theme, toast queue
  hooks/        # useKeyboard (global shortcuts)
  components/   # All UI components (see below)
scripts/
  dev.mjs       # Dev launcher (builds electron, starts Vite, spawns Electron)
  build-electron.mjs  # esbuild bundle of electron/ → dist-electron/
```

**Data flow**: React component → Zustand store → db/index.ts → window.electronAPI (IPC) → main.ts → sql.js → SQLite file on disk.

**DB**: sql.js (WASM SQLite) in the main process. Sync API wrapped in `queryAll()` and `execMod()` helpers. DB file at `app.getPath('userData')/moment.db`. Auto-saved after each write, auto-backed up on quit (keeps last 7 copies in `Documents/Moment/backups/`).

**Window**: Frameless with custom TitleBar. Close minimizes to tray (never exits). Right-click tray icon or File menu to quit.

## Component hierarchy

- `TitleBar` — Drag region, window controls (min/max/close via electronAPI)
- `Sidebar` — 260px, preset views (今天/计划日程/已完成) + custom lists + stats/settings buttons
- `TaskList` — Center area, top quick-add input + Reorder.Group or static list
- `TaskItem` — Single task row with completion toggle, priority flag, due date badge
- `ReorderableTaskItem` — Wrapper for use inside Reorder.Group (drag handle)
- `DetailPanel` — 320px slides from right, full task editing (title, priority, date, list, notes, delete)
- `CommandPalette` — Ctrl+K floating search overlay, keyboard-navigable results
- `QuickAdd` — Ctrl+N floating quick task creation with optional detail fields
- `Settings` — Full-page overlay: theme toggle, backup, JSON export, keyboard shortcuts reference
- `Stats` — Full-page overlay: summary cards, weekly bar chart (Recharts), category pie chart
- `ToastContainer` — Bottom-center undo/confirmation toasts (5s auto-dismiss)
- `EmptyState` — Time-of-day greeting + contextual empty view messaging

## Key design decisions

- **Theme**: CSS variables on `:root` / `:root.light`, Tailwind `darkMode: 'class'`. Dark by default, manual toggle persisted to localStorage.
- **Animations**: Framer Motion spring physics (stiffness: 400-500, damping: 25-40). Layout animations for list reordering, `AnimatePresence` for enter/exit.
- **Undo**: Action stack in Zustand (max 20, 30s time window). Covers delete, complete, update.
- **Sort**: Default auto-sort (priority → due date → order). Toggle button switches to manual drag-sort via Framer Motion Reorder.
- **Notifications**: Electron `Notification` API triggered from renderer via IPC.
- **Icons**: Lucide React, strokeWidth 1.5-2 depending on context.
- **Fonts**: Inter + Noto Sans SC loaded from Google Fonts in index.html.

## LAN Team (multi-user)

**Mode**: One machine runs as server (WebSocket on port 5174), others connect as clients. mDNS auto-discovery with manual IP fallback.

**Data separation:**
- Personal space → local sql.js (always functional, zero network dependency)
- Team space → server's sql.js (real-time via WebSocket), client holds in-memory cache

**New files:**
```
electron/
  team-server.ts     # WS server (accepts connections, routes messages, broadcasts, DB ops)
  team-client.ts     # WS client (auto-reconnect with exponential backoff, heartbeat)
  team-config.ts     # Read/write team-config.json (member identity, role, server address)
  team-discovery.ts  # mDNS publisher + discovery
src/lib/
  team-store.ts      # Separate Zustand store for team state (tasks, lists, members, connection)
```

**Message protocol:** Client → Server via WS for CRUD; server broadcasts to all clients. `sync:full` on connect. Server-authoritative, last-write-wins.

**IPC bridge:** `electronAPI.teamStart/Stop/Send/GetConfig/SaveConfig/Discover/GetStatus/GetMembers` + `onTeamEvent` callback from main→renderer.

**Scope toggle:** `scope: 'personal' | 'team'` in main Zustand store. Components check scope to decide data source (local store vs team-store).
