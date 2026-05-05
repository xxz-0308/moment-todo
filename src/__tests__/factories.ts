// src/__tests__/factories.ts
import type { Task, List } from '@/store'
import type { TeamTask, TeamList, TeamMember } from '@/lib/team-store'

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id || crypto.randomUUID(),
    title: overrides.title || 'Test Task',
    completed: overrides.completed ?? 0,
    priority: overrides.priority || 'medium',
    due_date: overrides.due_date ?? null,
    list_id: overrides.list_id || 'default',
    notes: overrides.notes ?? '',
    pinned: overrides.pinned ?? 0,
    sort_order: overrides.sort_order ?? 0,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
  }
}

export function makeList(overrides: Partial<List> = {}): List {
  return {
    id: overrides.id || 'default',
    name: overrides.name || '收集箱',
    color: overrides.color ?? '#6366f1',
    sort_order: overrides.sort_order ?? 0,
    created_at: overrides.created_at || new Date().toISOString(),
  }
}

export function makeTeamTask(overrides: Partial<TeamTask> = {}): TeamTask {
  return {
    id: overrides.id || 'tt1',
    title: overrides.title || 'Team Task',
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

export function makeTeamList(overrides: Partial<TeamList> = {}): TeamList {
  return {
    id: overrides.id || 'tl1',
    name: overrides.name || '版本',
    color: overrides.color ?? '#6366f1',
    sort_order: overrides.sort_order ?? 0,
    scope: 'team',
    created_by: overrides.created_by ?? null,
    created_at: overrides.created_at || new Date().toISOString(),
  }
}

export function makeMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: overrides.id || 'm1',
    name: overrides.name || '张三',
    color: overrides.color || '#6366f1',
    is_server: overrides.is_server ?? 0,
    last_seen: overrides.last_seen ?? null,
    created_at: overrides.created_at || new Date().toISOString(),
  }
}
