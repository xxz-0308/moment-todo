# Bug Fixes & Feature Enhancements Design

Date: 2026-05-08

## Overview

10 items total: 2 bugs, 2 features, 5 optimizations, 1 verification.

---

## Part A: Quick Fixes (6 items, direct implementation)

### A1. Bug: Overdue tasks pinning not working

**File:** `src/components/TaskList.tsx`

**Root cause:** `sortedOverdue` uses a custom sort (just `due_date` compare) instead of `autoSort()`, so `pinned` prioritization is lost.

**Fix:**
```ts
const sortedOverdue = effectiveSortManual
  ? overdueTasks
  : autoSort(overdueTasks)
```

### A2. Bug: Member count error (7→1→7)

**File:** `electron/team-server.ts`

**Root cause:** Client disconnect does not remove entry from `this.clients` Map. When a client reconnects, it's added again, but stale entries accumulate. `broadcastToAll` uses `clients.size + 1` so count is wrong.

**Fix:** In `ws.on('close')` and `ws.on('error')`, add:
```ts
if (memberId) {
  this.clients.delete(memberId)
  const newCount = this.clients.size + 1
  this.broadcastToAll({ type: 'member:disconnected', payload: { memberId, totalCount: newCount }, senderId: '' })
}
```

### A3. Optimization: Completed tasks stay visible with strikethrough until tomorrow

**Files:** `src/components/TaskList.tsx`, `src/components/TaskItem.tsx`

**Current behavior:** Completed tasks immediately disappear from today view.

**New behavior:**
- Today view: show both active AND tasks completed today (with strikethrough + dimmed style)
- Tomorrow: completed tasks only show in 已完成 view (existing behavior)
- Need a `completed_at` field to track when task was completed. If DB doesn't have this, add migration.

**Implementation:**
- DB migration: add `completed_at TEXT` column to tasks table
- `toggleComplete`: set `completed_at = datetime('now')` when completing, clear when uncompleting
- `TaskList` today filter: include tasks where `completed_at` is today
- `TaskItem`: when `showCompletedState`, apply `line-through text-text-tertiary` style

### A4. Optimization: In-app notification + taskbar flash for assignments

**Files:** `src/App.tsx`, `electron/main.ts`

**Implementation:**
- On team event `task:assign` (or `task:created` with `assigned_to` matching self):
  1. `get().addToast('Bob 指派给你: "整理报表"', { label: '查看', onClick: ... })` — already have toast system
  2. `mainWindow.flashFrame(true)` — Electron API to flash taskbar icon
  3. Existing Windows Notification stays as-is (already working)
- Clear flash when window gains focus: `mainWindow.on('focus', () => mainWindow.flashFrame(false))`

### A5. Optimization: Category name uniqueness

**Files:** `src/store/index.ts`, `src/lib/team-store.ts`

**Implementation:**
- `addList`: before creating, check `lists.some(l => l.name === name.trim().toLowerCase())`
- If duplicate, `addToast('分类名称已存在')` and return early
- `updateList`: check other lists (exclude current id) for same name
- Check is case-insensitive: `l.name.toLowerCase() === name.trim().toLowerCase()`

### A6. Feature: Data import/restore

**Files:** `electron/main.ts`, `electron/preload.ts`, `src/components/Settings.tsx`

**Implementation:**
- `main.ts`: IPC handler `db:restore` — show `dialog.showOpenDialog` for `.db` files, then copy selected file over `moment.db`
- `main.ts`: IPC handler `db:import-json` — show `dialog.showOpenDialog` for `.json` files, read file, parse tasks, insert into DB
- `preload.ts`: expose `dbRestore: () => ipcRenderer.invoke('db:restore')` and `dbImportJSON: () => ipcRenderer.invoke('db:import-json')`
- `Settings.tsx`: add "恢复备份 (.db)" and "导入数据 (.json)" buttons next to existing backup/export buttons
- After restore/import: reload data with `get().loadData()`

---

## Part B: Team Task Sync to Personal Space (design discussion complete)

### B1. Overview

When Alice assigns a task to Bob in team space, a copy appears in Bob's personal space. Changes sync bidirectionally.

### B2. Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Personal stores full copy with `team_task_id` field | Offline-friendly, uniform DB access |
| 2 | Assigned tasks go to "全部" category | Avoid cluttering personal categories |
| 3 | Personal delete = remove self from `assigned_to` | Deleting shouldn't affect team data |
| 4 | Each assignee has independent completion status | One person's completion ≠ everyone's |
| 5 | All fields sync bidirectionally | Title, priority, date, notes mirror team |
| 6 | Last-Write-Wins conflict resolution | Simple, consistent with existing architecture |

### B3. Data Model

**New table: `task_assignee_status`**
```sql
CREATE TABLE IF NOT EXISTS task_assignee_status (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,        -- team task id
  assignee_id TEXT NOT NULL,    -- member id
  completed INTEGER DEFAULT 0,  -- this assignee's completion
  completed_at TEXT,            -- when this assignee completed
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

**New columns on `tasks` table:**
```sql
ALTER TABLE tasks ADD COLUMN team_task_id TEXT;      -- null for personal-only tasks
ALTER TABLE tasks ADD COLUMN is_team_assigned INTEGER DEFAULT 0;  -- 1 = from team assignment
ALTER TABLE tasks ADD COLUMN completed_at TEXT;       -- for A3
```

### B4. Sync Flow

**Team → Personal (assignment):**
1. Alice assigns task to Bob in team space
2. Team server broadcasts `task:created` or `task:updated` with `assigned_to`
3. Bob's renderer (team-store) receives it
4. Bob's main process adds/updates task in **local sql.js** with `team_task_id` set
5. Bob sees task in personal "全部" when `is_team_assigned = 1`

**Personal → Team (Bob modifies):**
1. Bob modifies personal task (that has `team_task_id`)
2. Store detects `is_team_assigned` → sends `task:update` via team WebSocket
3. Server broadcasts to all clients
4. Alice's team space updates
5. Other assignees' personal copies update via team-store listener

**Completion sync:**
1. Bob marks task complete in personal space
2. Sends `task:update { id: teamTaskId, assignee_status: { bobId: 1 } }`
3. Server updates `task_assignee_status`
4. Server checks if ALL assignees completed → if so, sets `completed = 1` on task
5. Broadcasts updated task + assignee statuses to all clients

### B5. Key Implementation Points

- **Store changes**: `updateTask` and `toggleComplete` need to check `is_team_assigned` and route via WebSocket when in personal scope
- **DB access in main**: need `dbRun` calls from team store event handlers to add/update local task copies
- **Duplication prevention**: use `team_task_id` UNIQUE constraint to prevent duplicates
- **Removing personal copy**: when `assigned_to` no longer contains Bob, remove `team_task_id` from his local copy (or delete it entirely)

---

## Part C: Auto-Update System

### C1. Overview

Server downloads new installer from GitHub Releases, distributes to clients on request.

### C2. Flow

```
[Developer releases v2.0.3 on GitHub]
       ↓
[Server (Alice) starts] → checks GitHub Releases API
       ↓                            ↓
  Found? Yes → download to userData/updates/    No → log, skip
       ↓
[Server starts HTTP server on port 5175, serving updates/ dir]
       ↓
[Client (Bob) connects] → handshake sends { appVersion: "2.0.2" }
       ↓
[Server compares] → appVersion < serverAppVersion → send update:available
       ↓
[Bob sees toast] "发现新版本 v2.0.3 (约 80MB)，是否下载？"
       ↓
[Bob confirms] → HTTP GET from server:5175 → download → prompt "点击安装"
       ↓
[Bob clicks] → shell.openPath(installer) → installer runs → app restarts
```

### C3. Key Details

- **Server check**: on startup, after team server starts, async fetch from GitHub Releases API. Repo URL stored as constant `UPDATE_REPO` (e.g. `https://api.github.com/repos/<owner>/<repo>/releases/latest`), find `.exe` asset, download to `app.getPath('userData')/updates/`
- **Client version in handshake**: add `appVersion` field to `member:handshake` message
- **Server version compare**: `compareVersions(clientVersion, serverAppVersion) < 0` → send `update:available`
- **Server download failure**: Toast to server user "从 GitHub 下载安装包失败，是否重试？或手动下载后放到 `{userData}/updates/Moment-{version}-setup.exe`"
- **Client never fetches from GitHub**: all update data goes through server
- **No code signing needed**: manual install flow, same as current

### C4. Files to Change

| File | Change |
|------|--------|
| `electron/main.ts` | Add `checkForUpdate()` function, download with `https.get()`, store ISO comparison logic |
| `electron/team-server.ts` | Add `appVersion` to handshake response, send `update:available` |
| `electron/team-client.ts` | Send `appVersion` in handshake payload |
| `electron/preload.ts` | Expose `installUpdate(path)` IPC |
| `src/lib/team-store.ts` | Handle `update:available` event, show toast with download action |
| `src/App.tsx` | Wire `update:available` handler |

---

## Part D: Reconnect Verification

### D1. Issue

User reported clients don't reconnect after server restarts. Code analysis shows `scheduleReconnect` with exponential backoff capped at 30s — this should work.

### D2. Verification Steps

1. Start server + 2 clients → verify connection
2. Kill server → verify clients show "disconnected" status
3. Wait up to 60s → verify clients reconnect when server restarts
4. If not reconnecting: check if `_intentionalClose` flag is incorrectly set, or if `reconnectTimer` is being cleared somewhere unexpected

### D3. Potential Bug

The `connect()` method has: `if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return` — if the WebSocket is in a zombie state (not properly cleaned up on disconnect), it could prevent reconnection.

Potential fix: add a timeout that force-closes and creates a new WebSocket if connection attempt takes too long.

---

## Part E: Implementation Order

**Phase 1 — Quick wins (A1-A5, low risk):**
1. A1: Overdue pinning
2. A2: Member count
3. A3: Completed tasks strikethrough
4. A4: In-app notification + flash
5. A5: Category name uniqueness

**Phase 2 — Auto-update (C, medium risk):**
6. Auto-update via GitHub Releases

**Phase 3 — Task sync (B, high risk, most complex):**
7. Team task sync to personal space

**Phase 4 — Import + verification (A6 + D, low risk):**
8. Data import/restore
9. Reconnect verification/fix
