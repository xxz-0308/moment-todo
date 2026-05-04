import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useStore } from '@/store'

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts)
  const removeToast = useStore((s) => s.removeToast)

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: 'var(--glass-elevated-bg)',
              backdropFilter: 'var(--glass-elevated-blur)',
              WebkitBackdropFilter: 'var(--glass-elevated-blur)',
              border: '1px solid var(--glass-elevated-border)',
              boxShadow: 'var(--glass-elevated-shadow)',
            }}
          >
            <span className="text-[13px] text-text-primary">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick()
                  removeToast(toast.id)
                }}
                className="text-[13px] font-medium text-accent hover:text-accent-hover transition-colors px-1.5 py-0.5 rounded-md hover:bg-accent-muted"
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="w-5 h-5 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X size={13} strokeWidth={2} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
