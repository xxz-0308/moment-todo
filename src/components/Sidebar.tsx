import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Plus,
  Hash,
  Trash2,
  BarChart3,
  Settings,
} from 'lucide-react'
import { useStore } from '@/store'

const presetViews = [
  { id: 'today', label: '今天', icon: Calendar },
  { id: 'upcoming', label: '计划日程', icon: CalendarDays },
  { id: 'completed', label: '已完成', icon: CheckCircle2 },
]

export function Sidebar() {
  const currentView = useStore((s) => s.currentView)
  const setCurrentView = useStore((s) => s.setCurrentView)
  const lists = useStore((s) => s.lists)
  const addList = useStore((s) => s.addList)
  const removeList = useStore((s) => s.removeList)
  const toggleSettings = useStore((s) => s.toggleSettings)
  const toggleStats = useStore((s) => s.toggleStats)
  const tasks = useStore((s) => s.tasks)

  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')

  const handleAddList = () => {
    if (newListName.trim()) {
      addList(newListName.trim())
      setNewListName('')
      setShowNewList(false)
    }
  }

  const [dragOverList, setDragOverList] = useState<string | null>(null)
  const updateTask = useStore((s) => s.updateTask)

  const handleDrop = async (e: React.DragEvent, listId: string) => {
    e.preventDefault()
    setDragOverList(null)
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) {
      await updateTask(taskId, { list_id: listId } as any)
    }
  }

  const getTaskCount = (viewId: string) => {
    const today = new Date().toISOString().split('T')[0]
    switch (viewId) {
      case 'today':
        return tasks.filter((t) => !t.completed && t.due_date && t.due_date <= today).length
      case 'upcoming':
        return tasks.filter((t) => !t.completed && t.due_date && t.due_date >= today).length
      case 'completed':
        return tasks.filter((t) => t.completed).length
      default:
        // '全部' shows all; other lists filter by list_id
        return viewId === 'default'
          ? tasks.filter((t) => !t.completed).length
          : tasks.filter((t) => !t.completed && t.list_id === viewId).length
    }
  }

  // Today progress: completed / total for today + overdue
  const activeDue = tasks.filter((t) => !t.completed && t.due_date && t.due_date <= new Date().toISOString().split('T')[0])
  const todayTotal = activeDue.length + tasks.filter((t) => t.completed && t.due_date && t.due_date <= new Date().toISOString().split('T')[0]).length
  const todayCompleted = tasks.filter((t) => t.completed && t.due_date && t.due_date <= new Date().toISOString().split('T')[0]).length
  const todayProgress = todayTotal > 0 ? todayCompleted / todayTotal : 0

  return (
    <aside className="w-[260px] flex-shrink-0 flex flex-col overflow-hidden border-r border-[rgba(255,255,255,0.04)]" style={{ background: 'rgba(22,22,38,0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '4px 0 32px rgba(0,0,0,0.4)' }}>
      {/* Preset views */}
      <nav className="p-3 space-y-0.5">
        {presetViews.map((view) => {
          const Icon = view.icon
          const isActive = currentView === view.id
          const count = getTaskCount(view.id)

          return (
            <motion.button
              key={view.id}
              onClick={() => setCurrentView(view.id)}
              className={`
                w-full flex items-center gap-3 pl-2.5 pr-3 py-2 rounded-lg text-[13px] font-medium
                transition-all duration-150 relative overflow-hidden
                ${isActive
                  ? 'text-text-primary bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] shadow-[0_0_16px_rgba(99,102,241,0.08)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
                }
              `}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent" style={{ boxShadow: '0 0 6px rgba(99,102,241,0.4)' }} />
              )}
              <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? 'text-accent' : ''} />
              <span className="flex-1 text-left">{view.label}</span>
              {view.id === 'today' && todayTotal > 0 ? (
                <svg width="22" height="22" viewBox="0 0 22 22" className="flex-shrink-0" style={{ filter: 'drop-shadow(0 0 3px rgba(99,102,241,0.3))' }}>
                  <circle cx="11" cy="11" r="9" fill="none"
                    stroke="var(--color-border)" strokeWidth="2.5"
                  />
                  <motion.circle cx="11" cy="11" r="9" fill="none"
                    stroke="var(--color-accent)" strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 9}
                    strokeDashoffset={2 * Math.PI * 9 * (1 - todayProgress)}
                    transform="rotate(-90 11 11)"
                    initial={{ strokeDashoffset: 2 * Math.PI * 9 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 9 * (1 - todayProgress) }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </svg>
              ) : count > 0 ? (
                <span className={`
                  text-[11px] font-medium px-1.5 py-0.5 rounded-md min-w-[20px] text-center
                  ${isActive ? 'bg-accent text-white' : 'bg-surface-tertiary text-text-tertiary'}
                `}>
                  {count}
                </span>
              ) : null}
            </motion.button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-[rgba(255,255,255,0.04)]" />

      {/* Custom lists */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between px-3 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
            列表
          </span>
        </div>

        <div className="space-y-0.5">
          <AnimatePresence>
            {lists.map((list) => {
              const isActive = currentView === list.id
              const count = getTaskCount(list.id)

              return (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="group relative"
                >
                  <button
                    onClick={() => setCurrentView(list.id)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverList(list.id) }}
                    onDragLeave={() => setDragOverList(null)}
                    onDrop={(e) => handleDrop(e, list.id)}
                    className={`
                      w-full flex items-center gap-3 pl-2.5 pr-3 py-2 rounded-lg text-[13px] font-medium
                      transition-all duration-150 relative overflow-hidden
                      ${isActive || dragOverList === list.id
                        ? 'text-text-primary bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] shadow-[0_0_16px_rgba(99,102,241,0.08)]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
                      }
                      ${dragOverList === list.id ? 'ring-1 ring-accent scale-[1.02]' : ''}
                    `}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent" style={{ boxShadow: '0 0 6px rgba(99,102,241,0.4)' }} />
                    )}
                    <Hash size={16} strokeWidth={1.8} style={{ color: list.color || '#6366f1' }} />
                    <span className="flex-1 text-left truncate">{list.name}</span>
                    {count > 0 && (
                      <span className={`
                        text-[11px] font-medium px-1.5 py-0.5 rounded-md min-w-[20px] text-center
                        ${isActive ? 'bg-accent text-white' : 'bg-surface-tertiary text-text-tertiary'}
                      `}>
                        {count}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeList(list.id)
                    }}
                    className={`
                      absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center
                      rounded-md text-text-tertiary hover:text-danger hover:bg-danger-muted
                      opacity-0 group-hover:opacity-100 transition-all
                    `}
                  >
                    <Trash2 size={13} strokeWidth={1.8} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Add list */}
        <AnimatePresence mode="wait">
          {showNewList ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1"
            >
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddList()
                  if (e.key === 'Escape') {
                    setShowNewList(false)
                    setNewListName('')
                  }
                }}
                onBlur={() => {
                  if (!newListName.trim()) {
                    setShowNewList(false)
                  }
                }}
                placeholder="列表名称..."
                className="w-full px-3 py-2 rounded-lg bg-surface-tertiary text-[13px] text-text-primary placeholder-text-tertiary outline-none border border-border focus:border-accent transition-colors"
              />
            </motion.div>
          ) : (
            <motion.button
              key="button"
              onClick={() => setShowNewList(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors mt-1"
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} strokeWidth={1.8} />
              <span>新建列表</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.04)] space-y-0.5">
        <motion.button
          onClick={toggleStats}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-[rgba(255,255,255,0.03)] transition-all duration-150"
          whileTap={{ scale: 0.97 }}
        >
          <BarChart3 size={17} strokeWidth={1.8} />
          <span>统计</span>
        </motion.button>
        <motion.button
          onClick={toggleSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-[rgba(255,255,255,0.03)] transition-all duration-150"
          whileTap={{ scale: 0.97 }}
        >
          <Settings size={17} strokeWidth={1.8} />
          <span>设置</span>
        </motion.button>
      </div>
    </aside>
  )
}
