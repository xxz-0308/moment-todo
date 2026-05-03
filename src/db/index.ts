import type { Task, List } from '@/store'

const api = window.electronAPI

function generateId(): string {
  return crypto.randomUUID()
}

// Tasks
export async function fetchTasks(): Promise<Task[]> {
  return (await api.dbQuery(
    'SELECT * FROM tasks ORDER BY sort_order ASC, created_at DESC'
  )) as Task[]
}

export async function fetchTasksByView(view: string): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0]
  switch (view) {
    case 'today':
      return (await api.dbQuery(
        'SELECT * FROM tasks WHERE completed = 0 AND due_date = ? ORDER BY sort_order ASC, created_at DESC',
        [today]
      )) as Task[]
    case 'upcoming':
      return (await api.dbQuery(
        'SELECT * FROM tasks WHERE completed = 0 AND due_date > ? ORDER BY due_date ASC, sort_order ASC',
        [today]
      )) as Task[]
    case 'completed':
      return (await api.dbQuery(
        'SELECT * FROM tasks WHERE completed = 1 ORDER BY updated_at DESC LIMIT 100'
      )) as Task[]
    default:
      // list_id
      return (await api.dbQuery(
        'SELECT * FROM tasks WHERE completed = 0 AND list_id = ? ORDER BY sort_order ASC, created_at DESC',
        [view]
      )) as Task[]
  }
}

export async function createTask(task: {
  title: string
  priority?: string
  dueDate?: string | null
  listId?: string
  notes?: string
  sortOrder?: number
}): Promise<Task> {
  const id = generateId()
  const now = new Date().toISOString()
  // Use provided sort_order, or append to end of list
  const sortOrder = task.sortOrder !== undefined
    ? task.sortOrder
    : (((await api.dbGet(
        'SELECT MAX(sort_order) as max_order FROM tasks WHERE list_id = ?',
        [task.listId || 'default']
      )) as { max_order: number | null })?.max_order ?? -1) + 1

  await api.dbRun(
    `INSERT INTO tasks (id, title, priority, due_date, list_id, notes, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      task.title,
      task.priority || 'medium',
      task.dueDate || null,
      task.listId || 'default',
      task.notes || '',
      sortOrder,
      now,
      now,
    ]
  )
  return (await api.dbGet('SELECT * FROM tasks WHERE id = ?', [id])) as Task
}

export async function updateTask(
  id: string,
  updates: Partial<Pick<Task, 'title' | 'completed' | 'priority' | 'due_date' | 'list_id' | 'notes' | 'sort_order'>>
): Promise<void> {
  const fields: string[] = []
  const values: unknown[] = []

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`)
    values.push(value)
  }
  fields.push("updated_at = ?")
  values.push(new Date().toISOString())
  values.push(id)

  await api.dbRun(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values)
}

export async function reorderTasks(items: { id: string; sort_order: number; list_id: string }[]): Promise<void> {
  const stmt = 'UPDATE tasks SET sort_order = ?, list_id = ? WHERE id = ?'
  for (const item of items) {
    await api.dbRun(stmt, [item.sort_order, item.list_id, item.id])
  }
}

export async function deleteTask(id: string): Promise<void> {
  await api.dbRun('DELETE FROM tasks WHERE id = ?', [id])
}

export async function getTask(id: string): Promise<Task | null> {
  return (await api.dbGet('SELECT * FROM tasks WHERE id = ?', [id])) as Task | null
}

// Lists
export async function fetchLists(): Promise<List[]> {
  return (await api.dbQuery('SELECT * FROM lists ORDER BY sort_order ASC')) as List[]
}

export async function createList(name: string, color?: string): Promise<List> {
  const id = generateId()
  const last = (await api.dbGet('SELECT MAX(sort_order) as max_order FROM lists')) as { max_order: number | null }
  const sortOrder = (last?.max_order ?? -1) + 1
  await api.dbRun(
    'INSERT INTO lists (id, name, color, sort_order) VALUES (?, ?, ?, ?)',
    [id, name, color || '#6366f1', sortOrder]
  )
  return (await api.dbGet('SELECT * FROM lists WHERE id = ?', [id])) as List
}

export async function deleteList(id: string): Promise<void> {
  // Move tasks to default list first
  await api.dbRun("UPDATE tasks SET list_id = 'default' WHERE list_id = ?", [id])
  await api.dbRun('DELETE FROM lists WHERE id = ?', [id])
}

// Settings
export async function getSetting(key: string): Promise<string | null> {
  const row = (await api.dbGet('SELECT value FROM settings WHERE key = ?', [key])) as { value: string } | undefined
  return row?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await api.dbRun(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
    [key, value, value]
  )
}

// Search
export async function searchTasks(query: string): Promise<Task[]> {
  return (await api.dbQuery(
    "SELECT * FROM tasks WHERE title LIKE ? OR notes LIKE ? ORDER BY updated_at DESC LIMIT 20",
    [`%${query}%`, `%${query}%`]
  )) as Task[]
}

// Stats
export async function getStats(): Promise<{
  total: number
  completed: number
  overdue: number
  byList: { name: string; count: number }[]
  byDay: { date: string; completed: number }[]
}> {
  const total = (await api.dbGet('SELECT COUNT(*) as count FROM tasks WHERE completed = 0')) as { count: number }
  const completed = (await api.dbGet('SELECT COUNT(*) as count FROM tasks WHERE completed = 1')) as { count: number }
  const today = new Date().toISOString().split('T')[0]
  const overdue = (await api.dbGet(
    'SELECT COUNT(*) as count FROM tasks WHERE completed = 0 AND due_date IS NOT NULL AND due_date < ?',
    [today]
  )) as { count: number }
  const byList = (await api.dbQuery(
    `SELECT l.name, COUNT(t.id) as count
     FROM tasks t JOIN lists l ON t.list_id = l.id
     WHERE t.completed = 0
     GROUP BY l.name ORDER BY count DESC`
  )) as { name: string; count: number }[]
  const byDay = (await api.dbQuery(
    `SELECT date(updated_at) as date, COUNT(*) as completed
     FROM tasks WHERE completed = 1 AND updated_at >= date('now', '-7 days')
     GROUP BY date ORDER BY date ASC`
  )) as { date: string; completed: number }[]

  return {
    total: total.count,
    completed: completed.count,
    overdue: overdue.count,
    byList,
    byDay,
  }
}

// Backup & Export
export async function backupDatabase(): Promise<void> {
  await api.dbBackup()
}

export async function exportJSON(): Promise<string> {
  return await api.dbExportJSON()
}
