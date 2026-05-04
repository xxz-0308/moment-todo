import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, PieChart, CheckCircle2, AlertTriangle, ListTodo } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
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

function polar(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function donutPath(cx: number, cy: number, innerR: number, outerR: number, start: number, end: number): string {
  const outerStart = polar(cx, cy, outerR, start)
  const outerEnd = polar(cx, cy, outerR, end)
  const innerStart = polar(cx, cy, innerR, end)
  const innerEnd = polar(cx, cy, innerR, start)
  const large = (end - start) > Math.PI ? 1 : 0
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ')
}

export default function Stats() {
  const toggleStats = useStore((s) => s.toggleStats)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [activePieIndex, setActivePieIndex] = useState<number | undefined>(undefined)

  useEffect(() => {
    getStats().then(setStats)
  }, [])

  if (!stats) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-surface flex flex-col"
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
      className="fixed inset-0 z-40 bg-surface flex flex-col"
      onClick={() => toggleStats()}
    >
      {/* Header — sticky */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <h2 className="text-[16px] font-semibold text-text-primary">统计</h2>
        <button
          onClick={toggleStats}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <X size={17} strokeWidth={2} />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto max-w-[640px] w-full mx-auto px-6 py-8 space-y-8 [&::-webkit-scrollbar]:hidden"
        onClick={(e) => e.stopPropagation()}
      >
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
                {/* Custom SVG donut with Framer Motion path animation */}
                <div className="w-[55%] flex items-center justify-center">
                  <svg viewBox="0 0 180 180" className="w-full h-auto">
                    {(() => {
                      const cx = 90, cy = 90, outerR = 70, innerR = 40
                      const total = stats.byList.reduce((s, d) => s + d.count, 0) || 1
                      let currentAngle = -Math.PI / 2 // Start from top

                      return stats.byList.map((item, i) => {
                        const sliceAngle = (item.count / total) * Math.PI * 2
                        const start = currentAngle
                        const end = currentAngle + sliceAngle
                        currentAngle = end

                        const isHovered = activePieIndex === i
                        const normalPath = donutPath(cx, cy, innerR, outerR, start, end)
                        const expandedPath = donutPath(
                          cx, cy,
                          Math.max(5, innerR - 8),  // Expand inward
                          outerR + 8,                  // Expand outward
                          start - 0.05,                 // Widen left
                          end + 0.05                    // Widen right
                        )

                        return (
                          <motion.path
                            key={i}
                            d={isHovered ? expandedPath : normalPath}
                            fill={COLORS[i % COLORS.length]}
                            stroke="transparent"
                            animate={{ d: isHovered ? expandedPath : normalPath }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            onMouseEnter={() => setActivePieIndex(i)}
                            onMouseLeave={() => setActivePieIndex(undefined)}
                            style={{
                              cursor: 'pointer',
                              filter: isHovered
                                ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
                                : 'none',
                              transition: 'filter 0.2s ease',
                            }}
                          />
                        )
                      })
                    })()}
                  </svg>
                </div>
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
