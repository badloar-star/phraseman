import { motion } from 'framer-motion'
import { Cta, ShardBurst, appear } from '../components/ui'
import { T, YOU, radius } from '../data/players'

type Variant = 'win' | 'streak' | 'champion'

const CONTENT: Record<Variant, { bg: string; icon: string; kicker: string; big: string; sub: string }> = {
  win: {
    bg: 'radial-gradient(600px 400px at 50% 0%, rgba(255,212,59,.18), transparent 65%)',
    icon: '🏆', kicker: 'Турнир 19:00 · 16 игроков',
    big: 'Я обыграл\n15 игроков!', sub: '1-е место · +50 💎 · титул «Чемпион дня»',
  },
  streak: {
    bg: 'radial-gradient(600px 400px at 50% 0%, rgba(251,146,60,.2), transparent 65%)',
    icon: '🔥', kicker: 'Серия побед',
    big: '5 побед\nподряд!', sub: 'Огненная рамка открыта · титул «Неудержимый»',
  },
  champion: {
    bg: 'radial-gradient(600px 400px at 50% 0%, rgba(255,200,0,.24), transparent 65%)',
    icon: '👑', kicker: 'Итоги сезона',
    big: 'Чемпион\nсезона!', sub: 'Топ-1 из 2 480 игроков недели',
  },
}

export default function ShareCard({ demo }: { demo?: { variant?: Variant } }) {
  const v = demo?.variant ?? 'win'
  const c = CONTENT[v]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 16px 120px' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        style={{
          borderRadius: radius.lg, overflow: 'hidden', position: 'relative',
          background: `${c.bg}, ${T.elev}`, padding: '34px 24px 30px', textAlign: 'center',
          boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.07), 0 24px 60px rgba(0,0,0,.5)',
        }}
      >
        <ShardBurst count={14} />
        {/* аватар с рамкой */}
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.6, repeat: Infinity }}
          style={{
            width: 96, height: 96, margin: '0 auto', borderRadius: 34, fontSize: 50,
            background: T.card, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 4px ${v === 'streak' ? T.streak : T.gold}, 0 12px 30px rgba(0,0,0,.5)`,
          }}>{YOU.emoji}</motion.div>
        <div style={{ fontSize: 17, fontWeight: 800, color: T.muted, marginTop: 14 }}>{YOU.name} · {YOU.rank}</div>

        <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ fontSize: 62, marginTop: 16 }}>{c.icon}</motion.div>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: v === 'streak' ? T.streak : T.gold, marginTop: 8 }}>{c.kicker}</div>
        <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.4, lineHeight: 1.12, color: T.text, marginTop: 8, whiteSpace: 'pre-line' }}>{c.big}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.muted, marginTop: 10 }}>{c.sub}</div>

        <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, background: T.card, padding: '9px 16px', borderRadius: 999 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: T.accent }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: T.muted, letterSpacing: 0.5 }}>Phraseman · Турниры</span>
        </div>
      </motion.div>

      <motion.div {...appear(0.2)}><Cta gold>Поделиться</Cta></motion.div>
      <motion.div {...appear(0.26)}><Cta ghost>Скачать картинку</Cta></motion.div>
    </div>
  )
}
