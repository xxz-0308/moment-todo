import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Square, X, SquareStack, Plus } from 'lucide-react'
import { useStore } from '@/store'

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
    await addTask(captureText.trim())
    setCaptureText('')
    setShowQuickCapture(false)
  }

  return (
    <div className="drag-region h-11 flex items-center justify-between px-4 bg-surface-secondary border-b border-border-subtle flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 no-drag">
          <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
            <SquareStack size={11} className="text-white" strokeWidth={2.5} />
          </div>
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
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <Minus size={14} strokeWidth={2} />
        </button>
        <button
          onClick={() => window.electronAPI?.maximizeWindow()}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          {isMaximized ? (
            <SquareStack size={13} strokeWidth={2} />
          ) : (
            <Square size={12} strokeWidth={2} />
          )}
        </button>
        <button
          onClick={() => window.electronAPI?.closeWindow()}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-white hover:bg-danger transition-colors"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
