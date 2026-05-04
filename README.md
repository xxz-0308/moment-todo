<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows-6366f1?style=flat-square" />
  <img src="https://img.shields.io/badge/built%20with-Electron-9feaf9?style=flat-square" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square" />
</p>

# Moment

A beautiful, fast todo app for Windows. Built with Electron, React, and attention to detail.

<p align="center">
  <i>Dark by default. Glassmorphism UI. Micro-interactions everywhere.</i>
</p>

## Features

- **Glassmorphism design** — 4-layer frosted glass material system, dark & light mode
- **Natural date input** — type "buy groceries tomorrow" and the date is parsed automatically
- **Smart sorting** — auto-sort by priority → due date, or switch to manual drag-and-drop
- **Keyboard-first** — `Ctrl+N` quick add, `Ctrl+K` search, `Ctrl+Z` undo, `Space` complete
- **Multi-select** — `Ctrl+Click` to batch select, change priority, or delete
- **Pin tasks** — keep important items at the top
- **Sound feedback** — subtle audio cues for complete, delete, pin, drag, and undo
- **Stats dashboard** — weekly completion bar chart + category distribution pie chart
- **Undo system** — 30-second undo window for deletes, completes, and edits
- **Auto-backup** — keeps last 7 database copies in `Documents/Moment/backups/`
- **System tray** — minimize to tray, never accidentally quit

## Screenshots

> *Coming soon — or just run `npm run dev` and see for yourself.*

## Install

Download the latest installer from [Releases](https://github.com/xxz-0308/moment-todo/releases).

Or build from source:

```bash
git clone https://github.com/xxz-0308/moment-todo.git
cd moment-todo
npm install
npm run dev          # dev mode (Vite + Electron)
npm run package      # build Windows installer
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 33 |
| UI | React 19, Tailwind CSS 3, Framer Motion 11 |
| State | Zustand 5 |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Database | sql.js (WASM SQLite) |
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
electron/         # Electron main process + preload
src/
  main.tsx        # React entry
  App.tsx         # Root layout
  store/index.ts  # Zustand — all app state + undo
  db/index.ts     # Database CRUD layer
  hooks/          # useKeyboard, useSound, parseDate
  components/     # 13 UI components
```

## License

MIT
