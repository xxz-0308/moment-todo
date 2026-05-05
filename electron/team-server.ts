import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import type { Database } from 'sql.js'
import type { TeamMember } from './team-config'

interface TeamClientConn {
  ws: WebSocket
  memberId: string
}

interface WrappedMessage {
  type: string
  payload: Record<string, unknown>
  senderId: string
  messageId?: string
}

export type ServerEventHandler = (event: string, data: unknown) => void

export class TeamServer {
  private wss: WebSocketServer | null = null
  private clients = new Map<string, TeamClientConn>()
  private db: Database
  private onEvent: ServerEventHandler
  private port: number

  constructor(db: Database, port: number, onEvent: ServerEventHandler) {
    this.db = db
    this.port = port
    this.onEvent = onEvent
  }

  start(): boolean {
    try {
      this.wss = new WebSocketServer({ port: this.port })
    } catch (err: any) {
      console.error('[TeamServer] Failed to start:', err.message)
      return false
    }
    this.wss.on('error', (err: Error) => {
      console.error('[TeamServer] Server error:', err.message)
      this.onEvent('error', err.message)
    })
    console.log(`[TeamServer] Listening on port ${this.port}`)

    this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
      let memberId = ''

      ws.on('message', (raw: Buffer) => {
        try {
          const msg: WrappedMessage = JSON.parse(raw.toString())
          switch (msg.type) {
            case 'member:handshake': {
              const member = (msg.payload.member as TeamMember)
              memberId = member.id
              this.clients.set(memberId, { ws, memberId })
              // Upsert member
              this.db.run(
                `INSERT INTO team_members (id, name, color, last_seen) VALUES (?, ?, ?, datetime('now'))
                 ON CONFLICT(id) DO UPDATE SET name = ?, color = ?, last_seen = datetime('now')`,
                [member.id, member.name, member.color, member.name, member.color]
              )
              this.broadcastToAll({ type: 'member:connected', payload: { member }, senderId: '' })
              this.onEvent('member:connected', { member })
              break
            }
            case 'member:heartbeat': {
              this.db.run("UPDATE team_members SET last_seen = datetime('now') WHERE id = ?", [memberId])
              break
            }
            case 'sort:mode': {
              this.broadcastToAll({ type: 'sort:mode', payload: msg.payload, senderId: memberId })
              this.onEvent('sort:mode', msg.payload)
              break
            }
            case 'sync:request': {
              this.sendSyncFull(ws)
              break
            }
            case 'task:create':
            case 'task:update':
            case 'task:delete':
            case 'task:reorder': {
              this.handleTaskMessage(msg, memberId)
              break
            }
            case 'list:create':
            case 'list:update':
            case 'list:delete': {
              this.handleListMessage(msg, memberId)
              break
            }
          }
        } catch (e) {
          console.error('[TeamServer] Message error:', e)
        }
      })

      ws.on('close', () => {
        if (memberId) {
          this.clients.delete(memberId)
          this.db.run("UPDATE team_members SET last_seen = datetime('now') WHERE id = ?", [memberId])
          this.broadcastToAll({ type: 'member:left', payload: { memberId }, senderId: '' })
          this.onEvent('member:left', { memberId })
        }
      })
    })
    return true
  }

  stop(): void {
    // Force-close all client connections first
    for (const client of this.clients.values()) {
      try { client.ws.terminate() } catch {}
    }
    this.clients.clear()
    if (this.wss) {
      this.wss.close()
      this.wss = null
    }
  }

  private handleTaskMessage(msg: WrappedMessage, senderId: string): void {
    const type = msg.type
    const data = msg.payload
    const now = new Date().toISOString()

    if (type === 'task:create') {
      const id = (data.id as string) || crypto.randomUUID()
      this.db.run(
        `INSERT INTO tasks (id, title, completed, priority, due_date, list_id, notes, pinned, sort_order, scope, created_by, assigned_to, created_at, updated_at)
         VALUES (?, ?, 0, ?, ?, ?, '', 0, 0, 'team', ?, ?, ?, ?)`,
        [id, data.title, data.priority || 'medium', data.dueDate || null, data.listId || 'default', senderId, data.assignedTo || null, now, now]
      )
      const task = this.queryOne('SELECT * FROM tasks WHERE id = ?', [id])
      this.broadcastToAll({ type: 'task:created', payload: { task, by: senderId }, senderId })
      this.onEvent('task:created', { task, by: senderId })
    } else if (type === 'task:update') {
      const fields: string[] = []
      const values: unknown[] = []
      for (const key of ['title', 'completed', 'priority', 'due_date', 'list_id', 'notes', 'pinned', 'sort_order', 'assigned_to']) {
        if (key in data) {
          fields.push(`${key} = ?`)
          values.push(data[key])
        }
      }
      if (fields.length > 0) {
        fields.push("updated_at = ?")
        values.push(now)
        values.push(data.id)
        this.db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values)
      }
      this.broadcastToAll({ type: 'task:updated', payload: { id: data.id, ...data, by: senderId }, senderId })
      this.onEvent('task:updated', { id: data.id, ...data, by: senderId })
    } else if (type === 'task:delete') {
      this.db.run('DELETE FROM tasks WHERE id = ?', [data.id])
      this.broadcastToAll({ type: 'task:deleted', payload: { id: data.id, by: senderId }, senderId })
      this.onEvent('task:deleted', { id: data.id, by: senderId })
    } else if (type === 'task:reorder') {
      const items = data.items as Array<{ id: string; sort_order: number; list_id: string }>
      for (const item of items) {
        this.db.run('UPDATE tasks SET sort_order = ?, list_id = ?, updated_at = ? WHERE id = ?',
          [item.sort_order, item.list_id, now, item.id])
      }
      // Broadcast to all clients + echo to server renderer
      const broadcastMsg = { type: 'task:reorder', payload: { items }, senderId }
      this.broadcastToAll(broadcastMsg)
      this.onEvent('task:reorder', { items })
    }
  }

  private handleListMessage(msg: WrappedMessage, senderId: string): void {
    const type = msg.type
    const data = msg.payload
    const now = new Date().toISOString()

    if (type === 'list:create') {
      const id = (data.id as string) || crypto.randomUUID()
      const r = this.db.exec("SELECT COALESCE(MAX(sort_order), -1) as m FROM lists WHERE scope = 'team'")
      const maxOrder = (r.length > 0 && r[0].values.length > 0) ? (r[0].values[0][0] as number) : -1
      this.db.run(
        "INSERT INTO lists (id, name, color, sort_order, scope, created_by) VALUES (?, ?, ?, ?, 'team', ?)",
        [id, data.name, data.color || '#6366f1', (maxOrder as number) + 1, senderId]
      )
      const list = this.queryOne('SELECT * FROM lists WHERE id = ?', [id])
      this.broadcastToAll({ type: 'list:created', payload: { list, by: senderId }, senderId })
      this.onEvent('list:created', { list, by: senderId })
    } else if (type === 'list:delete') {
      this.db.run("UPDATE tasks SET list_id = 'default' WHERE list_id = ?", [data.id])
      this.db.run('DELETE FROM lists WHERE id = ?', [data.id])
      this.broadcastToAll({ type: 'list:deleted', payload: { id: data.id, by: senderId }, senderId })
      this.onEvent('list:deleted', { id: data.id, by: senderId })
    } else if (type === 'list:update') {
      if (data.name) {
        this.db.run('UPDATE lists SET name = ? WHERE id = ?', [data.name, data.id])
      }
      if (data.color) {
        this.db.run('UPDATE lists SET color = ? WHERE id = ?', [data.color, data.id])
      }
      this.broadcastToAll({ type: 'list:updated', payload: { id: data.id, ...data, by: senderId }, senderId })
      this.onEvent('list:updated', { id: data.id, ...data, by: senderId })
    }
  }

  private sendSyncFull(ws: WebSocket): void {
    const members = this.queryAll('SELECT * FROM team_members')
    const lists = this.queryAll("SELECT * FROM lists WHERE scope = 'team'")
    const tasks = this.queryAll("SELECT * FROM tasks WHERE scope = 'team'")
    const msg = JSON.stringify({ type: 'sync:full', payload: { members, lists, tasks }, senderId: '' })
    ws.send(msg)
  }

  broadcast(msg: { type: string; payload: unknown; senderId?: string }): void {
    this.broadcastToAll({ ...msg, senderId: msg.senderId || '' })
  }

  private broadcastToAll(msg: { type: string; payload: unknown; senderId: string }): void {
    const data = JSON.stringify(msg)
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data)
      }
    }
  }

  // sql.js helper — uses the same pattern as the existing queryAll in main.ts
  private queryAll(sql: string, params?: unknown[]): Record<string, unknown>[] {
    const stmt = this.db.prepare(sql)
    if (params && params.length > 0) stmt.bind(params as any[])
    const cols = stmt.getColumnNames()
    const rows: Record<string, unknown>[] = []
    while (stmt.step()) {
      const vals = stmt.get()
      const row: Record<string, unknown> = {}
      cols.forEach((c, i) => { row[c] = vals[i] })
      rows.push(row)
    }
    stmt.free()
    return rows
  }

  private queryOne(sql: string, params?: unknown[]): Record<string, unknown> | null {
    const rows = this.queryAll(sql, params)
    return rows[0] || null
  }

  get memberCount(): number {
    return this.clients.size
  }
}
