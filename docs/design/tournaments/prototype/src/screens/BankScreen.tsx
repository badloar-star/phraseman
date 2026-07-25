import { motion } from 'framer-motion'
import { Card, appear } from '../components/ui'
import { TimeLeft } from '../components/TimeLeft'
import { T, radius } from '../data/players'

const FEED = [
  { text: '+2 💎', src: 'турнир 19:00', t: 'только что' },
  { text: '+5 💎', src: 'турнир 18:00', t: '1 ч назад' },
  { text: '+2 💎', src: 'турнир 16:30', t: '3 ч назад' },
  { text: '+10 💎', src: 'дневной спринт', t: '5 ч назад' },
  { text: '+2 💎', src: 'турнир 13:00', t: 'вчера' },
]

const SPLIT = [
  { place: 1, pct: 50, val: '1 240', col: T.gold, h: 96, medal: '🥇' },
  { place: 2, pct: 30, val: '744', col: T.silver, h: 70, medal: '🥈' },
  { place: 3, pct: 20, val: '496', col: T.bronze, h: 52, medal: '🥉' },
]

export default function BankScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 16px 120px' }}>
      {/* hero counter */}
      <motion.div {...appear(0)}>
        <Card tone="gold" pad={28} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: T.gold }}>Банк недели</div>
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 60, fontWeight: 900, letterSpacing: -2.5, color: T.text, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}
          >2 480 <span style={{ color: T.gold }}>💎</span></motion.div>
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ fontSize: 15, fontWeight: 700, color: T.accent, marginTop: 4 }}>▲ растёт прямо сейчас</motion.div>
        </Card>
      </motion.div>

      {/* подиум-сплит 50/30/20 */}
      <motion.div {...appear(0.1)}>
        <Card pad={20}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12 }}>
            {[SPLIT[1], SPLIT[0], SPLIT[2]].map((s, i) => (
              <motion.div key={s.place} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 260, damping: 20 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 30 }}>{s.medal}</span>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.col }}>{s.pct}%</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.muted }}>{s.val} 💎</div>
                <motion.div initial={{ height: 0 }} animate={{ height: s.h }} transition={{ delay: 0.35 + i * 0.12, duration: 0.6, ease: [0.25, 1, 0.35, 1] }}
                  style={{ width: 84, borderRadius: `${radius.sm}px ${radius.sm}px 0 0`, background: `linear-gradient(180deg, ${s.col}33, ${s.col}11)`, boxShadow: `inset 0 2px 0 ${s.col}` }} />
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* лента пополнений */}
      <motion.div {...appear(0.2)}>
        <Card pad={8}>
          {FEED.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: radius.md, background: i === 0 ? T.elev2 : 'transparent', marginBottom: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: T.accent, fontVariantNumeric: 'tabular-nums' }}>{f.text}</span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: T.text }}>от {f.src}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.ghost }}>{f.t}</span>
            </motion.div>
          ))}
        </Card>
      </motion.div>

      {/* countdown */}
      <motion.div {...appear(0.3)}>
        <Card pad={20} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ghost }}>Банк разыграет VIP-турнир в воскресенье</div>
          <div style={{ marginTop: 8 }}><TimeLeft seconds={2 * 86400 + 5 * 3600 + 12 * 60} size={34} /></div>
        </Card>
      </motion.div>
    </div>
  )
}
