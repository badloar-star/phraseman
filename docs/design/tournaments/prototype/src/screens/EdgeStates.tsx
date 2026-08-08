import { motion } from 'framer-motion'
import { Card, Cta, appear } from '../components/ui'
import { TimeLeft } from '../components/TimeLeft'
import { T, radius } from '../data/players'

type Variant = 'loading' | 'offline' | 'preseason' | 'waiting'

function Skeleton({ w, h, r = radius.sm }: { w: number | string; h: number; r?: number }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: w, height: h, borderRadius: r,
        background: `linear-gradient(100deg, ${T.card} 30%, ${T.elev2} 50%, ${T.card} 70%)`,
        backgroundSize: '200% 100%',
        animation: 'sk-shimmer 1.6s linear infinite',
      }}
    />
  )
}

export default function EdgeStates({ demo }: { demo?: { variant?: Variant } }) {
  const v = demo?.variant ?? 'loading'

  if (v === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 16px 120px' }}>
        <style>{`@keyframes sk-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
        <Skeleton w="100%" h={190} r={radius.lg} />
        <div style={{ display: 'flex', gap: 12 }}>
          <Skeleton w={64} h={64} r={radius.md} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
            <Skeleton w="70%" h={18} />
            <Skeleton w="45%" h={14} />
          </div>
        </div>
        <Skeleton w="100%" h={96} r={radius.lg} />
        <Skeleton w="100%" h={60} r={radius.md} />
        <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: T.ghost, marginTop: 8 }}>
          <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>Загружаем турниры…</motion.span>
        </div>
      </div>
    )
  }

  if (v === 'offline') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '24px 20px 120px', minHeight: '90%' }}>
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity }} style={{ fontSize: 76 }}>📡</motion.div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.8, color: T.text }}>Нет соединения</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.muted, marginTop: 8 }}>Проверь интернет — турнир начнётся без тебя</div>
        </div>
        <motion.div {...appear(0.2)} style={{ width: '100%' }}><Cta>Повторить</Cta></motion.div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ghost }}>последняя попытка: 10 сек назад</div>
      </div>
    )
  }

  if (v === 'preseason') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '24px 20px 120px', minHeight: '90%' }}>
        <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 3, repeat: Infinity }} style={{ fontSize: 76 }}>🌱</motion.div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.8, color: T.text }}>Сезон ещё не начался</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.muted, marginTop: 8 }}>Новый сезон — в понедельник. Очки обнулятся, титулы останутся</div>
        </div>
        <Card pad={22} style={{ width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ghost }}>До старта сезона</div>
          <div style={{ marginTop: 8 }}><TimeLeft seconds={2 * 86400 + 3 * 3600 + 24 * 60} size={36} /></div>
        </Card>
        <motion.div {...appear(0.2)} style={{ width: '100%' }}><Cta ghost>Напомнить о старте</Cta></motion.div>
      </div>
    )
  }

  // waiting — уже в лобби
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: '24px 20px 120px', minHeight: '90%' }}>
      <div style={{ position: 'relative', width: 130, height: 130 }}>
        {[0, 1, 2].map((i) => (
          <motion.span key={i}
            animate={{ scale: [1, 2.1], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.65, ease: 'easeOut' }}
            style={{ position: 'absolute', inset: 0, borderRadius: 999, background: T.accentSoft }}
          />
        ))}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: T.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.06)' }}>🦊</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.8, color: T.text }}>Ты уже в лобби</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.muted, marginTop: 8 }}>Ждём старт турнира · 12 из 16 на месте</div>
      </div>
      <Card pad={18} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Турнир 20:00</span>
          <TimeLeft seconds={47} size={16} color={T.accent} />
        </div>
        <div style={{ height: 10, borderRadius: 999, background: T.bg, overflow: 'hidden' }}>
          <motion.div initial={{ width: '40%' }} animate={{ width: '75%' }} transition={{ duration: 1.2, ease: [0.25, 1, 0.35, 1] }}
            style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${T.accentDark}, ${T.accent})` }} />
        </div>
      </Card>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.ghost }}>не закрывай экран — билет уже списан</div>
    </div>
  )
}
