// src/lib/__tests__/team-store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockApi = vi.hoisted(() => ({
  teamSend: vi.fn(),
  teamStart: vi.fn(),
  teamStop: vi.fn(),
  teamGetConfig: vi.fn(),
  teamSaveConfig: vi.fn(),
  teamDiscover: vi.fn(),
  teamGetStatus: vi.fn(),
  teamGetMembers: vi.fn(),
  onTeamEvent: vi.fn(),
}))

vi.stubGlobal('window', {
  electronAPI: mockApi,
})

import { useTeamStore, type TeamTask, type TeamList, type TeamMember } from '../team-store'

function makeTeamTask(overrides: Partial<TeamTask> = {}): TeamTask {
  return {
    id: overrides.id || 't1',
    title: overrides.title || 'Test Task',
    completed: overrides.completed ?? 0,
    priority: overrides.priority || 'medium',
    due_date: overrides.due_date ?? null,
    list_id: overrides.list_id || 'default',
    notes: overrides.notes ?? '',
    pinned: overrides.pinned ?? 0,
    sort_order: overrides.sort_order ?? 0,
    scope: 'team',
    created_by: overrides.created_by || 'member1',
    assigned_to: overrides.assigned_to ?? null,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  }
}

function makeTeamList(overrides: Partial<TeamList> = {}): TeamList {
  return {
    id: overrides.id || 'l1',
    name: overrides.name || '版本',
    color: overrides.color ?? '#6366f1',
    sort_order: overrides.sort_order ?? 0,
    scope: 'team',
    created_by: overrides.created_by ?? null,
    created_at: overrides.created_at || new Date().toISOString(),
  }
}

function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: overrides.id || 'm1',
    name: overrides.name || '张三',
    color: overrides.color || '#6366f1',
    is_server: overrides.is_server ?? 0,
    last_seen: overrides.last_seen ?? null,
    created_at: overrides.created_at || new Date().toISOString(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useTeamStore.setState({
    tasks: [],
    lists: [],
    members: [],
    connectionStatus: 'disabled',
    serverUrl: null,
  })
})

describe('sync handling', () => {
  it('sync:full populates all data', () => {
    const store = useTeamStore.getState()
    store._handleMessage({
      type: 'sync:full',
      payload: {
        members: [makeMember({ id: 'm1', name: '张三' })],
        lists: [makeTeamList({ id: 'l1', name: '版本' })],
        tasks: [makeTeamTask({ id: 't1', title: 'Fix bug' })],
      },
    })

    const s = useTeamStore.getState()
    expect(s.members).toHaveLength(1)
    expect(s.members[0].name).toBe('张三')
    expect(s.lists).toHaveLength(1)
    expect(s.lists[0].name).toBe('版本')
    expect(s.tasks).toHaveLength(1)
    expect(s.tasks[0].title).toBe('Fix bug')
  })

  it('task:created prepends to tasks', () => {
    useTeamStore.setState({ tasks: [makeTeamTask({ id: 'old' })] })
    useTeamStore.getState()._handleMessage({
      type: 'task:created',
      payload: { task: makeTeamTask({ id: 'new', title: 'New task' }), by: 'm1' },
    })
    expect(useTeamStore.getState().tasks[0].id).toBe('new')
    expect(useTeamStore.getState().tasks).toHaveLength(2)
  })

  it('task:updated modifies in-place', () => {
    useTeamStore.setState({ tasks: [makeTeamTask({ id: 't1', title: 'Old' })] })
    useTeamStore.getState()._handleMessage({
      type: 'task:updated',
      payload: { id: 't1', title: 'Updated' },
    })
    expect(useTeamStore.getState().tasks[0].title).toBe('Updated')
  })

  it('task:deleted removes from state', () => {
    useTeamStore.setState({ tasks: [makeTeamTask({ id: 't1' }), makeTeamTask({ id: 't2' })] })
    useTeamStore.getState()._handleMessage({
      type: 'task:deleted',
      payload: { id: 't1' },
    })
    expect(useTeamStore.getState().tasks).toHaveLength(1)
    expect(useTeamStore.getState().tasks[0].id).toBe('t2')
  })

  it('member:joined adds to members', () => {
    useTeamStore.getState()._handleMessage({
      type: 'member:joined',
      payload: { member: makeMember({ id: 'm1', name: '李四' }) },
    })
    expect(useTeamStore.getState().members).toHaveLength(1)
    expect(useTeamStore.getState().members[0].name).toBe('李四')
  })

  it('member:joined updates existing member on re-join', () => {
    useTeamStore.setState({ members: [makeMember({ id: 'm1', name: 'Old' })] })
    useTeamStore.getState()._handleMessage({
      type: 'member:joined',
      payload: { member: makeMember({ id: 'm1', name: '新的名' }) },
    })
    expect(useTeamStore.getState().members).toHaveLength(1)
    expect(useTeamStore.getState().members[0].name).toBe('新的名')
  })

  it('member:left removes member', () => {
    useTeamStore.setState({ members: [makeMember({ id: 'm1' })] })
    useTeamStore.getState()._handleMessage({
      type: 'member:left',
      payload: { memberId: 'm1' },
    })
    expect(useTeamStore.getState().members).toHaveLength(0)
  })
})

describe('connection status', () => {
  it('updateStatus does not clear data on disconnect (preserves for read-only)', () => {
    useTeamStore.setState({
      tasks: [makeTeamTask()],
      lists: [makeTeamList()],
      members: [makeMember()],
    })
    useTeamStore.getState()._updateStatus('disconnected')
    expect(useTeamStore.getState().connectionStatus).toBe('disconnected')
    expect(useTeamStore.getState().tasks).toHaveLength(1)
    expect(useTeamStore.getState().lists).toHaveLength(1)
  })
})
