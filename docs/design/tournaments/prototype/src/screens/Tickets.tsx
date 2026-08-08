import { motion } from 'framer-motion'
import { Card, Cta, appear } from '../components/ui'
import { T, radius } from '../data/players'

type Variant = 'inventory' | 'howto' | 'free'

export function Ticket({ vip, fire, size = 1 }: { vip?: boolean; fire?: boolean; size?: number }) {
  return (
    <motion.div
      animate={fire ? { y: [0, -3, 0] } : { y: [0, -4, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width: 64 * size, height: 80 * size, borderRadius: 14 * size, position: 'relative',
        background: vip
          ? 'linear-gradient(160deg, #3a2f08, #241d05)'
          : fire
            ? 'linear-gradient(160deg, #3d1408, #240d05)'
            : 'linear-gradient(160deg, #123a22, #0b2415)',
        boxShadow: vip
          ? 'inset 0 1.5px 0 rgba(255,212,59,.4), 0 8px 20px rgba(0,0,0,.4)'
          : fire
            ? 'inset 0 1.5px 0 rgba(251,146,60,.5), 0 8px 20px rgba(0,0,0,.4)'
            : 'inset 0 1.5px 0 rgba(71,200,112,.35), 0 8px 20px rgba(0,0,0,.4)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
      {/* перфорация */}
      {[0, 1].map((i) => (
        <span key={i} style={{
          position: 'absolute', top: '50%', [i === 0 ? 'left' : 'right']: -7 * size, width: 14 * size, height: 14 * size,
          borderRadius: 999, background: T.bg, transform: 'translateY(-50%)',
        }} />
      ))}
      <span style={{ fontSize: 24 * size }}>{fire ? '🔥' : '🎟'}</span>
      <span style={{ fontSize: 12 * size, fontWeight: 900, letterSpacing: 1, color: vip ? T.gold : fire ? T.streak : T.accent }}>{vip ? 'VIP' : fire ? 'СЕРИЯ' : 'ВХОД'}</span>
    </motion.div>
  )
}

const SOURCES = [
  { icon: '🎓', title: 'Новый уровень', sub: '+1 🎟 за каждый уровень', col: T.accent },
  { icon: '🔥', title: 'Стрик 7 дней', sub: '+1 🎟 за неделю подряд', col: T.streak },
  { icon: '🎡', title: 'Рулетка дня', sub: 'шанс выиграть до 3 🎟', col: '#B79CFF' },
  { icon: '💎', title: 'За гемы', sub: '1 🎟 = 20 💎', col: T.gold },
]

export default function Tickets({ demo }: { demo?: { variant?: Variant } }) {
  const v = demo?.variant ?? 'inventory'

  if (v === 'howto') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 16px 120px' }}>
        <motion.div {...appear(0)}>
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1, color: T.text }}>Как получить билеты</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, marginTop: 4 }}>4 способа · обновляются каждую неделю</div>
        </motion.div>
        {SOURCES.map((s, i) => (
          <motion.div key={s.title} {...appear(0.08 + i * 0.07)}>
            <Card pad={20} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
                style={{
                  width: 64, height: 64, borderRadius: radius.md, flexShrink: 0, fontSize: 32,
                  background: T.elev, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `inset 0 1.5px 0 ${s.col}44`,
                }}>{s.icon}</motion.div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: T.text }}>{s.title}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, marginTop: 2 }}>{s.sub}</div>
              </div>
              <span style={{ fontSize: 22, color: T.ghost }}>›</span>
            </Card>
          </motion.div>
        ))}
      </div>
    )
  }

  if (v === 'free') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 16px 120px' }}>
        <motion.div {...appear(0)}>
          <Card tone="accent" pad={28} style={{ textAlign: 'center' }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 13 }} style={{ fontSize: 64 }}>🎁</motion.div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: T.accent, marginTop: 12 }}>Подарок недели</div>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.8, color: T.text, marginTop: 6 }}>Бесплатный вход активен</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, marginTop: 6 }}>Первый турнир сегодня — без билета</div>
          </Card>
        </motion.div>
        <motion.div {...appear(0.15)}>
          <Card pad={18} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Ticket />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Билеты не тронем</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.muted, marginTop: 2 }}>3 🎟 останутся на VIP в воскресенье</div>
            </div>
            <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
              style={{ fontSize: 13, fontWeight: 900, color: T.accentText, background: T.accent, padding: '6px 12px', borderRadius: 999 }}>FREE</motion.span>
          </Card>
        </motion.div>
        <motion.div {...appear(0.25)}><Cta>Играть бесплатно</Cta></motion.div>
      </div>
    )
  }

  // inventory
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 16px 120px' }}>
      <motion.div {...appear(0)}>
        <Card tone="elev" pad={28} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: T.ghost }}>Ваши билеты</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 18 }}>
            {[0, 1, 2].map((i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20, rotate: -6 + i * 6 }} animate={{ opacity: 1, y: 0, rotate: -4 + i * 4 }} transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 240, damping: 16 }}>
                <Ticket />
              </motion.div>
            ))}
          </div>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1.5, color: T.text, marginTop: 16 }}>У вас 3 🎟</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, marginTop: 4 }}>хватит на 3 турнира</div>
        </Card>
      </motion.div>
      <motion.div {...appear(0.15)}>
        <Card pad={18} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 30 }}>👑</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>VIP нужно 5 🎟</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.muted, marginTop: 2 }}>не хватает 2 до воскресенья</div>
          </div>
        </Card>
      </motion.div>
      <motion.div {...appear(0.22)}><Cta>Как получить ещё</Cta></motion.div>
      <motion.div {...appear(0.27)}><Cta ghost>Купить 1 🎟 за 20 💎</Cta></motion.div>
    </div>
  )
}
