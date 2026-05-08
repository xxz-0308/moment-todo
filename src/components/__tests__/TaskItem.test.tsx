// src/components/__tests__/TaskItem.test.tsx
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
    h2: 'h2',
    p: 'p',
    circle: 'circle',
  },
  AnimatePresence: ({ children }: any) => children,
  Reorder: {
    Group: ({ children }: any) => children,
    Item: ({ children }: any) => children,
  },
}))

vi.mock('@/hooks/useSound', () => ({
  playCompleteSound: vi.fn(),
  playDeleteSound: vi.fn(),
  playUndoSound: vi.fn(),
  playPinSound: vi.fn(),
  playQuickAddSound: vi.fn(),
  playDragPickupSound: vi.fn(),
  playDragDropSound: vi.fn(),
  playCelebrationSound: vi.fn(),
}))

import { TaskItem } from '@/components/TaskItem'

function resetState() {
  resetStores()
  useStore.setState({ scope: 'personal' })
}

describe('TaskItem', () => {
  beforeEach(() => {
    resetState()
  })

  it('renders task title', () => {
    const task = makeTask({ id: 't1', title: 'Buy groceries' })
    useStore.setState({ tasks: [task] })
    render(<TaskItem task={task} isSelected={false} onSelect={() => {}} />)
    const matches = screen.getAllByText('Buy groceries')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows completed styling in completed view', () => {
    const task = makeTask({ id: 't1', completed: 1 })
    useStore.setState({ tasks: [task] })
    const { container } = render(<TaskItem task={task} isSelected={false} onSelect={() => {}} showCompletedState />)
    const taskEl = container.querySelector('.opacity-40')
    expect(taskEl).toBeTruthy()
  })

  it('renders priority flag with title for high priority', () => {
    const task = makeTask({ id: 't1', priority: 'high' })
    useStore.setState({ tasks: [task] })
    render(<TaskItem task={task} isSelected={false} onSelect={() => {}} />)
    expect(screen.getByTitle('优先级: 高')).toBeInTheDocument()
  })

  it('renders due date badge with "今天" for today', () => {
    const today = new Date().toISOString().split('T')[0]
    const task = makeTask({ id: 't1', due_date: today })
    useStore.setState({ tasks: [task] })
    render(<TaskItem task={task} isSelected={false} onSelect={() => {}} />)
    expect(screen.getByText('今天')).toBeInTheDocument()
  })

  it('renders category badge from matching list', () => {
    const task = makeTask({ id: 't1', list_id: 'work' })
    const list = makeList({ id: 'work', name: '工作', color: '#ff0000' })
    useStore.setState({ tasks: [task], lists: [list] })
    render(<TaskItem task={task} isSelected={false} onSelect={() => {}} />)
    expect(screen.getByText('工作')).toBeInTheDocument()
  })
})
