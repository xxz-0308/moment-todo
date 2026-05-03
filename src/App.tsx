import { useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from '@/store'
import { useKeyboard } from '@/hooks/useKeyboard'
import { TitleBar } from '@/components/TitleBar'
import { Sidebar } from '@/components/Sidebar'
import { TaskList } from '@/components/TaskList'
import { DetailPanel } from '@/components/DetailPanel'
import { CommandPalette } from '@/components/CommandPalette'
import { QuickAdd } from '@/components/QuickAdd'
import { Settings } from '@/components/Settings'
import { Stats } from '@/components/Stats'
import { ToastContainer } from '@/components/Toast'

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

  // Apply theme class
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  // Load theme from system preference on first visit
  useEffect(() => {
    const stored = localStorage.getItem('moment-theme')
    if (stored === 'light' || stored === 'dark') {
      useStore.getState().setTheme(stored)
    }
  }, [])

  // Persist theme
  const persistTheme = useCallback(() => {
    localStorage.setItem('moment-theme', useStore.getState().theme)
  }, [])

  useEffect(() => {
    persistTheme()
  }, [theme, persistTheme])

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
        {showSettings && <Settings />}
        {showStats && <Stats />}
      </AnimatePresence>

      <ToastContainer />
    </div>
  )
}
