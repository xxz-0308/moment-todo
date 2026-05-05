# LAN Team Todo — Design Spec

> Local-area network multi-user extension for Moment, the Electron todo app.

## Overview

Add a **team workspace layer** on top of the existing personal todo app. Team data syncs over LAN via WebSocket; personal data stays entirely local. The two spaces are independent — no cross-contamination.

## Architecture

```
Server machine                         Client machines
┌──────────────────────┐               ┌──────────────────────┐
│ Electron App         │               │ Electron App         │
│                      │               │                      │
│  ┌────────────────┐  │  WebSocket    │  ┌────────────────┐  │
│  │ WS Server      │◄─┼───tcp:5174───┼─►│ WS Client      │  │
│  │ (ws package)   │  │  mDNS         │  │                │  │
│  └───────┬────────┘  │  auto-discover│  └───────┬────────┘  │
│          │           │               │          │           │
│  ┌───────┴────────┐  │               │  ┌───────┴────────┐  │
│  │ sql.js (local)  │  │               │  │ sql.js (local)  │  │
│  │ personal + team │  │               │  │ personal only   │  │
│  └────────────────┘  │               │  └────────────────┘  │
└──────────────────────┘               └──────────────────────┘
```

**Key principle:** Personal space is always local sql.js — zero network dependency. Team space exists only on the server's sql.js; clients hold team data in memory only.

## Data Model

### New: `team_members` table (server-side only)

```sql
CREATE TABLE team_members (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#6366f1',
  is_server    INTEGER DEFAULT 0,
  last_seen    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `lists` table — add scope column

```sql
ALTER TABLE lists ADD COLUMN scope TEXT NOT NULL DEFAULT 'personal'; -- 'personal' | 'team'
ALTER TABLE lists ADD COLUMN created_by TEXT; -- team_members.id for team lists; null for personal
```

### `tasks` table — add scope, created_by, assigned_to

```sql
ALTER TABLE tasks ADD COLUMN scope TEXT NOT NULL DEFAULT 'personal'; -- 'personal' | 'team'
ALTER TABLE tasks ADD COLUMN created_by TEXT; -- team_members.id
ALTER TABLE tasks ADD COLUMN assigned_to TEXT; -- team_members.id
```

### Local config file

Simple JSON at `app.getPath('userData')/team-config.json`:

```json
{
  "member": { "id": "uuid", "name": "张三", "color": "#6366f1" },
  "role": "server" | "client",
  "serverAddress": "",   -- cached IP from last successful discovery
  "serverPort": 5174
}
```

## Data Flow

### Personal space (unchanged)
React → Zustand store → db/index.ts → IPC → main.ts → local sql.js

### Team space
React → Zustand store → WebSocket → server main.ts → server sql.js → broadcast to all clients

Visibility:
| Scope | Visibility | Storage |
|-------|-----------|---------|
| Personal task | Only the creator | Creator's local sql.js |
| Team task | All connected members | Server's sql.js |
| Personal list | Only the creator | Creator's local sql.js |
| Team list | All connected members | Server's sql.js |

## Sync Protocol

### Connection lifecycle

```
Client connects
  → Server sends sync:full (all team members, lists, tasks)
  → Client renders full team workspace
  → Server broadcasts user:joined to other clients
  → Client's ongoing operations are real-time via individual messages

Client disconnects (server crash / network issue)
  → Client enters "team offline" (read-only) state
  → Cached team data remains visible in the UI
  → All team mutation operations (create/edit/delete on tasks and lists) are disabled or show "需要连接服务端" toast
  → Personal space remains fully functional regardless
  → Client auto-reconnects with exponential backoff (1s → 2s → 4s → ... → 30s max)
  → On reconnect: client receives sync:full again, replaces cache, re-enables mutations
```

### Message types

**Client → Server:**
```
task:create     { scope: 'team', title, priority, dueDate, listId, assignedTo? }
task:update     { id, ...fields }
task:delete     { id }
task:reorder    { items: [{ id, sort_order, list_id }] }
list:create     { name, color }
list:update     { id, ...fields }
list:delete     { id }
member:heartbeat  {} — sent every 30s to update last_seen
```

**Server → Client (broadcast):**
```
task:created    { task: Task, by: memberId }
task:updated    { id, ...fields, by: memberId }
task:deleted    { id, by: memberId }
list:created    { list: List, by: memberId }
list:updated    { id, ...fields, by: memberId }
list:deleted    { id, by: memberId }
member:joined   { member: Member }
member:left     { memberId }
```

**Server → Client (direct):**
```
sync:full       { members: [], lists: [], tasks: [] }
sync:ack        { id: messageId, success: true }
sync:error      { id: messageId, error: string }
```

### Conflict resolution

Server-authoritative. Last write wins. No merge logic in v1.

## UI Changes

### Sidebar — space toggle + connection status

- Two tabs at top: `[个人]` `[团队]`
  - Personal: shows personal lists, personal tasks (current behavior)
  - Team: shows team lists, team tasks (networked)
- Bottom status line (team mode): `● 已连接 (4/10)` or `○ 离线`
- Status dot colors: green (connected), yellow (reconnecting), red (offline)

### TaskList — task card (team mode)

- Same glass card design as personal
- Additional badge for `assigned_to` (shows member name/color dot)
- Subtle "by 张三" on hover for team tasks

### DetailPanel — assignee selector (team mode)

- New "负责人" dropdown below priority
- Shows all team members with color dots
- Only available when editing team tasks

### Settings — new "网络" tab

```
┌─ 设置 ───────────────────────┐
│  外观  |  网络  |  关于        │
├──────────────────────────────┤
│  我的昵称： [ 输入名字 ]      │
│  我的颜色： [ color picker ]  │
│                              │
│  运行模式：                   │
│  ◎ 服务端（本机作为团队服务器） │
│  ○ 客户端                     │
│                              │
│  服务端地址：                  │
│  [192.168.1.100:5174] 连接   │
│  ↑ 自动发现失败时手动输入       │
└──────────────────────────────┘
```

### Connection indicator

- TitleBar right side or Sidebar bottom
- States: `正在连接...` → `已连接` → `已离线，自动重连中...` → `离线`

### EmptyState

- Team mode: "当前没有团队待办，点击 + 添加第一个团队事务"
- Offline: "团队服务已断开，正在自动重连..."

## Discovery

### Primary: mDNS (multicast DNS)

- Server publishes `_moment-todo._ws._tcp.local.` on startup
- Clients query for it on startup
- Use `multicast-dns` npm package (lightweight, no Bonjour dependency)
- 5-second timeout: if no response, fall back to cached IP or manual

### Fallback: Manual IP

- User enters `192.168.x.x:5174` in Settings → 网络
- Stored in team-config.json, used on next startup
- Auto-discovered IPs also cached for quick reconnect

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Client starts, server off | mDNS timeout → cache miss → show offline → retry background |
| Server goes down mid-session | WebSocket close → enter offline → auto-reconnect |
| Server restarts | All clients reconnect → get `sync:full` → fresh state |
| Client operation times out | 5s timeout → retry 3x → show toast "操作失败，请重试" |
| Network cable unplugged | Same as server down |
| Duplicate member name | Names are not unique — use member ID internally |

## Operating Modes

### Mode 1: Single-user (default)
- No team config needed
- No WebSocket server/client started
- App works exactly as v1.0.2 — zero changes

### Mode 2: Server
- Settings → 网络 → 输入昵称 → 选择"服务端" → 保存
- Starts WS server on port 5174
- Personal: local sql.js. Team: local sql.js + WS broadcast.

### Mode 3: Client
- Settings → 网络 → 输入昵称 → 选择"客户端" → 自动发现 / 手动填 IP → 保存
- Personal: local sql.js (always). Team: memory cache via WS.

Can switch between modes at any time. No data loss.

## Dependencies Added

- `ws` — WebSocket server + client for Electron main process
- `multicast-dns` — mDNS service discovery

## Out of Scope (v1)

- Permissions / ACLs (who can delete whose team task)
- File attachments on team tasks
- Team activity log
- Cross-LAN / Internet sync
- End-to-end encryption
- Rich presence (typing indicators, etc.)
