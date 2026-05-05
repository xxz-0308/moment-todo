// src/components/__tests__/Sidebar.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, render, fireEvent } from '@testing-library/react'
import { resetStores } from '@/__tests__/test-utils'
import { makeList } from '@/__tests__/factories'
import { useStore } from '@/store'
import { useTeamStore } from '@/lib/team-store'

vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    circle: 'circle',
  },
  AnimatePresence: ({ children }: any) => children,
}))

import { Sidebar } from '@/components/Sidebar'

function setup(lists = [makeList({ id: 'default', name: '收集箱' })]) {
  resetStores()
  useStore.setState({ lists, scope: 'personal', currentView: 'today' })
  useTeamStore.setState({ connectionStatus: 'disabled' })
}

describe('Sidebar', () => {
  beforeEach(() => {
    setup()
  })

  it('renders three preset views', () => {
    render(<Sidebar />)
    expect(screen.getByText('今天')).toBeInTheDocument()
    expect(screen.getByText('计划日程')).toBeInTheDocument()
    expect(screen.getByText('已完成')).toBeInTheDocument()
  })

  it('renders custom lists from store', () => {
    setup([
      makeList({ id: 'default', name: '收集箱' }),
      makeList({ id: 'work', name: '工作' }),
    ])
    render(<Sidebar />)
    expect(screen.getByText('工作')).toBeInTheDocument()
  })

  it('clicking preset view updates currentView', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByText('计划日程'))
    expect(useStore.getState().currentView).toBe('upcoming')
  })

  it('renders scope tabs', () => {
    render(<Sidebar />)
    expect(screen.getByText('个人')).toBeInTheDocument()
    expect(screen.getByText('团队')).toBeInTheDocument()
  })

  it('clicking 团队 switches scope to team', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByText('团队'))
    expect(useStore.getState().scope).toBe('team')
  })

  it('shows connection status when connected', () => {
    useTeamStore.setState({ connectionStatus: 'connected', onlineMemberCount: 3 })
    render(<Sidebar />)
    expect(screen.getByText(/已连接/)).toBeInTheDocument()
    expect(screen.getByText(/3人/)).toBeInTheDocument()
  })
})
