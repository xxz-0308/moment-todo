import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Minus, Square, X, SquareStack } from 'lucide-react'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI?.isMaximized().then(setIsMaximized)
    window.electronAPI?.onMaximizeChange(setIsMaximized)
  }, [])

  return (
    <div className="drag-region h-11 flex items-center justify-between px-4 bg-surface-secondary border-b border-border-subtle flex-shrink-0">
      <div className="flex items-center gap-2.5 no-drag">
        <div className="w-5 h-5 rounded-md bg-accent flex items-center justify-center">
          <SquareStack size={11} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[13px] font-semibold text-text-primary tracking-tight">
          Moment
        </span>
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
