import { motion } from 'framer-motion'
import { Card, Cta, appear } from '../components/ui'
import { T, PLAYERS, radius } from '../data/players'

const P = PLAYERS[0] // СловоЖора
const HISTORY = [
  { name: 'Турнир 19:00', place: 1, pts: 75, medal: '🥇' },
  { name: 'Турнир 16:30', place: 2, pts: 68, medal: '🥈' },
  { name: 'VIP воскресный', place: 3, pts: 62, medal: '🥉' },
  { name: 'Турнир 13:00', place: 5, pts: 44, medal: '' },
  { name: 'Дневной спринт', place: 1, pts: 80, medal: '🥇' },
]

function WinRing({ pct }: { pct: number }) {
  const C = 2 * Math.PI * 45
  return (
    <div style={{ width: 120, height: 120, position: 'relative' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="45" fill="none" stroke={T.card} strokeWidth="11" />
        <motion.circle cx="50" cy="50" r="45" fill="none" stroke={T.accent} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C - (pct / 100) * C }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.25, 1, 0.35, 1] }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 30, fontWeight: 900, color: T.text, letterSpacing: -1 }}>{pct}%</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.ghost }}>винрейт</span>
      </div>
    </div>
  )
}

export default function ProfileScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 16px 120px' }}>
      {/* hero */}
      <motion.div {...appear(0)}>
        <Card tone="elev" pad={26} style={{ textAlign: 'center' }}>
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.4, repeat: Infinity }}
            style={{
              width: 104, height: 104, margin: '0 auto', borderRadius: 36, fontSize: 54,
              background: T.card, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 0 4px ${T.gold}, 0 10px 26px rgba(0,0,0,.45)`,
            }}>{P.emoji}</motion.div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, color: T.text, marginTop: 14 }}>{P.name}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: T.goldSoft, padding: '6px 14px', borderRadius: 999 }}>
            <span style={{ fontSize: 16 }}>💠</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: T.gold }}>{P.rank}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 16 }}>
            <div><div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>🏆 ×5</div><div style={{ fontSize: 13, fontWeight: 600, color: T.ghost }}>побед</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>{P.played}</div><div style={{ fontSize: 13, fontWeight: 600, color: T.ghost }}>турниров</div></div>
            <div><div style={{ fontSize: 22, fontWeight: 900, color: T.streak }}>🔥 {P.streak}</div><div style={{ fontSize: 13, fontWeight: 600, color: T.ghost }}>серия</div></div>
          </div>
        </Card>
      </motion.div>

      {/* винрейт + титулы */}
      <motion.div {...appear(0.1)}>
        <Card pad={20} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <WinRing pct={P.winRate} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: T.ghost }}>Титулы</div>
            {P.titles.map((t, i) => (
              <motion.span key={t} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.1 }}
                style={{ fontSize: 15, fontWeight: 800, color: i === 0 ? T.gold : T.text, background: i === 0 ? T.goldSoft : T.elev, padding: '8px 14px', borderRadius: radius.sm, alignSelf: 'flex-start' }}>
                {i === 0 ? '🎖 ' : '🏅 '}{t}
              </motion.span>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* история */}
      <motion.div {...appear(0.18)}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: T.ghost, margin: '0 4px 8px' }}>Последние турниры</div>
        <Card pad={8}>
          {HISTORY.map((h, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.07 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: radius.md, background: i === 0 ? T.elev2 : 'transparent' }}>
              <span style={{ width: 34, fontSize: 20, textAlign: 'center' }}>{h.medal || <span style={{ fontSize: 15, fontWeight: 900, color: T.ghost }}>{h.place}</span>}</span>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: T.text }}>{h.name}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{h.pts} очк.</span>
            </motion.div>
          ))}
        </Card>
      </motion.div>

      <motion.div {...appear(0.3)}><Cta>Добавить в друзья</Cta></motion.div>
    </div>
  )
}
