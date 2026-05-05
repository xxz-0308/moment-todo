# Team Mode UX Optimization — Design Spec

> Polish, interaction improvements, and small features for the LAN team todo feature.

## Overview

8 improvements across connection UX, visual feedback, sound control, and team-awareness features.

---

## 1. Remove mDNS — Manual IP + Remember

**Current:** mDNS auto-discovery (`multicast-dns`), which is unreliable and ambiguous with multiple servers.

**New:** Client must manually enter `IP:port` on first connect. The address is saved to `team-config.json`. All subsequent reconnects (restart, disconnect) use only this saved address.

**Changes:**
- Remove `electron/team-discovery.ts` entirely (no longer needed)
- Remove `multicast-dns` from dependencies
- Client Settings: remove placeholder about auto-discovery, add hint "输入服务端 IP 地址和端口"
- `connectClient()` in main.ts: always use `config.serverAddress:config.serverPort`, never try discovery
- Auto-reconnect still uses the same saved address

**Multi-server:** No conflict possible — each client connects to exactly one configured server.

---

## 2. Planet/Member View

Click "已连接 N 人" in Sidebar → full-screen Canvas overlay showing a solar system:

- **Center:** Server as a glowing star (pulsing ring, server member name + IP)
- **Orbiting:** Connected clients as colored planets (member color, name label)
- **Distant:** Offline members as dim, semi-transparent dots on outer edge
- **Interaction:** Click a planet → tooltip with member name + status. Click background → close.
- **Animation:** Planets orbit at different speeds. Server pulses gently.

**Tech:** HTML Canvas 2D, `requestAnimationFrame` loop, no external libraries. Component: `src/components/TeamPlanet.tsx`.

**Design:** Dark space background (matches app's dark theme), subtle glass overlay for the modal, member colors from team config.

---

## 3. Task Assignment Notification

When a team task's `assigned_to` changes, the assignee receives a desktop notification.

**Flow:**
1. Server receives `task:update` with `assigned_to` changed
2. Server looks up the member ID in connected WebSocket clients
3. Server sends `notify:assigned` to that specific client via WebSocket
4. Client receives → Electron `Notification` API → Windows system notification: "张三给你分配了任务：修复登录 bug"

**Details:**
- Notification only if `assigned_to` actually changed (not on create with existing assignee, not on other field updates)
- Uses existing Electron `Notification` API (already wired in preload)

---

## 4. Volume Control

Add volume slider to Settings → 外观.

**Implementation:**
- Store volume (0-100) in `localStorage` key `moment-sound-volume`
- `playTone()` reads volume, multiplies oscillator gain
- Slider in Appearance section, below theme toggle
- Icon: speaker with volume waves, shows muted state at 0

---

## 5. Team Mode Views (Today / Upcoming)

Team mode now properly filters "今天" and "计划日程" views using team data.

**Current:** TaskList's `getFilteredTasks` uses `activeTasks` which already comes from team-store. But the view logic for "today" filters by `due_date === today`, which works for both personal and team tasks. The issue is that "today" view in team mode shows the team's perspective — all team tasks due today.

**Fix:** The filtering logic already works. The fix is ensuring `currentView` properly maps to team data. The `setCurrentView` action in the store already switches views. No data model changes needed — just verify the view filtering works end-to-end for team tasks.

**Acceptance criteria:**
- Team mode → 今天: shows all team tasks due today
- Team mode → 计划日程: shows all team tasks due > today
- Team mode → 已完成: shows completed team tasks (already works)

---

## 6. Task Completion Animation + Toggle

When a team member completes a task, other members see a brief green pulse on that task row.

**Implementation:**
- In team-store's `task:updated` handler, when `completed` changes from 0 to 1, add the task ID to a `recentlyCompleted: Set<string>`
- TaskItem checks if its task ID is in `recentlyCompleted`
- If yes, render a CSS keyframe animation: `backgroundColor` green pulse (transparent → `rgba(16,185,129,0.08)` → transparent, 1s)
- After 1.5s, remove from set

**Toggle:** Settings → 外观 → switch "团队任务完成提醒". Stored in `localStorage` as `moment-team-completion-notify`. Default `true`.

---

## 7. Server Quit Warning

When server closes window (or quits), show confirmation if clients are connected.

**Flow:**
- Window `close` event handler in main.ts checks `teamServer && teamServer.memberCount > 0`
- If true, send IPC to renderer to show confirm dialog
- Dialog: "服务端将关闭，当前 N 个客户端将断开连接。确定退出吗？"
- User confirms → proceed with close/save/backup
- User cancels → stay open

**Already handled for window close** (which minimizes to tray). Add explicit check for app quit (`before-quit` event).

---

## 8. Reconnect Summary Toast

When a client reconnects, compare cached data with fresh `sync:full` and show a summary.

**Implementation:**
- Client's team-store saves a snapshot of `tasks` before disconnect
- On `sync:full` after reconnect, diff against snapshot:
  - New tasks (IDs not in snapshot): count
  - Newly completed (completed=1 now, was 0 in snapshot): count
- Show toast: "同步完成：新增 X 个任务，完成 X 个任务"
- Clear snapshot after diff

If no snapshot exists (first connect), skip summary.

---

## Out of Scope

## 9. Fix Search Scope Isolation

**Bug:** Ctrl+K search in team mode finds personal tasks. Clicking a personal search result in team mode opens it for editing as if it were a team task — data leaks between scopes.

**Fix:**
- `search()` in the store checks `scope`. In team mode, searches `useTeamStore.tasks` in-memory instead of calling `db.searchTasks()`.
- `searchResults` are filtered to only show tasks from the current scope.
- `selectTask()` in team mode uses `useTeamStore.tasks` for the lookup (already fixed in a prior commit — verify).

**Acceptance criteria:**
- Team mode → Ctrl+K → only team tasks appear
- Personal mode → Ctrl+K → only personal tasks appear
- Selecting a result in team mode opens it in team context (DetailPanel uses team data)

---

## Out of Scope

- Real-time typing indicators
- Voice/video chat integration
- File sharing on team tasks
- Mobile (Android/iOS) client
- Cross-internet sync
