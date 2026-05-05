// src/components/__tests__/TaskList.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { resetStores } from '@/__tests__/test-utils'
import { makeTask, makeList } from '@/__tests__/factories'
import { useStore } from '@/store'

vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
    h1: 'h1',
    h2: 'h2',
    p: 'p',
    input: 'input',
    circle: 'circle',
  },
  AnimatePresence: ({ children }: any) => children,
  Reorder: {
    Group: ({ children }: any) => children,
    Item: ({ children }: any) => children,
  },
}))

vi.mock('@/hooks/useSound', () => ({
  playQuickAddSound: vi.fn(),
  playCompleteSound: vi.fn(),
  playDeleteSound: vi.fn(),
  playUndoSound: vi.fn(),
  playPinSound: vi.fn(),
  playDragPickupSound: vi.fn(),
  playDragDropSound: vi.fn(),
  playCelebrationSound: vi.fn(),
}))

import { TaskList } from '@/components/TaskList'

function resetState() {
  resetStores()
  useStore.setState({
    lists: [makeList({ id: 'default', name: '收集箱' })],
    scope: 'personal',
    currentView: 'default',
  })
}

describe('TaskList', () => {
  beforeEach(() => {
    resetState()
  })

  it('renders tasks from store', () => {
    useStore.setState({
      tasks: [
        makeTask({ id: 't1', title: 'Task A' }),
        makeTask({ id: 't2', title: 'Task B' }),
      ],
    })
    render(<TaskList />)
    expect(screen.getByText('Task A')).toBeInTheDocument()
    expect(screen.getByText('Task B')).toBeInTheDocument()
  })

  it('renders empty state when no tasks', () => {
    useStore.setState({ tasks: [] })
    render(<TaskList />)
    // Current view is 'default' (list view), EmptyState shows generic empty list
    // with heading "这个列表是空的" and "添加任务" button
    expect(screen.getByText('这个列表是空的')).toBeInTheDocument()
    expect(screen.getByText('添加任务')).toBeInTheDocument()
  })

  it('renders quick-add input with correct placeholder', () => {
    useStore.setState({ tasks: [] })
    render(<TaskList />)
    expect(screen.getByPlaceholderText('快速添加...')).toBeInTheDocument()
  })
})
