import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Square, X, SquareStack, Plus } from 'lucide-react'
import { useStore } from '@/store'
import { parseDateHint } from '@/hooks/parseDate'
import { playQuickAddSound } from '@/hooks/useSound'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [showQuickCapture, setShowQuickCapture] = useState(false)
  const [captureText, setCaptureText] = useState('')
  const captureRef = useRef<HTMLInputElement>(null)
  const addTask = useStore((s) => s.addTask)

  useEffect(() => {
    window.electronAPI?.isMaximized().then(setIsMaximized)
    window.electronAPI?.onMaximizeChange(setIsMaximized)
  }, [])

  useEffect(() => {
    if (showQuickCapture) captureRef.current?.focus()
  }, [showQuickCapture])

  const handleCapture = async () => {
    if (!captureText.trim()) {
      setShowQuickCapture(false)
      return
    }
    const parsed = parseDateHint(captureText)
    await addTask(parsed.title, 'medium', parsed.dueDate)
    playQuickAddSound()
    setCaptureText('')
    setShowQuickCapture(false)
  }

  return (
    <div className="drag-region h-11 flex items-center justify-between px-4 border-b border-border-subtle flex-shrink-0 bg-surface-gradient">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 no-drag">
          <svg width="20" height="20" viewBox="0 0 20 20" className="flex-shrink-0">
            <defs>
              <linearGradient id="tb-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1"/>
                <stop offset="100%" stopColor="#818cf8"/>
              </linearGradient>
            </defs>
            <rect x="3" y="3" width="14" height="14" rx="1.5" ry="1.5"
                  transform="rotate(45 10 10)" fill="url(#tb-grad)"/>
            <polyline points="7,10.5 9,12.5 13.5,7.5"
                      fill="none" stroke="white" strokeWidth="1.4"
                      strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[13px] font-semibold text-text-primary tracking-tight">
            Moment
          </span>
        </div>

        {/* Global quick capture */}
        <AnimatePresence mode="wait">
          {showQuickCapture ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 220 }}
              exit={{ opacity: 0, width: 0 }}
              className="no-drag overflow-hidden"
            >
              <input
                ref={captureRef}
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCapture()
                  if (e.key === 'Escape') {
                    setShowQuickCapture(false)
                    setCaptureText('')
                  }
                }}
                onBlur={() => {
                  if (!captureText.trim()) setShowQuickCapture(false)
                }}
                placeholder="快速记录..."
                className="w-full px-3 py-1 rounded-lg bg-surface-tertiary text-[13px] text-text-primary placeholder-text-tertiary outline-none border border-border focus:border-accent transition-colors"
              />
            </motion.div>
          ) : (
            <motion.button
              key="btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuickCapture(true)}
              className="no-drag flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors"
            >
              <Plus size={14} strokeWidth={2} />
              <span>快速记录</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={() => window.electronAPI?.minimizeWindow()}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover hover:shadow-[0_0_12px_rgba(255,255,255,0.05)] transition-all"
        >
          <Minus size={14} strokeWidth={2} />
        </button>
        <button
          onClick={() => window.electronAPI?.maximizeWindow()}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover hover:shadow-[0_0_12px_rgba(255,255,255,0.05)] transition-all"
        >
          {isMaximized ? (
            <SquareStack size={13} strokeWidth={2} />
          ) : (
            <Square size={12} strokeWidth={2} />
          )}
        </button>
        <button
          onClick={() => window.electronAPI?.closeWindow()}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-white hover:bg-danger hover:shadow-[0_0_16px_rgba(239,68,68,0.25)] transition-all"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
