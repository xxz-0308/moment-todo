import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ListChecks, CheckCircle2, Sparkles, Plus, Trophy } from 'lucide-react'
import type { ViewType } from '@/store'
import { useStore } from '@/store'
import { playCelebrationSound } from '@/hooks/useSound'

function getGreeting(): { title: string; subtitle: string } {
  const hour = new Date().getHours()
  if (hour < 6) return { title: '夜深了', subtitle: '早点休息，明天再战' }
  if (hour < 9) return { title: '早上好', subtitle: '新的一天，从整理开始' }
  if (hour < 12) return { title: '上午好', subtitle: '一日之计在于晨' }
  if (hour < 14) return { title: '中午好', subtitle: '休息一下，看看待办' }
  if (hour < 18) return { title: '下午好', subtitle: '高效的一下午' }
  if (hour < 22) return { title: '晚上好', subtitle: '回顾今天，计划明天' }
  return { title: '夜深了', subtitle: '早点休息，明天再战' }
}

const configs: Record<string, { icon: typeof Calendar; title: string; subtitle: string }> = {
  today: {
    icon: Calendar,
    title: '今天没有任务',
    subtitle: '按下 Ctrl + N 添加一个吧',
  },
  upcoming: {
    icon: Calendar,
    title: '没有计划的任务',
    subtitle: '给任务加上截止日期，它会出现在这里',
  },
  completed: {
    icon: CheckCircle2,
    title: '还没有完成的任务',
    subtitle: '完成一个任务，它会出现在这里',
  },
}

interface EmptyStateProps {
  view: ViewType
}

export function EmptyState({ view }: EmptyStateProps) {
  const toggleQuickAdd = useStore((s) => s.toggleQuickAdd)
  const tasks = useStore((s) => s.tasks)
  const greeting = getGreeting()
  const config = configs[view]

  // Celebration auto-play for "today all done"
  const hasPlayedCelebration = useRef(false)
  const isAllDone = view === 'today' &&
    tasks.filter((t) => !t.completed && t.due_date && t.due_date <= new Date().toISOString().split('T')[0]).length === 0 &&
    tasks.some((t) => t.completed && t.due_date && t.due_date <= new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (isAllDone && !hasPlayedCelebration.current) {
      hasPlayedCelebration.current = true
      playCelebrationSound()
      const timer = setTimeout(() => { hasPlayedCelebration.current = false }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isAllDone])

  // Show celebration for "today all done"
  if (isAllDone) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-8 text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.2)',
            boxShadow: '0 0 32px rgba(99,102,241,0.1)',
          }}
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Trophy size={40} strokeWidth={1.5} className="text-accent" />
          </motion.div>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[18px] font-semibold text-text-primary mb-2"
        >
          今天的事情都搞定了！
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-[13px] text-text-tertiary"
        >
          干得漂亮 🎉
        </motion.p>
      </motion.div>
    )
  }

  // For list views, show a generic empty state
  if (!config) {
    const isCompletedView = view === 'completed'
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 px-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {isCompletedView ? (
            <CheckCircle2 size={28} strokeWidth={1.5} className="text-text-tertiary" />
          ) : (
            <ListChecks size={28} strokeWidth={1.5} className="text-text-tertiary" />
          )}
        </motion.div>
        <h3 className="text-[15px] font-medium text-text-secondary mb-1.5">
          {isCompletedView ? '还没有完成的任务' : '这个列表是空的'}
        </h3>
        <p className="text-[13px] text-text-tertiary mb-6">
          {isCompletedView ? '完成一个任务，它会出现在这里' : '按下 Ctrl + N 添加第一个任务'}
        </p>
        {!isCompletedView && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={toggleQuickAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-[13px] font-medium hover:bg-accent-hover transition-colors"
          >
            <Plus size={16} strokeWidth={2} />
            <span>添加任务</span>
          </motion.button>
        )}
      </motion.div>
    )
  }

  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.15)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
        }}
      >
        <Sparkles size={28} strokeWidth={1.5} className="text-accent" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-[18px] font-semibold text-text-primary mb-1.5"
      >
        {greeting.title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-[13px] text-text-tertiary mb-8"
      >
        {greeting.subtitle}
      </motion.p>

      <div className="flex flex-col items-center">
        <Icon size={36} strokeWidth={1.2} className="text-text-tertiary/40 mb-4" />
        <p className="text-[13px] text-text-secondary">{config.subtitle}</p>
      </div>
    </motion.div>
  )
}
