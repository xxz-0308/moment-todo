import { useEffect, useCallback, lazy, Suspense, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from '@/store'
import { useTeamStore } from '@/lib/team-store'
import { useKeyboard } from '@/hooks/useKeyboard'
import { TitleBar } from '@/components/TitleBar'
import { Sidebar } from '@/components/Sidebar'
import { TaskList } from '@/components/TaskList'
import { DetailPanel } from '@/components/DetailPanel'
import { CommandPalette } from '@/components/CommandPalette'
import { QuickAdd } from '@/components/QuickAdd'
import { ToastContainer } from '@/components/Toast'
import { ShortcutHints } from '@/components/ShortcutHints'
import { GlassConfirm } from '@/components/GlassConfirm'

const Settings = lazy(() => import('@/components/Settings'))
const Stats = lazy(() => import('@/components/Stats'))

function LazyFallback() {
  return (
    <div className="fixed inset-0 z-40 bg-surface flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  )
}

export default function App() {
  const loadData = useStore((s) => s.loadData)
  const loading = useStore((s) => s.loading)
  const selectedTaskId = useStore((s) => s.selectedTaskId)
  const theme = useStore((s) => s.theme)
  const showCommandPalette = useStore((s) => s.showCommandPalette)
  const showQuickAdd = useStore((s) => s.showQuickAdd)
  const showSettings = useStore((s) => s.showSettings)
  const showStats = useStore((s) => s.showStats)

  const [quitConfirm, setQuitConfirm] = useState<{ memberCount: number } | null>(null)

  useKeyboard()

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  useEffect(() => {
    const stored = localStorage.getItem('moment-theme')
    if (stored === 'light' || stored === 'dark') {
      useStore.getState().setTheme(stored)
    }
  }, [])

  const persistTheme = useCallback(() => {
    localStorage.setItem('moment-theme', useStore.getState().theme)
  }, [])

  useEffect(() => {
    persistTheme()
  }, [theme, persistTheme])

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onTeamEvent) return
    api.onTeamEvent((event: { type: string; payload: unknown }) => {
      if (event.type === 'data:reloaded') {
        useStore.getState().loadData()
        return
      }
      useTeamStore.getState()._handleMessage(event as any)
    })
    // Request current team state — main process may have sent events before we were ready
    api.teamGetStatus?.().then((status: any) => {
      if (status.status === 'connected') {
        useTeamStore.getState()._updateStatus('connected')
        api.teamRequestSync?.()  // Pull full data from server
      }
    })
  }, [])

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onTeamQuitWarning) return
    api.onTeamQuitWarning((data: { memberCount: number }) => {
      setQuitConfirm(data)
    })
  }, [])

  // Show reconnect summary toast + listen for custom toast events from team-store
  useEffect(() => {
    const unsub = useTeamStore.subscribe((state) => {
      if (state.reconnectSummary) {
        useStore.getState().addToast(state.reconnectSummary)
        // Clear after showing — use setTimeout to avoid setState during subscribe
        setTimeout(() => useTeamStore.setState({ reconnectSummary: null }), 0)
      }
    })
    const toastHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      useStore.getState().addToast(detail.message)
    }
    const updateHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        serverVersion: string
        downloadUrl?: string
        required?: boolean
      }
      const msg = detail.required
        ? `协议不兼容，需要升级到 v${detail.serverVersion}`
        : `发现新版本 v${detail.serverVersion}，是否下载更新？`

      useStore.getState().addToast(msg, {
        label: detail.required ? '下载更新' : '下载',
        onClick: () => {
          if (detail.downloadUrl) {
            window.open(detail.downloadUrl, '_blank')
          }
        },
      })
    }
    window.addEventListener('moment:toast', toastHandler)
    window.addEventListener('moment:update-available', updateHandler)
    return () => {
      unsub()
      window.removeEventListener('moment:toast', toastHandler)
      window.removeEventListener('moment:update-available', updateHandler)
    }
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-surface overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          <TaskList />
          <AnimatePresence>
            {selectedTaskId && <DetailPanel key="detail-panel" />}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {showCommandPalette && <CommandPalette />}
        {showQuickAdd && <QuickAdd />}
        {showSettings && (
          <Suspense fallback={<LazyFallback />}>
            <Settings />
          </Suspense>
        )}
        {showStats && (
          <Suspense fallback={<LazyFallback />}>
            <Stats />
          </Suspense>
        )}
      </AnimatePresence>

      <ToastContainer />
      <ShortcutHints />

      <GlassConfirm
        open={!!quitConfirm}
        title="关闭服务端"
        message={`服务端将关闭，当前 ${quitConfirm?.memberCount || 0} 个客户端将断开连接。确定退出吗？`}
        danger
        confirmLabel="确定退出"
        onConfirm={() => {
          const api = (window as any).electronAPI
          api?.teamConfirmQuit?.()
          setQuitConfirm(null)
        }}
        onCancel={() => setQuitConfirm(null)}
      />
    </div>
  )
}
