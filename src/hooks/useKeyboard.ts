import { useEffect } from 'react'
import { useStore } from '@/store'

export function useKeyboard() {
  const toggleCommandPalette = useStore((s) => s.toggleCommandPalette)
  const toggleQuickAdd = useStore((s) => s.toggleQuickAdd)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const undo = useStore((s) => s.undo)
  const toggleComplete = useStore((s) => s.toggleComplete)
  const selectedTaskId = useStore((s) => s.selectedTaskId)
  const showCommandPalette = useStore((s) => s.showCommandPalette)
  const showQuickAdd = useStore((s) => s.showQuickAdd)
  const clearSearch = useStore((s) => s.clearSearch)
  const setCurrentView = useStore((s) => s.setCurrentView)
  const showSettings = useStore((s) => s.showSettings)
  const toggleSettings = useStore((s) => s.toggleSettings)
  const removeTask = useStore((s) => s.removeTask)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      // Global shortcuts (work even when input is focused)
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        toggleCommandPalette()
        return
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        toggleQuickAdd()
        return
      }

      // Don't trigger other shortcuts when typing
      if (isInputFocused) return

      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        toggleTheme()
        return
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if (e.key === ' ' && selectedTaskId) {
        e.preventDefault()
        toggleComplete(selectedTaskId)
        return
      }
      if (e.key === 'Escape') {
        if (showCommandPalette) {
          clearSearch()
        }
        return
      }
      if (e.key === 'Delete' && selectedTaskId) {
        e.preventDefault()
        removeTask(selectedTaskId)
        return
      }
      // View navigation
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault()
        setCurrentView('today')
        return
      }
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault()
        setCurrentView('upcoming')
        return
      }
      if (e.ctrlKey && e.key === '3') {
        e.preventDefault()
        setCurrentView('completed')
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    toggleCommandPalette,
    toggleQuickAdd,
    toggleTheme,
    undo,
    toggleComplete,
    selectedTaskId,
    showCommandPalette,
    showQuickAdd,
    clearSearch,
    setCurrentView,
    showSettings,
    toggleSettings,
    removeTask,
  ])
}
