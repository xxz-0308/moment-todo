import { useRef, useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useTeamStore, type TeamMember } from '@/lib/team-store'
import { useStore } from '@/store'

interface Planet {
  member: TeamMember
  orbit: number
  speed: number
  angle: number
  radius: number
}

export function TeamPlanet({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const members = useTeamStore((s) => s.members)
  const theme = useStore((s) => s.theme)
  const [hoveredMember, setHoveredMember] = useState<TeamMember | null>(null)
  const planetsRef = useRef<Planet[]>([])
  const animRef = useRef<number>(0)

  useEffect(() => {
    planetsRef.current = members
      .filter(m => !m.is_server)
      .map((m, i) => ({
        member: m,
        orbit: 80 + i * 55,
        speed: 0.3 + Math.random() * 0.4,
        angle: Math.random() * Math.PI * 2,
        radius: 12 + Math.random() * 8,
      }))
  }, [members])

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.width = canvas.offsetWidth * dpr
    const h = canvas.height = canvas.offsetHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cw = canvas.offsetWidth
    const ch = canvas.offsetHeight
    const cx = cw / 2
    const cy = ch / 2

    // Background
    ctx.fillStyle = theme === 'light' ? 'rgba(250,250,252,0.95)' : 'rgba(5,5,18,0.94)'
    ctx.fillRect(0, 0, cw, ch)

    // Starfield
    ctx.fillStyle = theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)'
    for (let i = 0; i < 80; i++) {
      const sx = (i * 137.508) % cw
      const sy = (i * 97.317) % ch
      const sz = (i % 3) + 0.5
      ctx.fillRect(sx, sy, sz, sz)
    }

    // Orbits
    planetsRef.current.forEach(p => {
      ctx.beginPath()
      ctx.arc(cx, cy, p.orbit, 0, Math.PI * 2)
      ctx.strokeStyle = theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      ctx.stroke()
    })

    // Server star
    const serverMember = members.find(m => m.is_server)
    const pulse = 1 + Math.sin(Date.now() * 0.0015) * 0.06
    const starColor = serverMember?.color || '#6366f1'

    // Outer glow
    const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 55 * pulse)
    glow.addColorStop(0, starColor + '50')
    glow.addColorStop(0.5, starColor + '15')
    glow.addColorStop(1, 'transparent')
    ctx.beginPath()
    ctx.arc(cx, cy, 55 * pulse, 0, Math.PI * 2)
    ctx.fillStyle = glow
    ctx.fill()

    // Core
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18)
    core.addColorStop(0, '#ffffff')
    core.addColorStop(0.3, starColor)
    core.addColorStop(1, starColor + '40')
    ctx.beginPath()
    ctx.arc(cx, cy, 18, 0, Math.PI * 2)
    ctx.fillStyle = core
    ctx.fill()

    // Server label
    ctx.fillStyle = theme === 'light' ? '#1a1a2e' : '#ffffff'
    ctx.font = '600 13px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(serverMember?.name || '服务端', cx, cy + 65)

    // Planets
    planetsRef.current.forEach(p => {
      p.angle += p.speed * 0.016
      const px = cx + Math.cos(p.angle) * p.orbit
      const py = cy + Math.sin(p.angle) * p.orbit

      // Planet glow
      const pglow = ctx.createRadialGradient(px, py, 0, px, py, p.radius * 2.5)
      pglow.addColorStop(0, p.member.color + '30')
      pglow.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(px, py, p.radius * 2.5, 0, Math.PI * 2)
      ctx.fillStyle = pglow
      ctx.fill()

      // Planet body
      const pcore = ctx.createRadialGradient(px - p.radius * 0.3, py - p.radius * 0.3, 0, px, py, p.radius)
      pcore.addColorStop(0, '#ffffff')
      pcore.addColorStop(0.4, p.member.color)
      pcore.addColorStop(1, p.member.color + '60')
      ctx.beginPath()
      ctx.arc(px, py, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = pcore
      ctx.fill()

      // Name
      ctx.fillStyle = theme === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.55)'
      ctx.font = '11px Inter, system-ui, sans-serif'
      ctx.fillText(p.member.name, px, py + p.radius + 16)
    })

    animRef.current = requestAnimationFrame(animate)
  }, [members, theme])

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [animate])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2

    if (Math.hypot(x - cx, y - cy) < 55) {
      const server = members.find(m => m.is_server)
      if (server) { setHoveredMember(server); return }
    }

    for (const p of planetsRef.current) {
      const px = cx + Math.cos(p.angle) * p.orbit
      const py = cy + Math.sin(p.angle) * p.orbit
      if (Math.hypot(x - px, y - py) < p.radius * 2.5) {
        setHoveredMember(p.member)
        return
      }
    }
    // Clicked empty space — close
    onClose()
  }, [members, onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onClick={(e) => { e.stopPropagation(); handleClick(e) }}
      />
      {hoveredMember && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl"
          style={{
            background: 'var(--glass-elevated-bg)',
            backdropFilter: 'var(--glass-elevated-blur)',
            WebkitBackdropFilter: 'var(--glass-elevated-blur)',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <span className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: hoveredMember.color }} />
            <span className="text-text-primary font-semibold text-[14px]">{hoveredMember.name}</span>
            {hoveredMember.is_server ? (
              <span className="text-[12px] text-green-400">服务端</span>
            ) : (
              <span className="text-[12px] text-text-tertiary">成员</span>
            )}
          </span>
        </div>
      )}

    </motion.div>
  )
}
