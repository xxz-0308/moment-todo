import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.mock is hoisted — use vi.hoisted for the mock object
const mockDb = vi.hoisted(() => ({
  fetchTasks: vi.fn(),
  fetchLists: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  createList: vi.fn(),
  deleteList: vi.fn(),
  searchTasks: vi.fn(),
  reorderTasks: vi.fn(),
  getStats: vi.fn(),
  backupDatabase: vi.fn(),
  exportJSON: vi.fn(),
}))

vi.mock('@/db', () => mockDb)

import { makeTask, makeList } from '@/__tests__/factories'
import { useStore, type Task, type List } from '@/store'


beforeEach(() => {
  vi.clearAllMocks()
  useStore.setState({
    tasks: [],
    lists: [],
    currentView: 'today',
    selectedTaskId: null,
    selectedTask: null,
    showCommandPalette: false,
    showSettings: false,
    showStats: false,
    showQuickAdd: false,
    searchQuery: '',
    toasts: [],
    undoStack: [],
    loading: false,
    searchResults: [],
  })
  document.documentElement.classList.remove('light')
})

describe('theme', () => {
  it('defaults to dark', () => {
    expect(useStore.getState().theme).toBe('dark')
  })

  it('toggleTheme switches dark ↔ light', () => {
    useStore.getState().toggleTheme()
    expect(useStore.getState().theme).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)

    useStore.getState().toggleTheme()
    expect(useStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('setTheme applies class', () => {
    useStore.getState().setTheme('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    useStore.getState().setTheme('dark')
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })
})

describe('view & selection', () => {
  it('setCurrentView clears selection', () => {
    useStore.setState({ selectedTaskId: 'abc', selectedTask: makeTask({ id: 'abc' }) })
    useStore.getState().setCurrentView('upcoming')
    expect(useStore.getState().currentView).toBe('upcoming')
    expect(useStore.getState().selectedTaskId).toBeNull()
  })

  it('selectTask finds and sets task', () => {
    const task = makeTask({ id: 't1' })
    useStore.setState({ tasks: [task] })
    useStore.getState().selectTask('t1')
    expect(useStore.getState().selectedTaskId).toBe('t1')
    expect(useStore.getState().selectedTask?.title).toBe('Test Task')
  })

  it('selectTask(null) clears', () => {
    useStore.setState({ selectedTaskId: 't1', selectedTask: makeTask({ id: 't1' }) })
    useStore.getState().selectTask(null)
    expect(useStore.getState().selectedTaskId).toBeNull()
  })
})

describe('addTask', () => {
  it('prepends new task to local state', async () => {
    const newTask = makeTask({ id: 'new1', title: 'Buy milk' })
    mockDb.createTask.mockResolvedValue(newTask)

    useStore.setState({ tasks: [makeTask({ id: 'old1' })], currentView: 'default' })
    const result = await useStore.getState().addTask('Buy milk', 'medium', null, 'default')

    expect(result.id).toBe('new1')
    expect(useStore.getState().tasks[0].id).toBe('new1')
    expect(useStore.getState().tasks).toHaveLength(2)
  })

  it('uses default list on preset view', async () => {
    mockDb.createTask.mockResolvedValue(makeTask({ id: 'n1' }))
    useStore.setState({ currentView: 'today' })
    await useStore.getState().addTask('X', 'low', '2026-06-01', undefined)
    expect(mockDb.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ listId: 'default' })
    )
  })

  it('shows error toast on failure', async () => {
    mockDb.createTask.mockRejectedValue(new Error('DB error'))
    useStore.setState({ currentView: 'default' })
    await expect(useStore.getState().addTask('Fail')).rejects.toThrow('DB error')
    expect(useStore.getState().toasts.some((t) => t.message === '添加任务失败')).toBe(true)
  })
})

describe('updateTask', () => {
  it('updates local state optimistically', async () => {
    mockDb.updateTask.mockResolvedValue(undefined)
    useStore.setState({ tasks: [makeTask({ id: 't1', title: 'Old' })] })
    await useStore.getState().updateTask('t1', { title: 'New' } as any)
    expect(useStore.getState().tasks[0].title).toBe('New')
  })

  it('pushes undo for non-completion updates', async () => {
    mockDb.updateTask.mockResolvedValue(undefined)
    useStore.setState({ tasks: [makeTask({ id: 't1' })] })
    await useStore.getState().updateTask('t1', { priority: 'high' } as any)
    expect(useStore.getState().undoStack).toHaveLength(1)
  })

  it('does NOT push undo for completion', async () => {
    mockDb.updateTask.mockResolvedValue(undefined)
    useStore.setState({ tasks: [makeTask({ id: 't1' })] })
    await useStore.getState().updateTask('t1', { completed: 1 } as any)
    expect(useStore.getState().undoStack).toHaveLength(0)
  })
})

describe('toggleComplete', () => {
  it('toggles 0→1 and pushes undo + toast', async () => {
    mockDb.updateTask.mockResolvedValue(undefined)
    useStore.setState({ tasks: [makeTask({ id: 't1', title: 'Done', completed: 0 })] })
    await useStore.getState().toggleComplete('t1')
    expect(useStore.getState().tasks[0].completed).toBe(1)
    expect(useStore.getState().undoStack).toHaveLength(1)
    expect(useStore.getState().toasts.some((t) => t.message.includes('已完成'))).toBe(true)
  })
})

describe('removeTask', () => {
  it('removes from state + pushes undo + toast', async () => {
    mockDb.deleteTask.mockResolvedValue(undefined)
    useStore.setState({ tasks: [makeTask({ id: 't1', title: 'Deleted' })] })
    await useStore.getState().removeTask('t1')
    expect(useStore.getState().tasks).toHaveLength(0)
    expect(useStore.getState().undoStack).toHaveLength(1)
    expect(useStore.getState().toasts.some((t) => t.message.includes('已删除'))).toBe(true)
  })
})

describe('undo', () => {
  it('restores deleted task with sort_order', async () => {
    const task = makeTask({ id: 't1', title: 'Restored', sort_order: 42 })
    useStore.setState({ undoStack: [{ type: 'delete', task, timestamp: Date.now() }] })
    mockDb.createTask.mockResolvedValue(makeTask({ id: 't1' }))
    mockDb.fetchTasks.mockResolvedValue([])
    mockDb.fetchLists.mockResolvedValue([])

    await useStore.getState().undo()
    expect(mockDb.createTask).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 42 }))
  })

  it('undes complete', async () => {
    const task = makeTask({ id: 't1', completed: 1 })
    useStore.setState({ undoStack: [{ type: 'complete', task: { ...task }, timestamp: Date.now() }] })
    mockDb.updateTask.mockResolvedValue(undefined)
    mockDb.fetchTasks.mockResolvedValue([])
    mockDb.fetchLists.mockResolvedValue([])

    await useStore.getState().undo()
    expect(mockDb.updateTask).toHaveBeenCalledWith('t1', { completed: 0 })
  })

  it('expires after 30s', async () => {
    useStore.setState({ undoStack: [{ type: 'delete', task: makeTask({ id: 't1' }), timestamp: Date.now() - 31000 }] })
    await useStore.getState().undo()
    expect(mockDb.createTask).not.toHaveBeenCalled()
    expect(useStore.getState().undoStack).toHaveLength(0)
  })
})

describe('lists', () => {
  it('addList appends', async () => {
    mockDb.createList.mockResolvedValue(makeList({ id: 'l1', name: 'New' }))
    await useStore.getState().addList('New', '#ff0000')
    expect(useStore.getState().lists[0].name).toBe('New')
  })

  it('removeList moves tasks to default', async () => {
    mockDb.deleteList.mockResolvedValue(undefined)
    useStore.setState({
      lists: [makeList({ id: 'work' })],
      tasks: [makeTask({ id: 't1', list_id: 'work' })],
      currentView: 'work',
    })
    await useStore.getState().removeList('work')
    expect(useStore.getState().currentView).toBe('today')
    expect(useStore.getState().tasks[0].list_id).toBe('default')
  })
})

describe('reorderTasks', () => {
  it('updates sort_order and re-sorts local array', async () => {
    mockDb.reorderTasks.mockResolvedValue(undefined)
    useStore.setState({
      tasks: [
        makeTask({ id: 'a', sort_order: 0 }),
        makeTask({ id: 'b', sort_order: 1 }),
        makeTask({ id: 'c', sort_order: 2 }),
      ],
    })

    // Reverse order: c=0, b=1, a=2
    await useStore.getState().reorderTasks([
      { id: 'c', sort_order: 0, list_id: 'default' },
      { id: 'b', sort_order: 1, list_id: 'default' },
      { id: 'a', sort_order: 2, list_id: 'default' },
    ])

    const tasks = useStore.getState().tasks
    expect(tasks[0].id).toBe('c')
  })
})

describe('toasts', () => {
  it('auto-removes after 5s', () => {
    vi.useFakeTimers()
    useStore.getState().addToast('Test')
    expect(useStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(5000)
    expect(useStore.getState().toasts).toHaveLength(0)
    vi.useRealTimers()
  })
})

describe('loadData', () => {
  it('fetches tasks and lists', async () => {
    mockDb.fetchTasks.mockResolvedValue([makeTask({ id: 't1' })])
    mockDb.fetchLists.mockResolvedValue([makeList({ id: 'default' })])
    await useStore.getState().loadData()
    expect(useStore.getState().tasks).toHaveLength(1)
    expect(useStore.getState().lists).toHaveLength(1)
    expect(useStore.getState().loading).toBe(false)
  })

  it('shows error toast on failure', async () => {
    mockDb.fetchTasks.mockRejectedValue(new Error('Fail'))
    await useStore.getState().loadData()
    expect(useStore.getState().toasts.some((t) => t.message.includes('加载数据失败'))).toBe(true)
  })
})

describe('scope', () => {
  it('defaults to personal', () => {
    expect(useStore.getState().scope).toBe('personal')
  })

  it('setScope clears selection', () => {
    useStore.setState({ selectedTaskId: 'abc', selectedTask: makeTask() })
    useStore.getState().setScope('team')
    expect(useStore.getState().scope).toBe('team')
    expect(useStore.getState().selectedTaskId).toBeNull()
  })
})
