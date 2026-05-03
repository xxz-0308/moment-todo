import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Plus, ArrowUpDown, Calendar, X, Filter, Trash2, Flag, ListChecks } from 'lucide-react'
import { useStore, type Task } from '@/store'
import { TaskItem, ReorderableTaskItem } from './TaskItem'
import { EmptyState } from './EmptyState'

function quickDates(): { label: string; value: string | null }[] {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  return [
    { label: '今天', value: today },
    { label: '明天', value: tomorrow },
    { label: '下周', value: nextWeek },
    { label: '无日期', value: null },
  ]
}

export function TaskList() {
  const tasks = useStore((s) => s.tasks)
  const currentView = useStore((s) => s.currentView)
  const lists = useStore((s) => s.lists)
  const addTask = useStore((s) => s.addTask)
  const reorderTasks = useStore((s) => s.reorderTasks)
  const selectedTaskId = useStore((s) => s.selectedTaskId)
  const selectTask = useStore((s) => s.selectTask)
  const restoredTaskId = useStore((s) => s.restoredTaskId)

  const [newTitle, setNewTitle] = useState('')
  const [sortManual, setSortManual] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [quickDueDate, setQuickDueDate] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [multiSelectIds, setMultiSelectIds] = useState<Set<string>>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLDivElement>(null)

  const updateTask = useStore((s) => s.updateTask)
  const removeTask = useStore((s) => s.removeTask)

  const getFilteredTasks = useCallback((): Task[] => {
    const today = new Date().toISOString().split('T')[0]
    const active = tasks.filter((t) => !t.completed)
    const completed = tasks.filter((t) => t.completed)

    switch (currentView) {
      case 'today':
        return active.filter((t) => t.due_date === today)
      case 'upcoming':
        return active.filter((t) => t.due_date && t.due_date >= today)
      case 'completed':
        return completed
      default:
        return active.filter((t) => t.list_id === currentView)
    }
  }, [tasks, currentView])

  let filtered = getFilteredTasks()

  // Apply quick filter chip
  if (activeFilter === 'high') {
    filtered = filtered.filter((t) => t.priority === 'high')
  } else if (activeFilter === 'due') {
    filtered = filtered.filter((t) => !!t.due_date)
  } else if (activeFilter === 'notes') {
    filtered = filtered.filter((t) => !!t.notes)
  }

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
      dueDate = quickDueDate // from mini date picker
    }

    await addTask(newTitle.trim(), 'medium', dueDate, listId)
    setNewTitle('')
    setQuickDueDate(null)
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
      case 'today': return '今天'
      case 'upcoming': return '计划日程'
      case 'completed': return '已完成'
      default: return lists.find((l) => l.id === currentView)?.name || '任务'
    }
  }

  const isCompletedView = currentView === 'completed'
  const isListView = !['today', 'upcoming', 'completed'].includes(currentView)

  const handleTaskClick = (taskId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation()
      setMultiSelectIds((prev) => {
        const next = new Set(prev)
        if (next.has(taskId)) next.delete(taskId)
        else next.add(taskId)
        return next
      })
      return
    }
    // Normal click
    selectTask(selectedTaskId === taskId ? null : taskId)
  }

  const clearMultiSelect = () => setMultiSelectIds(new Set())

  const batchDelete = async () => {
    for (const id of multiSelectIds) {
      await removeTask(id)
    }
    clearMultiSelect()
  }

  const batchSetPriority = async (priority: string) => {
    for (const id of multiSelectIds) {
      await updateTask(id, { priority } as any)
    }
    clearMultiSelect()
  }

  const batchMoveToList = async (listId: string) => {
    for (const id of multiSelectIds) {
      await updateTask(id, { list_id: listId } as any)
    }
    clearMultiSelect()
  }

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
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-secondary border border-border-subtle focus-within:border-accent/40 transition-colors">
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

            {/* Date quick-pick for list views */}
            {isListView && (
              <div className="relative flex-shrink-0" ref={dateRef}>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`
                    w-7 h-7 flex items-center justify-center rounded-lg transition-colors
                    ${quickDueDate
                      ? 'bg-accent-muted text-accent'
                      : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary'
                    }
                  `}
                >
                  <Calendar size={14} strokeWidth={2} />
                </button>
                {quickDueDate && (
                  <button
                    onClick={() => setQuickDueDate(null)}
                    className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-surface-tertiary text-text-tertiary hover:text-text-primary"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                )}

                <AnimatePresence>
                  {showDatePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 z-30 bg-surface-tertiary border border-border rounded-xl shadow-xl p-1.5 w-32"
                    >
                      {quickDates().map((d) => (
                        <button
                          key={d.label}
                          onClick={() => {
                            setQuickDueDate(d.value)
                            setShowDatePicker(false)
                            inputRef.current?.focus()
                          }}
                          className={`
                            w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-colors
                            ${quickDueDate === d.value
                              ? 'bg-accent-muted text-accent'
                              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                            }
                          `}
                        >
                          {d.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter chips */}
      {!isCompletedView && (
        <div className="flex items-center gap-1.5 px-6 pb-3">
          <Filter size={12} strokeWidth={2} className="text-text-tertiary mr-0.5" />
          {[
            { id: 'high', label: '高优先级' },
            { id: 'due', label: '有截止日期' },
            { id: 'notes', label: '有备注' },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(activeFilter === chip.id ? null : chip.id)}
              className={`
                px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all
                ${activeFilter === chip.id
                  ? 'bg-accent text-white'
                  : 'bg-surface-tertiary text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
                }
              `}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Batch action bar */}
      <AnimatePresence>
        {multiSelectIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-6 pb-2"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-muted border border-accent/20">
              <span className="text-[12px] font-medium text-accent">
                已选 {multiSelectIds.size} 项
              </span>
              <div className="flex-1" />
              <button
                onClick={batchDelete}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-danger hover:bg-danger-muted transition-colors"
              >
                <Trash2 size={13} strokeWidth={2} />
                删除
              </button>
              <button
                onClick={() => batchSetPriority('high')}
                className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-[var(--color-danger)] hover:bg-[rgba(239,68,68,0.12)] transition-colors"
              >
                <Flag size={13} strokeWidth={2} className="inline mr-1" />
                高优先级
              </button>
              <button
                onClick={() => batchSetPriority('low')}
                className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-text-tertiary hover:bg-surface-hover transition-colors"
              >
                低优先级
              </button>
              <button
                onClick={clearMultiSelect}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X size={13} strokeWidth={2} />
                取消
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                onSelect={(e: React.MouseEvent) => handleTaskClick(task.id, e)}
                isMultiSelected={multiSelectIds.has(task.id)}
                showCompletedState={isCompletedView}
                flashHighlight={restoredTaskId === task.id}
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
                onSelect={(e: React.MouseEvent) => handleTaskClick(task.id, e)}
                isMultiSelected={multiSelectIds.has(task.id)}
                showCompletedState={isCompletedView}
                flashHighlight={restoredTaskId === task.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
