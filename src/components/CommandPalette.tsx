import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Hash } from 'lucide-react'
import { useStore } from '@/store'

export function CommandPalette() {
  const toggleCommandPalette = useStore((s) => s.toggleCommandPalette)
  const search = useStore((s) => s.search)
  const searchResults = useStore((s) => s.searchResults)
  const clearSearch = useStore((s) => s.clearSearch)
  const selectTask = useStore((s) => s.selectTask)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Parse prefix filters (@high, @today, etc.) from query
  const prefixFilters = query.match(/@(high|medium|low|today|overdue|pinned)/g) || []
  const searchText = query.replace(/@\w+/g, '').trim()

  useEffect(() => {
    search(searchText)
    setSelectedIndex(0)
  }, [query, search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply prefix filters client-side
  let filtered = searchResults
  const today = new Date().toISOString().split('T')[0]
  for (const pf of prefixFilters) {
    switch (pf) {
      case '@high': filtered = filtered.filter((t) => t.priority === 'high'); break
      case '@medium': filtered = filtered.filter((t) => t.priority === 'medium'); break
      case '@low': filtered = filtered.filter((t) => t.priority === 'low'); break
      case '@today': filtered = filtered.filter((t) => t.due_date === today); break
      case '@overdue': filtered = filtered.filter((t) => t.due_date && t.due_date < today); break
      case '@pinned': filtered = filtered.filter((t) => t.pinned); break
    }
  }

  const handleSelect = (taskId: string) => {
    selectTask(taskId)
    toggleCommandPalette()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSearch()
      toggleCommandPalette()
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter') {
      if (searchResults[selectedIndex]) {
        handleSelect(searchResults[selectedIndex].id)
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          clearSearch()
          toggleCommandPalette()
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="w-[480px] bg-surface-secondary border border-border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
          <Search size={18} strokeWidth={2} className="text-text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索任务..."
            className="flex-1 bg-transparent text-[14px] text-text-primary placeholder-text-tertiary outline-none"
          />
          <kbd className="px-2 py-0.5 rounded-md bg-surface-tertiary text-[11px] text-text-tertiary font-medium border border-border-subtle">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[280px] overflow-y-auto p-2">
          {query && filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-text-tertiary">
              未找到匹配的任务
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((task, index) => (
              <motion.button
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleSelect(task.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors
                  ${index === selectedIndex
                    ? 'bg-accent-muted'
                    : 'hover:bg-surface-hover'
                  }
                `}
              >
                <Hash size={16} strokeWidth={1.5} className="text-text-tertiary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] truncate ${task.completed ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
                    {task.title}
                  </p>
                  {task.notes && (
                    <p className="text-[11px] text-text-tertiary truncate mt-0.5">{task.notes}</p>
                  )}
                </div>
                <kbd className="px-1.5 py-0.5 rounded text-[10px] text-text-tertiary font-medium">
                  {index === selectedIndex ? '↵' : ''}
                </kbd>
              </motion.button>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-[13px] text-text-tertiary">
              输入关键词搜索任务
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border-subtle text-[11px] text-text-tertiary">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary text-[10px] font-medium border border-border-subtle">↑↓</kbd>
            导航
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary text-[10px] font-medium border border-border-subtle">↵</kbd>
            选择
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-tertiary text-[10px] font-medium border border-border-subtle">ESC</kbd>
            关闭
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
