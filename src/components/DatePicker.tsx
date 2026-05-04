import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface DatePickerProps {
  value: string | null
  onChange: (value: string | null) => void
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function formatDisplay(dateStr: string | null): string {
  if (!dateStr) return '无日期'
  const d = new Date(dateStr)
  const weekDay = WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDay}`
}

function getMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = []
  const startOffset = firstDay === 0 ? 6 : firstDay - 1 // Mon-start
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  return days
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth()) // 0-based

  const todayStr = now.toISOString().split('T')[0]
  const days = getMonthDays(viewYear, viewMonth)

  const selectDay = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    onChange(`${viewYear}-${m}-${d}`)
    setOpen(false)
  }

  const goPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }
  const goNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-colors w-full
          ${value
            ? 'text-text-primary bg-surface-tertiary border border-border hover:border-accent'
            : 'text-text-tertiary bg-surface-tertiary border border-border-subtle hover:border-border'
          }
        `}
      >
        <Calendar size={14} strokeWidth={2} />
        <span>{formatDisplay(value)}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute left-0 top-full mt-1 z-40 bg-surface-tertiary border border-border rounded-xl shadow-xl p-3 w-56"
          >
            {/* Month header */}
            <div className="flex items-center justify-between mb-2">
              <button onClick={goPrev} className="p-1 rounded-md hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-colors">
                <ChevronLeft size={15} strokeWidth={2} />
              </button>
              <span className="text-[13px] font-semibold text-text-primary">
                {viewYear}年{viewMonth + 1}月
              </span>
              <button onClick={goNext} className="p-1 rounded-md hover:bg-surface-hover text-text-tertiary hover:text-text-primary transition-colors">
                <ChevronRight size={15} strokeWidth={2} />
              </button>
            </div>

            {/* Day-of-week header */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-[10px] font-medium text-text-tertiary py-1">
                  {w}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day, i) => {
                if (day === null) return <div key={`e${i}`} />
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isToday = dateStr === todayStr
                const isSelected = dateStr === value

                return (
                  <button
                    key={day}
                    onClick={() => selectDay(day)}
                    className={`
                      w-7 h-7 text-[12px] rounded-lg font-medium transition-colors
                      ${isSelected
                        ? 'bg-accent text-white'
                        : isToday
                          ? 'bg-accent-muted text-accent'
                          : 'text-text-secondary hover:bg-surface-hover'
                      }
                    `}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Clear */}
            {value && (
              <button
                onClick={() => { onChange(null); setOpen(false) }}
                className="w-full mt-2 text-[12px] text-text-tertiary hover:text-text-primary py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
              >
                清除日期
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
