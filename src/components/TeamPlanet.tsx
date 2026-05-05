import { useRef, useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useTeamStore, type TeamMember } from '@/lib/team-store'

const STAR_COUNT = 120

interface PlanetData {
  member: TeamMember
  orbit: number
  speed: number
  angle: number
  radius: number
}

export function TeamPlanet({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const members = useTeamStore((s) => s.members)
  const onlineMembers = useTeamStore((s) => s.onlineMembers)
  const [hoveredMember, setHoveredMember] = useState<TeamMember | null>(null)
  const planetsRef = useRef<PlanetData[]>([])
  const starsRef = useRef<Array<{ x: number; y: number; r: number; phase: number; speed: number }>>([])
  const animRef = useRef<number>(0)
  const timeRef = useRef(0)
  const serverMember = members.find(m => m.is_server)

  // Init starfield once
  useEffect(() => {
    starsRef.current = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.3 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
    }))
  }, [])

  // Update planets when members change
  useEffect(() => {
    const clients = members.filter(m => !m.is_server)
    const count = clients.length
    let orbitRadii: number[], planetSize: number
    if (count <= 3) { orbitRadii = [85, 125, 155].slice(0, count); planetSize = count <= 2 ? 16 : 14 }
    else if (count <= 5) { orbitRadii = [75, 105, 135, 155, 175].slice(0, count); planetSize = 13 }
    else { orbitRadii = [65, 85, 105, 125, 140, 155, 170].slice(0, count); planetSize = 11 }

    planetsRef.current = clients.map((m, i) => ({
      member: m,
      orbit: orbitRadii[i] || 100,
      speed: 0.4 + i * 0.06,
      angle: i * 2.1,
      radius: planetSize,
    }))
  }, [members])

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cw = canvas.offsetWidth
    const ch = canvas.offsetHeight
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr
      canvas.height = ch * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cx = cw / 2, cy = ch / 2
    const t = timeRef.current

    // Space background
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(cw, ch) * 0.8)
    bg.addColorStop(0, '#111128')
    bg.addColorStop(1, '#050510')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, cw, ch)

    // Starfield
    const stars = starsRef.current
    for (const s of stars) {
      const sx = s.x * cw, sy = s.y * ch
      const alpha = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase))
      ctx.fillStyle = `rgba(255,255,255,${alpha})`
      ctx.beginPath()
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2)
      ctx.fill()
    }

    const onlinePlanets = planetsRef.current.filter(p => onlineMembers.has(p.member.id))
    const offlinePlanets = planetsRef.current.filter(p => !onlineMembers.has(p.member.id))

    // Orbit rings (online only)
    onlinePlanets.forEach(p => {
      ctx.beginPath()
      ctx.arc(cx, cy, p.orbit, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 8])
      ctx.stroke()
      ctx.setLineDash([])
    })

    // Server star
    if (serverMember) {
      const pulse = 1 + Math.sin(t * 1.8) * 0.05
      const starColor = serverMember.color || '#6366f1'

      for (let i = 3; i >= 0; i--) {
        const halo = ctx.createRadialGradient(cx, cy, 10, cx, cy, 50 * pulse + i * 15)
        halo.addColorStop(0, starColor + '40')
        halo.addColorStop(0.5, starColor + '10')
        halo.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(cx, cy, 50 * pulse + i * 15, 0, Math.PI * 2)
        ctx.fillStyle = halo
        ctx.fill()
      }

      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22)
      core.addColorStop(0, '#ffffff')
      core.addColorStop(0.15, starColor)
      core.addColorStop(0.5, starColor + '80')
      core.addColorStop(1, starColor + '10')
      ctx.beginPath()
      ctx.arc(cx, cy, 22, 0, Math.PI * 2)
      ctx.fillStyle = core
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = '600 14px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(serverMember.name || '服务端', cx, cy + 68)
    }

    // Online planets - orbit and glow
    onlinePlanets.forEach(p => {
      p.angle += p.speed * 0.016
      const px = cx + Math.cos(p.angle) * p.orbit
      const py = cy + Math.sin(p.angle) * p.orbit
      const pr = p.radius
      const color = p.member.color || '#6366f1'

      const pglow = ctx.createRadialGradient(px, py, 0, px, py, pr * 2.8)
      pglow.addColorStop(0, color + '35')
      pglow.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(px, py, pr * 2.8, 0, Math.PI * 2)
      ctx.fillStyle = pglow
      ctx.fill()

      const hlX = px - pr * 0.3, hlY = py - pr * 0.3
      const pcore = ctx.createRadialGradient(hlX, hlY, 0, px, py, pr)
      pcore.addColorStop(0, '#ffffff')
      pcore.addColorStop(0.25, color)
      pcore.addColorStop(1, color + '40')
      ctx.beginPath()
      ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.fillStyle = pcore
      ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '11px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(p.member.name, px, py + pr + 16)
    })

    // Offline planets - dim, static, no orbit
    offlinePlanets.forEach((p, i) => {
      const angle = i * 1.8 + t * 0.1
      const orbit = 210 + i * 40
      const px = cx + Math.cos(angle) * orbit
      const py = cy + Math.sin(angle) * orbit * 0.4 // elliptical
      const pr = Math.max(8, p.radius * 0.6)

      ctx.beginPath()
      ctx.arc(px, py, pr, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(p.member.name, px, py + pr + 14)
    })

    timeRef.current += 0.016
    animRef.current = requestAnimationFrame(animate)
  }, [members, onlineMembers, serverMember])

  useEffect(() => {
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [animate])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2, cy = rect.height / 2

    // Check server star
    if (Math.hypot(x - cx, y - cy) < 55 && serverMember) {
      setHoveredMember(serverMember)
      return
    }

    // Check online planets
    for (const p of planetsRef.current) {
      if (!onlineMembers.has(p.member.id)) continue
      const px = cx + Math.cos(p.angle) * p.orbit
      const py = cy + Math.sin(p.angle) * p.orbit
      if (Math.hypot(x - px, y - py) < p.radius * 3) {
        setHoveredMember(p.member)
        return
      }
    }

    // Check offline planets
    const offlinePlanets = planetsRef.current.filter(p => !onlineMembers.has(p.member.id))
    for (let i = 0; i < offlinePlanets.length; i++) {
      const p = offlinePlanets[i]
      const angle = i * 1.8 + timeRef.current * 0.1
      const orbit = 210 + i * 40
      const px = cx + Math.cos(angle) * orbit
      const py = cy + Math.sin(angle) * orbit * 0.4
      if (Math.hypot(x - px, y - py) < 20) {
        setHoveredMember(p.member)
        return
      }
    }

    onClose()
  }, [serverMember, onlineMembers, onClose])

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
        <div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl"
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
            <span className="text-[12px]" style={{ color: onlineMembers.has(hoveredMember.id) ? 'rgba(16,185,129,0.85)' : 'var(--color-text-tertiary)' }}>
              {hoveredMember.is_server ? '服务端' : onlineMembers.has(hoveredMember.id) ? '在线' : '离线'}
            </span>
          </span>
        </div>
      )}
    </motion.div>
  )
}
