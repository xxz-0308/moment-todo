# Bug Fixes & Feature Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 2 bugs + implement 2 features + 5 optimizations + 1 verification across 4 phases

**Architecture:** 10 changes touching Electron main process (main.ts, team-server.ts, team-client.ts), IPC bridge (preload.ts), Zustand stores (store/index.ts, team-store.ts), React components (TaskList.tsx, TaskItem.tsx, Settings.tsx, App.tsx), and DB layer (db/index.ts + schema migrations)

**Tech Stack:** Electron 33, React 19, TypeScript, Zustand, sql.js (WASM SQLite), ws (WebSocket), Framer Motion

---

## File Structure

| File | Phase | Change |
|------|-------|--------|
| `src/components/TaskList.tsx` | P1 | A1 overdue pinning, A3 completed tasks today filter |
| `electron/team-server.ts` | P1 | A2 member count cleanup, D3 zombie connection fix |
| `src/components/TaskItem.tsx` | P1 | A3 completed strikethrough style |
| `src/store/index.ts` | P1, P3 | A4 flash frame, A5 name uniqueness, B5 team task routing |
| `src/lib/team-store.ts` | P1, P2, P3 | A4 assigned notification, C update:available, B sync handlers |
| `electron/main.ts` | P1, P2, P4 | A4 flash frame, C GitHub update check, A6 import/restore IPC |
| `electron/team-client.ts` | P2 | C appVersion in handshake |
| `electron/preload.ts` | P2, P4 | C installUpdate, A6 import/restore IPC |
| `src/App.tsx` | P2 | C update:available toast wiring |
| `src/components/Settings.tsx` | P4 | A6 import/restore buttons |
| `src/db/index.ts` | P3 | B task sync DB helpers |

---

## Phase 1: Quick Wins (A1-A5)

### Task 1: Fix overdue tasks pinning (A1)

**Files:**
- Modify: `src/components/TaskList.tsx:145-151`

- [ ] **Step 1: Change sortedOverdue to use autoSort**

Replace the custom due_date sort in `sortedOverdue` with a call to `autoSort`:

```ts
const sortedOverdue = effectiveSortManual
  ? overdueTasks
  : autoSort(overdueTasks)
```

This fixes pinned overdue tasks not appearing at the top.

- [ ] **Step 2: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/TaskList.tsx
git commit -m "fix: use autoSort for overdue tasks so pinning works"
```

---

### Task 2: Fix member count error (A2)

**Files:**
- Modify: `electron/team-server.ts:40-149`

- [ ] **Step 1: Add error handler that cleans up client on WebSocket error**

In `team-server.ts` `start()` method, inside `this.wss.on('connection', ...)` after the existing close handler, add an `error` handler:

```ts
ws.on('error', () => {
  if (memberId) {
    this.clients.delete(memberId)
    const totalCount = this.clients.size + 1
    this.broadcastToAll({ type: 'member:left', payload: { memberId, totalCount }, senderId: '' })
    this.onEvent('member:left', { memberId, totalCount })
  }
})
```

- [ ] **Step 2: Fix server-side team:request-sync to include connected client IDs**

In `electron/main.ts`, find the `team:request-sync` handler (~line 591). Change `onlineIds` to include connected client IDs:

```ts
ipcMain.handle('team:request-sync', () => {
  if (teamServer && db) {
    mainWindow?.webContents.send('team:event', { type: 'status', payload: 'connected' })
    const members = queryAll('SELECT * FROM team_members')
    const teamLists = queryAll("SELECT * FROM lists WHERE scope = 'team'")
    const teamTasks = queryAll("SELECT * FROM tasks WHERE scope = 'team'")
    const config = readTeamConfig()
    const onlineIds = [config.member.id, ...teamServer.getClientIds()]
    mainWindow?.webContents.send('team:event', { type: 'sync:full', payload: { members, lists: teamLists, tasks: teamTasks, onlineIds } })
  }
  // ...
})
```

- [ ] **Step 3: Add getClientIds() method to TeamServer**

In `electron/team-server.ts`, add after the `memberCount` getter:

```ts
getClientIds(): string[] {
  return [...this.clients.keys()]
}
```

- [ ] **Step 4: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add electron/team-server.ts electron/main.ts
git commit -m "fix: clean up clients on WS error, include client IDs in sync:full"
```

---

### Task 3: Completed tasks stay visible with strikethrough until tomorrow (A3)

**Files:**
- Modify: `electron/main.ts` (DB migration)
- Modify: `src/store/index.ts` (toggleComplete)
- Modify: `src/components/TaskList.tsx` (today filter)
- Modify: `src/components/TaskItem.tsx` (strikethrough style)

- [ ] **Step 1: Add completed_at column migration in main.ts**

In `electron/main.ts` `initSchema()`, after the existing team migrations (~line 97), add:

```ts
// A3: completed_at for tracking when task was completed today
try { db.run("ALTER TABLE tasks ADD COLUMN completed_at TEXT") } catch {}
```

- [ ] **Step 2: Update toggleComplete in store to set completed_at**

In `src/store/index.ts` `toggleComplete`, in both personal and team paths, the `db.updateTask` / WebSocket payload needs to include `completed_at`. For the personal path, modify the `updateTask` call:

```ts
// In toggleComplete, personal scope:
const now = new Date().toISOString()
await db.updateTask(id, { 
  completed: newCompleted,
  completed_at: newCompleted ? now : null 
})
```

And in the set() call:
```ts
set((s) => ({
  tasks: s.tasks.map((t) =>
    t.id === id ? { ...t, completed: newCompleted, completed_at: newCompleted ? now : null, updated_at: now } : t
  ),
}))
```

For the team scope path, add `completed_at` to the payload:
```ts
useTeamStore.getState().sendMessage('task:update', { 
  id, 
  completed: newCompleted,
  completed_at: newCompleted ? new Date().toISOString() : null
})
```

- [ ] **Step 3: Update DB updateTask to accept completed_at**

In `src/db/index.ts` `updateTask`, add `completed_at` to the type:
```ts
updates: Partial<Pick<Task, 'title' | 'completed' | 'priority' | 'due_date' | 'list_id' | 'notes' | 'sort_order' | 'pinned' | 'completed_at'>>
```

- [ ] **Step 4: Update Task type to include completed_at**

In `src/store/index.ts` `Task` interface, add:
```ts
completed_at: string | null
```

And in `src/lib/team-store.ts` `TeamTask` interface, add:
```ts
completed_at: string | null
```

- [ ] **Step 5: Update TaskList today filter to include tasks completed today**

In `src/components/TaskList.tsx` `getFilteredTasks`, in the `case 'today'` block, modify the filter:

```ts
case 'today': {
  const todayActive = active.filter((t) => t.due_date === today)
  const overdue = active.filter((t) => t.due_date && t.due_date < today)
  const completedToday = activeTasks.filter((t) => 
    t.completed && (t as any).completed_at && (t as any).completed_at.startsWith(today)
  )
  return {
    todayTasks: applyFilters([...todayActive, ...completedToday], activeFilters),
    overdueTasks: applyFilters(overdue, activeFilters),
    regularTasks: [],
  }
}
```

- [ ] **Step 6: TaskItem strikethrough for completed tasks in today view**

In `src/components/TaskItem.tsx`, the title span already has conditional strikethrough for `task.completed`. But for today view, the completed task should show full strikethrough without the `opacity-40` class. Modify the className:

The existing code already has:
```tsx
${task.completed ? 'opacity-40' : ''}
```

Change to only apply opacity-40 in the completed view, not today view:
```tsx
${(showCompletedState || task.completed) ? 'opacity-40' : ''}
```

Wait, actually for today view completed tasks we want:
- strikethrough (already there via `task.completed ? 'text-text-tertiary line-through'`)
- dimmed but NOT fully faded (keep visible)
- The completed circle stays checked

The title span already has: `task.completed ? 'text-text-tertiary line-through' : 'text-text-primary'`. And the outer div has `task.completed ? 'opacity-40' : ''`.

Change the outer opacity to only apply in completed view:
```tsx
${(task.completed && showCompletedState) ? 'opacity-40' : ''}
```

- [ ] **Step 7: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add electron/main.ts src/store/index.ts src/components/TaskList.tsx src/components/TaskItem.tsx src/db/index.ts src/lib/team-store.ts
git commit -m "feat: keep completed tasks visible in today view with strikethrough"
```

---

### Task 4: In-app notification + taskbar flash for assignments (A4)

**Files:**
- Modify: `electron/main.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add flashFrame call when assignment notification fires**

In `electron/main.ts`, around line 661 in the `notify:assigned` handler, add `mainWindow?.flashFrame(true)`:

```ts
if (addedIds.includes(config.member.id)) {
  mainWindow?.webContents.send('team:event', {
    type: 'notify:assigned',
    payload: notifyPayload,
  })
  mainWindow?.flashFrame(true)  // Flash taskbar icon
}
```

For the WebSocket path (server → renderer), in the same file's `ipcMain.handle('team:send', ...)` handler, the `notify:assigned` logic sends to renderer via `mainWindow?.webContents.send` but doesn't flash. Add flash after the send.

Also for the client-side notification in `team-store.ts` `notify:assigned` handler, we need to dispatch flash frame via IPC. In the handler:

```ts
case 'notify:assigned': {
  const p = payload as { taskId: string; taskTitle: string; assignedBy: string }
  if (typeof window !== 'undefined') {
    const msg = `${p.assignedBy || '有人'}给你分配了任务：${p.taskTitle}`
    ;(window as any).electronAPI?.showNotification?.('新任务分配', msg)
    ;(window as any).electronAPI?.flashWindow?.()  // New IPC
    window.dispatchEvent(new CustomEvent('moment:toast', { detail: { message: msg } }))
  }
  break
}
```

- [ ] **Step 2: Add flashWindow IPC to preload**

In `electron/preload.ts`, add:
```ts
flashWindow: () => ipcRenderer.invoke('window:flash'),
```

- [ ] **Step 3: Add window:flash IPC handler in main.ts**

In `electron/main.ts` `setupIPC()`:
```ts
ipcMain.handle('window:flash', () => {
  mainWindow?.flashFrame(true)
  return true
})
```

- [ ] **Step 4: Clear flash on window focus**

In `electron/main.ts` `createWindow()`, add:

```ts
mainWindow.on('focus', () => {
  mainWindow?.flashFrame(false)
})
```

- [ ] **Step 5: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add electron/main.ts electron/preload.ts src/lib/team-store.ts
git commit -m "feat: add taskbar flash on assignment notification"
```

---

### Task 5: Category name uniqueness (A5)

**Files:**
- Modify: `src/store/index.ts`

- [ ] **Step 1: Add duplicate check to addList**

In `src/store/index.ts` `addList`, add guard before creation:

```ts
addList: async (name, color) => {
  if (get().scope === 'team') {
    // Team checks done on server side
  }
  const trimmed = name.trim()
  if (get().lists.some(l => l.name.toLowerCase() === trimmed.toLowerCase())) {
    get().addToast('分类名称已存在')
    return
  }
  // ... existing code
  const list = await db.createList(trimmed, color)
  set((s) => ({ lists: [...s.lists, list] }))
},
```

- [ ] **Step 2: Add duplicate check to team list creation**

In `src/lib/team-store.ts`, add a `_checkDuplicateList` helper. But since team list creation goes through `sendMessage`, the check should be on the server side. In `electron/team-server.ts` `handleListMessage` for `list:create`, add a duplicate name check:

```ts
if (type === 'list:create') {
  // Check duplicate name
  const existing = this.queryOne("SELECT id FROM lists WHERE scope = 'team' AND name = ?", [data.name])
  if (existing) {
    // Send error back to sender only
    const senderConn = this.clients.get(senderId)
    if (senderConn && senderConn.ws.readyState === WebSocket.OPEN) {
      senderConn.ws.send(JSON.stringify({ 
        type: 'error', 
        payload: { message: '分类名称已存在' } 
      }))
    }
    return
  }
  // ... existing create code
}
```

- [ ] **Step 3: Add duplicate check to updateList (store)**

In `src/store/index.ts` `updateList`, add guard:

```ts
updateList: async (id, updates: { name?: string; color?: string }) => {
  if (updates.name) {
    const trimmed = updates.name.trim()
    if (get().lists.some(l => l.id !== id && l.name.toLowerCase() === trimmed.toLowerCase())) {
      get().addToast('分类名称已存在')
      return
    }
  }
  // ... existing code
},
```

- [ ] **Step 4: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/store/index.ts electron/team-server.ts
git commit -m "feat: prevent duplicate category names in personal and team scopes"
```

---

## Phase 2: Auto-Update System (C)

### Task 6: Server-side GitHub update check + download

**Files:**
- Modify: `electron/main.ts`

- [ ] **Step 1: Add checkForUpdate function**

Add to `electron/main.ts` (before `startUpdateServer`):

```ts
const UPDATE_REPO_OWNER = ''  // Fill in with actual owner
const UPDATE_REPO_NAME = ''   // Fill in with actual repo name
const UPDATES_DIR = path.join(app.getPath('userData'), 'updates')

async function checkForUpdate(): Promise<void> {
  if (!UPDATE_REPO_OWNER || !UPDATE_REPO_NAME) {
    console.log('[Updater] Repo not configured, skipping')
    return
  }
  try {
    const https = require('https') as typeof import('https')
    const pkg = require('../package.json')
    const currentVersion = pkg.version as string

    const releasesUrl = `https://api.github.com/repos/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}/releases/latest`

    const releasesData = await new Promise<string>((resolve, reject) => {
      https.get(releasesUrl, { headers: { 'User-Agent': 'Moment-App' } }, (res) => {
        let body = ''
        res.on('data', (chunk: string) => body += chunk)
        res.on('end', () => resolve(body))
      }).on('error', reject)
    })

    const release = JSON.parse(releasesData)
    const latestVersion = (release.tag_name || '').replace(/^v/, '')
    if (!latestVersion || latestVersion === currentVersion) {
      console.log('[Updater] Already at latest version')
      return
    }

    const asset = release.assets?.find((a: any) =>
      a.name && a.name.endsWith('.exe') && a.browser_download_url
    )
    if (!asset) {
      console.log('[Updater] No .exe asset found in latest release')
      return
    }

    // Download
    const installerName = `Moment-${latestVersion}-setup.exe`
    const destPath = path.join(UPDATES_DIR, installerName)
    if (!fs.existsSync(UPDATES_DIR)) fs.mkdirSync(UPDATES_DIR, { recursive: true })

    console.log(`[Updater] Downloading ${installerName}...`)
    const file = fs.createWriteStream(destPath)

    await new Promise<void>((resolve, reject) => {
      https.get(asset.browser_download_url, { headers: { 'User-Agent': 'Moment-App' } }, (res) => {
        res.pipe(file)
        file.on('finish', () => { file.close(); resolve() })
      }).on('error', reject)
    })

    console.log(`[Updater] Downloaded ${installerName}`)
  } catch (e: any) {
    console.error('[Updater] Failed to check/download update:', e.message)
    // Notify server user about failure
    mainWindow?.webContents.send('team:event', {
      type: 'update:download-failed',
      payload: { message: `从 GitHub 下载安装包失败: ${e.message}。请重试或手动下载后放到 ${UPDATES_DIR}` }
    })
  }
}
```

- [ ] **Step 2: Update startUpdateServer to serve from UPDATES_DIR**

In `electron/main.ts` `startUpdateServer`, change:

```ts
const installerPath = path.join(UPDATES_DIR, installerName)
```

- [ ] **Step 3: Call checkForUpdate on server start**

In `electron/main.ts` `startTeam`, after `teamServer.start()`, add:

```ts
checkForUpdate()  // async, don't block
```

- [ ] **Step 4: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add electron/main.ts
git commit -m "feat: add GitHub Releases update check and download to server"
```

---

### Task 7: Client version in handshake + update:available flow

**Files:**
- Modify: `electron/team-client.ts`
- Modify: `electron/team-server.ts`
- Modify: `src/lib/team-store.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Send appVersion in team-client handshake**

In `electron/team-client.ts` `connect()`, update the handshake message:

```ts
this.send({ type: 'member:handshake', payload: { 
  member: this.member, 
  protocolVersion: MIN_PROTOCOL_VERSION,
  appVersion: (() => { try { return require('../package.json').version } catch { return '0.0.0' } })()
}})
```

Wait, `require` in Electron main should work. But for cleanliness, pass appVersion to the constructor. Let me check the constructor...

Actually, `TeamClient` is created in `main.ts` `connectClient`:
```ts
teamClient = new TeamClient(url, config.member, (event, data) => { ... })
```

Let me add appVersion to the constructor:

```ts
// team-client.ts constructor
private appVersion: string

constructor(url: string, member: TeamMember, appVersion: string, onEvent: ClientEventHandler) {
  this.url = url
  this.member = member
  this.appVersion = appVersion
  this.onEvent = onEvent
}
```

And in `connect()`:
```ts
this.send({ type: 'member:handshake', payload: { 
  member: this.member, 
  protocolVersion: MIN_PROTOCOL_VERSION,
  appVersion: this.appVersion
}})
```

- [ ] **Step 2: Update connectClient in main.ts to pass appVersion**

In `electron/main.ts` `connectClient`:
```ts
const pkg = require('../package.json')
teamClient = new TeamClient(url, config.member, pkg.version, (event, data) => {
  mainWindow?.webContents.send('team:event', { type: event, payload: data })
})
```

- [ ] **Step 3: Server compares versions and sends update:available**

In `electron/team-server.ts` `member:handshake` handler, after the protocol check, add version comparison:

```ts
const clientAppVersion = (msg.payload.appVersion as string) || '0.0.0'
if (clientAppVersion && this.appVersion && clientAppVersion !== this.appVersion) {
  // Only notify if client is older (server has newer)
  ws.send(JSON.stringify({
    type: 'update:available',
    payload: {
      serverVersion: this.appVersion,
      clientVersion: clientAppVersion,
      downloadUrl: `http://${this.getLocalIP()}:5175/Moment-${this.appVersion}-setup.exe`,
    },
  }))
}
```

- [ ] **Step 4: Handle update:available in team-store**

In `src/lib/team-store.ts` `_handleMessage`, add:

```ts
case 'update:available': {
  const p = payload as { serverVersion: string; clientVersion: string; downloadUrl: string }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('moment:update-available', {
      detail: { serverVersion: p.serverVersion, downloadUrl: p.downloadUrl, required: false },
    }))
  }
  break
}
```

- [ ] **Step 5: Update App.tsx update handler for non-required updates**

The existing `moment:update-available` handler already works but always says "protocol incompatible". Modify in `src/App.tsx`:

```ts
const updateHandler = (e: Event) => {
  const detail = (e as CustomEvent).detail as {
    serverVersion: string
    downloadUrl?: string
    required?: boolean
  }
  const msg = detail.required
    ? `协议不兼容，需要升级到 v${detail.serverVersion}`
    : `发现新版本 v${detail.serverVersion}，是否下载更新？`

  useStore.getState().addToast(msg, {
    label: detail.required ? '下载更新' : '下载',
    onClick: () => {
      if (detail.downloadUrl) {
        window.open(detail.downloadUrl, '_blank')
      }
    },
  })
}
```

- [ ] **Step 6: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add electron/team-client.ts electron/team-server.ts electron/main.ts src/lib/team-store.ts src/App.tsx
git commit -m "feat: client sends appVersion in handshake, server notifies on update"
```

---

## Phase 3: Team Task Sync to Personal Space (B)

### Task 8: DB migration for team task sync

**Files:**
- Modify: `electron/main.ts` (initSchema)

- [ ] **Step 1: Add new columns and table in initSchema**

In `electron/main.ts` `initSchema()`, after existing migrations, add:

```ts
// B: team task sync columns
try { db.run("ALTER TABLE tasks ADD COLUMN team_task_id TEXT") } catch {}
try { db.run("ALTER TABLE tasks ADD COLUMN is_team_assigned INTEGER DEFAULT 0") } catch {}
try { db.run("ALTER TABLE tasks ADD COLUMN completed_at TEXT") } catch {}

// B: task_assignee_status table
db.run(`
  CREATE TABLE IF NOT EXISTS task_assignee_status (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    assignee_id TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT
  )
`)
```

- [ ] **Step 2: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add electron/main.ts
git commit -m "feat: add team_task_id + task_assignee_status schema for team-personal sync"
```

---

### Task 9: Team store writes assigned tasks to local personal DB

**Files:**
- Modify: `src/lib/team-store.ts`
- Modify: `src/db/index.ts`

- [ ] **Step 1: Add syncTeamTaskToPersonal + removeTeamTask helpers in db/index.ts**

In `src/db/index.ts`, add two new exports:

```ts
export async function upsertTeamTask(task: {
  id: string
  title: string
  completed: number
  priority: string
  due_date: string | null
  list_id: string
  notes: string
  pinned: number
  sort_order: number
  team_task_id: string
}): Promise<void> {
  const existing = await api.dbGet(
    'SELECT id FROM tasks WHERE team_task_id = ?',
    [task.team_task_id]
  )
  const row = existing as { id: string } | null
  if (row) {
    await api.dbRun(
      `UPDATE tasks SET title=?, completed=?, priority=?, due_date=?, list_id=?, notes=?, pinned=?, sort_order=? WHERE id=?`,
      [task.title, task.completed, task.priority, task.due_date, 'default', task.notes, task.pinned, task.sort_order, row.id]
    )
  } else {
    const id = generateId()
    const now = new Date().toISOString()
    await api.dbRun(
      `INSERT INTO tasks (id, title, completed, priority, due_date, list_id, notes, pinned, sort_order, team_task_id, is_team_assigned, scope, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'default', ?, ?, ?, ?, 1, 'personal', ?, ?)`,
      [id, task.title, task.completed, task.priority, task.due_date, task.notes, task.pinned, task.sort_order, task.team_task_id, now, now]
    )
  }
}

export async function removeTeamTask(teamTaskId: string): Promise<void> {
  await api.dbRun('DELETE FROM tasks WHERE team_task_id = ?', [teamTaskId])
}
```

- [ ] **Step 2: Add selfMemberId to TeamState and populate on connect/startTeam**

In `src/lib/team-store.ts`:
1. Add `selfMemberId: ''` to the `TeamState` interface and initial state
2. In both `connect()` and `startTeam()`, after `a.onTeamEvent(...)`, add:

```ts
a.teamGetConfig().then((cfg: any) => {
  if (cfg?.member?.id) set({ selfMemberId: cfg.member.id })
})
```

- [ ] **Step 3: Handle task:created — write to personal DB when assigned to self**

In `src/lib/team-store.ts` `task:created` handler, after the existing `set()`:

```ts
case 'task:created': {
  const p = payload as { task: TeamTask }
  set((s) => {
    if (s.tasks.find((t) => t.id === p.task.id)) return s
    return { tasks: [p.task, ...s.tasks] }
  })
  // If this task is assigned to me, write to personal DB
  const t = p.task
  const selfId = get().selfMemberId
  if (selfId && t.assigned_to) {
    const assignedIds = t.assigned_to.split(',').map((s: string) => s.trim()).filter(Boolean)
    if (assignedIds.includes(selfId) && typeof window !== 'undefined') {
      // Dynamic import to avoid circular dependency
      import('@/db').then((db) => {
        db.upsertTeamTask({
          id: t.id, title: t.title, completed: t.completed, priority: t.priority,
          due_date: t.due_date, list_id: t.list_id, notes: t.notes,
          pinned: t.pinned, sort_order: t.sort_order, team_task_id: t.id,
        })
      }).catch(() => {})
    }
  }
  break
}
```

- [ ] **Step 4: Handle task:updated — sync changes to personal DB**

In `src/lib/team-store.ts` `task:updated` handler, after the existing `set()`:

```ts
case 'task:updated': {
  const p = payload as { id: string; assigned_to?: string } & Partial<TeamTask>
  set((s) => ({
    tasks: s.tasks.map((t) => (t.id === p.id ? { ...t, ...p, updated_at: new Date().toISOString() } : t)),
  }))
  // Sync to/from personal DB if this task is/was assigned to me
  const selfId = get().selfMemberId
  if (selfId) {
    const t = get().tasks.find((x) => x.id === p.id)
    const newAssigned = p.assigned_to
      ? p.assigned_to.split(',').map((s: string) => s.trim()).filter(Boolean)
      : (t?.assigned_to?.split(',').map((s: string) => s.trim()).filter(Boolean) || [])
    if (newAssigned.includes(selfId) && t) {
      // Task is assigned to me — upsert in personal DB
      import('@/db').then((db) => {
        db.upsertTeamTask({
          id: t.id, title: t.title, completed: t.completed, priority: t.priority,
          due_date: t.due_date, list_id: t.list_id, notes: t.notes,
          pinned: t.pinned, sort_order: t.sort_order, team_task_id: t.id,
        })
      }).catch(() => {})
    } else if ('assigned_to' in p && !newAssigned.includes(selfId)) {
      // I was removed from assigned_to — delete from personal DB
      import('@/db').then((db) => {
        db.removeTeamTask(p.id as string)
      }).catch(() => {})
    }
  }
  break
}
```

- [ ] **Step 5: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/team-store.ts src/db/index.ts src/store/index.ts
git commit -m "feat: sync assigned team tasks to personal DB on create/update"
```

---

### Task 10: Store routes team-assigned task modifications via WebSocket

**Files:**
- Modify: `src/store/index.ts`

- [ ] **Step 1: Check is_team_assigned in updateTask**

In `src/store/index.ts` `updateTask`, add check before personal DB update:

```ts
updateTask: async (id, updates) => {
  // If in personal scope and task is team-assigned, route via WebSocket
  const task = get().tasks.find((t) => t.id === id)
  if (get().scope === 'personal' && (task as any)?.is_team_assigned && (task as any)?.team_task_id) {
    // Route through team WebSocket
    useTeamStore.getState().sendMessage('task:update', { 
      id: (task as any).team_task_id, 
      ...updates 
    })
    // Optimistically update local
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }))
    return
  }
  // ... existing code
},
```

- [ ] **Step 2: Check is_team_assigned in toggleComplete**

Same pattern in `toggleComplete` for personal scope:

```ts
toggleComplete: async (id) => {
  if (get().scope === 'personal') {
    const task = get().tasks.find((t) => t.id === id)
    if (task && (task as any)?.is_team_assigned && (task as any)?.team_task_id) {
      const newCompleted = task.completed ? 0 : 1
      useTeamStore.getState().sendMessage('task:update', {
        id: (task as any).team_task_id,
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : t
        ),
      }))
      if (newCompleted) playCompleteSound()
      return
    }
  }
  // ... existing code
},
```

- [ ] **Step 3: Check is_team_assigned in removeTask**

In `removeTask`, for personal scope with team-assigned tasks:

```ts
removeTask: async (id) => {
  if (get().scope === 'personal') {
    const task = get().tasks.find((t) => t.id === id)
    if (task && (task as any)?.is_team_assigned && (task as any)?.team_task_id) {
      // Remove self from assigned_to instead of deleting
      const teamTask = useTeamStore.getState().tasks.find((t) => t.id === (task as any).team_task_id)
      const currentAssigned = parseAssigneeIds((teamTask as any)?.assigned_to || (task as any).assigned_to || '')
      const selfId = useTeamStore.getState().selfMemberId || ''
      const newAssigned = currentAssigned.filter((a: string) => a !== selfId)
      useTeamStore.getState().sendMessage('task:update', {
        id: (task as any).team_task_id,
        assigned_to: joinAssigneeIds(newAssigned),
      })
      // Remove from personal local DB
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
      get().addToast('已取消指派')
      return
    }
  }
  // ... existing code
},
```

Need to import `parseAssigneeIds` and `joinAssigneeIds` in store:
```ts
import { parseAssigneeIds, joinAssigneeIds } from '@/constants'
```

- [ ] **Step 4: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/store/index.ts
git commit -m "feat: route team-assigned task modifications through WebSocket"
```

---

### Task 11: Server handles task_assignee_status for per-assignee completion

**Files:**
- Modify: `electron/team-server.ts`

- [ ] **Step 1: Update task:update to handle assignee_status**

In `electron/team-server.ts` `handleTaskMessage` for `task:update`, after updating the task, check if `assignee_status` was sent:

```ts
// After the existing task update in task:update handler:
if (data.assignee_status) {
  const statuses = data.assignee_status as Record<string, number>  // { memberId: completed }
  for (const [assigneeId, completed] of Object.entries(statuses)) {
    this.db.run(
      `INSERT INTO task_assignee_status (id, task_id, assignee_id, completed, completed_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET completed = ?, completed_at = datetime('now')`,
      [crypto.randomUUID(), data.id, assigneeId, completed, completed]
    )
  }
  // Check if ALL assignees completed
  const assignedTo = (data.assigned_to as string) || (this.queryOne('SELECT assigned_to FROM tasks WHERE id = ?', [data.id])?.assigned_to as string) || ''
  const assigneeIds = assignedTo.split(',').map((s: string) => s.trim()).filter(Boolean)
  if (assigneeIds.length > 0) {
    const statusRows = this.queryAll(
      'SELECT assignee_id, completed FROM task_assignee_status WHERE task_id = ? AND assignee_id IN (' + assigneeIds.map(() => '?').join(',') + ')',
      [data.id, ...assigneeIds]
    )
    const allCompleted = assigneeIds.every((aid: string) =>
      statusRows.some((r: Record<string, unknown>) => r.assignee_id === aid && r.completed === 1)
    )
    if (allCompleted) {
      this.db.run('UPDATE tasks SET completed = 1, updated_at = ? WHERE id = ?', [now, data.id])
      // Broadcast task completion
      this.broadcastToAll({ type: 'task:updated', payload: { id: data.id, completed: 1, by: 'system' }, senderId: '' })
      this.onEvent('task:updated', { id: data.id, completed: 1, by: 'system' })
    }
  }
}
```

- [ ] **Step 2: Send task_assignee_status in sync:full**

In `sendSyncFull`, include `assignee_statuses`:

```ts
const assigneeStatuses = this.queryAll('SELECT * FROM task_assignee_status')
const msg = JSON.stringify({ type: 'sync:full', payload: { members, lists, tasks, onlineIds, assigneeStatuses }, senderId: '' })
ws.send(msg)
```

- [ ] **Step 3: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add electron/team-server.ts
git commit -m "feat: per-assignee completion status in team server"
```

---

## Phase 4: Data Import + Reconnect Verification (A6 + D)

### Task 12: Data restore and JSON import (A6)

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/components/Settings.tsx`
- Modify: `src/db/index.ts`

- [ ] **Step 1: Add db:restore IPC handler in main.ts**

In `electron/main.ts` `setupIPC()`:

```ts
ipcMain.handle('db:restore', async () => {
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择备份文件',
    filters: [{ name: 'Database', extensions: ['db'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return false
  const srcPath = result.filePaths[0]
  try {
    // Close current DB
    if (db) { db.close(); db = null }
    // Copy backup over current DB
    fs.copyFileSync(srcPath, DB_PATH)
    // Re-open
    loadDatabase()
    // Notify renderer to reload data
    mainWindow?.webContents.send('team:event', { type: 'data:reloaded', payload: {} })
    return true
  } catch (e: any) {
    console.error('[DB Restore] Failed:', e.message)
    return false
  }
})
```

- [ ] **Step 2: Add db:import-json IPC handler in main.ts**

```ts
ipcMain.handle('db:import-json', async () => {
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择 JSON 导出文件',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return false
  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf-8')
    const data = JSON.parse(content)
    if (!data.tasks || !Array.isArray(data.tasks)) throw new Error('Invalid JSON format')
    const now = new Date().toISOString()
    for (const task of data.tasks) {
      // Check if task already exists
      const existing = queryAll('SELECT id FROM tasks WHERE id = ?', [task.id])
      if (existing.length > 0) continue
      db!.run(
        `INSERT INTO tasks (id, title, completed, priority, due_date, list_id, notes, pinned, sort_order, scope, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'personal', ?, ?)`,
        [task.id, task.title, task.completed || 0, task.priority || 'medium', task.due_date || null, task.list_id || 'default', task.notes || '', task.pinned || 0, task.sort_order || 0, task.created_at || now, now]
      )
    }
    if (data.lists && Array.isArray(data.lists)) {
      for (const list of data.lists) {
        const existing = queryAll('SELECT id FROM lists WHERE id = ?', [list.id])
        if (existing.length > 0) continue
        db!.run(
          'INSERT INTO lists (id, name, color, sort_order) VALUES (?, ?, ?, ?)',
          [list.id, list.name, list.color || '#6366f1', list.sort_order || 0]
        )
      }
    }
    saveDatabase()
    mainWindow?.webContents.send('team:event', { type: 'data:reloaded', payload: {} })
    return { taskCount: data.tasks.length, listCount: data.lists?.length || 0 }
  } catch (e: any) {
    console.error('[DB Import] Failed:', e.message)
    return false
  }
})
```

- [ ] **Step 3: Expose IPC in preload.ts**

In `electron/preload.ts`:

```ts
dbRestore: () => ipcRenderer.invoke('db:restore'),
dbImportJSON: () => ipcRenderer.invoke('db:import-json'),
```

- [ ] **Step 4: Add buttons in Settings.tsx**

Add buttons in the backup section of Settings, alongside existing backup/export:

```tsx
<button onClick={async () => {
  const ok = await (window as any).electronAPI?.dbRestore()
  if (ok) { useStore.getState().loadData(); useStore.getState().addToast('备份恢复成功') }
  else { useStore.getState().addToast('恢复失败') }
}}>
  恢复备份 (.db)
</button>
<button onClick={async () => {
  const result = await (window as any).electronAPI?.dbImportJSON()
  if (result) { useStore.getState().loadData(); useStore.getState().addToast(`导入完成：${result.taskCount} 个任务`) }
  else { useStore.getState().addToast('导入失败') }
}}>
  导入数据 (.json)
</button>
```

- [ ] **Step 5: Handle data:reloaded event in App.tsx**

In `src/App.tsx` `useEffect` for team events, add:

```ts
case 'data:reloaded': {
  useStore.getState().loadData()
  break
}
```

- [ ] **Step 6: Verify with type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add electron/main.ts electron/preload.ts src/components/Settings.tsx src/App.tsx
git commit -m "feat: add data restore (.db) and JSON import functionality"
```

---

### Task 13: Reconnect verification and zombie connection fix (D)

**Files:**
- Modify: `electron/team-client.ts`

- [ ] **Step 1: Add connection timeout to force-clean zombie WebSocket**

In `electron/team-client.ts` `connect()`, add a connection timeout:

```ts
// Add connection timeout field
private connectTimeout: ReturnType<typeof setTimeout> | null = null

connect(): void {
  if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return
  this._intentionalClose = false
  this._status = 'connecting'
  this.onEvent('status', 'connecting')

  try {
    this.ws = new WebSocket(`ws://${this.url}`)

    // Connection timeout: if not connected in 10s, force close and retry
    this.connectTimeout = setTimeout(() => {
      if (this._status === 'connecting' && this.ws) {
        console.log('[TeamClient] Connection timeout, force closing')
        try { this.ws.terminate() } catch {}
        this.ws = null
        this.scheduleReconnect()
      }
    }, 10000)

    this.ws.on('open', () => {
      if (this.connectTimeout) { clearTimeout(this.connectTimeout); this.connectTimeout = null }
      // ... existing open handler
    })
    // ... rest
  }
}

// In cleanup():
private cleanup(): void {
  if (this.connectTimeout) {
    clearTimeout(this.connectTimeout)
    this.connectTimeout = null
  }
  // ... existing cleanup
}
```

- [ ] **Step 2: Verify reconnect behavior manually**

Manual test checklist:
1. Start server + 2 clients
2. Kill server, observe clients show "disconnected"
3. Restart server, observe clients reconnect within 30s
4. Verify no "zombie" connections after repeated disconnect/reconnect

- [ ] **Step 3: Commit**

```bash
git add electron/team-client.ts
git commit -m "fix: add connection timeout to prevent zombie WebSocket state"
```

---

## Final Verification

After all 13 tasks complete:

- [ ] **Run full test suite**

```bash
npm test
```
Expected: All 110+ tests pass

- [ ] **Type check**

```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Manual smoke test**
1. Create overdue task, pin it → verify it stays on top of overdue section
2. Start server + 2 clients, disconnect all, verify count goes to 1, reconnect one, verify count goes to 2
3. Complete a task in today view → verify strikethrough, verify it disappears tomorrow
4. Assign task to another client → verify toast + taskbar flash
5. Create duplicate category → verify rejection toast
6. Start server → verify GitHub update check (requires configured repo)
7. Client with lower version connects → verify update:available toast
8. Assign task to Bob → verify Bob's personal space shows it → Bob completes → verify team sync
9. Restore from backup → verify data loads correctly
10. Kill/restart server → verify client reconnects
