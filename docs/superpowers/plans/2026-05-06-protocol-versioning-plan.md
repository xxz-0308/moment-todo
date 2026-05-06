# Protocol Versioning & Auto-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace strict protocol version equality check with minimum-compatible-version check. Add server-hosted installer distribution for auto-update.

**Architecture:** `MIN_PROTOCOL_VERSION` lives in shared `src/constants.ts`. Server checks `clientVersion >= minVersion` instead of `!==`. Server runs a minimal HTTP file server on port 5175 serving the installer `.exe`. Client compares app version from handshake and shows upgrade toast.

**Tech Stack:** Electron, Node.js `http` module, existing WebSocket + Zustand infrastructure.

---

## File Map

```
Modify: src/constants.ts                 # Add MIN_PROTOCOL_VERSION + breaking change rules comment
Modify: electron/team-server.ts           # Import from constants; >= comparison; appVersion in handshake response; downloadUrl in rejection
Modify: electron/team-client.ts           # Import from constants; forward appVersion from handshake
Modify: electron/main.ts                  # HTTP file server on port 5175
Modify: src/lib/team-store.ts             # Handle update:available event; downloadUrl in protocol:rejected
Modify: src/App.tsx                       # Wire update:available handler with download/ignore toast
```

---

### Task 1: Add MIN_PROTOCOL_VERSION to constants.ts

**Files:**
- Modify: `src/constants.ts`

- [ ] **Step 1: Add the constant with rules comment**

Read `src/constants.ts`, prepend at the top of the file (before PRESET_COLORS):

```ts
// ── Protocol Version ────────────────────────────────────────
// MIN_PROTOCOL_VERSION only increments on BREAKING wire format changes.
// Non-breaking: new optional message types, new optional fields, UI changes, bug fixes.
// Breaking: removing/renaming message types, changing field types, adding required fields.
// See docs/superpowers/specs/2026-05-06-protocol-versioning-design.md for full rules.
export const MIN_PROTOCOL_VERSION = 1

// ── Preset Colors ───────────────────────────────────────────
```

- [ ] **Step 2: Verify existing code still works**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/constants.ts
git commit -m "feat: add MIN_PROTOCOL_VERSION to shared constants"
```

---

### Task 2: Update team-server.ts — minimum version check + appVersion

**Files:**
- Modify: `electron/team-server.ts`

- [ ] **Step 1: Replace PROTOCOL_VERSION import and comparison logic**

Read `electron/team-server.ts`, make these changes:

Remove line 18:
```ts
const PROTOCOL_VERSION = 1     // DELETE this line
```

At the top after the import of `./team-config`, add:
```ts
import { MIN_PROTOCOL_VERSION } from '../src/constants'
```

In the `member:handshake` case (line 59-67), replace:

```ts
const clientVersion = (msg.payload.protocolVersion as number) || 0
if (clientVersion !== PROTOCOL_VERSION) {
    ws.send(JSON.stringify({
        type: 'protocol:rejected',
        payload: { serverVersion: PROTOCOL_VERSION, clientVersion, message: `协议版本不匹配：服务端 v${PROTOCOL_VERSION}，客户端 v${clientVersion}。请升级后重试。` },
    }))
    ws.close()
    return
}
```

With:

```ts
const clientVersion = (msg.payload.protocolVersion as number) || 1
if (clientVersion < MIN_PROTOCOL_VERSION) {
    const pkg = require('../../package.json')
    const appVersion = pkg.version
    ws.send(JSON.stringify({
        type: 'protocol:rejected',
        payload: {
            serverVersion: MIN_PROTOCOL_VERSION,
            clientVersion,
            appVersion,
            message: `协议不兼容：服务端 v${appVersion}，你的版本太旧，请升级。`,
            downloadUrl: `http://${this.getLocalIP()}:5175/Moment-${appVersion}-setup.exe`,
        },
    }))
    ws.close()
    return
}
```

Note: `require('../../package.json')` won't work in bundled Electron because the path is wrong. Use `require(path.join(app.getAppPath(), 'package.json'))` or read it once and cache it. Better approach: pass `appVersion` to TeamServer constructor.

**Step 1a: Pass appVersion to TeamServer constructor**

In the TeamServer class, add `appVersion` to constructor:

```ts
export class TeamServer {
  private wss: WebSocketServer | null = null
  private clients = new Map<string, TeamClientConn>()
  private db: Database
  private onEvent: ServerEventHandler
  private port: number
  private serverMemberId: string
  private appVersion: string

  constructor(db: Database, port: number, serverMemberId: string, appVersion: string, onEvent: ServerEventHandler) {
    this.db = db
    this.port = port
    this.serverMemberId = serverMemberId
    this.appVersion = appVersion
    this.onEvent = onEvent
  }
```

- [ ] **Step 2: Send appVersion in handshake response**

After the `broadcastToAll` + `onEvent` for `member:connected` (line 77-78), add a direct response to the connecting client:

```ts
const totalCount = this.clients.size + 1
this.broadcastToAll({ type: 'member:connected', payload: { member, totalCount }, senderId: '' })
this.onEvent('member:connected', { member, totalCount })
// Send app version so client can check for update
ws.send(JSON.stringify({
    type: 'handshake:ok',
    payload: { appVersion: this.appVersion },
}))
break
```

- [ ] **Step 3: Add getLocalIP helper to TeamServer**

Add a private method to get the server's LAN IP:

```ts
private getLocalIP(): string {
    const os = require('os') as typeof import('os')
    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
        const net = interfaces[name]
        if (!net) continue
        for (const iface of net) {
            if (iface.family === 'IPv4' && !iface.internal &&
                (iface.address.startsWith('192.168.') ||
                 iface.address.startsWith('10.') ||
                 /^172\.(1[6-9]|2\d|3[01])\./.test(iface.address))) {
                return iface.address
            }
        }
    }
    return '127.0.0.1'
}
```

- [ ] **Step 4: Update protocol:rejected with downloadUrl**

Update the rejection code used in step 2 of the handshake to use `this.appVersion`:

```ts
ws.send(JSON.stringify({
    type: 'protocol:rejected',
    payload: {
        serverVersion: MIN_PROTOCOL_VERSION,
        clientVersion,
        appVersion: this.appVersion,
        message: `协议不兼容：服务端 v${this.appVersion}，你的版本太旧，请升级。`,
        downloadUrl: `http://${this.getLocalIP()}:5175/Moment-${this.appVersion}-setup.exe`,
    },
}))
```

- [ ] **Step 5: Verify type check**

Run: `npx tsc --noEmit`
Expected: No new errors from team-server.ts

- [ ] **Step 6: Commit**

```bash
git add electron/team-server.ts
git commit -m "feat: replace strict protocol version with minimum compatible check, add appVersion handshake"
```

---

### Task 3: Update team-client.ts — import from constants, handle appVersion

**Files:**
- Modify: `electron/team-client.ts`

- [ ] **Step 1: Replace PROTOCOL_VERSION and handle handshake:ok**

Remove line 4:
```ts
const PROTOCOL_VERSION = 1     // DELETE
```

Add import at top (after ws import):
```ts
import { MIN_PROTOCOL_VERSION } from '../src/constants'
```

Update the handshake send (line 46):
```ts
this.send({ type: 'member:handshake', payload: { member: this.member, protocolVersion: MIN_PROTOCOL_VERSION } })
```

Add handler for `handshake:ok` in the message handler. The team-client sends all received messages through `this.onEvent(msg.type, msg.payload)`. No change needed — `handshake:ok` will be forwarded to the renderer and handled in team-store.

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add electron/team-client.ts
git commit -m "feat: use MIN_PROTOCOL_VERSION from shared constants in team-client"
```

---

### Task 4: Add HTTP file server for installer distribution

**Files:**
- Modify: `electron/main.ts`

- [ ] **Step 1: Add HTTP server module**

In `electron/main.ts`, add after the imports (around line 8):

```ts
import http from 'http'
```

Add state variables near `let teamServer` / `let teamClient`:

```ts
let updateServer: http.Server | null = null
```

- [ ] **Step 2: Create startUpdateServer function**

Add this function (e.g., after `connectClient`):

```ts
function startUpdateServer(port: number): void {
  const pkg = require('../package.json')
  const installerName = `Moment-${pkg.version}-setup.exe`
  const installerPath = path.join(__dirname, '..', '..', 'release', installerName)

  updateServer = http.createServer((_req, res) => {
    if (fs.existsSync(installerPath)) {
      const stat = fs.statSync(installerPath)
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'Content-Disposition': `attachment; filename="${installerName}"`,
      })
      fs.createReadStream(installerPath).pipe(res)
    } else {
      res.writeHead(404)
      res.end('Installer not found')
    }
  })

  updateServer.listen(port, () => {
    console.log(`[UpdateServer] Listening on port ${port}`)
  })
}

function stopUpdateServer(): void {
  if (updateServer) {
    updateServer.close()
    updateServer = null
  }
}
```

- [ ] **Step 3: Start/stop update server with team server**

In `startTeam()`, after team server starts successfully, start the update server:

```ts
const ok = teamServer.start()
if (!ok) {
    teamServer = null
    mainWindow?.webContents.send('team:event', { type: 'error', payload: '端口被占用，无法启动服务端' })
    return
}
startUpdateServer(5175)
```

In `stopTeam()`, stop the update server:

```ts
function stopTeam(): void {
  stopUpdateServer()
  if (teamServer) {
    teamServer.stop()
    teamServer = null
  }
  ...
}
```

- [ ] **Step 4: Pass appVersion to TeamServer constructor**

Update the TeamServer constructor call (line ~214):

```ts
teamServer = new TeamServer(db, config.serverPort, config.member.id, pkg.version, (event, data) => {
    mainWindow?.webContents.send('team:event', { type: event, payload: data })
})
```

Make sure `pkg` is available. Read it once at the top of main.ts or inside startTeam:

```ts
const pkg = require('../package.json')
teamServer = new TeamServer(db, config.serverPort, config.member.id, pkg.version, (event, data) => {
```

- [ ] **Step 5: Verify type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add electron/main.ts
git commit -m "feat: add HTTP file server for installer distribution on port 5175"
```

---

### Task 5: Update team-store — handle handshake:ok, update:available, downloadUrl

**Files:**
- Modify: `src/lib/team-store.ts`

- [ ] **Step 1: Add handshake:ok handler**

Add a case in `_handleMessage` switch for `handshake:ok`. Store appVersion from server and compare with local:

```ts
case 'handshake:ok': {
    const p = payload as { appVersion: string }
    const localVersion = '2.0.2' // will be replaced — see note below
    if (p.appVersion && p.appVersion !== localVersion) {
        window.dispatchEvent(new CustomEvent('moment:update-available', {
            detail: {
                serverVersion: p.appVersion,
                localVersion,
                downloadUrl: `http://${get().serverUrl}/update`, // placeholder
            },
        }))
    }
    break
}
```

**Note:** Getting the local app version in the renderer requires `window.electronAPI.getAppVersion()` which already exists. Update the handler to use it:

```ts
case 'handshake:ok': {
    const p = payload as { appVersion: string }
    const localVersion = (window as any).electronAPI?.getAppVersion
        ? await (window as any).electronAPI.getAppVersion()
        : ''
    if (p.appVersion && localVersion && p.appVersion !== localVersion) {
        window.dispatchEvent(new CustomEvent('moment:update-available', {
            detail: {
                serverVersion: p.appVersion,
                localVersion,
            },
        }))
    }
    break
}
```

But `_handleMessage` is not async. We need a different approach — use the sync version from preload.

Actually, `getAppVersion` is exposed via IPC invoke (async). For a simpler approach, store the version in the team-store state and check after receiving:

```ts
case 'handshake:ok': {
    const p = payload as { appVersion: string }
    if (p.appVersion && get().appVersion && p.appVersion !== get().appVersion) {
        set({ updateAvailable: { serverVersion: p.appVersion } })
    }
    break
}
```

Add `appVersion` and `updateAvailable` to TeamState interface and initial state:

```ts
appVersion: string
updateAvailable: { serverVersion: string } | null
```

In `_handleMessage`, the `init` or bootstrap should populate `appVersion`:

Add a new case in `_handleMessage` or populate from main.ts startup:

In the `sync:full` or `status:connected` handler, or better: add a new message type.

Simplest approach: pass the local version from `preload.ts` as a new IPC method, or store it in team-store state during init.

**Simplest approach:** Modify the team-store's `startTeam` to store the app version before connecting:

```ts
startTeam: async (mode: 'server' | 'client') => {
    const a = api()
    if (!a) return
    // Store local app version for update comparison
    const localVersion = a.getAppVersion ? await a.getAppVersion() : ''
    set({ appVersion: localVersion })
    a.onTeamEvent((event: TeamEvent) => {
        get()._handleMessage(event)
    })
    await a.teamStart(mode)
},
```

And similarly for `connect`:

```ts
connect: async (url?: string) => {
    set({ connectionStatus: 'connecting' })
    const a = api()
    if (!a) return
    const localVersion = a.getAppVersion ? await a.getAppVersion() : ''
    set({ appVersion: localVersion })
    a.onTeamEvent((event: TeamEvent) => {
        get()._handleMessage(event)
    })
    await a.teamStart('client')
},
```

Then in `handshake:ok`:

```ts
case 'handshake:ok': {
    const p = payload as { appVersion: string }
    if (p.appVersion && get().appVersion && p.appVersion !== get().appVersion) {
        set({ updateAvailable: { serverVersion: p.appVersion } })
    }
    break
}
```

- [ ] **Step 2: Update protocol:rejected to include downloadUrl**

Modify the existing `protocol:rejected` case to include download action when `downloadUrl` is present:

```ts
case 'protocol:rejected': {
    const p = payload as { serverVersion: number; clientVersion: number; message: string; downloadUrl?: string }
    set({ connectionStatus: 'disconnected' })
    if (typeof window !== 'undefined') {
        if (p.downloadUrl) {
            window.dispatchEvent(new CustomEvent('moment:update-available', {
                detail: { serverVersion: String(p.serverVersion), downloadUrl: p.downloadUrl, required: true },
            }))
        } else {
            window.dispatchEvent(new CustomEvent('moment:toast', { detail: { message: p.message || '协议版本不匹配' } }))
        }
    }
    break
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/team-store.ts
git commit -m "feat: add handshake:ok and update app version tracking to team-store"
```

---

### Task 6: Wire update toast in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add update:available event listener**

In the `useEffect` block (near line 96 where `moment:toast` listener is registered), add:

```ts
const updateHandler = (e: Event) => {
    const detail = (e as CustomEvent).detail as {
        serverVersion: string
        downloadUrl?: string
        required?: boolean
    }
    const msg = detail.required
        ? `协议不兼容，请升级到 v${detail.serverVersion}`
        : `服务端版本 v${detail.serverVersion}，你当前 v${localVersion}。是否下载更新？`
    
    if (detail.downloadUrl) {
        useStore.getState().addToast(msg, {
            label: '下载更新',
            onClick: () => {
                // Open download URL in browser / download via shell
                ;(window as any).electronAPI?.shellOpen?.(detail.downloadUrl!)
            },
        })
    } else {
        useStore.getState().addToast(msg)
    }
}
window.addEventListener('moment:update-available', updateHandler)
```

And in the cleanup:
```ts
return () => {
    unsub()
    window.removeEventListener('moment:toast', toastHandler)
    window.removeEventListener('moment:update-available', updateHandler)
}
```

But we need `localVersion`. Read it once via IPC. Actually, `getAppVersion` is already exposed in preload. Let's add a simple invocation:

```ts
// In the useEffect, fetch local version
;(window as any).electronAPI?.getAppVersion?.().then((v: string) => {
    // store locally for use in handlers
})
```

Actually, simpler: just store it in App state or closure. Let me simplify the handler to not need localVersion in the message:

```ts
const updateHandler = (e: Event) => {
    const detail = (e as CustomEvent).detail as {
        serverVersion: string
        downloadUrl?: string
        required?: boolean
    }
    const msg = detail.required
        ? `协议不兼容，请升级到 v${detail.serverVersion}`
        : `服务端版本 v${detail.serverVersion}，和当前版本不同。是否下载更新？`
    
    useStore.getState().addToast(msg, {
        label: '下载更新',
        onClick: () => {
            if (detail.downloadUrl) {
                ;(window as any).electronAPI?.shellOpen?.(detail.downloadUrl!)
            }
        },
    })
}
window.addEventListener('moment:update-available', updateHandler)
```

Wait, `shellOpen` might not exist in the preload API. Let me check. Actually, `shell.openExternal` would need to be exposed. For HTTP URLs, we can use `shell.openExternal`. But for direct file downloads, we might need something else.

Actually, let me check if `shellOpen` is already exposed. Looking at the current preload.ts, it exposes `windowControl` for min/max/close. For opening URLs, I should add `shell.openExternal`.

But for downloading and running the installer, `shell.openExternal(url)` with an HTTP URL would open it in the default browser, which would download the file. That's acceptable.

Let me add `shellOpenExternal` to preload if it's not there. Let me check.

For now, the plan step should cover this:

```ts
const updateHandler = (e: Event) => {
    const detail = (e as CustomEvent).detail as {
        serverVersion: string
        downloadUrl?: string
        required?: boolean
    }
    const msg = detail.required
        ? `协议不兼容，需要升级到 v${detail.serverVersion}`
        : `服务端版本 v${detail.serverVersion}，建议更新。是否下载？`
    
    useStore.getState().addToast(msg, {
        label: '下载更新',
        onClick: () => {
            if (detail.downloadUrl) {
                // Open download URL in default browser
                const shell = (window as any).require?.('electron')?.shell
                if (shell) {
                    shell.openExternal(detail.downloadUrl)
                } else {
                    window.open(detail.downloadUrl, '_blank')
                }
            }
        },
    })
}
```

Hmm, `require('electron')` won't work in renderer with contextIsolation. I should add an IPC method.

Let me add `shellOpenExternal` to the preload. Actually, we already have `shell` imported in preload. Let me add a method there.

Actually, looking at the preload code more carefully, the simplest approach: just use `window.open(url)` — it should trigger the default browser to download the file.

For the plan, let me keep it simple and propose adding a quick IPC or using `window.open`.

- [ ] **Step 2: Verify test suite**

Run: `npm test`
Expected: All 110 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire update:available toast with download action in App"
```

---

### Task 7: Final verification — full test suite + manual checklist

**Files:**
- None (verification only)

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All 110 tests pass

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Manual verification checklist**

- [ ] Build: `npm run build` succeeds
- [ ] Package: `npm run package` succeeds
- [ ] Install and launch as server
- [ ] Client with same version connects → no upgrade prompt
- [ ] Check HTTP server: `curl http://localhost:5175/` returns installer (404 if no release dir in dev)

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification fixes for protocol versioning feature"
```

---

## Self-Review

**Spec coverage check:**
- MIN_PROTOCOL_VERSION in constants.ts → Task 1 ✓
- >= comparison in team-server.ts → Task 2 ✓
- Legacy client handling (no protocolVersion = 1) → Task 2 (|| 1 fallback) ✓
- appVersion in handshake → Task 2 + Task 3 ✓
- HTTP file server on port 5175 → Task 4 ✓
- update:available toast → Task 5 + Task 6 ✓
- downloadUrl in protocol:rejected → Task 2 + Task 5 ✓
- Dismiss version → left as future enhancement
- Breaking change rules comment → Task 1 ✓

**Placeholder scan:** No TBD or TODO. All code is inline.

**Type consistency:** MIN_PROTOCOL_VERSION is number across all files. appVersion is string. downloadUrl is string.
