import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { T, innerLight, radius } from '../data/players'

/** Контейнер: только тональная заливка + мягкий блик. БЕЗ бордеров. */
export function Card({ children, tone = 'card', style, onClick, pad = 22 }: {
  children: ReactNode
  tone?: 'card' | 'elev' | 'elev2' | 'gold' | 'accent' | 'danger'
  style?: React.CSSProperties
  onClick?: () => void
  pad?: number
}) {
  const bg = {
    card: T.card, elev: T.elev, elev2: T.elev2,
    gold: `linear-gradient(160deg, rgba(255,212,59,.14), rgba(255,212,59,.05) 60%), ${T.card}`,
    accent: `linear-gradient(160deg, rgba(71,200,112,.16), rgba(71,200,112,.06) 60%), ${T.card}`,
    danger: T.dangerSoft,
  }[tone]
  return (
    <div
      onClick={onClick}
      style={{
        background: bg,
        borderRadius: radius.lg,
        padding: pad,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: innerLight,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Primary CTA — chunky 3D, большая типографика */
export function Cta({ children, onClick, gold, red, ghost }: {
  children: ReactNode; onClick?: () => void; gold?: boolean; red?: boolean; ghost?: boolean
}) {
  if (ghost) {
    return (
      <motion.button whileTap={{ scale: 0.97 }} onClick={onClick} style={{
        width: '100%', minHeight: 56, borderRadius: radius.md, border: 'none',
        background: T.elev, color: T.muted, fontSize: 17, fontWeight: 800, cursor: 'pointer',
        boxShadow: innerLight,
      }}>{children}</motion.button>
    )
  }
  const bg = gold ? T.gold : red ? T.danger : T.accent
  const dark = gold ? T.goldDark : red ? T.dangerDark : T.accentDark
  return (
    <motion.button
      whileTap={{ y: 5 }}
      onClick={onClick}
      style={{
        width: '100%', minHeight: 60, borderRadius: radius.md, border: 'none',
        background: `linear-gradient(180deg, ${bg}, ${bg})`,
        color: red ? '#FFF' : T.accentText,
        fontSize: 18, fontWeight: 900, letterSpacing: 0.4, cursor: 'pointer',
        boxShadow: `0 5px 0 ${dark}, inset 0 1.5px 0 rgba(255,255,255,0.35)`,
      }}
    >{children}</motion.button>
  )
}

/** Появление: мягкий сдвиг (как .rise в статистике) */
export const appear = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 0.9, 0.3, 1] as const },
})

/** Bottom sheet */
export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}
    >
      <motion.div
        initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400, background: T.elev,
          borderRadius: `${radius.lg}px ${radius.lg}px 0 0`, padding: '10px 24px 36px',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.5), ' + innerLight,
        }}
      >
        <div style={{ width: 44, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.14)', margin: '8px auto 22px' }} />
        {children}
      </motion.div>
    </motion.div>
  )
}

/** Вспышка-осколки (победный burst) */
export function ShardBurst({ count = 18 }: { count?: number }) {
  const shards = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    const dist = 90 + Math.random() * 110
    return {
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 30,
      color: [T.gold, T.accent, '#FF8FA3', '#7EC8FF'][i % 4],
      size: 6 + Math.random() * 7,
      rot: Math.random() * 540 - 270,
      delay: Math.random() * 0.15,
    }
  })
  return (
    <div style={{ position: 'absolute', top: '38%', left: '50%', pointerEvents: 'none', zIndex: 5 }}>
      {shards.map((s) => (
        <motion.span
          key={s.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{ x: s.x, y: s.y + 120, opacity: 0, scale: 0.4, rotate: s.rot }}
          transition={{ duration: 1.4, delay: s.delay, ease: [0.15, 0.85, 0.45, 1] }}
          style={{ position: 'absolute', width: s.size, height: s.size * 1.4, borderRadius: 2, background: s.color }}
        />
      ))}
    </div>
  )
}
