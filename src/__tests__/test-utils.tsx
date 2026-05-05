// src/__tests__/test-utils.tsx
import { render, type RenderOptions } from '@testing-library/react'
import { type ReactElement } from 'react'
import { useStore } from '@/store'
import { useTeamStore } from '@/lib/team-store'

function resetStores() {
  useStore.setState({
    tasks: [],
    lists: [],
    currentView: 'today',
    selectedTaskId: null,
    selectedTask: null,
    scope: 'personal',
    showCommandPalette: false,
    showSettings: false,
    showStats: false,
    showQuickAdd: false,
    searchQuery: '',
    searchResults: [],
    toasts: [],
    undoStack: [],
    loading: false,
    restoredTaskId: null,
  })
  useTeamStore.setState({
    tasks: [],
    lists: [],
    members: [],
    connectionStatus: 'disabled',
    serverUrl: null,
    manualSort: false,
    onlineMemberCount: 0,
    onlineMembers: new Set(),
    reconnectSummary: null,
    _snapshot: null,
  })
}

export function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  resetStores()
  return render(ui, { ...options })
}

export { customRender as render }
export { resetStores }
export * from '@testing-library/react'
