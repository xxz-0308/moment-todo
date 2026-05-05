import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp, PieChart, CheckCircle2, AlertTriangle, ListTodo, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RPieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useStore } from '@/store'
import { getStats } from '@/db'
import { DatePicker } from '@/components/DatePicker'

interface StatsData {
  total: number
  completed: number
  overdue: number
  byListAll: { name: string; count: number }[]
  byListActive: { name: string; count: number }[]
  byListCompleted: { name: string; count: number }[]
  byDay: { date: string; completed: number }[]
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

type TimeRange = 'week' | 'month' | 'quarter' | 'all' | 'custom'

function getDateRange(range: TimeRange, customFrom: string, customTo: string): { from: string; to: string } {
  const today = new Date()
  const to = today.toISOString().split('T')[0]
  let from = ''
  switch (range) {
    case 'week':
      from = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0]
      break
    case 'month':
      from = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0]
      break
    case 'quarter':
      from = new Date(today.getTime() - 90 * 86400000).toISOString().split('T')[0]
      break
    case 'all':
      return { from: '', to: '' }
    case 'custom':
      return { from: customFrom, to: customTo }
  }
  return { from, to }
}

const timeRangeLabels: { key: TimeRange; label: string }[] = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '近3月' },
  { key: 'all', label: '全部' },
]

import { useTeamStore } from '@/lib/team-store'

function computeTeamStats(tasks: import('@/lib/team-store').TeamTask[], lists: import('@/lib/team-store').TeamList[], from: string, to: string): StatsData {
  const filtered = tasks.filter(t => {
    if (from && t.updated_at < from) return false
    if (to && t.updated_at > to + 'T23:59:59') return false
    return true
  })
  const total = filtered.filter(t => !t.completed).length
  const completed = filtered.filter(t => t.completed).length
  const today = new Date().toISOString().split('T')[0]
  const overdue = filtered.filter(t => !t.completed && t.due_date && t.due_date < today).length

  const byListMap = new Map<string, number>()
  for (const t of filtered) {
    const list = lists.find(l => l.id === t.list_id)
    const name = list?.name || '默认'
    byListMap.set(name, (byListMap.get(name) || 0) + 1)
  }
  const byListAll = Array.from(byListMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  const byListActive = Array.from(byListMap.entries()).map(([name, count]) => {
    const active = filtered.filter(t => !t.completed && (lists.find(l => l.id === t.list_id)?.name || '默认') === name).length
    return { name, count: active }
  }).filter(x => x.count > 0).sort((a, b) => b.count - a.count)
  // Reuse the map for completed-only
  const completedMap = new Map<string, number>()
  for (const t of filtered.filter(t => t.completed)) {
    const list = lists.find(l => l.id === t.list_id)
    const name = list?.name || '默认'
    completedMap.set(name, (completedMap.get(name) || 0) + 1)
  }
  const byListCompleted = Array.from(completedMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

  const byDayMap = new Map<string, number>()
  for (const t of filtered.filter(t => t.completed)) {
    const day = t.updated_at.split('T')[0]
    byDayMap.set(day, (byDayMap.get(day) || 0) + 1)
  }
  const byDay = Array.from(byDayMap.entries()).map(([date, completed]) => ({ date, completed })).sort((a, b) => a.date.localeCompare(b.date))

  return { total, completed, overdue, byListAll, byListActive, byListCompleted, byDay }
}

export default function Stats() {
  const toggleStats = useStore((s) => s.toggleStats)
  const scope = useStore((s) => s.scope)
  const teamTasks = useTeamStore((s) => s.tasks)
  const teamLists = useTeamStore((s) => s.lists)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [hoveredPie, setHoveredPie] = useState<number | undefined>(undefined)
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [pieMode, setPieMode] = useState<'all' | 'active' | 'completed'>('active')

  useEffect(() => {
    const { from, to } = getDateRange(timeRange, customFrom, customTo)
    if (scope === 'team') {
      setStats(computeTeamStats(teamTasks, teamLists, from, to))
    } else {
      getStats(from || undefined, to || undefined).then(s => {
        // DB gives all tasks by list — can't split completed/uncompleted.
        // Use heuristics: if all tasks are active, byListActive = byListAll; etc.
        const allActive = s.completed === 0
        const allCompleted = s.total === 0
        setStats({
          ...s,
          byListAll: s.byList,
          byListActive: allActive ? s.byList : [],
          byListCompleted: allCompleted ? s.byList : [],
        })
      })
    }
  }, [timeRange, customFrom, customTo, scope, teamTasks, teamLists])

  if (!stats) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-surface-gradient flex flex-col items-center justify-center"
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
      className="fixed inset-0 z-40 bg-surface-gradient flex flex-col"
      onClick={() => toggleStats()}
    >
      {/* Header — sticky */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
        <h2 className="text-[16px] font-semibold text-text-primary">统计</h2>
        <button
          onClick={toggleStats}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <X size={17} strokeWidth={2} />
        </button>
      </div>

      {/* Time range selector */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Calendar size={13} strokeWidth={2} className="text-text-tertiary" />
        {timeRangeLabels.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTimeRange(key)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              timeRange === key
                ? 'bg-[rgba(99,102,241,0.1)] text-accent border border-[rgba(99,102,241,0.2)]'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setTimeRange('custom')}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
            timeRange === 'custom'
              ? 'bg-[rgba(99,102,241,0.1)] text-accent border border-[rgba(99,102,241,0.2)]'
              : 'text-text-tertiary hover:text-text-secondary hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
          }`}
        >
          自定义
        </button>
        {timeRange === 'custom' && (
          <div className="flex items-center gap-2 ml-1">
            <DatePicker value={customFrom || null} onChange={(v) => setCustomFrom(v ?? '')} />
            <span className="text-text-tertiary text-[13px]">—</span>
            <DatePicker value={customTo || null} onChange={(v) => setCustomTo(v ?? '')} />
          </div>
        )}
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
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: card.bg,
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                }}
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
            {timeRange === 'week' ? '本周' : timeRange === 'month' ? '本月' : timeRange === 'quarter' ? '近3月' : timeRange === 'custom' ? `${customFrom || '...'} — ${customTo || '...'}` : '全部'}完成趋势
          </h3>
          <div className="p-5 rounded-xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
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
                    labelStyle={{ color: 'var(--color-text-secondary)' }}
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
            <span className="flex gap-1 ml-auto">
              {([['active','待完成'],['completed','已完成'],['all','全部']] as const).map(([k,label]) => (
                <button key={k} onClick={() => setPieMode(k)} className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  pieMode === k ? 'bg-[rgba(99,102,241,0.12)] text-accent' : 'text-text-tertiary hover:text-text-secondary'
                }`}>{label}</button>
              ))}
            </span>
          </h3>
          <div className="p-5 rounded-xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
            {(() => {
              const pieData = pieMode === 'completed' ? stats.byListCompleted : pieMode === 'active' ? stats.byListActive : stats.byListAll
              if (pieData.length === 0) return <div className="flex items-center justify-center h-[180px] text-[13px] text-text-tertiary">暂无数据</div>
              return (
              <div className="flex items-center" key={pieMode}>
                <ResponsiveContainer width="55%" height={180}>
                  <RPieChart>
                    <Pie
                      data={pieData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                      strokeWidth={0}
                      activeIndex={-1}
                      onMouseEnter={(_: any, index: number) => setHoveredPie(index)}
                      onMouseLeave={() => setHoveredPie(undefined)}
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          opacity={hoveredPie === undefined || hoveredPie === index ? 1 : 0.4}
                          style={{
                            transition: 'opacity 0.2s ease',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-surface-tertiary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: 'var(--color-text-primary)',
                      }}
                      labelStyle={{ color: 'var(--color-text-primary)' }}
                      itemStyle={{ color: 'var(--color-text-secondary)' }}
                    />
                  </RPieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5">
                  {pieData.map((item, index) => (
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
              )
            })()}
          </div>
        </section>
      </div>
    </motion.div>
  )
}
