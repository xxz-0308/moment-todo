// src/components/__tests__/EmptyState.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { resetStores } from '@/__tests__/test-utils'
import { useStore } from '@/store'
import { useTeamStore } from '@/lib/team-store'

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
}))

vi.mock('@/hooks/useSound', () => ({
  playCelebrationSound: vi.fn(),
  playCompleteSound: vi.fn(),
  playDeleteSound: vi.fn(),
  playUndoSound: vi.fn(),
  playPinSound: vi.fn(),
  playQuickAddSound: vi.fn(),
}))

import { EmptyState } from '@/components/EmptyState'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 6) return { title: '夜深了', subtitle: '早点休息，明天再战' }
  if (hour < 9) return { title: '早上好', subtitle: '新的一天，从整理开始' }
  if (hour < 12) return { title: '上午好', subtitle: '一日之计在于晨' }
  if (hour < 14) return { title: '中午好', subtitle: '休息一下，看看待办' }
  if (hour < 18) return { title: '下午好', subtitle: '高效的一下午' }
  if (hour < 22) return { title: '晚上好', subtitle: '回顾今天，计划明天' }
  return { title: '夜深了', subtitle: '早点休息，明天再战' }
}

describe('EmptyState', () => {
  beforeEach(() => {
    resetStores()
    useStore.setState({ scope: 'personal' })
  })

  it('shows personal greeting for today view', () => {
    render(<EmptyState view="today" />)
    const greeting = getGreeting()
    expect(screen.getByText(greeting.title)).toBeInTheDocument()
  })

  it('shows team offline message when disconnected', () => {
    useStore.setState({ scope: 'team' })
    useTeamStore.setState({ connectionStatus: 'disconnected' })
    render(<EmptyState view="custom-list" />)
    expect(screen.getByText(/团队服务已断开/)).toBeInTheDocument()
  })

  it('shows team online message when connected', () => {
    useStore.setState({ scope: 'team' })
    useTeamStore.setState({ connectionStatus: 'connected' })
    render(<EmptyState view="custom-list" />)
    expect(screen.getByText(/添加第一个团队事务/)).toBeInTheDocument()
  })

  it('shows add task button for non-completed views', () => {
    render(<EmptyState view="custom-list" />)
    expect(screen.getByText('添加任务')).toBeInTheDocument()
  })
})
