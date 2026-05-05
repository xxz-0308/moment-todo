// src/components/__tests__/TeamPlanet.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { resetStores } from '@/__tests__/test-utils'
import { makeMember } from '@/__tests__/factories'
import { useTeamStore } from '@/lib/team-store'

vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
  },
  AnimatePresence: ({ children }: any) => children,
}))

import { TeamPlanet } from '@/components/TeamPlanet'

describe('TeamPlanet', () => {
  beforeEach(() => {
    resetStores()
  })

  it('renders server and client member names', () => {
    useTeamStore.setState({
      members: [
        makeMember({ id: 'server', name: '主机', is_server: 1 }),
        makeMember({ id: 'm1', name: '张三' }),
        makeMember({ id: 'm2', name: '李四' }),
      ],
      onlineMembers: new Set(['server', 'm1', 'm2']),
      onlineMemberCount: 3,
    })
    render(<TeamPlanet onClose={() => {}} />)
    expect(screen.getByText('主机')).toBeInTheDocument()
    expect(screen.getByText('张三')).toBeInTheDocument()
    expect(screen.getByText('李四')).toBeInTheDocument()
  })

  it('shows online member count including server', () => {
    useTeamStore.setState({
      members: [
        makeMember({ id: 'server', name: 'Server', is_server: 1 }),
        makeMember({ id: 'm1', name: 'User' }),
      ],
      onlineMembers: new Set(['server', 'm1']),
      onlineMemberCount: 2,
    })
    render(<TeamPlanet onClose={() => {}} />)
    // TeamPlanet calculates totalOnline = 1 + onlineClients.length
    // and shows "已连接 {totalOnline} 人"
    expect(screen.getByText(/已连接/)).toBeInTheDocument()
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })
})
