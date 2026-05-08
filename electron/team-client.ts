import WebSocket from 'ws'
import type { TeamMember } from './team-config'
import { MIN_PROTOCOL_VERSION } from '../src/constants'

export type ClientStatus = 'disconnected' | 'connecting' | 'connected'

export type ClientEventHandler = (event: string, data: unknown) => void

export class TeamClient {
  private ws: WebSocket | null = null
  private member: TeamMember
  private url: string
  private appVersion: string
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private onEvent: ClientEventHandler
  private _status: ClientStatus = 'disconnected'
  private _intentionalClose = false

  constructor(url: string, member: TeamMember, appVersion: string, onEvent: ClientEventHandler) {
    this.url = url
    this.member = member
    this.appVersion = appVersion
    this.onEvent = onEvent
  }

  get status(): ClientStatus {
    return this._status
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return
    this._intentionalClose = false
    this._status = 'connecting'
    this.onEvent('status', 'connecting')

    try {
      this.ws = new WebSocket(`ws://${this.url}`)

      this.ws.on('open', () => {
        console.log('[TeamClient] Connected')
        this._status = 'connected'
        this.reconnectDelay = 1000
        this.onEvent('status', 'connected')
        // Handshake with protocol version
        this.send({ type: 'member:handshake', payload: { member: this.member, protocolVersion: MIN_PROTOCOL_VERSION, appVersion: this.appVersion } })
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
    this._intentionalClose = true
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

  private scheduleReconnect(): void {
    if (this._intentionalClose) return
    this._status = 'disconnected'
    if (this.reconnectTimer) return
    console.log(`[TeamClient] Reconnecting in ${this.reconnectDelay}ms...`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      this.connect()
    }, this.reconnectDelay)
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
}
