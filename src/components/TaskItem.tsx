import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Circle, CheckCircle2, GripVertical, Calendar, Flag } from 'lucide-react'
import { useStore, type Task } from '@/store'
import { Reorder } from 'framer-motion'

interface TaskItemProps {
  task: Task
  isSelected: boolean
  onSelect: () => void
  showCompletedState?: boolean
}

const priorityConfig = {
  high: { color: 'var(--color-danger)', label: '高' },
  medium: { color: 'var(--color-warning)', label: '中' },
  low: { color: 'var(--color-text-tertiary)', label: '低' },
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  if (dateStr === today) return '今天'
  if (dateStr === tomorrow) return '明天'
  if (dateStr === yesterday) return '昨天'

  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  const today = new Date().toISOString().split('T')[0]
  return dateStr < today
}

export function TaskItem({ task, isSelected, onSelect, showCompletedState }: TaskItemProps) {
  const toggleComplete = useStore((s) => s.toggleComplete)
  const priority = task.priority || 'medium'
  const pConfig = priorityConfig[priority]
  const overdue = !task.completed && isOverdue(task.due_date)
  const hasDueDate = !!task.due_date

  const content = (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        task-item group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer
        border border-transparent
        ${isSelected
          ? 'bg-accent-muted border-accent/20'
          : 'hover:bg-surface-hover hover:border-border-subtle'
        }
        ${task.completed ? 'opacity-50' : ''}
      `}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Drag handle or grip */}
      <div className="flex-shrink-0 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical size={15} strokeWidth={1.8} />
      </div>

      {/* Complete circle */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleComplete(task.id)
        }}
        className="flex-shrink-0 relative"
      >
        {task.completed ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <CheckCircle2 size={20} strokeWidth={2} className="text-accent" />
          </motion.span>
        ) : (
          <Circle
            size={20}
            strokeWidth={1.8}
            className={`
              transition-colors
              ${overdue ? 'text-danger' : 'text-text-tertiary hover:text-accent'}
            `}
          />
        )}
      </button>

      {/* Title */}
      <span
        className={`
          flex-1 text-[14px] leading-snug truncate
          ${task.completed ? 'text-text-tertiary line-through' : 'text-text-primary'}
          ${overdue ? '!text-danger font-medium' : ''}
        `}
      >
        {task.title}
      </span>

      {/* Due date */}
      {hasDueDate && !showCompletedState && (
        <span
          className={`
            flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md flex-shrink-0
            ${overdue
              ? 'bg-danger-muted text-danger'
              : 'bg-surface-tertiary text-text-tertiary group-hover:text-text-secondary'
            }
          `}
        >
          <Calendar size={11} strokeWidth={2} />
          {formatDueDate(task.due_date)}
        </span>
      )}

      {/* Priority indicator */}
      {!showCompletedState && (
        <span
          className="flex-shrink-0"
          style={{ color: pConfig.color }}
          title={`优先级: ${pConfig.label}`}
        >
          <Flag size={13} strokeWidth={2.5} fill={task.priority === 'high' ? 'currentColor' : 'none'} />
        </span>
      )}
    </motion.div>
  )

  // Wrap in Reorder.Item for draggable mode (used by parent Reorder.Group)
  // When not in reorder mode, just render the item
  return content
}

// Wrapper for use inside Reorder.Group
export function ReorderableTaskItem({ task, isSelected, onSelect, showCompletedState }: TaskItemProps) {
  const wasDragging = useRef(false)

  return (
    <Reorder.Item
      value={task}
      id={task.id}
      onDragStart={() => { wasDragging.current = true }}
      onDragEnd={() => { setTimeout(() => { wasDragging.current = false }, 100) }}
    >
      <TaskItem
        task={task}
        isSelected={isSelected}
        onSelect={() => {
          if (!wasDragging.current) onSelect()
        }}
        showCompletedState={showCompletedState}
      />
    </Reorder.Item>
  )
}
