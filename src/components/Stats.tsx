import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp, PieChart, CheckCircle2, AlertTriangle, ListTodo } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RPieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useStore } from '@/store'
import { getStats } from '@/db'

interface StatsData {
  total: number
  completed: number
  overdue: number
  byList: { name: string; count: number }[]
  byDay: { date: string; completed: number }[]
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

export function Stats() {
  const toggleStats = useStore((s) => s.toggleStats)
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    getStats().then(setStats)
  }, [])

  if (!stats) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-surface flex items-center justify-center"
      >
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </motion.div>
    )
  }

  const completionRate = stats.total + stats.completed > 0
    ? Math.round((stats.completed / (stats.total + stats.completed)) * 100)
    : 0

  const formattedDays = stats.byDay.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-surface overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <h2 className="text-[16px] font-semibold text-text-primary">统计</h2>
        <button
          onClick={toggleStats}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <X size={17} strokeWidth={2} />
        </button>
      </div>

      <div className="max-w-[640px] mx-auto px-6 py-8 space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: '待完成', value: stats.total, icon: ListTodo, color: 'var(--color-accent)', bg: 'var(--color-accent-muted)' },
            { label: '已完成', value: stats.completed, icon: CheckCircle2, color: 'var(--color-success)', bg: 'rgba(16, 185, 129, 0.1)' },
            { label: '已逾期', value: stats.overdue, icon: AlertTriangle, color: 'var(--color-danger)', bg: 'var(--color-danger-muted)' },
            { label: '完成率', value: `${completionRate}%`, icon: TrendingUp, color: 'var(--color-warning)', bg: 'rgba(245, 158, 11, 0.1)' },
          ].map((card) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-xl border border-border-subtle"
                style={{ backgroundColor: card.bg }}
              >
                <Icon size={17} strokeWidth={2} style={{ color: card.color }} />
                <p className="mt-3 text-[22px] font-bold text-text-primary">{card.value}</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">{card.label}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Weekly trend chart */}
        <section>
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-text-primary mb-4">
            <TrendingUp size={16} strokeWidth={2} />
            本周完成趋势
          </h3>
          <div className="p-5 rounded-xl bg-surface-secondary border border-border-subtle">
            {formattedDays.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={formattedDays}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-surface-tertiary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: 'var(--color-text-primary)',
                    }}
                    cursor={{ fill: 'var(--color-surface-hover)' }}
                  />
                  <Bar dataKey="completed" fill="var(--color-accent)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-[13px] text-text-tertiary">
                暂无数据
              </div>
            )}
          </div>
        </section>

        {/* Distribution pie chart */}
        <section>
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-text-primary mb-4">
            <PieChart size={16} strokeWidth={2} />
            分类分布
          </h3>
          <div className="p-5 rounded-xl bg-surface-secondary border border-border-subtle">
            {stats.byList.length > 0 ? (
              <div className="flex items-center">
                <ResponsiveContainer width="55%" height={180}>
                  <RPieChart>
                    <Pie
                      data={stats.byList}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      strokeWidth={0}
                    >
                      {stats.byList.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </RPieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5">
                  {stats.byList.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-[13px] text-text-secondary flex-1">{item.name}</span>
                      <span className="text-[13px] font-medium text-text-primary">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-[13px] text-text-tertiary">
                暂无数据
              </div>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  )
}
