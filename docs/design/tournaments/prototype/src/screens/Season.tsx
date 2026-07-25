import { motion } from 'framer-motion'
import { Card, appear } from '../components/ui'
import { TimeLeft } from '../components/TimeLeft'
import { SEASON_LEADERS, T, radius } from '../data/players'
import { useCountdown } from '../hooks/useAnim'

const TIERS = [
  { range: 'Топ-1', reward: '100 💎 + рамка «Легенда»', tone: T.gold },
  { range: 'Топ-3', reward: '50 💎 + 2 🎟', tone: T.silver },
  { range: 'Топ-10', reward: '20 💎 + 1 🎟', tone: T.bronze },
  { range: 'Топ-50', reward: '5 💎', tone: T.muted },
]

export default function Season({ onBack, demo }: { onBack: () => void; demo?: { place?: number; seconds?: number } }) {
  const left = useCountdown(demo?.seconds ?? (3 * 86400 + 14 * 3600 + 42 * 60))
  const urgent = left < 86400

  // позиция юзера в демо
  const place = demo?.place ?? 6
  const leaders = [...SEASON_LEADERS.filter((p) => !p.isYou)]
  const mePts = place <= 5 ? 230 : 174
  const me = { name: 'Вы', emoji: '🦊', color: '#58CC89', pts: mePts, isYou: true }
  const list = [...leaders, me].sort((a, b) => b.pts - a.pts)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 120px' }}>
      <motion.div {...appear(0)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 44, height: 44, borderRadius: 16, border: 'none', background: T.card, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)', color: T.text, fontSize: 20, cursor: 'pointer' }}>‹</button>
        <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, color: T.text }}>Сезон</span>
        <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 700, color: T.ghost }}>неделя 4/6</span>
      </motion.div>

      {/* Сброс */}
      <motion.div {...appear(0.05)}>
        <Card tone="elev" pad={24} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: urgent ? T.danger : T.ghost }}>{urgent ? '⚠️ сезон кончается' : 'до сброса'}</div>
          <div style={{ marginTop: 6 }}>
            <TimeLeft seconds={left} size={48} color={urgent ? T.danger : T.text} badge={!urgent} />
          </div>
        </Card>
      </motion.div>

      {/* Ваша позиция */}
      <motion.div {...appear(0.1)}>
        <Card tone="accent" pad={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 52, height: 52, borderRadius: 999, background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25 }}>🦊</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>Вы — {place}-е место</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.muted, marginTop: 2 }}>{place <= 5 ? 'зона наград — держитесь! 🏆' : 'до топ-5 — 24 очка'}</div>
            </div>
            <span style={{ fontSize: 26, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: T.accent }}>{mePts}</span>
          </div>
        </Card>
      </motion.div>

      {/* Лидерборд */}
      <motion.div {...appear(0.15)}>
        <Card pad={14}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {list.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.35, ease: [0.22, 0.9, 0.3, 1] }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: radius.md,
                  background: p.isYou ? 'rgba(71,200,112,.16)' : 'transparent',
                }}
              >
                <span style={{ width: 24, textAlign: 'center', fontSize: 16, fontWeight: 900, color: i === 0 ? T.gold : i === 1 ? T.silver : i === 2 ? T.bronze : T.ghost }}>{i + 1}</span>
                <span style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, background: p.color + '2e' }}>{p.emoji}</span>
                <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: T.text }}>{p.name}</span>
                <span style={{ fontSize: 16, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: T.muted }}>{p.pts}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Награды */}
      <motion.div {...appear(0.2)}>
        <Card pad={14}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIERS.map((t) => (
              <div key={t.range} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px', borderRadius: radius.md, background: T.elev, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                <span style={{ width: 64, fontSize: 15, fontWeight: 900, color: t.tone }}>{t.range}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.muted }}>{t.reward}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Зал славы */}
      <motion.div {...appear(0.25)}>
        <Card tone="gold" pad={18}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {['🐺', '👑', '⚔️'].map((e, i) => (
              <motion.span
                key={i}
                animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                style={{ width: 48, height: 48, borderRadius: 999, background: T.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}
              >{e}</motion.span>
            ))}
            <div style={{ marginLeft: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>🏛 Зал славы</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>откроется в конце сезона</div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
