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

vi.stubGlobal('electronAPI', mockApi)

import { useTeamStore, type TeamTask, type TeamList, type TeamMember } from '../team-store'
import { makeTeamTask, makeTeamList, makeMember } from '@/__tests__/factories'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('electronAPI', mockApi)
  useTeamStore.setState({
    tasks: [],
    lists: [],
    members: [],
    connectionStatus: 'disabled',
    serverUrl: null,
    _snapshot: null,
    reconnectSummary: null,
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

  it('member:left keeps member for assignee display', () => {
    useTeamStore.setState({ members: [makeMember({ id: 'm1', name: '张三' })] })
    useTeamStore.getState()._handleMessage({
      type: 'member:left',
      payload: { memberId: 'm1' },
    })
    // Member stays in list so task assignee badges still show names
    expect(useTeamStore.getState().members).toHaveLength(1)
    expect(useTeamStore.getState().members[0].name).toBe('张三')
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

describe('list message handling', () => {
  it('list:created appends and deduplicates', () => {
    useTeamStore.setState({ lists: [makeTeamList({ id: 'l1', name: 'Old' })] })
    useTeamStore.getState()._handleMessage({
      type: 'list:created',
      payload: { list: makeTeamList({ id: 'l1', name: 'Duplicate' }) },
    })
    expect(useTeamStore.getState().lists).toHaveLength(1)
    expect(useTeamStore.getState().lists[0].name).toBe('Old')
  })

  it('list:created adds new list', () => {
    useTeamStore.getState()._handleMessage({
      type: 'list:created',
      payload: { list: makeTeamList({ id: 'new', name: '新' }) },
    })
    expect(useTeamStore.getState().lists).toHaveLength(1)
  })

  it('list:deleted moves tasks to default and removes list', () => {
    useTeamStore.setState({
      lists: [makeTeamList({ id: 'l1' }), makeTeamList({ id: 'l2' })],
      tasks: [makeTeamTask({ id: 't1', list_id: 'l1' })],
    })
    useTeamStore.getState()._handleMessage({ type: 'list:deleted', payload: { id: 'l1' } })
    expect(useTeamStore.getState().lists).toHaveLength(1)
    expect(useTeamStore.getState().tasks[0].list_id).toBe('default')
  })

  it('list:updated renames in-place', () => {
    useTeamStore.setState({ lists: [makeTeamList({ id: 'l1', name: 'Old' })] })
    useTeamStore.getState()._handleMessage({ type: 'list:updated', payload: { id: 'l1', name: '新名' } })
    expect(useTeamStore.getState().lists[0].name).toBe('新名')
  })
})

describe('connection status supplements', () => {
  it('disconnect saves snapshot of task IDs and completed IDs', () => {
    useTeamStore.setState({
      connectionStatus: 'connected',
      tasks: [makeTeamTask({ id: 't1', completed: 1 }), makeTeamTask({ id: 't2', completed: 0 })],
    })
    useTeamStore.getState()._updateStatus('disconnected')
    expect(useTeamStore.getState()._snapshot).not.toBeNull()
    expect(useTeamStore.getState()._snapshot!.taskIds.has('t1')).toBe(true)
    expect(useTeamStore.getState()._snapshot!.completedIds.has('t1')).toBe(true)
    expect(useTeamStore.getState()._snapshot!.completedIds.has('t2')).toBe(false)
  })

  it('_updateStatus preserves tasks and lists on disconnect', () => {
    useTeamStore.setState({
      tasks: [makeTeamTask()], lists: [makeTeamList()], connectionStatus: 'connected',
    })
    useTeamStore.getState()._updateStatus('disconnected')
    expect(useTeamStore.getState().tasks).toHaveLength(1)
    expect(useTeamStore.getState().lists).toHaveLength(1)
  })
})

describe('reconnect summary', () => {
  it('detects new tasks since disconnect', () => {
    useTeamStore.setState({ _snapshot: { taskIds: new Set(['old']), completedIds: new Set() } })
    useTeamStore.getState()._handleMessage({
      type: 'sync:full',
      payload: { members: [makeMember()], lists: [], tasks: [
        makeTeamTask({ id: 'old' }), makeTeamTask({ id: 'new', title: 'New' }),
      ]},
    })
    expect(useTeamStore.getState().reconnectSummary).toContain('新增 1 个任务')
  })

  it('detects completed tasks since disconnect', () => {
    useTeamStore.setState({ _snapshot: { taskIds: new Set(['t1']), completedIds: new Set() } })
    useTeamStore.getState()._handleMessage({
      type: 'sync:full',
      payload: { members: [makeMember()], lists: [], tasks: [
        makeTeamTask({ id: 't1', completed: 1 }),
      ]},
    })
    expect(useTeamStore.getState().reconnectSummary).toContain('完成 1 个任务')
  })

  it('no summary when nothing changed', () => {
    useTeamStore.setState({ _snapshot: { taskIds: new Set(['t1']), completedIds: new Set() } })
    useTeamStore.getState()._handleMessage({
      type: 'sync:full',
      payload: { members: [makeMember()], lists: [], tasks: [
        makeTeamTask({ id: 't1', completed: 0 }),
      ]},
    })
    expect(useTeamStore.getState().reconnectSummary).toBeNull()
  })
})

describe('sendMessage and sort', () => {
  it('sendMessage calls teamSend IPC', () => {
    useTeamStore.getState().sendMessage('task:create', { title: 'X' })
    expect(mockApi.teamSend).toHaveBeenCalledWith({ type: 'task:create', payload: { title: 'X' } })
  })

  it('sort:mode event updates manualSort', () => {
    useTeamStore.getState()._handleMessage({ type: 'sort:mode', payload: { manualSort: true } })
    expect(useTeamStore.getState().manualSort).toBe(true)
  })

  it('setManualSort broadcasts sort change', () => {
    useTeamStore.getState().setManualSort(true)
    expect(mockApi.teamSend).toHaveBeenCalledWith({ type: 'sort:mode', payload: { manualSort: true } })
  })
})
