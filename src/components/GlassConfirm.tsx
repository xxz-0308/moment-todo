import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useStore } from '@/store'

interface GlassConfirmProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function GlassConfirm({ open, title, message, confirmLabel = '确定', cancelLabel = '取消', onConfirm, onCancel, danger }: GlassConfirmProps) {
  const theme = useStore((s) => s.theme)
  const isLight = theme === 'light'

  if (!open) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[360px] rounded-2xl overflow-hidden"
        style={{
          background: isLight ? 'rgba(255,255,255,0.95)' : 'var(--glass-elevated-bg)',
          backdropFilter: 'var(--glass-elevated-blur)',
          border: '1px solid var(--glass-border)',
          boxShadow: isLight ? '0 16px 48px rgba(0,0,0,0.15)' : '0 16px 48px rgba(0,0,0,0.5)',
        }}
      >
        <div className="p-6 text-center">
          <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${danger ? 'bg-[rgba(239,68,68,0.1)]' : 'bg-[rgba(245,158,11,0.1)]'}`}>
            <AlertTriangle size={24} strokeWidth={2} className={danger ? 'text-red-400' : 'text-yellow-400'} />
          </div>
          <h3 className="text-[15px] font-semibold text-text-primary mb-2">{title}</h3>
          <p className="text-[13px] text-text-secondary leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t" style={{ borderColor: 'var(--glass-border)' }}>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-[13px] font-medium text-text-secondary hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-[13px] font-semibold transition-colors border-l ${danger ? 'text-red-400 hover:bg-[rgba(239,68,68,0.08)]' : 'text-accent hover:bg-[rgba(99,102,241,0.08)]'}`}
            style={{ borderColor: 'var(--glass-border)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
