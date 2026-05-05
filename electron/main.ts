import { app, BrowserWindow, Tray, Menu, ipcMain, Notification, shell, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { TeamServer } from './team-server'
import { TeamClient } from './team-client'
import { publishServer, discoverServer, getLocalIPs } from './team-discovery'
import { readTeamConfig, writeTeamConfig, type TeamConfig } from './team-config'

const isDev = process.env.NODE_ENV === 'development'

// Support multi-instance testing: --data-suffix=client isolates userData
const dataSuffix = process.argv.find(a => a.startsWith('--data-suffix='))?.split('=')[1]
if (dataSuffix) {
  app.setPath('userData', app.getPath('userData') + '-' + dataSuffix)
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let db: Database | null = null
let SQL: SqlJsStatic | null = null
let reminderInterval: ReturnType<typeof setInterval> | null = null
const notifiedTasks = new Set<string>()
let teamServer: TeamServer | null = null
let teamClient: TeamClient | null = null
let stopDiscovery: (() => void) | null = null

const DB_PATH = path.join(app.getPath('userData'), 'moment.db')

// ── Database ──────────────────────────────────────────────

function loadDatabase() {
  if (!SQL) throw new Error('SQL not initialized')
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH))
  } else {
    db = new SQL.Database()
  }
  db.run('PRAGMA foreign_keys = ON')
}

function saveDatabase() {
  if (!db) return
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()))
}

function initSchema() {
  if (!db) return
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      list_id TEXT,
      notes TEXT DEFAULT '',
      pinned INTEGER NOT NULL DEFAULT 0,
      sort_order REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      sort_order REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)

  // ── Team migrations ──────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      is_server INTEGER DEFAULT 0,
      last_seen TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Add scope columns if missing (try/catch because ALTER TABLE fails if column exists)
  try { db.run("ALTER TABLE tasks ADD COLUMN scope TEXT NOT NULL DEFAULT 'personal'") } catch {}
  try { db.run("ALTER TABLE tasks ADD COLUMN created_by TEXT") } catch {}
  try { db.run("ALTER TABLE tasks ADD COLUMN assigned_to TEXT") } catch {}
  try { db.run("ALTER TABLE lists ADD COLUMN scope TEXT NOT NULL DEFAULT 'personal'") } catch {}
  try { db.run("ALTER TABLE lists ADD COLUMN created_by TEXT") } catch {}

  const result = db.exec('SELECT COUNT(*) as count FROM lists')
  const count = result.length > 0 ? (result[0].values[0][0] as number) : 0
  if (count === 0) {
    db.run("INSERT INTO lists (id, name, color, sort_order) VALUES ('default', ?, '#6366f1', 0)", ['全部'])
    db.run("INSERT INTO lists (id, name, color, sort_order) VALUES ('work', ?, '#f59e0b', 1)", ['工作'])
    db.run("INSERT INTO lists (id, name, color, sort_order) VALUES ('personal', ?, '#10b981', 2)", ['生活'])
  }
  // Migrations
  db.run("UPDATE lists SET name = '全部' WHERE id = 'default' AND name = '收集箱'")
  db.run("UPDATE lists SET name = '生活' WHERE id = 'personal' AND name = '个人'")
  // Add pinned column if missing
  // Add pinned column if missing (for pre-existing databases)
  const cols = db.exec("PRAGMA table_info(tasks)")
  const hasPinned = cols.length > 0 && cols[0].values.some((row: unknown[]) => row[1] === 'pinned')
  if (!hasPinned) {
    db.exec("ALTER TABLE tasks ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0")
  }
  saveDatabase()
}

function queryAll(sql: string, params?: unknown[]): Record<string, unknown>[] {
  if (!db) return []
  const stmt = db.prepare(sql)
  if (params && params.length > 0) stmt.bind(params as any[])
  const columns = stmt.getColumnNames()
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    const values = stmt.get()
    const row: Record<string, unknown> = {}
    columns.forEach((col, i) => { row[col] = values[i] })
    rows.push(row)
  }
  stmt.free()
  return rows
}

function execMod(sql: string, params?: unknown[]): { changes: number; lastInsertRowid: number } {
  if (!db) return { changes: 0, lastInsertRowid: 0 }
  db.run(sql, params as any[])
  const r = db.exec('SELECT changes() as c, last_insert_rowid() as l')
  if (r.length > 0 && r[0].values.length > 0) {
    return {
      changes: r[0].values[0][0] as number,
      lastInsertRowid: r[0].values[0][1] as number,
    }
  }
  return { changes: 0, lastInsertRowid: 0 }
}


// ── Reminder system ───────────────────────────────────────

function checkReminders() {
  if (!db) return
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()

  // Overdue tasks (due_date passed) + tasks due today
  const tasks = queryAll(
    `SELECT id, title, due_date FROM tasks
     WHERE completed = 0 AND due_date IS NOT NULL AND due_date <= ?
     ORDER BY due_date ASC`,
    [today]
  ) as { id: string; title: string; due_date: string }[]

  for (const task of tasks) {
    if (notifiedTasks.has(task.id)) continue

    const isOverdue = task.due_date < today
    const label = isOverdue ? '已逾期' : '今天到期'

    if (Notification.isSupported()) {
      new Notification({ title: `⏰ ${label}: ${task.title}`, body: task.due_date, silent: false }).show()
    }
    notifiedTasks.add(task.id)
  }

  // Clear notified tasks that are now completed or no longer due
  const activeTaskIds = new Set(
    queryAll(
      'SELECT id FROM tasks WHERE completed = 0 AND due_date IS NOT NULL AND due_date <= ?',
      [today]
    ).map((t: any) => t.id)
  )
  for (const id of notifiedTasks) {
    if (!activeTaskIds.has(id)) notifiedTasks.delete(id)
  }
}

function startReminders() {
  checkReminders()
  reminderInterval = setInterval(checkReminders, 60_000)
}

function stopReminders() {
  if (reminderInterval) {
    clearInterval(reminderInterval)
    reminderInterval = null
  }
}

// ── Team ────────────────────────────────────────────────────

function startTeam(mode: 'server' | 'client', config: TeamConfig): void {
  if (mode === 'server') {
    if (!db) return
    teamServer = new TeamServer(db, config.serverPort, (event, data) => {
      mainWindow?.webContents.send('team:event', { type: event, payload: data })
    })
    const ok = teamServer.start()
    if (!ok) {
      teamServer = null
      mainWindow?.webContents.send('team:event', { type: 'error', payload: '端口被占用，无法启动服务端' })
      return
    }
    stopDiscovery = publishServer(config.serverPort)
    // Register server's own member in team_members
    db.run(
      `INSERT INTO team_members (id, name, color, is_server, last_seen) VALUES (?, ?, ?, 1, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET name = ?, color = ?, is_server = 1, last_seen = datetime('now')`,
      [config.member.id, config.member.name, config.member.color, config.member.name, config.member.color]
    )
    // Notify renderer that server is running and send team data
    mainWindow?.webContents.send('team:event', { type: 'status', payload: 'connected' })
    const members = queryAll('SELECT * FROM team_members')
    const teamLists = queryAll("SELECT * FROM lists WHERE scope = 'team'")
    const teamTasks = queryAll("SELECT * FROM tasks WHERE scope = 'team'")
    mainWindow?.webContents.send('team:event', { type: 'sync:full', payload: { members, lists: teamLists, tasks: teamTasks } })
  } else if (mode === 'client') {
    const address = config.serverAddress || ''
    if (!address) {
      discoverServer().then((addr) => {
        if (addr) {
          connectClient(addr, config)
        } else {
          mainWindow?.webContents.send('team:event', { type: 'status', payload: 'disconnected' })
        }
      })
    } else {
      connectClient(`${address}:${config.serverPort}`, config)
    }
  }
}

function connectClient(url: string, config: TeamConfig): void {
  teamClient = new TeamClient(url, config.member, (event, data) => {
    mainWindow?.webContents.send('team:event', { type: event, payload: data })
  })
  teamClient.connect()
}

function stopTeam(): void {
  if (teamServer) {
    teamServer.stop()
    teamServer = null
  }
  if (teamClient) {
    teamClient.disconnect()
    teamClient = null
  }
  if (stopDiscovery) {
    stopDiscovery()
    stopDiscovery = null
  }
  // Notify renderer that team is now disabled
  mainWindow?.webContents.send('team:event', { type: 'status', payload: 'disabled' })
}

// ── Window ────────────────────────────────────────────────

function createWindow() {
  const iconPath = isDev
    ? path.join(__dirname, '../../public/icon.png')
    : path.join(process.resourcesPath, 'public', 'icon.png')

  mainWindow = new BrowserWindow({
    width: 960,
    height: 660,
    minWidth: 500,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f0f',
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximize-change', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximize-change', false)
  })

  mainWindow.on('show', () => {
    if (!db) loadDatabase()
  })

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
      // Suggest V8 GC after hiding
      try {
        mainWindow.webContents.executeJavaScript('if (window.gc) window.gc()')
      } catch {}
    }
  })
}

// ── Tray ──────────────────────────────────────────────────

function getTrayIconPath(): string {
  // Resolve icon-32.png. In dev, it's in the project public/ dir.
  // In production, it's in the app's resources/public/ (extraResources).
  const candidates = [
    path.join(__dirname, '../../public/icon-32.png'),
    path.join(process.resourcesPath, 'public', 'icon-32.png'),
    path.join(app.getAppPath(), 'public', 'icon-32.png'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  // Fallback: generate a simple 32x32 indigo diamond as base64 data URL
  console.warn('Tray icon not found, using fallback')
  return ''
}

function createTray() {
  const iconPath = getTrayIconPath()
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty()
  tray = new Tray(icon)

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

// ── Backup ────────────────────────────────────────────────

function backupDatabase() {
  if (!db) return
  const backupDir = path.join(app.getPath('documents'), 'Moment', 'backups')
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `moment-${timestamp}.db`)
  fs.writeFileSync(backupPath, Buffer.from(db.export()))

  const files = fs.readdirSync(backupDir).filter((f: string) => f.endsWith('.db')).sort().reverse()
  for (const file of files.slice(7)) {
    fs.unlinkSync(path.join(backupDir, file))
  }
}

// ── IPC ───────────────────────────────────────────────────

function setupIPC() {
  ipcMain.handle('db:query', (_e, sql: string, params?: unknown[]) => queryAll(sql, params))
  ipcMain.handle('db:get', (_e, sql: string, params?: unknown[]) => {
    const rows = queryAll(sql, params)
    return rows[0] || null
  })
  ipcMain.handle('db:run', (_e, sql: string, params?: unknown[]) => {
    const result = execMod(sql, params)
    saveDatabase()
    return result
  })
  ipcMain.handle('db:backup', () => { backupDatabase(); return true })
  ipcMain.handle('db:export-json', () => {
    if (!db) return '{}'
    const toRows = (r: { columns: string[]; values: unknown[][] }[]) => {
      if (r.length === 0) return []
      return r[0].values.map(row => {
        const obj: Record<string, unknown> = {}
        r[0].columns.forEach((col, i) => { obj[col] = row[i] })
        return obj
      })
    }
    return JSON.stringify({
      tasks: toRows(db.exec('SELECT * FROM tasks ORDER BY created_at DESC')),
      lists: toRows(db.exec('SELECT * FROM lists ORDER BY sort_order')),
      exportedAt: new Date().toISOString(),
    }, null, 2)
  })
  ipcMain.handle('notification:show', (_e, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, silent: false }).show()
    }
  })
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()
  })
  ipcMain.handle('window:close', () => { saveDatabase(); mainWindow?.close() })
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())
  ipcMain.handle('shell:openExternal', (_e, url: string) => shell.openExternal(url))

  // Team
  ipcMain.handle('team:start', (_e, mode: 'server' | 'client') => {
    const config = readTeamConfig()
    config.role = mode
    writeTeamConfig(config)
    startTeam(mode, config)
    return true
  })
  ipcMain.handle('team:stop', () => {
    stopTeam()
    const config = readTeamConfig()
    config.role = ''
    writeTeamConfig(config)
    return true
  })
  ipcMain.handle('team:get-config', () => readTeamConfig())
  ipcMain.handle('team:save-config', (_e, partial: Partial<TeamConfig>) => {
    const config = readTeamConfig()
    const merged = { ...config, ...partial }
    writeTeamConfig(merged)
    stopTeam()
    if (merged.role && merged.member.id) {
      startTeam(merged.role as 'server' | 'client', merged)
    }
    return readTeamConfig()
  })
  ipcMain.handle('team:update-profile', (_e, member: { id: string; name: string; color: string }) => {
    // Update member profile without restarting server/client
    const config = readTeamConfig()
    config.member = { ...config.member, ...member }
    writeTeamConfig(config)
    if (teamServer && db) {
      db.run(
        `UPDATE team_members SET name = ?, color = ?, last_seen = datetime('now') WHERE id = ?`,
        [member.name, member.color, member.id]
      )
      const updated = queryAll('SELECT * FROM team_members WHERE id = ?', [member.id])[0]
      teamServer.broadcast({ type: 'member:joined', payload: { member: updated } })
      mainWindow?.webContents.send('team:event', { type: 'member:joined', payload: { member: updated } })
    }
    return true
  })
  ipcMain.handle('team:discover', async () => {
    const result = await discoverServer()
    return result
  })
  ipcMain.handle('team:request-sync', () => {
    if (teamServer && db) {
      mainWindow?.webContents.send('team:event', { type: 'status', payload: 'connected' })
      const members = queryAll('SELECT * FROM team_members')
      const teamLists = queryAll("SELECT * FROM lists WHERE scope = 'team'")
      const teamTasks = queryAll("SELECT * FROM tasks WHERE scope = 'team'")
      mainWindow?.webContents.send('team:event', { type: 'sync:full', payload: { members, lists: teamLists, tasks: teamTasks } })
    } else if (teamClient && teamClient.status === 'connected') {
      // Client mode: re-request sync from server
      teamClient.send({ type: 'sync:request', payload: {} })
    }
    return true
  })
  ipcMain.handle('team:send', (_e, msg: { type: string; payload: unknown }) => {
    if (teamClient) {
      teamClient.send(msg)
    } else if (teamServer && db) {
      // Server mode: process message locally, write to DB, broadcast to all clients
      const data = msg.payload as Record<string, unknown>
      const now = new Date().toISOString()
      const senderId = '' // server self

      try {
        if (msg.type === 'task:create') {
          const id = (data.id as string) || crypto.randomUUID()
          db.run(
            `INSERT INTO tasks (id, title, completed, priority, due_date, list_id, notes, pinned, sort_order, scope, created_by, created_at, updated_at)
             VALUES (?, ?, 0, ?, ?, ?, '', 0, 0, 'team', ?, ?, ?)`,
            [id, data.title, data.priority || 'medium', data.dueDate || null, data.listId || 'default', senderId, now, now]
          )
          const task = queryAll('SELECT * FROM tasks WHERE id = ?', [id])[0]
          const broadcast = { type: 'task:created', payload: { task, by: senderId } }
          teamServer.broadcast(broadcast)
          mainWindow?.webContents.send('team:event', broadcast)
        } else if (msg.type === 'task:update') {
          const fields: string[] = []
          const values: unknown[] = []
          for (const key of ['title', 'completed', 'priority', 'due_date', 'list_id', 'notes', 'pinned', 'sort_order', 'assigned_to']) {
            if (key in data) { fields.push(`${key} = ?`); values.push(data[key]) }
          }
          if (fields.length > 0) {
            fields.push("updated_at = ?")
            values.push(now, data.id)
            db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values)
          }
          const broadcast = { type: 'task:updated', payload: { id: data.id, ...data, by: senderId } }
          teamServer.broadcast(broadcast)
          mainWindow?.webContents.send('team:event', broadcast)
        } else if (msg.type === 'task:delete') {
          db.run('DELETE FROM tasks WHERE id = ?', [data.id])
          const broadcast = { type: 'task:deleted', payload: { id: data.id, by: senderId } }
          teamServer.broadcast(broadcast)
          mainWindow?.webContents.send('team:event', broadcast)
        } else if (msg.type === 'list:create') {
          const id = (data.id as string) || crypto.randomUUID()
          const r = db.exec("SELECT COALESCE(MAX(sort_order), -1) as m FROM lists WHERE scope = 'team'")
          const maxOrder = (r.length > 0 && r[0].values.length > 0) ? (r[0].values[0][0] as number) : -1
          db.run("INSERT INTO lists (id, name, color, sort_order, scope, created_by) VALUES (?, ?, ?, ?, 'team', ?)",
            [id, data.name, data.color || '#6366f1', maxOrder + 1, senderId])
          const list = queryAll('SELECT * FROM lists WHERE id = ?', [id])[0]
          const broadcast = { type: 'list:created', payload: { list, by: senderId } }
          teamServer.broadcast(broadcast)
          mainWindow?.webContents.send('team:event', broadcast)
        } else if (msg.type === 'list:delete') {
          db.run("UPDATE tasks SET list_id = 'default' WHERE list_id = ?", [data.id])
          db.run('DELETE FROM lists WHERE id = ?', [data.id])
          const broadcast = { type: 'list:deleted', payload: { id: data.id, by: senderId } }
          teamServer.broadcast(broadcast)
          mainWindow?.webContents.send('team:event', broadcast)
        } else if (msg.type === 'task:reorder') {
          const items = data.items as Array<{ id: string; sort_order: number; list_id: string }>
          for (const item of items) {
            db.run('UPDATE tasks SET sort_order = ?, list_id = ?, updated_at = ? WHERE id = ?',
              [item.sort_order, item.list_id, now, item.id])
          }
          const broadcastMsg = { type: 'task:reorder', payload: { items }, senderId }
          teamServer.broadcast(broadcastMsg)
          mainWindow?.webContents.send('team:event', broadcastMsg)
        }
        saveDatabase()
      } catch (e) {
        console.error('[TeamServer] Process error:', e)
      }
    }
    return true
  })
  ipcMain.handle('team:get-status', () => {
    if (teamServer) {
      const ips = getLocalIPs()
      return { status: 'connected', memberCount: teamServer.memberCount, ip: ips[0] || '', port: 5174 }
    }
    if (teamClient) return { status: teamClient.status }
    return { status: 'disabled' }
  })
  ipcMain.handle('team:get-members', () => {
    if (!db) return []
    const stmt = db.prepare('SELECT * FROM team_members ORDER BY name')
    const cols = stmt.getColumnNames()
    const rows: Record<string, unknown>[] = []
    while (stmt.step()) {
      const vals = stmt.get()
      const row: Record<string, unknown> = {}
      cols.forEach((c, i) => { row[c] = vals[i] })
      rows.push(row)
    }
    stmt.free()
    return rows
  })
}

// ── Init ──────────────────────────────────────────────────

async function init() {
  SQL = await initSqlJs()
  loadDatabase()
  initSchema()
  setupIPC()
  // Auto-start team if previously configured
  const teamConfig = readTeamConfig()
  if (teamConfig.role && teamConfig.member.id) {
    startTeam(teamConfig.role as 'server' | 'client', teamConfig)
  }
  createWindow()
  createTray()
  // Reminders disabled — not useful for this use case
  // startReminders()
}

app.whenReady().then(init)

app.on('before-quit', () => {
  stopTeam()
  saveDatabase()
  backupDatabase()
  stopReminders()
})

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
})
