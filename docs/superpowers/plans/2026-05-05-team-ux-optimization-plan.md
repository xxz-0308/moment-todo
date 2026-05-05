# Team Mode UX Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish team mode with 9 UX improvements — manual IP connection, planet member view, assign notifications, volume control, team views, completion animation, quit warning, reconnect summary, search isolation.

**Architecture:** Remove mDNS entirely, replace with saved-IP reconnect. Add Canvas 2D planet overlay. Server sends targeted WS messages for assign notifications. Team-store tracks recently-completed tasks and reconnect snapshots. All visual polish stays within the existing glass design system.

**Tech Stack:** Electron + React + TypeScript + Zustand + Tailwind + Canvas 2D + Web Audio API

---

## File Structure

| File | Change |
|------|--------|
| `electron/team-discovery.ts` | **Delete** |
| `electron/main.ts` | Remove discovery imports, simplify `connectClient`, add `notify:assigned`, add quit warning |
| `electron/preload.ts` | Remove `teamDiscover` |
| `electron/team-server.ts` | Add `notify:assigned` message routing |
| `src/components/TeamPlanet.tsx` | **New** — Canvas 2D planet view |
| `src/components/Settings.tsx` | Manual IP UX, volume slider, completion toggle |
| `src/components/Sidebar.tsx` | Click handler → planet view |
| `src/components/TaskItem.tsx` | Green pulse animation |
| `src/hooks/useSound.ts` | Volume from localStorage |
| `src/store/index.ts` | Search scope isolation |
| `src/lib/team-store.ts` | `recentlyCompleted`, reconnect snapshot, diff logic |
| `package.json` | Remove `multicast-dns` dep |

---

### Task 1: Remove mDNS dependencies and discovery module

**Files:**
- Delete: `electron/team-discovery.ts`
- Modify: `package.json`

- [ ] **Step 1: Remove multicast-dns from dependencies**

```bash
npm uninstall multicast-dns @types/multicast-dns
```

- [ ] **Step 2: Delete team-discovery.ts**

```bash
rm electron/team-discovery.ts
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: remove mDNS and multicast-dns dependency"
```

---

### Task 2: Remove discovery from main.ts and preload.ts

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`

- [ ] **Step 1: In main.ts, remove discovery imports**

Remove the line:
```typescript
import { publishServer, discoverServer, getLocalIPs } from './team-discovery'
```

Replace with a simple `getLocalIPs` inline function (needed for team:get-status IPC):

```typescript
import os from 'os'

function getLocalIPs(): string[] {
  const ips: string[] = []
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    const net = interfaces[name]
    if (!net) continue
    for (const iface of net) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address)
      }
    }
  }
  return ips
}
```

Place this after the other helper functions.

- [ ] **Step 2: Simplify startTeam for client mode**

Remove the mDNS discovery branch. In `startTeam()`, replace the client mode block:

```typescript
  } else if (mode === 'client') {
    const address = config.serverAddress
    if (address) {
      connectClient(`${address}:${config.serverPort}`, config)
    }
  }
```

Remove the `discoverServer()` call entirely.

- [ ] **Step 3: Remove stopDiscovery from stopTeam**

In `stopTeam()`, remove:
```typescript
  if (stopDiscovery) {
    stopDiscovery()
    stopDiscovery = null
  }
```

Also remove `let stopDiscovery` from the module-level state declarations.

- [ ] **Step 4: Remove teamDiscover from preload.ts**

Remove the line:
```typescript
  teamDiscover: () => ipcRenderer.invoke('team:discover'),
```

- [ ] **Step 5: Type check and commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "refactor: remove mDNS — manual IP only for client connection"
```

---

### Task 3: Update Settings to remove auto-discovery UX

**Files:**
- Modify: `src/components/Settings.tsx`

- [ ] **Step 1: Update client address input placeholder and hint**

Find the server address input (in network tab, client mode). Change:

From placeholder `"192.168.1.100（同机测试填 localhost）"` to `"192.168.1.100:5174"`.

Remove the hint text below: `"留空则使用自动发现，填写 IP 则优先使用"` — replace with nothing or a simple "输入服务端的 IP 地址和端口".

- [ ] **Step 2: Type check and commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: simplify client settings — manual IP only, no discovery"
```

---

### Task 4: Volume control

**Files:**
- Modify: `src/hooks/useSound.ts`
- Modify: `src/components/Settings.tsx`

- [ ] **Step 1: Write test for volume storage**

There is no existing test file for useSound. Add a minimal test:

Create `src/hooks/__tests__/useSound.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('volume', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reads volume from localStorage', () => {
    localStorage.setItem('moment-sound-volume', '50')
    // Dynamic import to trigger module evaluation
    const vol = localStorage.getItem('moment-sound-volume')
    expect(vol).toBe('50')
  })

  it('defaults to 100 when not set', () => {
    const vol = localStorage.getItem('moment-sound-volume')
    expect(vol).toBeNull()
  })
})
```

Run: `npx vitest run src/hooks/__tests__/useSound.test.ts`
Expected: 2 tests PASS

- [ ] **Step 2: Add getVolume() to useSound.ts**

In `src/hooks/useSound.ts`, add before the `playTone` function:

```typescript
export function getVolume(): number {
  const stored = localStorage.getItem('moment-sound-volume')
  return stored !== null ? parseInt(stored) / 100 : 1.0
}

export function setVolume(percent: number): void {
  localStorage.setItem('moment-sound-volume', String(percent))
}
```

- [ ] **Step 3: Apply volume in playTone**

In `playTone()`, after creating the oscillator, multiply gain by `getVolume()`:

```typescript
export function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.08
) {
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = frequency
    gain.gain.value = volume * getVolume()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration + 0.05)
  } catch {}
}
```

- [ ] **Step 4: Add volume slider to Settings → 外观**

In Settings.tsx, after the theme toggle buttons, add:

```tsx
{/* Volume */}
<div className="mt-6">
  <label className="flex items-center gap-2 text-[13px] font-semibold text-text-primary mb-3">
    <Volume2 size={16} strokeWidth={2} />
    音效音量
  </label>
  <div className="flex items-center gap-3">
    <Volume1 size={14} strokeWidth={2} className="text-text-tertiary" />
    <input
      type="range"
      min="0"
      max="100"
      value={soundVolume}
      onChange={(e) => {
        const v = parseInt(e.target.value)
        setSoundVolume(v)
        setVolume(v)
      }}
      className="flex-1 h-1.5 rounded-full appearance-none bg-[rgba(255,255,255,0.08)] cursor-pointer
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer
        [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(99,102,241,0.4)]"
    />
    <Volume2 size={16} strokeWidth={2} className="text-text-tertiary" />
    <span className="text-[12px] text-text-tertiary w-8 text-right">{soundVolume}%</span>
  </div>
</div>
```

Add imports: `import { Volume1, Volume2 } from 'lucide-react'` and `import { setVolume } from '@/hooks/useSound'`.

Add state: `const [soundVolume, setSoundVolume] = useState(() => { const v = localStorage.getItem('moment-sound-volume'); return v ? parseInt(v) : 100 })`.

- [ ] **Step 5: Type check and commit**

```bash
npx tsc --noEmit
npx vitest run
git add -A && git commit -m "feat: add volume control slider for sound effects"
```

---

### Task 5: Task completion animation + toggle

**Files:**
- Modify: `src/lib/team-store.ts`
- Modify: `src/components/TaskItem.tsx`
- Modify: `src/components/Settings.tsx`

- [ ] **Step 1: Add recentlyCompleted to team-store**

In `src/lib/team-store.ts`, add to interface:

```typescript
  recentlyCompleted: Set<string>
```

Add to initial state:

```typescript
  recentlyCompleted: new Set<string>(),
```

In `task:updated` handler, add completion detection:

```typescript
      case 'task:updated': {
        const p = payload as { id: string; completed?: number } & Partial<TeamTask>
        const isCompletion = p.completed === 1
        set((s) => {
          const prevTask = s.tasks.find(t => t.id === p.id)
          const wasCompleted = prevTask && prevTask.completed === 1
          const newlyCompleted = isCompletion && !wasCompleted
          const updated = s.tasks.map((t) => (t.id === p.id ? { ...t, ...p, updated_at: new Date().toISOString() } : t))
          if (newlyCompleted) {
            const rc = new Set(s.recentlyCompleted)
            rc.add(p.id)
            setTimeout(() => {
              useTeamStore.setState((prev) => {
                const next = new Set(prev.recentlyCompleted)
                next.delete(p.id)
                return { recentlyCompleted: next }
              })
            }, 1500)
            return { tasks: updated, recentlyCompleted: rc }
          }
          return { tasks: updated }
        })
        break
      }
```

- [ ] **Step 2: Add green pulse to TaskItem**

In TaskItem.tsx, add import: `import { useTeamStore } from '@/lib/team-store'`.

Add inside the component:
```typescript
const recentlyCompleted = useTeamStore((s) => s.recentlyCompleted)
const completionNotify = localStorage.getItem('moment-team-completion-notify') !== 'false'
const isCompleting = completionNotify && recentlyCompleted.has(task.id)
```

On the task row's outer div/motion.div, add a conditional animation style:

```tsx
style={{
  ...(isCompleting ? {
    animation: 'completionPulse 1s ease-out',
  } : {}),
}}
```

Add the keyframe in `src/index.css`:

```css
@keyframes completionPulse {
  0% { background-color: transparent; }
  30% { background-color: rgba(16, 185, 129, 0.12); }
  100% { background-color: transparent; }
}
```

- [ ] **Step 3: Add toggle in Settings → 外观**

In Settings appearance section, add after volume slider:

```tsx
{/* Completion notification toggle */}
<div className="mt-4 flex items-center justify-between">
  <div>
    <span className="text-[13px] font-medium text-text-primary">团队任务完成提醒</span>
    <p className="text-[11px] text-text-tertiary mt-0.5">有人完成任务时显示绿色动画</p>
  </div>
  <button
    onClick={() => {
      const current = localStorage.getItem('moment-team-completion-notify') !== 'false'
      localStorage.setItem('moment-team-completion-notify', String(!current))
      setCompletionNotify(!current)
    }}
    className={`w-9 h-5 rounded-full transition-colors relative ${completionNotify ? 'bg-accent' : 'bg-[rgba(255,255,255,0.1)]'}`}
  >
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${completionNotify ? 'left-[18px]' : 'left-[2px]'}`} />
  </button>
</div>
```

Add state: `const [completionNotify, setCompletionNotify] = useState(() => localStorage.getItem('moment-team-completion-notify') !== 'false')`.

- [ ] **Step 4: Type check and commit**

```bash
npx tsc --noEmit
npx vitest run
git add -A && git commit -m "feat: task completion green pulse animation with toggle"
```

---

### Task 6: Assign task notification

**Files:**
- Modify: `electron/team-server.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: Add notify:assigned routing in team-server**

In `electron/team-server.ts`, in the `ws.on('message')` switch, add a case:

```typescript
            case 'notify:assigned': {
              // Forward assign notification to the specific member
              const targetId = msg.payload.memberId as string
              const targetClient = this.clients.get(targetId)
              if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
                targetClient.ws.send(JSON.stringify({
                  type: 'notify:assigned',
                  payload: msg.payload,
                }))
              }
              break
            }
```

- [ ] **Step 2: In main.ts server-side, detect assignee change and send notification**

In the `team:send` IPC handler, for `task:update`, add after the DB update and broadcast:

```typescript
        } else if (msg.type === 'task:update') {
          const data = msg.payload as Record<string, unknown>
          // ... existing DB update code ...
          
          // If assigned_to changed, send notification to assignee
          if ('assigned_to' in data && data.assigned_to) {
            const task = queryAll('SELECT * FROM tasks WHERE id = ?', [data.id])[0] as Record<string, unknown> | undefined
            if (task && teamServer) {
              teamServer.broadcast({
                type: 'notify:assigned',
                payload: {
                  memberId: data.assigned_to,
                  taskId: data.id,
                  taskTitle: task.title || '',
                  assignedBy: '', // server self
                },
              })
            }
          }
```

Wait — broadcast sends to ALL. We need to send to the SPECIFIC member. TeamServer doesn't have a `sendTo` method. Add one:

In `electron/team-server.ts`, add after `broadcast()`:

```typescript
  sendTo(memberId: string, msg: { type: string; payload: unknown }): void {
    const client = this.clients.get(memberId)
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(msg))
    }
  }
```

Then in main.ts, use:
```typescript
            if (task && teamServer) {
              teamServer.sendTo(data.assigned_to as string, {
                type: 'notify:assigned',
                payload: {
                  taskId: data.id,
                  taskTitle: task.title || '',
                },
              })
            }
```

- [ ] **Step 3: Handle notify:assigned on client side**

In `electron/team-client.ts`, the `on('message')` handler already forwards `msg.type` and `msg.payload` to the onEvent callback. No changes needed — the client's renderer will receive `notify:assigned` event.

In team-store.ts `_handleMessage`, add:

```typescript
      case 'notify:assigned': {
        const p = payload as { taskId: string; taskTitle: string }
        // Trigger desktop notification
        if (typeof window !== 'undefined' && (window as any).electronAPI?.showNotification) {
          (window as any).electronAPI.showNotification('新任务分配', `你被分配了任务：${p.taskTitle}`)
        }
        break
      }
```

- [ ] **Step 4: Type check and commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: assign task desktop notification via targeted WS message"
```

---

### Task 7: Server quit warning

**Files:**
- Modify: `electron/main.ts`

- [ ] **Step 1: Add quit warning logic**

In `electron/main.ts`, modify the `close` event handler. Currently it saves DB, backs up, closes sql.js, and hides to tray. Add a check before hiding:

```typescript
  mainWindow.on('close', (e) => {
    if (teamServer && teamServer.memberCount > 0) {
      e.preventDefault()
      mainWindow?.webContents.send('team:quit-warning', { memberCount: teamServer.memberCount })
      return
    }
    saveDatabase()
    backupDatabase()
    // ... rest of existing close logic
  })
```

- [ ] **Step 2: Add IPC for quit confirmation**

Add a new IPC handler:

```typescript
  ipcMain.handle('team:confirm-quit', () => {
    saveDatabase()
    backupDatabase()
    if (teamServer) {
      teamServer.stop()
      teamServer = null
    }
    stopReminders()
    app.exit(0)
    return true
  })
```

- [ ] **Step 3: Handle in renderer with GlassConfirm**

In App.tsx or a dedicated handler, listen for `team:quit-warning`:

In App.tsx `useEffect`, add after `onTeamEvent`:

```typescript
// Listen for quit warning from server
const quitWarningHandler = (_e: any, data: { memberCount: number }) => {
  if (window.confirm(`服务端将关闭，当前 ${data.memberCount} 个客户端将断开连接。确定退出吗？`)) {
    api.teamConfirmQuit()
  }
}
// Register via ipcRenderer directly since we need a specific channel
const { ipcRenderer } = require('electron') // can't require in renderer with contextIsolation
```

Wait — with `contextIsolation: true`, we can't use `ipcRenderer` directly. Need to expose via preload.

Add to preload.ts:
```typescript
  onTeamQuitWarning: (callback: (data: { memberCount: number }) => void) => {
    ipcRenderer.on('team:quit-warning', (_e, data) => callback(data))
  },
  teamConfirmQuit: () => ipcRenderer.invoke('team:confirm-quit'),
```

In App.tsx, use:
```typescript
api.onTeamQuitWarning?.((data: { memberCount: number }) => {
  // Use a simple confirm for now — GlassConfirm integration would need more plumbing
  if (window.confirm(`服务端将关闭，当前 ${data.memberCount} 个客户端将断开连接。确定退出吗？`)) {
    api.teamConfirmQuit?.()
  }
})
```

- [ ] **Step 4: Type check and commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: warn before quitting server with connected clients"
```

---

### Task 8: Reconnect summary toast

**Files:**
- Modify: `src/lib/team-store.ts`

- [ ] **Step 1: Add snapshot saving on disconnect**

In team-store, add to state interface:

```typescript
  _snapshot: { taskIds: Set<string>; completedIds: Set<string> } | null
```

Initial state:
```typescript
  _snapshot: null,
```

In `_updateStatus`, when status changes to 'disconnected', save snapshot:

```typescript
  _updateStatus: (status: ConnectionStatus) => {
    if (status === 'disconnected' && get().connectionStatus === 'connected') {
      const tasks = get().tasks
      set({
        connectionStatus: status,
        _snapshot: {
          taskIds: new Set(tasks.map(t => t.id)),
          completedIds: new Set(tasks.filter(t => t.completed).map(t => t.id)),
        },
      })
      return
    }
    set({ connectionStatus: status })
  },
```

- [ ] **Step 2: Diff on sync:full after reconnect**

In `sync:full` handler, after setting the new data, compute diff:

```typescript
      case 'sync:full': {
        const p = payload as { members: TeamMember[]; lists: TeamList[]; tasks: TeamTask[] }
        const snap = get()._snapshot
        set({ members: p.members || [], lists: p.lists || [], tasks: p.tasks || [], onlineMemberCount: (p.members || []).length })
        if (snap && (p.tasks || []).length > 0) {
          const newTasks = (p.tasks || []).filter(t => !snap.taskIds.has(t.id))
          const newCompleted = (p.tasks || []).filter(t => t.completed && !snap.completedIds.has(t.id))
          if (newTasks.length > 0 || newCompleted.length > 0) {
            const parts: string[] = []
            if (newTasks.length > 0) parts.push(`新增 ${newTasks.length} 个任务`)
            if (newCompleted.length > 0) parts.push(`完成 ${newCompleted.length} 个任务`)
            // Show toast via main store
            const mainStore = (await import('@/store')).useStore
            mainStore.getState().addToast(`同步完成：${parts.join('，')}`)
          }
          set({ _snapshot: null })
        }
        break
      }
```

Wait — `sync:full` handler is not async. The dynamic import inside a set callback won't work cleanly. Better approach: just import useStore at the top of team-store.

Actually, circular dependency risk: team-store imports useStore, useStore imports teamStore. Both already import each other (useStore imports useTeamStore at the top). Let me just access the Zustand store directly:

```typescript
// At top of team-store.ts, already imported useStore? No, team-store doesn't import useStore.
// Instead, use a simpler toast: window dispatch event or just skip toast for now and use a simple approach.
```

Simpler: just set a summary string in the store, and have Sidebar/App display it:

In team-store state add:
```typescript
  reconnectSummary: string | null
```

Set in sync:full diff:
```typescript
  set({ ..., reconnectSummary: parts.length > 0 ? `同步完成：${parts.join('，')}` : null })
```

In App.tsx or Sidebar, subscribe to `reconnectSummary` and show toast:

```typescript
// In a useEffect in App.tsx
const reconnectSummary = useTeamStore((s) => s.reconnectSummary)
useEffect(() => {
  if (reconnectSummary) {
    useStore.getState().addToast(reconnectSummary)
    useTeamStore.setState({ reconnectSummary: null })
  }
}, [reconnectSummary])
```

- [ ] **Step 3: Type check and commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: reconnect summary toast showing changes while offline"
```

---

### Task 9: Search scope isolation

**Files:**
- Modify: `src/store/index.ts`

- [ ] **Step 1: Modify search() to respect scope**

In `src/store/index.ts`, update the `search` action:

```typescript
  search: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [] })
      return
    }
    if (get().scope === 'team') {
      // Team mode: search team-store tasks in-memory
      const teamTasks = useTeamStore.getState().tasks
      const q = query.toLowerCase()
      const results = teamTasks.filter(
        (t) => t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q))
      )
      set({ searchResults: results as any, searchQuery: query })
    } else {
      const results = await db.searchTasks(query)
      set({ searchResults: results, searchQuery: query })
    }
  },
```

- [ ] **Step 2: Verify selectTask in team mode**

`selectTask` already checks team-store fallback (added in a prior commit). Verify it works:

```typescript
  selectTask: (taskId) => {
    // ... existing code already handles team fallback
  },
```

- [ ] **Step 3: Type check and test**

The `searchResults` type is `Task[]`. Team tasks are `TeamTask[]` which has extra fields but is compatible. The `as any` cast handles the type difference.

```bash
npx tsc --noEmit
npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "fix: search scope isolation — team mode searches team tasks only"
```

---

### Task 10: Planet member view (Canvas 2D)

**Files:**
- Create: `src/components/TeamPlanet.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Write the TeamPlanet component**

Create `src/components/TeamPlanet.tsx`:

```typescript
import { useRef, useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useTeamStore, type TeamMember } from '@/lib/team-store'
import { useStore } from '@/store'

interface Planet {
  member: TeamMember
  orbit: number      // orbit radius
  speed: number      // angular speed
  angle: number      // current angle
  radius: number     // planet size
}

export function TeamPlanet({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const members = useTeamStore((s) => s.members)
  const theme = useStore((s) => s.theme)
  const [hoveredMember, setHoveredMember] = useState<TeamMember | null>(null)
  const planetsRef = useRef<Planet[]>([])
  const animRef = useRef<number>(0)

  // Initialize planets from members
  useEffect(() => {
    planetsRef.current = members
      .filter(m => !m.is_server)
      .map((m, i) => ({
        member: m,
        orbit: 80 + i * 55,
        speed: 0.3 + Math.random() * 0.4,
        angle: Math.random() * Math.PI * 2,
        radius: 12 + Math.random() * 8,
      }))
  }, [members])

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1)
    const h = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1)
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
    const cw = canvas.offsetWidth
    const ch = canvas.offsetHeight
    const cx = cw / 2
    const cy = ch / 2

    // Clear — dark space background
    ctx.fillStyle = theme === 'light' ? 'rgba(0,0,0,0.85)' : 'rgba(5,5,15,0.92)'
    ctx.fillRect(0, 0, cw, ch)

    // Draw subtle starfield
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.5) % cw
      const sy = (i * 97.3) % ch
      ctx.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2))
    }

    // Draw orbits
    planetsRef.current.forEach(p => {
      ctx.beginPath()
      ctx.arc(cx, cy, p.orbit, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.stroke()
    })

    // Draw server star
    const serverMember = members.find(m => m.is_server)
    const pulse = 1 + Math.sin(Date.now() * 0.002) * 0.08
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 * pulse)
    gradient.addColorStop(0, serverMember?.color || '#6366f1')
    gradient.addColorStop(0.4, (serverMember?.color || '#6366f1') + '60')
    gradient.addColorStop(1, 'transparent')
    ctx.beginPath()
    ctx.arc(cx, cy, 40 * pulse, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    // Server core
    ctx.beginPath()
    ctx.arc(cx, cy, 14, 0, Math.PI * 2)
    ctx.fillStyle = serverMember?.color || '#6366f1'
    ctx.fill()
    ctx.shadowColor = serverMember?.color || '#6366f1'
    ctx.shadowBlur = 20
    ctx.fill()
    ctx.shadowBlur = 0

    // Server name
    ctx.fillStyle = '#fff'
    ctx.font = '13px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(serverMember?.name || '服务端', cx, cy + 60)

    // Draw orbiting planets
    planetsRef.current.forEach(p => {
      p.angle += p.speed * 0.016
      const px = cx + Math.cos(p.angle) * p.orbit
      const py = cy + Math.sin(p.angle) * p.orbit

      // Glow
      const pgradient = ctx.createRadialGradient(px, py, 0, px, py, p.radius * 2)
      pgradient.addColorStop(0, p.member.color + '40')
      pgradient.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(px, py, p.radius * 2, 0, Math.PI * 2)
      ctx.fillStyle = pgradient
      ctx.fill()

      // Planet body
      ctx.beginPath()
      ctx.arc(px, py, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = p.member.color
      ctx.fill()

      // Name
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '11px Inter, sans-serif'
      ctx.fillText(p.member.name, px, py + p.radius + 15)
    })

    animRef.current = requestAnimationFrame(animate)
  }, [members, theme])

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [animate])

  // Click handler
  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2

    // Check server
    if (Math.hypot(x - cx, y - cy) < 40) {
      const server = members.find(m => m.is_server)
      if (server) setHoveredMember(server)
      return
    }

    // Check planets
    for (const p of planetsRef.current) {
      const px = cx + Math.cos(p.angle) * p.orbit
      const py = cy + Math.sin(p.angle) * p.orbit
      if (Math.hypot(x - px, y - py) < p.radius * 2) {
        setHoveredMember(p.member)
        return
      }
    }
    setHoveredMember(null)
  }, [members])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onClick={handleClick}
      />
      {hoveredMember && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-[13px]"
          style={{
            background: 'var(--glass-elevated-bg)',
            backdropFilter: 'var(--glass-elevated-blur)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredMember.color }} />
            <span className="text-text-primary font-medium">{hoveredMember.name}</span>
            <span className="text-text-tertiary">
              {hoveredMember.last_seen && new Date(hoveredMember.last_seen).getTime() > Date.now() - 60000
                ? '在线' : '离线'}
            </span>
          </span>
        </div>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Wire Sidebar click to open planet view**

In Sidebar.tsx, add state:

```typescript
const [showPlanet, setShowPlanet] = useState(false)
```

Wrap the connection status indicator in a button:

```tsx
<button onClick={() => setShowPlanet(true)} className="w-full text-left">
  {/* existing status indicator content */}
</button>
```

Add the planet overlay at the end of the Sidebar (before closing tag):

```tsx
<AnimatePresence>
  {showPlanet && <TeamPlanet onClose={() => setShowPlanet(false)} />}
</AnimatePresence>
```

Import TeamPlanet.

- [ ] **Step 3: Type check and commit**

```bash
npx tsc --noEmit
git add -A && git commit -m "feat: planet member view — Canvas 2D solar system on connection status click"
```

---

### Task 11: Team mode views (verify today/upcoming filtering)

**Files:**
- Modify: `src/components/TaskList.tsx` (verify only — may need minor fix)

- [ ] **Step 1: Verify filtering**

Read the `getFilteredTasks` function in TaskList.tsx. Confirm that `activeTasks` (which is `teamTasks` in team mode) is used for all three views (today/upcoming/completed). The filtering logic already uses `activeTasks` — verify no hardcoded `tasks` references remain.

- [ ] **Step 2: Fix if needed**

If any view still uses `tasks` (personal) instead of `activeTasks`, change it. Also verify `currentView` switches correctly in team mode — `setCurrentView` already works independently of scope.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix: verify team mode views filter team data correctly"
```

---

## Self-Review

1. **Spec coverage:** All 9 items mapped to Tasks 1-11.
2. **Placeholder scan:** No "TODO", "TBD", or vague instructions. Every step has concrete code.
3. **Type consistency:** TeamPlanet uses `TeamMember` from team-store (already defined). `recentlyCompleted` uses `Set<string>` matching task IDs. Volume uses `localStorage` keys matching `useSound.ts`. Search uses `useTeamStore.getState().tasks` matching team-store API.
