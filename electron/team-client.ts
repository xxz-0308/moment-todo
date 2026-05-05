import WebSocket from 'ws'
import type { TeamMember } from './team-config'

export type ClientStatus = 'disconnected' | 'connecting' | 'connected'

export type ClientEventHandler = (event: string, data: unknown) => void

export class TeamClient {
  private ws: WebSocket | null = null
  private member: TeamMember
  private url: string
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private onEvent: ClientEventHandler
  private _status: ClientStatus = 'disconnected'

  constructor(url: string, member: TeamMember, onEvent: ClientEventHandler) {
    this.url = url
    this.member = member
    this.onEvent = onEvent
  }

  get status(): ClientStatus {
    return this._status
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return
    this._status = 'connecting'
    this.onEvent('status', 'connecting')

    try {
      this.ws = new WebSocket(`ws://${this.url}`)

      this.ws.on('open', () => {
        console.log('[TeamClient] Connected')
        this._status = 'connected'
        this.reconnectDelay = 1000
        this.onEvent('status', 'connected')
        // Handshake
        this.send({ type: 'member:handshake', payload: { member: this.member } })
        // Request full sync
        this.send({ type: 'sync:request', payload: {} })
        // Start heartbeat
        this.heartbeatTimer = setInterval(() => {
          this.send({ type: 'member:heartbeat', payload: {} })
        }, 30000)
      })

      this.ws.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString())
          this.onEvent(msg.type, msg.payload)
        } catch (e) {
          console.error('[TeamClient] Parse error:', e)
        }
      })

      this.ws.on('close', () => {
        console.log('[TeamClient] Disconnected')
        this.cleanup()
        this._status = 'disconnected'
        this.onEvent('status', 'disconnected')
        this.scheduleReconnect()
      })

      this.ws.on('error', (err) => {
        console.error('[TeamClient] Error:', err.message)
        this.cleanup()
        this._status = 'disconnected'
        this.onEvent('status', 'disconnected')
        this.scheduleReconnect()
      })
    } catch (e) {
      console.error('[TeamClient] Connect error:', e)
      this.scheduleReconnect()
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.cleanup()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this._status = 'disconnected'
  }

  send(msg: { type: string; payload: unknown }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    this._status = 'disconnected'
    if (this.reconnectTimer) return
    console.log(`[TeamClient] Reconnecting in ${this.reconnectDelay}ms...`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      this.connect()
    }, this.reconnectDelay)
  }
}
