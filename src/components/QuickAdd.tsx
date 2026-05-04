import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, Flag, Hash } from 'lucide-react'
import { useStore } from '@/store'
import { playQuickAddSound } from '@/hooks/useSound'

export function QuickAdd() {
  const toggleQuickAdd = useStore((s) => s.toggleQuickAdd)
  const addTask = useStore((s) => s.addTask)
  const lists = useStore((s) => s.lists)
  const currentView = useStore((s) => s.currentView)

  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [listId, setListId] = useState(
    ['today', 'upcoming', 'completed'].includes(currentView) ? 'default' : currentView
  )
  const [showMore, setShowMore] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    if (!title.trim()) return
    const list = showMore ? listId : (['today', 'upcoming', 'completed'].includes(currentView) ? 'default' : currentView)
    await addTask(title.trim(), priority, dueDate || null, list)
    playQuickAddSound()
    toggleQuickAdd()
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) toggleQuickAdd()
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="w-[420px] rounded-2xl overflow-hidden"
        style={{
          background: 'var(--glass-elevated-bg)',
          backdropFilter: 'var(--glass-elevated-blur)',
          WebkitBackdropFilter: 'var(--glass-elevated-blur)',
          border: '1px solid var(--glass-elevated-border)',
          boxShadow: 'var(--glass-elevated-shadow)',
        }}
      >
        {/* Title input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[rgba(255,255,255,0.05)]">
          <Plus size={18} strokeWidth={2} className="text-accent flex-shrink-0" />
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
              if (e.key === 'Escape') toggleQuickAdd()
            }}
            placeholder="添加任务..."
            className="flex-1 bg-transparent text-[15px] text-text-primary placeholder-text-tertiary outline-none"
          />
        </div>

        {/* Quick options */}
        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border-subtle px-4 py-3 space-y-3"
            >
              {/* Priority */}
              <div className="flex items-center gap-3">
                <Flag size={14} strokeWidth={2} className="text-text-tertiary" />
                <div className="flex gap-1.5">
                  {[
                    { value: 'high', label: '高', color: 'var(--color-danger)' },
                    { value: 'medium', label: '中', color: 'var(--color-warning)' },
                    { value: 'low', label: '低', color: 'var(--color-text-tertiary)' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPriority(opt.value)}
                      className={`
                        px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all
                        ${priority === opt.value
                          ? 'ring-1 ring-inset'
                          : 'bg-surface-tertiary hover:bg-surface-hover'
                        }
                      `}
                      style={{
                        color: priority === opt.value ? opt.color : 'var(--color-text-secondary)',
                        backgroundColor: priority === opt.value ? `${opt.color}20` : undefined,
                        ...(priority === opt.value ? { ringColor: opt.color } : {}),
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due date */}
              <div className="flex items-center gap-3">
                <Calendar size={14} strokeWidth={2} className="text-text-tertiary" />
                <div className="flex gap-1.5">
                  {[
                    { label: '今天', value: today },
                    { label: '明天', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
                    { label: '无日期', value: '' },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setDueDate(opt.value)}
                      className={`
                        px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all
                        ${dueDate === opt.value
                          ? 'bg-accent-muted text-accent'
                          : 'bg-surface-tertiary text-text-secondary hover:bg-surface-hover'
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="flex items-center gap-3">
                <Hash size={14} strokeWidth={2} className="text-text-tertiary" />
                <select
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-surface-tertiary text-[12px] text-text-primary outline-none border border-border focus:border-accent transition-colors appearance-none cursor-pointer"
                >
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(255,255,255,0.05)]">
          <button
            onClick={() => setShowMore(!showMore)}
            className={`
              text-[12px] font-medium transition-colors
              ${showMore ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'}
            `}
          >
            {showMore ? '收起选项' : '更多选项'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-tertiary">回车创建</span>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="px-4 py-1.5 rounded-lg bg-accent text-white text-[12px] font-medium hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              创建
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
