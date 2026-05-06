import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTeamStore, type TeamMember } from '@/lib/team-store'

export function TeamPlanet({ onClose }: { onClose: () => void }) {
  const members = useTeamStore((s) => s.members)
  const onlineMembers = useTeamStore((s) => s.onlineMembers)
  const [hoveredMember, setHoveredMember] = useState<TeamMember | null>(null)

  const serverMember = members.find(m => m.is_server)
  const clientMembers = members.filter(m => !m.is_server)
  const onlineClients = clientMembers.filter(m => onlineMembers.has(m.id))
  const totalOnline = 1 + onlineClients.length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(16px) saturate(1.2)', WebkitBackdropFilter: 'blur(16px) saturate(1.2)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="relative w-[440px] max-w-[94vw] rounded-[28px] px-9 py-10 overflow-y-auto max-h-[90vh]"
        style={{
          background: 'linear-gradient(160deg, rgba(20,20,45,0.92), rgba(10,10,28,0.96))',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top glow accent */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[300px] h-[120px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.06), transparent 70%)' }} />

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-4 right-5 z-10 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] transition-all"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.25)' }}
        >✕</button>

        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>团队成员</span>
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            已连接 <b style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{totalOnline}</b> 人
          </span>
        </div>

        {/* Server star */}
        {serverMember && (
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-20 h-20 flex items-center justify-center">
              {/* Rings */}
              <div className="absolute -inset-4 rounded-full border animate-pulse"
                style={{ borderColor: 'rgba(99,102,241,0.08)', animationDuration: '3.5s' }} />
              <div className="absolute -inset-7 rounded-full border animate-pulse"
                style={{ borderColor: 'rgba(99,102,241,0.04)', animationDuration: '3.5s', animationDelay: '0.6s' }} />
              {/* Glow */}
              <div className="absolute -inset-5 rounded-full"
                style={{ background: `radial-gradient(circle, ${serverMember.color}1f 30%, transparent 70%)` }} />
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center relative overflow-hidden"
                style={{
                  background: `linear-gradient(145deg, ${serverMember.color}, ${serverMember.color}cc)`,
                  boxShadow: `0 0 40px ${serverMember.color}33, 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)`,
                }}
              >
                <div className="absolute top-[12%] left-[18%] right-[18%] h-[30%] rounded-full"
                  style={{ background: 'linear-gradient(rgba(255,255,255,0.15), transparent)' }} />
                <span className="text-white text-[26px] font-bold" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                  {serverMember.name.charAt(0)}
                </span>
              </div>
            </div>
            <div className="mt-3 text-white text-[15px] font-semibold tracking-wide">{serverMember.name}</div>
            <div className="mt-0.5 text-[11px] flex items-center gap-1.5" style={{ color: 'rgba(16,185,129,0.6)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />服务端
            </div>
          </div>
        )}

        {/* Divider */}
        {clientMembers.length > 0 && (
          <div className="w-[60px] h-px mx-auto mb-5"
            style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)' }} />
        )}

        {/* Members */}
        {clientMembers.length > 0 && (
          <>
            <div className="text-center text-[10px] font-semibold tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.2)' }}>成员</div>
            <div className="flex flex-wrap justify-center gap-7 px-2">
              {clientMembers.map(m => {
                const online = onlineMembers.has(m.id)
                return (
                  <motion.div
                    key={m.id}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setHoveredMember(m)}
                    className="flex flex-col items-center gap-2 cursor-pointer"
                  >
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      {online ? (
                        <div className="absolute -inset-[5px] rounded-full border-2 animate-pulse"
                          style={{ borderColor: 'rgba(16,185,129,0.25)', animationDuration: '2.2s' }} />
                      ) : (
                        <div className="absolute -inset-[5px] rounded-full border-[1.5px] border-dashed"
                          style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                      )}
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center relative overflow-hidden"
                        style={{
                          background: `linear-gradient(145deg, ${m.color}, ${m.color}bb)`,
                          boxShadow: '0 3px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
                          filter: online ? 'none' : 'grayscale(0.6) brightness(0.4)',
                        }}
                      >
                        <div className="absolute top-[10%] left-[15%] right-[15%] h-[28%] rounded-full"
                          style={{ background: 'linear-gradient(rgba(255,255,255,0.12), transparent)' }} />
                        <span className="text-white text-lg font-semibold" style={{ textShadow: '0 1px 1px rgba(0,0,0,0.2)' }}>
                          {m.name.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-medium max-w-[72px] text-center truncate"
                      style={{ color: online ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.2)' }}>
                      {m.name}
                    </div>
                    <div className="text-[10px] px-2 py-0.5 rounded-[20px]"
                      style={{
                        background: online ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                        color: online ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.15)',
                      }}>
                      {online ? '在线' : '离线'}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-6 px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 min-h-[40px]"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          {hoveredMember ? (
            <>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: hoveredMember.color }} />
              <span className="text-[12px] text-white font-semibold">{hoveredMember.name}</span>
              <span className="text-[12px]" style={{ color: onlineMembers.has(hoveredMember.id) ? 'rgba(16,185,129,0.7)' : 'rgba(255,255,255,0.25)' }}>
                {hoveredMember.is_server ? '服务端' : onlineMembers.has(hoveredMember.id) ? '在线' : '离线'}
              </span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#6366f1' }} />
              <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>点击成员查看详情 · 点击外部区域关闭</span>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
