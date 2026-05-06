# Protocol Versioning & Auto-Update Design

> **Goal:** Replace strict protocol version matching with minimum compatible version check. Add simple auto-update via server-hosted installer distribution.

## Current Problem

`PROTOCOL_VERSION = 1` uses strict equality (`!==`). Any version difference blocks connection. Every small update forces the entire team to reinstall simultaneously.

## Design

### 1. Protocol Version: Minimum Compatible

Replace `PROTOCOL_VERSION` with `MIN_PROTOCOL_VERSION`. Server accepts any client where `clientVersion >= minVersion`.

```
服务端: MIN_PROTOCOL_VERSION = 1
客户端: 握手发 { protocolVersion: 1 }

通过条件: clientVersion >= minVersion
拒绝条件: clientVersion < minVersion
旧客户端兼容: 没发 protocolVersion → 默认视作 1
```

The protocol version integer is maintained independently of the app version. It only increments when there are breaking wire format changes (removing/renaming message types, changing required field types). Bug fixes and feature additions that add new optional message types do not increment it.

### 2. Auto-Update: Server-Side Distribution

Flow:
1. Server starts → reads its app version from `package.json`
2. Client handshakes → server returns `appVersion` in handshake response
3. Client compares local version vs server version
4. If different → toast: "服务端版本 vX，你当前 vY。是否下载更新？"
5. User clicks download → client fetches installer from server via HTTP
6. Download complete → opens installer, app exits

Server runs a minimal HTTP file server on a separate port (5175) to serve the installer `.exe` from the `release/` directory. The HTTP server only runs when team server mode is active.

### 3. User Can Dismiss

The upgrade toast has a "忽略此版本" option. Dismissed versions are stored in localStorage so the prompt doesn't reappear for the same version.

### 4. Cold Start Limitation

The auto-update feature itself only works on clients >= 2.0.2. The 2.0.2 deployment still requires manual installation across the team. Subsequent updates (2.0.3+) will be automatic.

| Server | Client | Protocol | Upgrade Prompt |
|--------|--------|----------|----------------|
| 2.0.2 | 2.0.2+ | Pass | Shows if different |
| 2.0.2 | 2.0.1 | Pass | No (old code) |
| 2.0.2 | 2.0.0 | Pass (defaults to v1) | No (old code) |

## Files to Modify

| File | Change |
|------|--------|
| `src/constants.ts` | Add `MIN_PROTOCOL_VERSION = 1` |
| `electron/team-server.ts` | Import from constants; `!==` → `<` comparison; send `appVersion` in handshake response; handle legacy clients (no protocolVersion = 1) |
| `electron/team-client.ts` | Import from constants; receive and forward `appVersion` from handshake |
| `electron/main.ts` | Start HTTP server on port 5175 to serve release installer when team server starts; stop on team stop |
| `src/lib/team-store.ts` | Handle `update:available` event; show toast with download/ignore actions |
| `src/App.tsx` | Wire up update:available toast handler |

## Verification

- 2.0.2 server + 2.0.2 client: connects normally, no upgrade prompt
- 2.0.2 server + 2.0.0 client: connects normally (protocol defaults to 1)
- 2.0.2 server + simulated 2.0.3 client: connects normally, client sees upgrade prompt
- Change `MIN_PROTOCOL_VERSION` to 2 → 2.0.0/2.0.1 clients rejected with clear message
