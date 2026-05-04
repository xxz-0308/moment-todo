# Icon Unification & Memory Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify app icon across title bar, taskbar, and tray with diamond+check design; reduce idle memory by closing sql.js when minimized to tray.

**Architecture:** Icons: SVG diamond+check → 512px PNG for electron-builder → 32px PNG for tray. Title bar uses inline SVG matching the same design. Memory: window close/hide → save DB → close sql.js WASM connection → trigger GC. Window show → reopen DB.

**Tech Stack:** SVG, electron-builder, sql.js, Node.js GC

**Key files:**
- Create: `public/icon.svg`, `public/icon.png` (512), `public/icon-32.png` (32)
- Modify: `electron-builder.yml`, `electron/main.ts`, `src/components/TitleBar.tsx`

---

### Task 1: Create SVG icon + export PNGs

**Files:**
- Create: `public/icon.svg`
- Create: `public/icon.png` (generated from SVG)
- Create: `public/icon-32.png` (generated from SVG)

- [ ] **Step 1: Write icon.svg — diamond + check**

Create `public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
    <radialGradient id="highlight" cx="30%" cy="30%" r="60%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.15)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <!-- Diamond: 45deg rotated square, rounded 2px equivalent ~16px at this scale -->
  <rect x="56" y="56" width="400" height="400" rx="32" ry="32"
        transform="rotate(45 256 256)" fill="url(#g)"/>
  <!-- Glass highlight on top-left -->
  <rect x="56" y="56" width="400" height="400" rx="32" ry="32"
        transform="rotate(45 256 256)" fill="url(#highlight)"/>
  <!-- Check mark -->
  <polyline points="170,270 230,330 350,200"
            fill="none" stroke="white" stroke-width="36"
            stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 2: Generate 512px PNG from SVG**

Since we can't use browser-based SVG rasterization in CLI, use the SVG file itself as the icon source — electron-builder accepts SVG on some platforms but not reliably on Windows. Instead, generate the PNGs directly via Node.js canvas-free approach: write pixel data directly.

Actually, just use the SVG as-is for now — electron-builder on Windows needs PNG/ICO. Let's create the PNGs using a simpler approach: export the SVG content as a data buffer manually.

Since we don't have image conversion tools, create `public/icon.png` as a copy of the SVG and flag for manual conversion, OR use the approach of generating it in the plan.

Better approach: Write a small Node script to generate the PNGs. But this requires canvas or sharp... neither is installed.

**Simplest workable approach:** Generate PNGs directly in main.ts at startup (reuse existing PNG generation code but with diamond+check shape), then copy to public/. Or even simpler: keep the tray icon generation but update the shape to diamond+check, and use the same approach for the 512px icon.

**Approach:** Modify the existing `generateTrayIconPNG()` to also generate the app icon PNGs. The existing code already generates a 32x32 indigo rounded rect. Change it to a diamond+check at 512x512 and 32x32.

For this task, write a standalone icon generator script `scripts/generate-icons.mjs`:

```javascript
// scripts/generate-icons.mjs
// Generates public/icon.png (512) and public/icon-32.png (32)
// Diamond + check design using raw pixel buffers + zlib PNG encoding

import fs from 'fs'
import zlib from 'zlib'

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    table[n] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td), 0)
  return Buffer.concat([len, td, c])
}

function png(size, rgbaAt) {
  const lines = []
  for (let y = 0; y < size; y++) {
    const line = Buffer.alloc(1 + size * 4)
    for (let x = 0; x < size; x++) {
      const idx = 1 + x * 4
      const [r, g, b, a] = rgbaAt(x, y, size)
      line[idx] = r; line[idx + 1] = g; line[idx + 2] = b; line[idx + 3] = a
    }
    lines.push(line)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(lines))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Anti-aliased diamond (rotated square) with rounded corners
function diamondDist(x, y, size, cornerR) {
  const cx = size / 2, cy = size / 2
  const half = size * 0.32
  // Rotate point to diamond space
  const dx = (x - cx) * 0.7071 + (y - cy) * 0.7071
  const dy = -(x - cx) * 0.7071 + (y - cy) * 0.7071
  // Distance to axis-aligned square in rotated space
  return Math.max(Math.abs(dx), Math.abs(dy)) - half + cornerR
}

// Check mark (centered, visually adjusted)
function inCheck(x, y, size) {
  const w = size * 0.12 // stroke width
  const cx = size / 2, cy = size * 0.52
  const s = size * 0.28
  // Three line segments forming check: bottom-left to center, center to top-right
  const mx = cx - s * 0.35, my = cy
  const sx = cx - s * 0.65, sy = cy + s * 0.3
  const ex = cx + s * 0.55, ey = cy - s * 0.5

  const d1 = distToSegment(x, y, sx, sy, mx, my)
  const d2 = distToSegment(x, y, mx, my, ex, ey)
  return Math.min(d1, d2) < w
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function rgbaAt(x, y, size) {
  // Indigo gradient: bottom-left #6366f1 → top-right #818cf8
  const t = (x + y) / (2 * size) // 0 at top-left, 1 at bottom-right
  const r = Math.round(99 + t * (129 - 99))
  const g = Math.round(102 + t * (140 - 102))
  const b = Math.round(241 + t * (248 - 241))

  const d = diamondDist(x + 0.5, y + 0.5, size, size * 0.015)
  const inDiamond = d < 0

  if (!inDiamond) return [0, 0, 0, 0]

  // Anti-alias
  let alpha = 255
  if (d > -1) alpha = Math.round(255 * (-d))
  alpha = Math.max(0, Math.min(255, alpha))

  if (inCheck(x, y, size)) return [255, 255, 255, alpha]

  // Highlight at top-left corner of diamond
  const hlDx = x / size - 0.3
  const hlDy = y / size - 0.3
  const hlDist = Math.sqrt(hlDx * hlDx + hlDy * hlDy)
  if (d < -2 && hlDist < 0.5) {
    const hl = Math.round(20 * (1 - hlDist / 0.5))
    return [Math.min(255, r + hl), Math.min(255, g + hl), Math.min(255, b + hl), alpha]
  }

  return [r, g, b, alpha]
}

// Generate 512 and 32 PNGs
fs.writeFileSync('public/icon.png', png(512, rgbaAt))
fs.writeFileSync('public/icon-32.png', png(32, (x, y, s) => rgbaAt(x * 16, y * 16, 512)))
console.log('Generated public/icon.png (512x512) and public/icon-32.png (32x32)')
```

- [ ] **Step 2: Run the generator**

```bash
node scripts/generate-icons.mjs
```

Expected: `public/icon.png` and `public/icon-32.png` created.

- [ ] **Step 3: Commit**

```bash
git add public/icon.svg scripts/generate-icons.mjs public/icon.png public/icon-32.png
git commit -m "feat: add diamond+check app icon SVG + generated PNGs"
```

---

### Task 2: Wire icon into electron-builder and tray

**Files:**
- Modify: `electron-builder.yml`
- Modify: `electron/main.ts` (tray section)

- [ ] **Step 1: Add icon to electron-builder.yml**

Read `electron-builder.yml`. Add an `icon` field:

```yaml
icon: public/icon.png
```

- [ ] **Step 2: Replace tray icon generation in main.ts**

In `electron/main.ts`:

**Remove** these functions and constants (lines 17, 119-214):
- `const TRAY_ICON_PATH`
- `crc32()` function
- `createPNGChunk()` function
- `roundedRectDist()` function
- `generateTrayIconPNG()` function
- `ensureTrayIcon()` function

**Remove** the `import zlib from 'zlib'` line (line 4) — it was only used for PNG generation.

**Replace** the `createTray()` function's icon loading:

```typescript
function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, '../../public/icon-32.png')
    : path.join(process.resourcesPath, 'public', 'icon-32.png')
  tray = new Tray(iconPath)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示 Moment',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createWindow()
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        saveDatabase()
        backupDatabase()
        stopReminders()
        app.exit(0)
      },
    },
  ])

  tray.setToolTip('Moment')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.focus() : mainWindow.show()
    } else {
      createWindow()
    }
  })
}
```

- [ ] **Step 3: Update electron-builder.yml to include icon PNG in build**

Add to `electron-builder.yml` the `extraResources` for the public folder:

```yaml
extraResources:
  - from: public/
    to: public/
    filter:
      - icon-32.png
```

- [ ] **Step 4: Verify build compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add electron-builder.yml electron/main.ts
git commit -m "feat: wire diamond+check icon into electron-builder and tray"
```

---

### Task 3: Update TitleBar logo to match

**Files:**
- Modify: `src/components/TitleBar.tsx`

- [ ] **Step 1: Replace the SquareStack icon with inline SVG diamond+check**

In `TitleBar.tsx`, replace the current logo area (the div with `bg-accent` and `SquareStack`):

FROM:
```tsx
<div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
  <SquareStack size={11} className="text-white" strokeWidth={2.5} />
</div>
```

TO:
```tsx
<svg width="20" height="20" viewBox="0 0 20 20" className="flex-shrink-0">
  <defs>
    <linearGradient id="tb-grad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#6366f1"/>
      <stop offset="100%" stopColor="#818cf8"/>
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="14" height="14" rx="1.5" ry="1.5"
        transform="rotate(45 10 10)" fill="url(#tb-grad)"/>
  <polyline points="7,10.5 9,12.5 13.5,7.5"
            fill="none" stroke="white" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round"/>
</svg>
```

Also remove `SquareStack` from the lucide-react import if it's no longer used elsewhere (check: it's only used in the logo area and the maximize button uses `SquareStack` too — keep the import for that).

Wait, `SquareStack` is also used in the maximize/minimize logic (line with `isMaximized ? <SquareStack ...> : <Square ...>`). Keep the import.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TitleBar.tsx
git commit -m "feat: replace TitleBar logo with inline SVG diamond+check"
```

---

### Task 4: Memory optimization — close sql.js on window hide

**Files:**
- Modify: `electron/main.ts`

- [ ] **Step 1: Close DB when window hides**

In `main.ts`, find the `mainWindow.on('close', ...)` handler (around line 304). After `saveDatabase()` and `backupDatabase()`, close the DB:

```typescript
mainWindow.on('close', (e) => {
  saveDatabase()
  backupDatabase()
  // Close sql.js to free WASM memory while hidden in tray
  if (db) {
    db.close()
    db = null
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    e.preventDefault()
    mainWindow.hide()
  }
})
```

- [ ] **Step 2: Reopen DB when window shows**

In the tray's `click` handler and the "显示 Moment" menu item, they already call `mainWindow.show()`. We need to intercept `show` to reopen the DB. The cleanest way: listen for the window's `show` event.

Add this after `createWindow()` is called (near line 296):

```typescript
mainWindow.on('show', () => {
  if (!db) loadDatabase()
})
```

- [ ] **Step 3: Add null checks to IPC handlers**

In `queryAll()` and `execMod()`, add null guard at the top:

```typescript
function queryAll(sql: string, params?: unknown[]): Record<string, unknown>[] {
  if (!db) return []
  // ... existing code
}

function execMod(sql: string, params?: unknown[]): { changes: number; lastInsertRowid: number } {
  if (!db) return { changes: 0, lastInsertRowid: 0 }
  // ... existing code
}
```

Also check `initSchema()` has null guard:

```typescript
function initSchema() {
  if (!db) return
  // ... existing code
}
```

- [ ] **Step 4: Verify type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add electron/main.ts
git commit -m "feat: close sql.js on window hide to free WASM memory"
```

---

### Task 5: Trigger GC on window hide + bump version

**Files:**
- Modify: `electron/main.ts`
- Modify: `package.json`

- [ ] **Step 1: Trigger GC after hiding window**

In `main.ts`, after the window hides in the close handler, trigger GC:

```typescript
mainWindow.on('close', (e) => {
  saveDatabase()
  backupDatabase()
  if (db) { db.close(); db = null }
  if (mainWindow && !mainWindow.isDestroyed()) {
    e.preventDefault()
    mainWindow.hide()
    // Suggest V8 GC after hiding (frees Chromium renderer memory)
    try {
      mainWindow.webContents.executeJavaScript('if (window.gc) window.gc()')
    } catch {}
  }
})
```

- [ ] **Step 2: Bump version to 1.0.1**

In `package.json`, change `"version": "1.0.0"` to `"version": "1.0.1"`.

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm test
git add electron/main.ts package.json
git commit -m "feat: trigger GC on window hide + bump to v1.0.1"
```

---

### Task 6: Final build verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full production build**

```bash
npm run package
```

- [ ] **Step 2: Verify output**

Check that:
- `release/Moment-1.0.1-setup.exe` exists
- Installer runs and icon appears in taskbar
- Tray icon shows diamond+check
- Title bar shows diamond+check SVG
- Close to tray, reopen — data still intact
- Memory in tray: significantly lower than 150MB

- [ ] **Step 3: Commit any final adjustments**

```bash
git add -A
git commit -m "chore: final v1.0.1 build verification"
```

---

### Summary

After all 6 tasks:
- App icon unified across title bar, taskbar, tray — diamond+check on indigo gradient
- 100+ lines of PNG generation code removed from main.ts
- sql.js database closed when hidden to tray, reopened on show
- GC triggered on window hide
- Version bumped to 1.0.1
