import { motion } from 'framer-motion'
import {
  X,
  Moon,
  Sun,
  Download,
  Database,
  Keyboard,
  Monitor,
} from 'lucide-react'
import { useStore } from '@/store'
import { exportJSON, backupDatabase } from '@/db'

export default function Settings() {
  const toggleSettings = useStore((s) => s.toggleSettings)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  const handleExport = async () => {
    const json = await exportJSON()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `moment-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBackup = async () => {
    await backupDatabase()
    useStore.getState().addToast('备份完成')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-surface overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <h2 className="text-[16px] font-semibold text-text-primary">设置</h2>
        <button
          onClick={toggleSettings}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <X size={17} strokeWidth={2} />
        </button>
      </div>

      <div className="max-w-[560px] mx-auto px-6 py-8 space-y-8">
        {/* Theme */}
        <section>
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-text-primary mb-4">
            <Monitor size={16} strokeWidth={2} />
            外观
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('dark')}
              className={`
                flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all
                ${theme === 'dark'
                  ? 'border-accent bg-accent-muted'
                  : 'border-border hover:border-border-subtle bg-surface-secondary'
                }
              `}
            >
              <Moon size={18} strokeWidth={2} className={theme === 'dark' ? 'text-accent' : 'text-text-tertiary'} />
              <div className="text-left">
                <p className={`text-[13px] font-medium ${theme === 'dark' ? 'text-text-primary' : 'text-text-secondary'}`}>
                  深色模式
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">沉稳专注</p>
              </div>
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`
                flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all
                ${theme === 'light'
                  ? 'border-accent bg-accent-muted'
                  : 'border-border hover:border-border-subtle bg-surface-secondary'
                }
              `}
            >
              <Sun size={18} strokeWidth={2} className={theme === 'light' ? 'text-accent' : 'text-text-tertiary'} />
              <div className="text-left">
                <p className={`text-[13px] font-medium ${theme === 'light' ? 'text-text-primary' : 'text-text-secondary'}`}>
                  浅色模式
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">清爽明亮</p>
              </div>
            </button>
          </div>
        </section>

        {/* Data */}
        <section>
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-text-primary mb-4">
            <Database size={16} strokeWidth={2} />
            数据
          </h3>
          <div className="space-y-3">
            <button
              onClick={handleBackup}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-surface-secondary border border-border-subtle hover:border-border transition-colors"
            >
              <div className="text-left">
                <p className="text-[13px] font-medium text-text-primary">立即备份</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">备份到 Documents/Moment/backups/</p>
              </div>
              <Database size={16} strokeWidth={1.8} className="text-text-tertiary" />
            </button>
            <button
              onClick={handleExport}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-surface-secondary border border-border-subtle hover:border-border transition-colors"
            >
              <div className="text-left">
                <p className="text-[13px] font-medium text-text-primary">导出 JSON</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">导出所有任务和列表数据</p>
              </div>
              <Download size={16} strokeWidth={1.8} className="text-text-tertiary" />
            </button>
          </div>
        </section>

        {/* Keyboard shortcuts */}
        <section>
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-text-primary mb-4">
            <Keyboard size={16} strokeWidth={2} />
            快捷键
          </h3>
          <div className="space-y-2">
            {[
              { keys: 'Ctrl + N', desc: '快速添加任务' },
              { keys: 'Ctrl + K', desc: '搜索任务' },
              { keys: 'Space', desc: '完成/取消完成选中任务' },
              { keys: 'Ctrl + Z', desc: '撤销' },
              { keys: 'Ctrl + Shift + T', desc: '切换深色/浅色模式' },
              { keys: 'Ctrl + 1/2/3', desc: '切换视图（今天/计划/已完成）' },
              { keys: 'Delete', desc: '删除选中任务' },
              { keys: 'ESC', desc: '关闭弹窗/取消选择' },
            ].map((shortcut) => (
              <div
                key={shortcut.keys}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg"
              >
                <span className="text-[13px] text-text-secondary">{shortcut.desc}</span>
                <kbd className="px-2.5 py-1 rounded-md bg-surface-tertiary text-[11px] text-text-tertiary font-medium border border-border-subtle">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  )
}
