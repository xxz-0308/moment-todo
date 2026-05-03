import { useState, useCallback, useRef } from 'react'
import { Reorder } from 'framer-motion'
import { Plus, ArrowUpDown } from 'lucide-react'
import { useStore, type Task } from '@/store'
import { TaskItem, ReorderableTaskItem } from './TaskItem'
import { EmptyState } from './EmptyState'

export function TaskList() {
  const tasks = useStore((s) => s.tasks)
  const currentView = useStore((s) => s.currentView)
  const lists = useStore((s) => s.lists)
  const addTask = useStore((s) => s.addTask)
  const reorderTasks = useStore((s) => s.reorderTasks)
  const selectedTaskId = useStore((s) => s.selectedTaskId)
  const selectTask = useStore((s) => s.selectTask)

  const [newTitle, setNewTitle] = useState('')
  const [sortManual, setSortManual] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const getFilteredTasks = useCallback((): Task[] => {
    const today = new Date().toISOString().split('T')[0]
    const active = tasks.filter((t) => !t.completed)
    const completed = tasks.filter((t) => t.completed)

    switch (currentView) {
      case 'today':
        return active.filter((t) => t.due_date === today)
      case 'upcoming':
        return active.filter((t) => t.due_date && t.due_date > today)
      case 'completed':
        return completed
      default:
        return active.filter((t) => t.list_id === currentView)
    }
  }, [tasks, currentView])

  const filtered = getFilteredTasks()

  // Sort: priority + due date
  const sortedTasks = sortManual
    ? filtered
    : [...filtered].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
        if (pDiff !== 0) return pDiff
        if (a.due_date && !b.due_date) return -1
        if (!a.due_date && b.due_date) return 1
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        return a.sort_order - b.sort_order
      })

  const handleAddTask = async () => {
    if (!newTitle.trim()) return
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    let listId = 'default'
    let dueDate: string | null = null

    if (currentView === 'today') {
      dueDate = today
    } else if (currentView === 'upcoming') {
      dueDate = tomorrow
    } else if (!['completed'].includes(currentView)) {
      listId = currentView
    }

    await addTask(newTitle.trim(), 'medium', dueDate, listId)
    setNewTitle('')
    inputRef.current?.focus()
  }

  const handleReorder = (reordered: Task[]) => {
    const items = reordered.map((task, index) => ({
      id: task.id,
      sort_order: index,
      list_id: task.list_id,
    }))
    reorderTasks(items)
  }

  const getViewTitle = () => {
    switch (currentView) {
      case 'today':
        return '今天'
      case 'upcoming':
        return '计划日程'
      case 'completed':
        return '已完成'
      default:
        return lists.find((l) => l.id === currentView)?.name || '任务'
    }
  }

  const isCompletedView = currentView === 'completed'

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">{getViewTitle()}</h1>
        <button
          onClick={() => setSortManual(!sortManual)}
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium
            transition-colors
            ${sortManual
              ? 'bg-accent-muted text-accent'
              : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
            }
          `}
        >
          <ArrowUpDown size={13} strokeWidth={2} />
          <span>{sortManual ? '手动排序' : '自动排序'}</span>
        </button>
      </div>

      {/* Quick add input */}
      {!isCompletedView && (
        <div className="px-6 pb-3">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-secondary border border-border-subtle focus-within:border-accent/40 transition-colors">
            <Plus size={17} strokeWidth={2} className="text-text-tertiary flex-shrink-0" />
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask()
              }}
              placeholder="添加任务，回车创建..."
              className="flex-1 bg-transparent text-[14px] text-text-primary placeholder-text-tertiary outline-none"
            />
          </div>
        </div>
      )}

      {/* Task list */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-4"
        onClick={() => selectTask(null)}>
        {sortedTasks.length === 0 ? (
          <EmptyState view={currentView} />
        ) : sortManual ? (
          <Reorder.Group
            axis="y"
            values={sortedTasks}
            onReorder={handleReorder}
            className="space-y-1"
          >
            {sortedTasks.map((task) => (
              <ReorderableTaskItem
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                onSelect={() =>
                  selectTask(selectedTaskId === task.id ? null : task.id)
                }
                showCompletedState={isCompletedView}
              />
            ))}
          </Reorder.Group>
        ) : (
          <div className="space-y-1">
            {sortedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isSelected={selectedTaskId === task.id}
                onSelect={() =>
                  selectTask(selectedTaskId === task.id ? null : task.id)
                }
                showCompletedState={isCompletedView}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
