import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store'

const shortcuts = [
  { keys: 'Ctrl + N', desc: '快速添加任务' },
  { keys: 'Ctrl + K', desc: '搜索任务' },
  { keys: 'Space', desc: '完成选中任务' },
  { keys: 'Ctrl + Z', desc: '撤销' },
  { keys: 'Ctrl + Shift + T', desc: '切换主题' },
  { keys: 'Ctrl + 1/2/3', desc: '切换视图' },
  { keys: 'Ctrl + Click', desc: '多选任务' },
  { keys: 'Delete', desc: '删除选中任务' },
  { keys: 'ESC', desc: '关闭弹窗' },
]

export function ShortcutHints() {
  const [visible, setVisible] = useState(false)
  const [ctrlHeld, setCtrlHeld] = useState(false)
  const showCommandPalette = useStore((s) => s.showCommandPalette)
  const showQuickAdd = useStore((s) => s.showQuickAdd)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const down = (e: KeyboardEvent) => {
      if (e.key === 'Control' && !e.repeat) {
        setCtrlHeld(true)
        timer = setTimeout(() => setVisible(true), 500)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setCtrlHeld(false)
        setVisible(false)
        clearTimeout(timer)
      }
    }

    // Cancel the 500ms timer on any mouse click — if the user clicks while
    // holding Ctrl (multi-select), the hints panel should never appear.
    const onMouseDown = () => {
      clearTimeout(timer)
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousedown', onMouseDown)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (showCommandPalette || showQuickAdd) {
      setVisible(false)
    }
  }, [showCommandPalette, showQuickAdd])

  // Dismiss on non-Ctrl key press while visible
  useEffect(() => {
    if (!visible) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Control') setVisible(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[45] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-surface-secondary border border-border rounded-2xl shadow-2xl p-6 w-[400px]"
          >
            <h3 className="text-[14px] font-semibold text-text-primary mb-4 text-center">
              快捷键
            </h3>
            <div className="space-y-1.5">
              {shortcuts.map((s) => (
                <div
                  key={s.keys}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                >
                  <span className="text-[13px] text-text-secondary">{s.desc}</span>
                  <kbd className="px-2 py-1 rounded-md bg-surface-tertiary text-[11px] text-text-tertiary font-medium border border-border-subtle font-mono">
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="text-center text-[11px] text-text-tertiary mt-4">
              松开 Ctrl 关闭
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
