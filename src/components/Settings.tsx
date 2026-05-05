import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  X,
  Moon,
  Sun,
  Download,
  Database,
  Keyboard,
  Monitor,
  Globe,
} from 'lucide-react'
import { useStore } from '@/store'
import { exportJSON, backupDatabase } from '@/db'

const PRESET_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

export default function Settings() {
  const toggleSettings = useStore((s) => s.toggleSettings)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  const [settingsTab, setSettingsTab] = useState<'appearance' | 'network' | 'shortcuts'>('appearance')

  // Network state
  const [nickname, setNickname] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [role, setRole] = useState<'' | 'server' | 'client'>('')
  const [serverAddress, setServerAddress] = useState('')
  const [connStatus, setConnStatus] = useState<string>('')

  const loadTeamConfig = async () => {
    try {
      const api = (window as any).electronAPI
      if (!api?.teamGetConfig) return
      const config = await api.teamGetConfig()
      setNickname(config.member.name || '')
      setColor(config.member.color || '#6366f1')
      setRole(config.role || '')
      setServerAddress(config.serverAddress || '')
      // Also check current connection status
      const st = await api.teamGetStatus()
      setConnStatus(st.status)
    } catch {}
  }

  const saveTeamConfig = async () => {
    try {
      const api = (window as any).electronAPI
      if (!api?.teamSaveConfig) return
      const existingConfig = await api.teamGetConfig()
      const id = existingConfig.member.id || crypto.randomUUID()
      await api.teamSaveConfig({
        member: { id, name: nickname, color },
        role,
        serverAddress,
        serverPort: 5174,
      })
      useStore.getState().addToast('团队配置已保存')
    } catch {}
  }

  const handleStart = async () => {
    // saveTeamConfig triggers stopTeam + startTeam in the IPC handler,
    // no need to call teamStart again — that would double-bind the port.
    await saveTeamConfig()
    try {
      const api = (window as any).electronAPI
      if (!api?.teamGetStatus) return
      const status = await api.teamGetStatus()
      setConnStatus(status.status)
    } catch {}
  }

  const handleStop = async () => {
    try {
      const api = (window as any).electronAPI
      if (!api?.teamStop) return
      await api.teamStop()
      setConnStatus('')
    } catch {}
  }

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
      className="fixed inset-0 z-40 bg-surface-gradient flex flex-col"
      onClick={() => toggleSettings()}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
        <h2 className="text-[16px] font-semibold text-text-primary">设置</h2>
        <button
          onClick={toggleSettings}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <X size={17} strokeWidth={2} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex gap-1 px-6 py-3 border-b border-[rgba(255,255,255,0.05)]" onClick={(e) => e.stopPropagation()}>
        {([
          { key: 'appearance' as const, label: '外观', icon: Monitor },
          { key: 'network' as const, label: '网络', icon: Globe },
          { key: 'shortcuts' as const, label: '快捷键', icon: Keyboard },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setSettingsTab(key); if (key === 'network') loadTeamConfig() }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
              settingsTab === key
                ? 'bg-[rgba(99,102,241,0.1)] text-accent border border-[rgba(99,102,241,0.2)]'
                : 'text-text-tertiary hover:text-text-secondary border border-transparent'
            }`}
          >
            <Icon size={14} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      <div
        className="flex-1 overflow-y-auto max-w-[560px] w-full mx-auto px-6 py-8 space-y-8 [&::-webkit-scrollbar]:hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {settingsTab === 'appearance' && (
          <>
            {/* Theme */}
            <section>
              <h3 className="flex items-center gap-2 text-[13px] font-semibold text-text-primary mb-4">
                <Monitor size={16} strokeWidth={2} />
                外观
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                    theme === 'dark'
                      ? 'bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] shadow-[0_0_12px_rgba(99,102,241,0.06)]'
                      : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                >
                  <Moon size={18} strokeWidth={2} className={theme === 'dark' ? 'text-accent' : 'text-text-tertiary'} />
                  <div className="text-left">
                    <p className={`text-[13px] font-medium ${theme === 'dark' ? 'text-text-primary' : 'text-text-secondary'}`}>深色模式</p>
                    <p className="text-[11px] text-text-tertiary mt-0.5">沉稳专注</p>
                  </div>
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                    theme === 'light'
                      ? 'bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] shadow-[0_0_12px_rgba(99,102,241,0.06)]'
                      : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                >
                  <Sun size={18} strokeWidth={2} className={theme === 'light' ? 'text-accent' : 'text-text-tertiary'} />
                  <div className="text-left">
                    <p className={`text-[13px] font-medium ${theme === 'light' ? 'text-text-primary' : 'text-text-secondary'}`}>浅色模式</p>
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
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.04)] transition-all"
                >
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-text-primary">立即备份</p>
                    <p className="text-[11px] text-text-tertiary mt-0.5">备份到 Documents/Moment/backups/</p>
                  </div>
                  <Database size={16} strokeWidth={1.8} className="text-text-tertiary" />
                </button>
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.04)] transition-all"
                >
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-text-primary">导出 JSON</p>
                    <p className="text-[11px] text-text-tertiary mt-0.5">导出所有任务和列表数据</p>
                  </div>
                  <Download size={16} strokeWidth={1.8} className="text-text-tertiary" />
                </button>
              </div>
            </section>
          </>
        )}

        {settingsTab === 'network' && (
          <section>
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-text-primary mb-4">
              <Globe size={16} strokeWidth={2} />
              团队网络
            </h3>

            <div className="space-y-4">
              {/* Nickname */}
              <div>
                <label className="text-[12px] text-text-secondary mb-1.5 block">我的昵称</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="输入名字"
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all"
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-[12px] text-text-secondary mb-1.5 block">我的颜色</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        color === c ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="text-[12px] text-text-secondary mb-1.5 block">运行模式</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setRole('server')}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                      role === 'server'
                        ? 'bg-[rgba(99,102,241,0.1)] text-accent border border-[rgba(99,102,241,0.2)]'
                        : 'bg-[rgba(255,255,255,0.02)] text-text-secondary border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)]'
                    }`}
                  >
                    服务端
                  </button>
                  <button
                    onClick={() => setRole('client')}
                    className={`flex-1 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                      role === 'client'
                        ? 'bg-[rgba(99,102,241,0.1)] text-accent border border-[rgba(99,102,241,0.2)]'
                        : 'bg-[rgba(255,255,255,0.02)] text-text-secondary border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)]'
                    }`}
                  >
                    客户端
                  </button>
                </div>
              </div>

              {/* Server address (client only) */}
              {role === 'client' && (
                <div>
                  <label className="text-[12px] text-text-secondary mb-1.5 block">服务端地址</label>
                  <input
                    type="text"
                    value={serverAddress}
                    onChange={(e) => setServerAddress(e.target.value)}
                    placeholder="192.168.1.100（留空自动发现）"
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all"
                  />
                </div>
              )}

              {/* Connection controls */}
              <div className="flex items-center gap-3 pt-2">
                {connStatus === 'connected' ? (
                  <button
                    onClick={handleStop}
                    className="px-4 py-2 rounded-lg bg-[rgba(239,68,68,0.12)] text-[rgba(239,68,68,0.9)] text-[13px] font-medium border border-[rgba(239,68,68,0.2)] hover:bg-[rgba(239,68,68,0.2)] transition-colors"
                  >
                    停止{role === 'server' ? '服务端' : '连接'}
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    disabled={!nickname || !role}
                    className="px-4 py-2 rounded-lg bg-accent text-white text-[13px] font-medium hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {role === 'server' ? '启动服务端' : '连接'}
                  </button>
                )}
                {connStatus && (
                  <span className="flex items-center gap-1.5 text-[12px]">
                    <span className={`w-2 h-2 rounded-full ${connStatus === 'connected' ? 'bg-green-500' : connStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className={connStatus === 'connected' ? 'text-green-400' : connStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'}>
                      {connStatus === 'connected' ? '已连接' : connStatus === 'connecting' ? '连接中...' : connStatus}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </section>
        )}

        {settingsTab === 'shortcuts' && (
          <section>
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-text-primary mb-4">
              <Keyboard size={16} strokeWidth={2} />
              快捷键
            </h3>
            <div className="spacе-y-2">
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
                <div key={shortcut.keys} className="flex items-center justify-between px-4 py-2.5 rounded-lg">
                  <span className="text-[13px] text-text-secondary">{shortcut.desc}</span>
                  <kbd className="px-2.5 py-1 rounded-md bg-surface-tertiary text-[11px] text-text-tertiary font-medium border border-border-subtle">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  )
}
