# Moment

A beautiful, design-forward todo app for Windows. Built with attention to every pixel and micro-interaction.

## Features

- **Smart Views** — Today (with overdue tracking), Upcoming, All tasks, custom lists
- **Rich Animations** — Framer Motion-powered spring animations, completion celebrations, smooth transitions
- **Keyboard-First** — Ctrl+N quick add, Ctrl+K search, Ctrl+Z undo, Space to complete, and more
- **Dark & Light Themes** — Organic rounded design with indigo accent, manual or system-following
- **Natural Language Dates** — Type "明天", "下周一", or "周末" to auto-set due dates
- **Task Pinning** — Pin important tasks to always stay on top
- **Multi-Select** — Ctrl+click to batch delete or set priority
- **Cross-List Drag** — Drag tasks between lists in the sidebar
- **Search Filters** — `@high`, `@today`, `@overdue`, `@pinned` prefix filters
- **Statistics** — Weekly completion trends and category distribution charts
- **System Tray** — Minimizes to tray, overdue reminders via Windows notifications
- **Auto-Backup** — Automatic database backups on close

## Install

Download `Moment-1.0.0-setup.exe` from [Releases](https://github.com/your-username/moment/releases) and run the installer.

## Dev

```bash
npm install
npm run dev      # Start dev mode (Vite + Electron)
npm run build    # Production build
npm run package  # Create Windows installer
npm test         # Run 23 unit tests
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Electron + React 19 + TypeScript |
| State | Zustand (with undo stack) |
| Database | sql.js (WASM SQLite) |
| Styling | Tailwind CSS + CSS custom properties |
| Animation | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |

## License

MIT
