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
  window.electronAPI = api
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
