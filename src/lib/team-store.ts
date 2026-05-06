// src/lib/team-store.ts
import { create } from 'zustand'

export interface TeamTask {
  id: string
  title: string
  completed: number
  priority: 'high' | 'medium' | 'low'
  due_date: string | null
  list_id: string
  notes: string
  pinned: number
  sort_order: number
  scope: string
  created_by: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface TeamList {
  id: string
  name: string
  color: string | null
  sort_order: number
  scope: string
  created_by: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  name: string
  color: string
  is_server: number
  last_seen: string | null
  created_at: string
}

export type ConnectionStatus = 'disabled' | 'disconnected' | 'connecting' | 'connected'

interface TeamEvent {
  type: string
  payload: Record<string, unknown>
}

interface TeamState {
  tasks: TeamTask[]
  lists: TeamList[]
  members: TeamMember[]
  connectionStatus: ConnectionStatus
  serverUrl: string | null
  manualSort: boolean
  onlineMemberCount: number
  onlineMembers: Set<string>
  reconnectSummary: string | null
  _snapshot: { taskIds: Set<string>; completedIds: Set<string> } | null

  _handleMessage: (event: TeamEvent) => void
  _updateStatus: (status: ConnectionStatus) => void
  setManualSort: (value: boolean) => void
  connect: (url?: string) => Promise<void>
  disconnect: () => Promise<void>
  startTeam: (mode: 'server' | 'client') => Promise<void>
  sendMessage: (type: string, payload: unknown) => void
}

const api = () => {
  if (typeof window === 'undefined') return null
  const win = window as any
  if (!win.electronAPI) return null
  return win.electronAPI as {
    teamSend: (msg: { type: string; payload: unknown }) => Promise<void>
    teamStart: (mode: string) => Promise<void>
    teamStop: () => Promise<void>
    teamGetConfig: () => Promise<{ member: TeamMember; role: string; serverAddress: string; serverPort: number }>
    teamSaveConfig: (config: unknown) => Promise<void>
    teamDiscover: () => Promise<string | null>
    teamGetStatus: () => Promise<{ status: string; memberCount?: number }>
    onTeamEvent: (cb: (event: TeamEvent) => void) => void
  }
}

export const useTeamStore = create<TeamState>((set, get) => ({
  tasks: [],
  lists: [],
  members: [],
  connectionStatus: 'disabled',
  serverUrl: null,
  manualSort: false,
  onlineMemberCount: 0,
  onlineMembers: new Set<string>(),
  reconnectSummary: null,
  _snapshot: null,

  _handleMessage: (event: TeamEvent) => {
    const { type, payload } = event
    switch (type) {
      case 'sync:full': {
        const p = payload as { members: TeamMember[]; lists: TeamList[]; tasks: TeamTask[]; onlineIds?: string[] }
        const snap = get()._snapshot
        const memberList = p.members || []
        const onlineIds = p.onlineIds || []
        const online = new Set<string>(onlineIds)
        set({ members: memberList, lists: p.lists || [], tasks: p.tasks || [], onlineMemberCount: onlineIds.length, onlineMembers: online, _snapshot: null })
        if (snap && (p.tasks || []).length > 0) {
          const newTasks = (p.tasks || []).filter(t => !snap.taskIds.has(t.id))
          const newCompleted = (p.tasks || []).filter(t => t.completed && !snap.completedIds.has(t.id))
          if (newTasks.length > 0 || newCompleted.length > 0) {
            const parts: string[] = []
            if (newTasks.length > 0) parts.push(`新增 ${newTasks.length} 个任务`)
            if (newCompleted.length > 0) parts.push(`完成 ${newCompleted.length} 个任务`)
            set({ reconnectSummary: `同步完成：${parts.join('，')}` })
          }
        }
        break
      }
      case 'task:created': {
        const p = payload as { task: TeamTask }
        set((s) => {
          if (s.tasks.find((t) => t.id === p.task.id)) return s
          return { tasks: [p.task, ...s.tasks] }
        })
        break
      }
      case 'task:updated': {
        const p = payload as { id: string } & Partial<TeamTask>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === p.id ? { ...t, ...p, updated_at: new Date().toISOString() } : t)),
        }))
        break
      }
      case 'task:deleted': {
        const p = payload as { id: string }
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== p.id) }))
        break
      }
      case 'task:reorder': {
        const p = payload as { items: Array<{ id: string; sort_order: number; list_id: string }> }
        const itemMap = new Map(p.items.map((i) => [i.id, i]))
        set((s) => {
          const updated = s.tasks.map((t) => {
            const update = itemMap.get(t.id)
            return update ? { ...t, sort_order: update.sort_order, list_id: update.list_id } : t
          })
          updated.sort((a, b) => a.sort_order - b.sort_order)
          return { tasks: updated, manualSort: true }
        })
        break
      }
      case 'list:created': {
        const p = payload as { list: TeamList }
        set((s) => {
          if (s.lists.find((l) => l.id === p.list.id)) return s
          return { lists: [...s.lists, p.list] }
        })
        break
      }
      case 'list:deleted': {
        const p = payload as { id: string }
        set((s) => ({
          lists: s.lists.filter((l) => l.id !== p.id),
          tasks: s.tasks.map((t) => t.list_id === p.id ? { ...t, list_id: 'default' } : t),
        }))
        break
      }
      case 'list:updated': {
        const p = payload as { id: string; name?: string; color?: string }
        set((s) => ({
          lists: s.lists.map((l) => l.id === p.id ? { ...l, ...p } : l),
        }))
        break
      }
      case 'member:connected': {
        const p = payload as { member: TeamMember; totalCount: number }
        set((s) => {
          const online = new Set(s.onlineMembers)
          online.add(p.member.id)
          const idx = s.members.findIndex((m) => m.id === p.member.id)
          if (idx >= 0) {
            const updated = [...s.members]
            updated[idx] = { ...updated[idx], ...p.member, last_seen: new Date().toISOString() }
            return { members: updated, onlineMemberCount: p.totalCount, onlineMembers: online }
          }
          return { members: [...s.members, p.member], onlineMemberCount: p.totalCount, onlineMembers: online }
        })
        break
      }
      case 'member:updated':
      case 'member:joined': {
        // Profile update or sync data — don't change count
        const p = payload as { member: TeamMember }
        set((s) => {
          const idx = s.members.findIndex((m) => m.id === p.member.id)
          if (idx >= 0) {
            const updated = [...s.members]
            updated[idx] = { ...updated[idx], ...p.member }
            return { members: updated }
          }
          return { members: [...s.members, p.member] }
        })
        break
      }
      case 'member:left': {
        const p = payload as { memberId: string; totalCount: number }
        set((s) => {
          const online = new Set(s.onlineMembers)
          online.delete(p.memberId)
          return {
            members: s.members.map((m) =>
              m.id === p.memberId ? { ...m, last_seen: new Date().toISOString() } : m
            ),
            onlineMemberCount: p.totalCount || Math.max(1, s.onlineMemberCount - 1),
            onlineMembers: online,
          }
        })
        break
      }
      case 'protocol:rejected': {
        const p = payload as { serverVersion: number; clientVersion: number; message: string }
        set({ connectionStatus: 'disconnected' })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('moment:toast', { detail: { message: p.message || '协议版本不匹配，请升级应用后重试' } }))
        }
        break
      }
      case 'sort:mode': {
        const p = payload as { manualSort: boolean }
        set({ manualSort: p.manualSort })
        break
      }
      case 'status': {
        const p = payload as unknown as string
        const newStatus = p as ConnectionStatus
        const prevStatus = get().connectionStatus
        if (newStatus === 'disconnected' && prevStatus === 'connected') {
          // Save snapshot for reconnect summary
          const tasks = get().tasks
          set({
            connectionStatus: newStatus,
            _snapshot: {
              taskIds: new Set(tasks.map(t => t.id)),
              completedIds: new Set(tasks.filter(t => t.completed).map(t => t.id)),
            },
          } as any)
        } else {
          set({
            connectionStatus: newStatus,
            ...(newStatus === 'disabled' ? { onlineMemberCount: 0 } : {}),
          })
        }
        break
      }
      case 'notify:assigned': {
        const p = payload as { taskId: string; taskTitle: string; assignedBy: string }
        if (typeof window !== 'undefined') {
          const msg = `${p.assignedBy || '有人'}给你分配了任务：${p.taskTitle}`
          ;(window as any).electronAPI?.showNotification?.('新任务分配', msg)
          window.dispatchEvent(new CustomEvent('moment:toast', { detail: { message: msg } }))
        }
        break
      }
    }
  },

  _updateStatus: (status: ConnectionStatus) => {
    if (status === 'disconnected' && get().connectionStatus === 'connected') {
      const tasks = get().tasks
      set({
        connectionStatus: status,
        _snapshot: {
          taskIds: new Set(tasks.map(t => t.id)),
          completedIds: new Set(tasks.filter(t => t.completed).map(t => t.id)),
        },
      } as any)
      return
    }
    set({ connectionStatus: status })
  },

  connect: async (url?: string) => {
    set({ connectionStatus: 'connecting' })
    const a = api()
    if (!a) return
    a.onTeamEvent((event: TeamEvent) => {
      get()._handleMessage(event)
    })
    await a.teamStart('client')
  },

  disconnect: async () => {
    const a = api()
    if (!a) return
    await a.teamStop()
    set({ connectionStatus: 'disabled' })
  },

  startTeam: async (mode: 'server' | 'client') => {
    const a = api()
    if (!a) return
    a.onTeamEvent((event: TeamEvent) => {
      get()._handleMessage(event)
    })
    await a.teamStart(mode)
  },

  setManualSort: (value: boolean) => {
    set({ manualSort: value })
    get().sendMessage('sort:mode', { manualSort: value })
  },

  sendMessage: (type: string, payload: unknown) => {
    const a = api()
    if (!a) return
    a.teamSend({ type, payload })
  },
}))
