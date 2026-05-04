import { app, BrowserWindow, Tray, Menu, ipcMain, Notification, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let db: Database | null = null
let SQL: SqlJsStatic | null = null
let reminderInterval: ReturnType<typeof setInterval> | null = null
const notifiedTasks = new Set<string>()

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

  const result = db.exec('SELECT COUNT(*) as count FROM lists')
  const count = result.length > 0 ? (result[0].values[0][0] as number) : 0
  if (count === 0) {
    db.run("INSERT INTO lists (id, name, color, sort_order) VALUES ('default', ?, '#6366f1', 0)", ['全部'])
    db.run("INSERT INTO lists (id, name, color, sort_order) VALUES ('work', ?, '#f59e0b', 1)", ['工作'])
    db.run("INSERT INTO lists (id, name, color, sort_order) VALUES ('personal', ?, '#10b981', 2)", ['个人'])
  }
  // Migrations
  db.run("UPDATE lists SET name = '全部' WHERE id = 'default' AND name = '收集箱'")
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

// ── Window ────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 660,
    minWidth: 500,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f0f',
    show: false,
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

  mainWindow.on('close', (e) => {
    saveDatabase()
    backupDatabase()
    if (mainWindow && !mainWindow.isDestroyed()) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

// ── Tray ──────────────────────────────────────────────────

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
}

// ── Init ──────────────────────────────────────────────────

async function init() {
  SQL = await initSqlJs()
  loadDatabase()
  initSchema()
  setupIPC()
  createWindow()
  createTray()
  // Reminders disabled — not useful for this use case
  // startReminders()
}

app.whenReady().then(init)

app.on('before-quit', () => {
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
