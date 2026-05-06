import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.hoisted runs before module imports, so window.electronAPI is set up
// before src/db/index.ts captures it at module level (const api = window.electronAPI).
// This avoids the issue where the global setup's beforeEach creates new mock
// objects but the module still holds a stale reference.
const mockApi = vi.hoisted(() => {
  const api = {
    dbQuery: vi.fn().mockResolvedValue([]),
    dbRun: vi.fn().mockResolvedValue(undefined),
    dbGet: vi.fn().mockResolvedValue(null),
    dbBackup: vi.fn().mockResolvedValue(undefined),
    dbExportJSON: vi.fn().mockResolvedValue('[]'),
  }
  ;(window as any).electronAPI = api
  return api
})

import * as db from '@/db'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchTasks', () => {
  it('queries personal-scope tasks sorted by sort_order, created_at DESC', async () => {
    mockApi.dbQuery.mockResolvedValue([{ id: 't1' }, { id: 't2' }])
    const result = await db.fetchTasks()
    expect(mockApi.dbQuery).toHaveBeenCalledWith(
      "SELECT * FROM tasks WHERE scope = 'personal' OR scope IS NULL ORDER BY sort_order ASC, created_at DESC"
    )
    expect(result).toHaveLength(2)
  })

  it('returns empty array for empty DB', async () => {
    mockApi.dbQuery.mockResolvedValue([])
    expect(await db.fetchTasks()).toEqual([])
  })
})

describe('fetchTasksByView', () => {
  it('today: filters by due_date = today AND completed=0', async () => {
    mockApi.dbQuery.mockResolvedValue([])
    const today = new Date().toISOString().split('T')[0]
    await db.fetchTasksByView('today')
    const sql = mockApi.dbQuery.mock.calls[0][0]
    expect(sql).toContain('due_date = ?')
    expect(mockApi.dbQuery.mock.calls[0][1]).toEqual([today])
  })

  it('upcoming: due_date > today, sorted by due_date ASC', async () => {
    mockApi.dbQuery.mockResolvedValue([])
    await db.fetchTasksByView('upcoming')
    expect(mockApi.dbQuery.mock.calls[0][0]).toContain('due_date > ?')
  })

  it('completed: completed=1, LIMIT 100', async () => {
    mockApi.dbQuery.mockResolvedValue([])
    await db.fetchTasksByView('completed')
    const sql = mockApi.dbQuery.mock.calls[0][0]
    expect(sql).toContain('completed = 1')
    expect(sql).toContain('LIMIT 100')
  })

  it('custom list_id: filters by list_id', async () => {
    mockApi.dbQuery.mockResolvedValue([])
    await db.fetchTasksByView('my-list')
    expect(mockApi.dbQuery.mock.calls[0][1]).toEqual(['my-list'])
  })
})

describe('createTask', () => {
  it('inserts with correct fields and returns created task', async () => {
    const created = { id: 'new1', title: 'Buy milk', priority: 'high', due_date: null, list_id: 'default', notes: '', sort_order: 5, completed: 0, pinned: 0, created_at: '', updated_at: '' }
    mockApi.dbGet.mockResolvedValueOnce({ max_order: 4 })
    mockApi.dbRun.mockResolvedValue(undefined)
    mockApi.dbGet.mockResolvedValueOnce(created)

    const result = await db.createTask({ title: 'Buy milk', priority: 'high' })
    expect(mockApi.dbRun).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tasks'),
      expect.arrayContaining(['Buy milk', 'high'])
    )
    expect(result.title).toBe('Buy milk')
  })

  it('uses explicit sortOrder when provided', async () => {
    mockApi.dbRun.mockResolvedValue(undefined)
    mockApi.dbGet.mockResolvedValue({ id: 't1', sort_order: 10 })
    await db.createTask({ title: 'X', sortOrder: 10 })
    expect(mockApi.dbRun.mock.calls[0][1]).toContain(10)
  })

  it('fills defaults: priority=medium, listId=default, notes=""', async () => {
    mockApi.dbGet.mockResolvedValueOnce({ max_order: -1 })
    mockApi.dbRun.mockResolvedValue(undefined)
    mockApi.dbGet.mockResolvedValueOnce({ id: 'x' })
    await db.createTask({ title: 'X' })
    const values = mockApi.dbRun.mock.calls[0][1]
    expect(values).toContain('medium')
    expect(values).toContain('default')
  })
})

describe('updateTask', () => {
  it('builds SET clause and appends updated_at', async () => {
    mockApi.dbRun.mockResolvedValue(undefined)
    await db.updateTask('t1', { title: 'New', priority: 'low' })
    const sql = mockApi.dbRun.mock.calls[0][0]
    expect(sql).toContain('title = ?')
    expect(sql).toContain('priority = ?')
    expect(sql).toContain('updated_at = ?')
    expect(mockApi.dbRun.mock.calls[0][1].slice(-1)[0]).toBe('t1')
  })
})

describe('deleteTask', () => {
  it('deletes by id', async () => {
    mockApi.dbRun.mockResolvedValue(undefined)
    await db.deleteTask('t1')
    expect(mockApi.dbRun).toHaveBeenCalledWith('DELETE FROM tasks WHERE id = ?', ['t1'])
  })
})

describe('reorderTasks', () => {
  it('calls UPDATE for each item', async () => {
    mockApi.dbRun.mockResolvedValue(undefined)
    await db.reorderTasks([
      { id: 'a', sort_order: 0, list_id: 'default' },
      { id: 'b', sort_order: 1, list_id: 'work' },
    ])
    expect(mockApi.dbRun).toHaveBeenCalledTimes(2)
  })

  it('empty array is a no-op', async () => {
    await db.reorderTasks([])
    expect(mockApi.dbRun).not.toHaveBeenCalled()
  })
})

describe('fetchLists', () => {
  it('queries personal-scope lists sorted by sort_order', async () => {
    mockApi.dbQuery.mockResolvedValue([])
    await db.fetchLists()
    expect(mockApi.dbQuery).toHaveBeenCalledWith(
      "SELECT * FROM lists WHERE scope = 'personal' OR scope IS NULL ORDER BY sort_order ASC"
    )
  })
})

describe('searchTasks', () => {
  it('passes LIKE params and optional scope', async () => {
    mockApi.dbQuery.mockResolvedValue([])
    await db.searchTasks('milk', 'team')
    expect(mockApi.dbQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND scope = ?'),
      ['%milk%', '%milk%', 'team']
    )
  })
})

describe('getStats', () => {
  it('returns all stat fields', async () => {
    mockApi.dbGet.mockResolvedValueOnce({ count: 5 })
    mockApi.dbGet.mockResolvedValueOnce({ count: 3 })
    mockApi.dbGet.mockResolvedValueOnce({ count: 1 })
    mockApi.dbQuery.mockResolvedValueOnce([{ name: '工作', count: 4 }])
    mockApi.dbQuery.mockResolvedValueOnce([{ date: '2026-05-01', completed: 2 }])

    const r = await db.getStats()
    expect(r.total).toBe(5)
    expect(r.completed).toBe(3)
    expect(r.overdue).toBe(1)
    expect(r.byList).toHaveLength(1)
    expect(r.byDay).toHaveLength(1)
  })

  it('applies date range when fromDate and toDate provided', async () => {
    mockApi.dbGet.mockResolvedValue({ count: 0 })
    mockApi.dbGet.mockResolvedValue({ count: 0 })
    mockApi.dbGet.mockResolvedValue({ count: 0 })
    mockApi.dbQuery.mockResolvedValue([])
    mockApi.dbQuery.mockResolvedValue([])

    await db.getStats('2026-05-01', '2026-05-05')
    const sql = mockApi.dbGet.mock.calls[0][0]
    expect(sql).toContain('updated_at >= ?')
    expect(sql).toContain('updated_at <= ?')
  })
})
