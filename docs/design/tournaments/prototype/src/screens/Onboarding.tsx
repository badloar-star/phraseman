import { motion } from 'framer-motion'
import { useState } from 'react'
import { Card, Cta } from '../components/ui'
import { T } from '../data/players'

const CARDS = [
  { icon: '🏆', title: 'Турниры каждый час', sub: '16 игроков · 4 быстрых раунда · 5 минут' },
  { icon: '⚡', title: 'Отвечай на фразы', sub: 'Чем быстрее — тем больше очков. Серия даёт ×2' },
  { icon: '💎', title: 'Забирай банк недели', sub: 'VIP-турнир в воскресенье разыгрывает всё' },
]

export default function Onboarding() {
  const [i, setI] = useState(1) // показываем среднюю карточку для скриншота
  const c = CARDS[i]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, padding: '24px 20px 120px', minHeight: '92%' }}>
      <motion.div
        key={i}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) setI((v) => Math.min(2, v + 1))
          if (info.offset.x > 60) setI((v) => Math.max(0, v - 1))
        }}
        initial={{ opacity: 0, x: 60, rotate: 2 }} animate={{ opacity: 1, x: 0, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        style={{ cursor: 'grab' }}
      >
        <Card tone="elev" pad={34} style={{ textAlign: 'center' }}>
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: 92, lineHeight: 1 }}>{c.icon}</motion.div>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1, color: T.text, marginTop: 24, lineHeight: 1.15 }}>{c.title}</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: T.muted, marginTop: 10, lineHeight: 1.5 }}>{c.sub}</div>
        </Card>
      </motion.div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        {CARDS.map((_, d) => (
          <motion.span key={d} animate={{ width: d === i ? 26 : 8, background: d === i ? T.accent : T.elev2 }}
            onClick={() => setI(d)} style={{ height: 8, borderRadius: 999, cursor: 'pointer' }} />
        ))}
      </div>

      <Cta onClick={() => setI((v) => Math.min(2, v + 1))}>{i < 2 ? 'Дальше' : 'Погнали!'}</Cta>
      <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: T.ghost }}>свайпай карточки ‹ ›</div>
    </div>
  )
}
