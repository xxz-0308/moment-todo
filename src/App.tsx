import { useEffect, useCallback, lazy, Suspense } from 'react'
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
      useTeamStore.getState()._handleMessage(event as any)
    })
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
    </div>
  )
}
