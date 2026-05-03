import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  Flag,
  Calendar,
  ListChecks,
  StickyNote,
  Trash2,
  Circle,
  CheckCircle2,
} from 'lucide-react'
import { useStore } from '@/store'

export function DetailPanel() {
  const selectedTask = useStore((s) => s.selectedTask)
  const selectTask = useStore((s) => s.selectTask)
  const updateTask = useStore((s) => s.updateTask)
  const toggleComplete = useStore((s) => s.toggleComplete)
  const removeTask = useStore((s) => s.removeTask)
  const lists = useStore((s) => s.lists)
  const theme = useStore((s) => s.theme)

  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [listId, setListId] = useState('default')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (selectedTask) {
      setTitle(selectedTask.title)
      setPriority(selectedTask.priority || 'medium')
      setDueDate(selectedTask.due_date || '')
      setListId(selectedTask.list_id || 'default')
      setNotes(selectedTask.notes || '')
    }
  }, [selectedTask?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveTitle = () => {
    if (!selectedTask) return
    const trimmed = title.trim()
    if (!trimmed) {
      // Reset to original if would be empty
      setTitle(selectedTask.title)
      return
    }
    if (trimmed !== selectedTask.title) {
      updateTask(selectedTask.id, { title: trimmed } as Partial<import('@/store').Task>)
    }
  }

  const savePriority = (value: string) => {
    if (selectedTask) {
      setPriority(value)
      updateTask(selectedTask.id, { priority: value } as Partial<import('@/store').Task>)
    }
  }

  const saveDueDate = (value: string) => {
    if (selectedTask) {
      setDueDate(value)
      updateTask(selectedTask.id, { due_date: value || null } as Partial<import('@/store').Task>)
    }
  }

  const saveList = (value: string) => {
    if (selectedTask) {
      setListId(value)
      updateTask(selectedTask.id, { list_id: value } as Partial<import('@/store').Task>)
    }
  }

  const saveNotes = () => {
    if (selectedTask && notes !== (selectedTask.notes || '')) {
      updateTask(selectedTask.id, { notes } as Partial<import('@/store').Task>)
    }
  }

  if (!selectedTask) return null

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = selectedTask.due_date && selectedTask.due_date < today && !selectedTask.completed

  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      className="w-[320px] flex-shrink-0 bg-surface-secondary border-l border-border-subtle flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <span className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">
          任务详情
        </span>
        <button
          onClick={() => selectTask(null)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Complete toggle + title */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleComplete(selectedTask.id)}
            className="mt-1.5 flex-shrink-0"
          >
            {selectedTask.completed ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <CheckCircle2 size={22} strokeWidth={2} className="text-accent" />
              </motion.span>
            ) : (
              <Circle size={22} strokeWidth={1.8} className="text-text-tertiary hover:text-accent transition-colors" />
            )}
          </button>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle()
            }}
            className={`
              flex-1 bg-transparent text-[15px] font-medium text-text-primary outline-none
              border-b border-transparent hover:border-border focus:border-accent transition-colors pb-1
              ${selectedTask.completed ? 'line-through text-text-tertiary' : ''}
            `}
          />
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[12px] font-medium text-text-tertiary">
            <Flag size={13} strokeWidth={2} />
            优先级
          </label>
          <div className="flex gap-2">
            {[
              { value: 'high', label: '高', color: 'var(--color-danger)', bg: 'var(--color-danger-muted)' },
              { value: 'medium', label: '中', color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.12)' },
              { value: 'low', label: '低', color: 'var(--color-text-tertiary)', bg: 'var(--color-surface-tertiary)' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => savePriority(opt.value)}
                className={`
                  flex-1 py-2 rounded-lg text-[13px] font-medium transition-all
                  ${priority === opt.value
                    ? 'ring-1 ring-inset'
                    : 'hover:bg-surface-hover'
                  }
                `}
                style={{
                  color: priority === opt.value ? opt.color : 'var(--color-text-secondary)',
                  backgroundColor: priority === opt.value ? opt.bg : 'var(--color-surface-tertiary)',
                  ...(priority === opt.value ? { ringColor: opt.color } : {}),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[12px] font-medium text-text-tertiary">
            <Calendar size={13} strokeWidth={2} />
            截止日期
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => saveDueDate(e.target.value)}
              className={`
                flex-1 px-3 py-2 rounded-lg bg-surface-tertiary text-[13px] text-text-primary
                outline-none border transition-colors
                ${isOverdue ? 'border-danger/50' : 'border-border focus:border-accent'}
              `}
              style={theme === 'dark' ? { colorScheme: 'dark' } : { colorScheme: 'light' }}
            />
            {dueDate && (
              <button
                onClick={() => saveDueDate('')}
                className="px-3 py-2 rounded-lg text-[12px] text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
              >
                清除
              </button>
            )}
          </div>
          {/* Quick date buttons */}
          <div className="flex gap-2">
            {[
              { label: '今天', value: today },
              { label: '明天', value: new Date(Date.now() + 86400000).toISOString().split('T')[0] },
              { label: '下周', value: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] },
            ].map((quick) => (
              <button
                key={quick.label}
                onClick={() => saveDueDate(quick.value)}
                className={`
                  px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all
                  ${dueDate === quick.value
                    ? 'bg-accent-muted text-accent'
                    : 'text-text-tertiary hover:text-text-secondary bg-surface-tertiary hover:bg-surface-hover'
                  }
                `}
              >
                {quick.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[12px] font-medium text-text-tertiary">
            <ListChecks size={13} strokeWidth={2} />
            所属列表
          </label>
          <select
            value={listId}
            onChange={(e) => saveList(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-tertiary text-[13px] text-text-primary outline-none border border-border focus:border-accent transition-colors appearance-none cursor-pointer"
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[12px] font-medium text-text-tertiary">
            <StickyNote size={13} strokeWidth={2} />
            备注
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="添加备注..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg bg-surface-tertiary text-[13px] text-text-primary placeholder-text-tertiary outline-none border border-border focus:border-accent transition-colors resize-none"
          />
        </div>
      </div>

      {/* Footer: Delete */}
      <div className="p-4 border-t border-border-subtle">
        <button
          onClick={() => {
            removeTask(selectedTask.id)
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-danger hover:bg-danger-muted transition-colors"
        >
          <Trash2 size={15} strokeWidth={2} />
          <span>删除任务</span>
        </button>
      </div>
    </motion.aside>
  )
}
