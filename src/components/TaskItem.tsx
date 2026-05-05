import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Circle, CheckCircle2, GripVertical, Calendar, Flag, Trash2, Pin } from 'lucide-react'
import { useStore, type Task } from '@/store'
import { Reorder } from 'framer-motion'
import { playPinSound, playDragPickupSound, playDragDropSound } from '@/hooks/useSound'

interface TaskItemProps {
  task: Task
  isSelected: boolean
  onSelect: (e: React.MouseEvent) => void
  showCompletedState?: boolean
  flashHighlight?: boolean
  isMultiSelected?: boolean
  disableNativeDrag?: boolean
  scope?: 'personal' | 'team'
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
  return dateStr < new Date().toISOString().split('T')[0]
}

function isApproaching(dateStr: string | null): boolean {
  if (!dateStr) return false
  const today = new Date()
  const due = new Date(dateStr)
  const diff = due.getTime() - today.getTime()
  return diff > 0 && diff <= 2 * 86400000 // within 2 days
}

export function TaskItem({ task, isSelected, onSelect, showCompletedState, flashHighlight, isMultiSelected, disableNativeDrag, scope }: TaskItemProps) {
  const toggleComplete = useStore((s) => s.toggleComplete)
  const togglePin = useStore((s) => s.togglePin)
  const removeTask = useStore((s) => s.removeTask)
  const [justCompleted, setJustCompleted] = useState(false)

  // Track completion for celebration animation
  const prevCompleted = useRef(task.completed)
  useEffect(() => {
    if (task.completed && !prevCompleted.current) {
      setJustCompleted(true)
      const timer = setTimeout(() => setJustCompleted(false), 800)
      prevCompleted.current = task.completed
      return () => clearTimeout(timer)
    }
    prevCompleted.current = task.completed
  }, [task.completed])

  const priority = task.priority || 'medium'
  const pConfig = priorityConfig[priority]
  const overdue = !task.completed && isOverdue(task.due_date)
  const approaching = !task.completed && isApproaching(task.due_date)
  const hasDueDate = !!task.due_date

  return (
    <motion.div
      layout
      transition={{ layout: { type: 'spring', stiffness: 500, damping: 35 } }}
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: flashHighlight
          ? ['rgba(99,102,241,0.25)', 'rgba(99,102,241,0)']
          : undefined,
        transition: flashHighlight ? { duration: 0.8, ease: 'easeOut' } : undefined,
      }}
      {...(!disableNativeDrag ? { draggable: true } : {})}
      ref={(el) => {
        if (el && !disableNativeDrag) {
          el.ondragstart = (e: DragEvent) => {
            e.dataTransfer!.setData('text/plain', task.id)
            e.dataTransfer!.effectAllowed = 'move'
          }
        }
      }}
      whileHover={{
        y: -1,
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        borderColor: 'rgba(255,255,255,0.08)',
        transition: { duration: 0.15 },
      }}
      className={`
        task-item group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer
        relative overflow-hidden
        bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]
        ${isSelected
          ? '!bg-[rgba(99,102,241,0.08)] !border-[rgba(99,102,241,0.2)]'
          : ''
        }
        ${task.completed ? 'opacity-40' : ''}
        ${isMultiSelected ? 'ring-1 ring-accent bg-[rgba(99,102,241,0.08)]' : ''}
      `}
      onClick={(e) => {
        // Don't stop propagation in multi-select mode so Ctrl+click works
        if (!e.ctrlKey && !e.metaKey) {
          e.stopPropagation()
          onSelect(e)
        } else {
          onSelect(e)
        }
      }}
    >
      {/* Completion green flash overlay */}
      <AnimatePresence>
        {justCompleted && (
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: '100%', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.12) 40%, rgba(16,185,129,0.08) 60%, transparent 100%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Priority left color bar */}
      {task.priority === 'high' && !task.completed && !showCompletedState && (
        <div
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full"
          style={{ backgroundColor: pConfig.color }}
        />
      )}

      {/* Approaching deadline pulse */}
      {approaching && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none animate-pulse"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(245, 158, 11, 0.3)',
            animationDuration: '2s',
          }}
        />
      )}

      {/* Drag grip */}
      <div
        className={`
          flex-shrink-0 transition-opacity cursor-grab active:cursor-grabbing
          ${disableNativeDrag
            ? 'text-text-tertiary opacity-25 group-hover:opacity-100'
            : 'text-text-tertiary opacity-0 group-hover:opacity-100'
          }
        `}
      >
        <GripVertical size={15} strokeWidth={1.8} />
      </div>

      {/* Pin toggle */}
      {!showCompletedState && (
        <motion.button
          onPointerDown={(e) => {
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.stopPropagation()
            togglePin(task.id)
            playPinSound()
          }}
          whileTap={{ scale: 0.85 }}
          className={`
            flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md transition-all duration-150
            ${task.pinned
              ? 'text-accent opacity-100 hover:bg-accent-muted'
              : 'text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-accent hover:bg-accent-muted'
            }
          `}
        >
          <Pin
            size={13}
            strokeWidth={2.5}
            fill={!!task.pinned ? 'currentColor' : 'none'}
          />
        </motion.button>
      )}

      {/* Complete circle */}
      <button
        onPointerDown={(e) => {
          e.stopPropagation()
        }}
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
            <CheckCircle2 size={20} strokeWidth={2} className="text-accent" style={{ filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.3))' }} />
          </motion.span>
        ) : (
          <motion.span
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
          >
            <Circle
              size={20}
              strokeWidth={1.8}
              className={`
                transition-colors
                ${overdue ? 'text-danger' : 'text-text-tertiary hover:text-accent'}
              `}
            />
          </motion.span>
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

      {/* Assignee badge (team tasks) */}
      {scope === 'team' && (task as any).assigned_to && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[rgba(99,102,241,0.1)] text-[rgba(99,102,241,0.85)] flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          {(task as any).assigned_to.slice(0, 2).toUpperCase()}
        </span>
      )}

      {/* Due date */}
      {hasDueDate && !showCompletedState && (
        <span
          className={`
            flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 transition-shadow
            ${overdue
              ? 'bg-[rgba(239,68,68,0.12)] text-danger shadow-[0_0_8px_rgba(239,68,68,0.15)]'
              : approaching
                ? 'bg-[rgba(245,158,11,0.12)] text-[var(--color-warning)] shadow-[0_0_6px_rgba(245,158,11,0.12)] animate-pulse'
                : 'bg-[rgba(255,255,255,0.04)] text-text-tertiary group-hover:text-text-secondary'
            }
          `}
        >
          <Calendar size={11} strokeWidth={2} />
          {formatDueDate(task.due_date)}
        </span>
      )}

      {/* Priority flag */}
      {!showCompletedState && (
        <motion.span
          className="flex-shrink-0"
          style={{ color: pConfig.color }}
          title={`优先级: ${pConfig.label}`}
        >
          <Flag size={13} strokeWidth={2.5} fill={task.priority === 'high' ? 'currentColor' : 'none'} />
        </motion.span>
      )}

      {/* Hover delete */}
      <button
          onPointerDown={(e) => {
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.stopPropagation()
            removeTask(task.id)
          }}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-danger hover:bg-[rgba(239,68,68,0.12)] hover:shadow-[0_0_10px_rgba(239,68,68,0.15)] opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={13} strokeWidth={1.8} />
        </button>
    </motion.div>
  )
}

// Wrapper for use inside Reorder.Group
export function ReorderableTaskItem({ task, isSelected, onSelect, showCompletedState, flashHighlight, isMultiSelected, scope }: TaskItemProps) {
  const wasDragging = useRef(false)

  return (
    <Reorder.Item
      value={task}
      id={task.id}
      onDragStart={() => {
        wasDragging.current = true
        playDragPickupSound()
      }}
      onDragEnd={() => {
        setTimeout(() => { wasDragging.current = false }, 100)
        playDragDropSound()
      }}
      whileDrag={{
        scale: 1.03,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.15)',
        zIndex: 50,
        cursor: 'grabbing',
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{ position: 'relative' }}
    >
      <TaskItem
        task={task}
        isSelected={isSelected}
        onSelect={(e: React.MouseEvent) => {
          if (!wasDragging.current) onSelect(e)
        }}
        showCompletedState={showCompletedState}
        flashHighlight={flashHighlight}
        isMultiSelected={isMultiSelected}
        disableNativeDrag
        scope={scope}
      />
    </Reorder.Item>
  )
}
