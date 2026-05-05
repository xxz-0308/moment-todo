import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, render, fireEvent } from '@testing-library/react'
import { resetStores } from '@/__tests__/test-utils'
import { makeTask, makeList } from '@/__tests__/factories'
import { useStore } from '@/store'

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button', span: 'span', input: 'input', textarea: 'textarea', aside: 'aside' },
  AnimatePresence: ({ children }: any) => children,
}))

import { DetailPanel } from '@/components/DetailPanel'

beforeEach(() => {
  resetStores()
})

describe('DetailPanel', () => {
  it('renders task title in input', () => {
    const task = makeTask({ id: 't1', title: 'My Task' })
    useStore.setState({ tasks: [task], selectedTaskId: 't1', selectedTask: task, lists: [makeList({ id: 'default' })] })
    render(<DetailPanel />)
    const input = screen.getByDisplayValue('My Task')
    expect(input).toBeInTheDocument()
  })

  it('renders priority buttons', () => {
    const task = makeTask({ id: 't1' })
    useStore.setState({ tasks: [task], selectedTaskId: 't1', selectedTask: task, lists: [makeList({ id: 'default' })] })
    render(<DetailPanel />)
    expect(screen.getByText('高')).toBeInTheDocument()
    expect(screen.getByText('中')).toBeInTheDocument()
    expect(screen.getByText('低')).toBeInTheDocument()
  })

  it('renders delete button', () => {
    const task = makeTask({ id: 't1' })
    useStore.setState({ tasks: [task], selectedTaskId: 't1', selectedTask: task, lists: [makeList({ id: 'default' })] })
    render(<DetailPanel />)
    expect(screen.getByText('删除任务')).toBeInTheDocument()
  })

  it('renders list selector', () => {
    const task = makeTask({ id: 't1', list_id: 'work' })
    useStore.setState({
      tasks: [task], selectedTaskId: 't1', selectedTask: task,
      lists: [makeList({ id: 'default', name: '收集箱' }), makeList({ id: 'work', name: '工作' })],
    })
    render(<DetailPanel />)
    expect(screen.getByText('工作')).toBeInTheDocument()
  })
})
