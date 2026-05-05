// src/components/__tests__/CommandPalette.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { resetStores } from '@/__tests__/test-utils'
import { makeTask } from '@/__tests__/factories'
import { useStore } from '@/store'

vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
    input: 'input',
    p: 'p',
    kbd: 'kbd',
  },
  AnimatePresence: ({ children }: any) => children,
}))

import { CommandPalette } from '@/components/CommandPalette'

describe('CommandPalette', () => {
  beforeEach(() => {
    resetStores()
  })

  it('renders search input with correct placeholder', () => {
    render(<CommandPalette />)
    expect(screen.getByPlaceholderText('搜索任务...')).toBeInTheDocument()
  })

  it('shows default prompt when no query and no results', () => {
    render(<CommandPalette />)
    expect(screen.getByText('输入关键词搜索任务')).toBeInTheDocument()
  })

  it('displays search results when they exist in store', () => {
    // The component's useEffect calls search('') on mount which clears results.
    // Replace search with a no-op mock to preserve pre-loaded results.
    const mockSearch = vi.fn().mockResolvedValue(undefined)
    useStore.setState({
      search: mockSearch as any,
      searchResults: [makeTask({ id: 't1', title: 'Found task' })],
    })
    render(<CommandPalette />)
    expect(screen.getByText('Found task')).toBeInTheDocument()
  })
})
