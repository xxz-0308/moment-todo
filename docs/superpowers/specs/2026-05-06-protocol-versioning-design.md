# Protocol Versioning & Auto-Update Design

> **Goal:** Replace strict protocol version matching with minimum compatible version check. Add simple auto-update via server-hosted installer distribution.

> **Authoritative source:** This document + `src/constants.ts` define the protocol increment rules. Any future developer touching WebSocket messages MUST read and follow the breaking change rules below.

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

The protocol version integer is maintained independently of the app version. It lives in `src/constants.ts` as the single source of truth:

```ts
// src/constants.ts
export const MIN_PROTOCOL_VERSION = 1
// ↑ 只有当协议出现 breaking change 时才手动 +1。
//   Breaking change 的定义见本文档 Breaking Change Rules 章节。
```

### 2. Breaking Change Rules (MIN_PROTOCOL_VERSION 加 1 的时机)

以下任一操作是 breaking change，**必须** `MIN_PROTOCOL_VERSION += 1`：

| 操作 | 示例 |
|------|------|
| 删除已有 message type | 不再支持 `task:deleted` |
| 重命名已有 message type | `task:created` → `task:add` |
| 改变已有字段的类型 | `priority` 从 `string` 变 `number` |
| 删除已有消息的必填字段 | `task:created` 不再发 `listId`，旧客户端发出的消息服务端解析失败 |
| 新增必填字段 | `task:created` 从此必须带 `assignee`，旧客户端不传这个字段 |

以下操作**不是** breaking change，**无需**加 1：

| 操作 | 示例 |
|------|------|
| 新增可选 message type | 加 `comment:add`，旧客户端不认识→忽略 |
| 新增可选字段 | `task:updated` 多了个 `color`，旧客户端忽略 |
| 修改 UI | 按钮颜色、布局、动画 |
| 修 bug | 逻辑修正，数据格式不变 |
| 加测试 | 不影响线上协议 |

**执行约束：** 任何 PR 如果涉及 WebSocket message 的增删改，reviewer 必须对照上表判断是否需要 `MIN_PROTOCOL_VERSION += 1`。如果需要但 PR 没改 → review 不通过。

### 3. Auto-Update: Server-Side Distribution

Flow:
1. Server starts → reads its app version from `package.json`
2. Client handshakes → server returns `appVersion` in handshake response
3. Client compares local version vs server version
4. If different → toast: "服务端版本 vX，你当前 vY。是否下载更新？"
5. User clicks download → client fetches installer from server via HTTP (port 5175)
6. Download complete → opens installer, app exits

Server runs a minimal HTTP file server on a separate port (5175) to serve the installer `.exe` from the `release/` directory. The HTTP server only runs when team server mode is active.

### 4. Upgrade When Protocol Is Incompatible

Even when protocol version check fails, the HTTP file server (port 5175) is still running. The rejection response carries a download URL:

```
客户端: 握手 protocolVersion=1
服务端: MIN_PROTOCOL_VERSION=2, 拒绝
→ 回包: {
    type: "protocol:rejected",
    payload: {
      serverVersion: 2,
      clientVersion: 1,
      message: "协议不兼容，请升级",
      downloadUrl: "http://192.168.1.5:5175/Moment-x.x.x-setup.exe"
    }
  }
客户端: 弹窗"版本太旧"，附带下载按钮
```

Version matrix:

| Server | Client | Protocol | Upgrade Prompt |
|--------|--------|----------|----------------|
| 2.0.2 | 2.0.2+ | Pass | Shows if app version differs |
| 2.0.2 | 2.0.1 | Pass | No (client code doesn't support it) |
| 2.0.2 | 2.0.0 | Pass (defaults to v1) | No (client code doesn't support it) |
| 2.x.y (协议 v2) | 2.0.0-2.0.2 (协议 v1) | **Reject** | Only 2.0.2+ clients see the prompt; older clients see a silent disconnect |

### 5. User Can Dismiss

The upgrade toast has a "忽略此版本" option. Dismissed versions are stored in localStorage so the prompt doesn't reappear for the same version. If the server upgrades again (new version), the prompt reappears.

### 6. Cold Start Limitation

The auto-update feature itself only works on clients >= 2.0.2. The 2.0.2 deployment still requires manual installation across the team. Subsequent updates (2.0.3+) will be automatic.

## Files to Modify

| File | Change |
|------|--------|
| `src/constants.ts` | Add `MIN_PROTOCOL_VERSION = 1` with breaking change rules comment |
| `electron/team-server.ts` | Import from constants; `!==` → `<` comparison; send `appVersion` in handshake response; handle legacy clients (no protocolVersion = 1); include `downloadUrl` in rejection payload |
| `electron/team-client.ts` | Import from constants; receive and forward `appVersion` from handshake |
| `electron/main.ts` | Start HTTP server on port 5175 to serve release installer when team server starts; stop on team stop |
| `src/lib/team-store.ts` | Handle `update:available` event; show toast with download/ignore actions; handle `downloadUrl` in protocol:rejected |
| `src/App.tsx` | Wire up update:available toast handler |

## Verification

- 2.0.2 server + 2.0.2 client: connects normally, no upgrade prompt
- 2.0.2 server + 2.0.0 client: connects normally (protocol defaults to 1)
- 2.0.2 server + simulated 2.0.3 client: connects normally, client sees upgrade prompt
- Change `MIN_PROTOCOL_VERSION` to 2 → 2.0.0/2.0.1 clients rejected; 2.0.2+ clients see download prompt
- HTTP file server accessible at `http://server-ip:5175/Moment-x.x.x-setup.exe`
