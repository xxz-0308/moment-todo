import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store'

interface Option {
  value: string
  label: string
  color?: string
}

interface GlassSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function GlassSelect({ options, value, onChange, placeholder }: GlassSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const theme = useStore((s) => s.theme)
  const isLight = theme === 'light'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find((o) => o.value === value)
  const display = selected?.label || placeholder || '请选择'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] text-left transition-all cursor-pointer"
        style={{
          background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
          border: open
            ? '1px solid var(--color-accent)'
            : isLight
              ? '1px solid rgba(0,0,0,0.08)'
              : '1px solid rgba(255,255,255,0.08)',
          color: selected ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
        }}
      >
        <span className="flex items-center gap-2">
          {selected?.color && (
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
          )}
          <span className="truncate">{display}</span>
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.4} />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
            style={{
              background: isLight ? 'rgba(255,255,255,0.95)' : 'var(--glass-elevated-bg)',
              backdropFilter: 'var(--glass-elevated-blur)',
              WebkitBackdropFilter: 'var(--glass-elevated-blur)',
              border: '1px solid var(--glass-border)',
              boxShadow: isLight
                ? '0 8px 32px rgba(0,0,0,0.12)'
                : '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div className="max-h-48 overflow-y-auto py-1">
              {options.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors"
                    style={{
                      background: isSelected
                        ? 'rgba(99,102,241,0.1)'
                        : 'transparent',
                      color: isLight && isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        (e.target as HTMLElement).style.background = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        (e.target as HTMLElement).style.background = 'transparent'
                      }
                    }}
                  >
                    {opt.color && (
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                    )}
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto flex-shrink-0">
                        <path d="M3 7L6 10L11 4" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
