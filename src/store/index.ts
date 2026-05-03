import { create } from 'zustand'
import * as db from '@/db'

// Types
export interface Task {
  id: string
  title: string
  completed: number
  priority: 'high' | 'medium' | 'low'
  due_date: string | null
  list_id: string
  notes: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface List {
  id: string
  name: string
  color: string | null
  sort_order: number
  created_at: string
}

export type ViewType = 'today' | 'upcoming' | 'completed' | string

interface UndoAction {
  type: 'delete' | 'complete' | 'update'
  task: Task
  previousValues?: Partial<Task>
  timestamp: number
}

interface ToastMessage {
  id: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

interface AppState {
  theme: 'dark' | 'light'
  toggleTheme: () => void
  setTheme: (theme: 'dark' | 'light') => void

  tasks: Task[]
  lists: List[]
  currentView: ViewType
  selectedTaskId: string | null
  selectedTask: Task | null

  showCommandPalette: boolean
  showSettings: boolean
  showStats: boolean
  showQuickAdd: boolean
  searchQuery: string
  toasts: ToastMessage[]

  undoStack: UndoAction[]
  loading: boolean

  loadData: () => Promise<void>
  setCurrentView: (view: ViewType) => void
  selectTask: (taskId: string | null) => void

  addTask: (title: string, priority?: string, dueDate?: string | null, listId?: string) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  toggleComplete: (id: string) => Promise<void>
  removeTask: (id: string) => Promise<void>
  reorderTask: (taskId: string, newOrder: number, listId: string) => Promise<void>
  reorderTasks: (items: { id: string; sort_order: number; list_id: string }[]) => Promise<void>

  addList: (name: string, color?: string) => Promise<void>
  removeList: (id: string) => Promise<void>

  undo: () => Promise<void>
  pushUndo: (action: UndoAction) => void

  toggleCommandPalette: () => void
  toggleSettings: () => void
  toggleStats: () => void
  toggleQuickAdd: () => void
  addToast: (message: string, action?: { label: string; onClick: () => void }) => void
  removeToast: (id: string) => void

  searchResults: Task[]
  search: (query: string) => Promise<void>
  clearSearch: () => void
}

export const useStore = create<AppState>((set, get) => ({
  theme: 'dark',
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
  loading: true,
  searchResults: [],

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: newTheme })
    document.documentElement.classList.toggle('light', newTheme === 'light')
  },

  setTheme: (theme) => {
    set({ theme })
    document.documentElement.classList.toggle('light', theme === 'light')
  },

  loadData: async () => {
    set({ loading: true })
    try {
      const [tasks, lists] = await Promise.all([db.fetchTasks(), db.fetchLists()])
      set({ tasks, lists, loading: false })
    } catch (e) {
      console.error('Failed to load data:', e)
      set({ loading: false })
      get().addToast('加载数据失败，请重启应用')
    }
  },

  setCurrentView: (view) => {
    set({ currentView: view, selectedTaskId: null, selectedTask: null })
  },

  selectTask: (taskId) => {
    if (!taskId) {
      set({ selectedTaskId: null, selectedTask: null })
      return
    }
    const task = get().tasks.find((t) => t.id === taskId) || null
    set({ selectedTaskId: taskId, selectedTask: task })
  },

  // ── Optimistic mutations (no loadData, update local state directly) ──

  addTask: async (title, priority = 'medium', dueDate = null, listId) => {
    try {
      const currentView = get().currentView
      const actualListId = listId || (['today', 'upcoming', 'completed'].includes(currentView) ? 'default' : currentView)
      const task = await db.createTask({ title, priority, dueDate, listId: actualListId })
      set((s) => ({ tasks: [task, ...s.tasks] }))
      return task
    } catch (e) {
      console.error('Failed to add task:', e)
      get().addToast('添加任务失败')
      throw e
    }
  },

  updateTask: async (id, updates) => {
    const currentTask = get().tasks.find((t) => t.id === id)
    if (!currentTask) return

    if (updates.completed === undefined) {
      get().pushUndo({
        type: 'update',
        task: { ...currentTask },
        previousValues: { ...currentTask },
        timestamp: Date.now(),
      })
    }

    await db.updateTask(id, updates)
    const now = new Date().toISOString()
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updated_at: now } : t
      ),
    }))
    // Refresh selected task
    const refreshed = get().tasks.find((t) => t.id === id) || null
    set({ selectedTask: refreshed })
  },

  toggleComplete: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return

    const newCompleted = task.completed ? 0 : 1
    try {
      await db.updateTask(id, { completed: newCompleted })

      if (newCompleted) {
        get().pushUndo({ type: 'complete', task: { ...task }, timestamp: Date.now() })
        get().addToast(`已完成: ${task.title}`, {
          label: '撤销',
          onClick: async () => { await get().undo() },
        })
      }

      const now = new Date().toISOString()
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id ? { ...t, completed: newCompleted, updated_at: now } : t
        ),
      }))

      const refreshed = get().tasks.find((t) => t.id === id) || null
      set({ selectedTask: refreshed })
    } catch (e) {
      console.error('Failed to toggle task:', e)
      get().addToast('操作失败')
    }
  },

  removeTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return

    get().pushUndo({ type: 'delete', task: { ...task }, timestamp: Date.now() })

    try {
      await db.deleteTask(id)
      set((s) => ({
        tasks: s.tasks.filter((t) => t.id !== id),
        selectedTaskId: null,
        selectedTask: null,
      }))

      get().addToast(`已删除: ${task.title}`, {
        label: '撤销',
        onClick: () => { get().undo() },
      })
    } catch (e) {
      console.error('Failed to remove task:', e)
      get().addToast('删除失败')
    }
  },

  reorderTask: async (taskId, newOrder, listId) => {
    await db.updateTask(taskId, { sort_order: newOrder, list_id: listId })
  },

  reorderTasks: async (items) => {
    await db.reorderTasks(items)
    const itemMap = new Map(items.map((i) => [i.id, i]))
    set((s) => {
      const updated = s.tasks.map((t) => {
        const update = itemMap.get(t.id)
        return update ? { ...t, sort_order: update.sort_order, list_id: update.list_id } : t
      })
      // Sort by sort_order so manual-sort view picks up the new order
      updated.sort((a, b) => a.sort_order - b.sort_order)
      return { tasks: updated }
    })
  },

  addList: async (name, color) => {
    const list = await db.createList(name, color)
    set((s) => ({ lists: [...s.lists, list] }))
  },

  removeList: async (id) => {
    await db.deleteList(id)
    set((s) => ({
      lists: s.lists.filter((l) => l.id !== id),
      currentView: s.currentView === id ? 'today' : s.currentView,
      // Move tasks from deleted list to default
      tasks: s.tasks.map((t) =>
        t.list_id === id ? { ...t, list_id: 'default' as string } : t
      ),
    }))
  },

  // ── Undo (needs full reload due to complex state) ──

  undo: async () => {
    const stack = get().undoStack
    if (stack.length === 0) return

    const lastAction = stack[stack.length - 1]
    if (Date.now() - lastAction.timestamp > 30000) {
      set({ undoStack: stack.slice(0, -1) })
      return
    }

    switch (lastAction.type) {
      case 'delete':
        await db.createTask({
          title: lastAction.task.title,
          priority: lastAction.task.priority,
          dueDate: lastAction.task.due_date,
          listId: lastAction.task.list_id,
          notes: lastAction.task.notes,
          sortOrder: lastAction.task.sort_order,
        })
        break
      case 'complete':
        await db.updateTask(lastAction.task.id, { completed: 0 })
        break
      case 'update':
        if (lastAction.previousValues) {
          const prev = lastAction.previousValues
          const updates: Partial<Task> = {}
          if (prev.title !== undefined) updates.title = prev.title
          if (prev.priority !== undefined) updates.priority = prev.priority
          if (prev.due_date !== undefined) updates.due_date = prev.due_date
          if (prev.list_id !== undefined) updates.list_id = prev.list_id
          if (prev.notes !== undefined) updates.notes = prev.notes
          await db.updateTask(lastAction.task.id, updates)
        }
        break
    }

    set({ undoStack: stack.slice(0, -1) })
    await get().loadData()
    get().addToast('已撤销')
  },

  pushUndo: (action) => {
    const stack = [...get().undoStack, action]
    if (stack.length > 20) stack.shift()
    set({ undoStack: stack })
  },

  // ── UI toggles ──

  toggleCommandPalette: () => set((s) => ({ showCommandPalette: !s.showCommandPalette })),
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  toggleStats: () => set((s) => ({ showStats: !s.showStats })),
  toggleQuickAdd: () => set((s) => ({ showQuickAdd: !s.showQuickAdd })),

  addToast: (message, action) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, action }] }))
    setTimeout(() => { get().removeToast(id) }, 5000)
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },

  search: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [] })
      return
    }
    const results = await db.searchTasks(query)
    set({ searchResults: results, searchQuery: query })
  },

  clearSearch: () => set({ searchResults: [], searchQuery: '' }),
}))
