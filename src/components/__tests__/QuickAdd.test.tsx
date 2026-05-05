import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, render } from '@testing-library/react'
import { resetStores } from '@/__tests__/test-utils'
import { makeList } from '@/__tests__/factories'
import { useStore } from '@/store'

vi.mock('framer-motion', () => ({
  motion: { div: 'div', button: 'button', span: 'span', input: 'input' },
  AnimatePresence: ({ children }: any) => children,
}))

vi.mock('@/hooks/useSound', () => ({
  playQuickAddSound: vi.fn(),
  playCompleteSound: vi.fn(),
  playDeleteSound: vi.fn(),
  playUndoSound: vi.fn(),
  playPinSound: vi.fn(),
}))

import { QuickAdd } from '@/components/QuickAdd'

beforeEach(() => {
  resetStores()
  useStore.setState({ lists: [makeList({ id: 'default', name: '收集箱' })], scope: 'personal', currentView: 'today' })
})

describe('QuickAdd', () => {
  it('renders title input with placeholder', () => {
    render(<QuickAdd />)
    expect(screen.getByPlaceholderText('添加任务...')).toBeInTheDocument()
  })

  it('renders create button disabled when empty', () => {
    render(<QuickAdd />)
    const btn = screen.getByText('创建')
    expect(btn).toBeDisabled()
  })

  it('shows "更多选项" toggle link', () => {
    render(<QuickAdd />)
    expect(screen.getByText('更多选项')).toBeInTheDocument()
  })
})
