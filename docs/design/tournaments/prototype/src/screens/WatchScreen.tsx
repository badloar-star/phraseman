import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Card, Cta, Sheet, appear } from '../components/ui'
import { TimeLeft } from '../components/TimeLeft'
import { T, ALL, PLAYERS, radius } from '../data/players'

const REACTIONS = ['👍', '🔥', '😎', '⚔️', '🍀']
const ROWS = [
  { p: PLAYERS[0], s: 68 }, { p: PLAYERS[14], s: 62 }, { p: PLAYERS[3], s: 58 },
  { p: PLAYERS[5], s: 51 }, { p: PLAYERS[10], s: 47 }, { p: PLAYERS[1], s: 40 },
]
const ODDS = ['×1.8', '×2.4', '×3.1', '×3.6', '×4.2', '×5.0']

type Reaction = { id: number; e: string; x: number }

function FloatingLayer({ items }: { items: Reaction[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40, overflow: 'hidden' }}>
      <AnimatePresence>
        {items.map((it) => (
          <motion.span key={it.id}
            initial={{ y: 0, opacity: 0, scale: 0.6 }}
            animate={{ y: -280, opacity: [0, 1, 1, 0], scale: 1.4, x: [0, 10, -8, 6] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.6, ease: 'easeOut' }}
            style={{ position: 'absolute', bottom: 120, left: `${it.x}%`, fontSize: 28 }}
          >{it.e}</motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}

function ReactionBar({ onSend }: { onSend: (e: string) => void }) {
  return (
    <motion.div {...appear(0.2)} style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {REACTIONS.map((e) => (
        <motion.button key={e} whileTap={{ scale: 0.78 }} onClick={() => onSend(e)}
          style={{ width: 52, height: 52, borderRadius: 999, border: 'none', cursor: 'pointer', background: T.card, fontSize: 24, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>{e}</motion.button>
      ))}
    </motion.div>
  )
}

/** Шторка прогноза — выбор игрока из карточек участников */
function PredictSheet({ onClose }: { onClose: () => void }) {
  const [pick, setPick] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  return (
    <Sheet onClose={onClose}>
      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.6, color: T.text, textAlign: 'center' }}>Кто победит?</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, textAlign: 'center', margin: '6px 0 6px' }}>Ставка 5 💎 · угадал — выплата ×3 = 15 💎</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.gold, textAlign: 'center', marginBottom: 14 }}>⏳ Прогнозы принимаются только до старта</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {ROWS.map(({ p }, i) => (
          <motion.button key={p.id} whileTap={{ scale: 0.96 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => setPick(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              borderRadius: radius.md, border: 'none', cursor: 'pointer',
              background: pick === i ? T.goldSoft : T.card,
              boxShadow: pick === i ? `inset 0 0 0 2px ${T.gold}` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
            <span style={{ fontSize: 24 }}>{p.emoji}</span>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: T.gold }}>{ODDS[i]}</span>
          </motion.button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <Cta gold onClick={() => pick !== null && setDone(true)}>
          {done ? '✓ Прогноз принят!' : pick === null ? 'Выбери игрока' : `Поставить 5 💎 на ${ROWS[pick].p.name}`}
        </Cta>
      </div>
    </Sheet>
  )
}

/** Лобби зрителя: сбор участников, прогнозы открыты до старта */
function SpectatorLobby({ openSheet }: { openSheet: boolean }) {
  const [sheet, setSheet] = useState(openSheet)
  const [predicted, setPredicted] = useState(false)
  const joined = ALL.slice(0, 12)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 120px', position: 'relative', overflow: 'hidden' }}>
      <motion.div {...appear(0)} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: T.text }}>👑 VIP-турнир · сбор</span>
        <div style={{ flex: 1 }} />
        <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
          style={{ fontSize: 13, fontWeight: 900, color: T.gold, background: T.goldSoft, padding: '6px 12px', borderRadius: 999 }}>⏳ Прогнозы до старта</motion.span>
      </motion.div>

      <motion.div {...appear(0.06)}>
        <Card tone="gold" pad={18} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 30 }}>👀</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Вы зритель</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.muted, marginTop: 2 }}>банк 2 480 💎 · {joined.length}/16 на месте</div>
          </div>
          <TimeLeft seconds={96} size={26} />
        </Card>
      </motion.div>

      {/* участники */}
      <motion.div {...appear(0.1)}>
        <Card pad={8}>
          {joined.slice(0, 6).map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
              <span style={{ width: 38, height: 38, borderRadius: 999, background: p.color + '2e', boxShadow: `0 0 0 2.5px ${p.color}59`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{p.emoji}</span>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: T.text }}>{p.name}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: T.ghost }}>{p.rank}</span>
            </motion.div>
          ))}
          <div style={{ padding: '8px 14px 12px', fontSize: 14, fontWeight: 700, color: T.ghost }}>+ ещё {joined.length - 6} игроков…</div>
        </Card>
      </motion.div>

      {/* прогноз */}
      <motion.div {...appear(0.16)}>
        <Card tone="elev" pad={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🎯</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Прогноз «кто победит»</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.muted, marginTop: 2 }}>ставка 5 💎 · выплата ×3 · после старта поставить нельзя</div>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            {predicted
              ? <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 900, color: T.gold, background: T.goldSoft, borderRadius: radius.md, padding: '14px' }}>✓ Твой прогноз: 🐺 {PLAYERS[0].name} · ×3</div>
              : <Cta gold onClick={() => setSheet(true)}>Сделать прогноз · 5 💎</Cta>}
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {sheet && <PredictSheet onClose={() => { setSheet(false); setPredicted(true) }} />}
      </AnimatePresence>
    </div>
  )
}

/** LIVE-трансляция: прогнозы закрыты, реакции летают */
function LiveWatch({ predicted }: { predicted?: boolean }) {
  const [reactions, setReactions] = useState<Reaction[]>([])
  const send = (e: string) => {
    const id = Date.now() + Math.random()
    setReactions((r) => [...r.slice(-9), { id, e, x: 8 + Math.random() * 78 }])
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 2600)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 120px', position: 'relative', overflow: 'hidden' }}>
      <FloatingLayer items={reactions} />

      <motion.div {...appear(0)} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <motion.span animate={{ opacity: [1, 0.45, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1.5, color: '#FFF', background: T.danger, padding: '5px 12px', borderRadius: 999, boxShadow: `0 0 14px ${T.danger}88` }}>● LIVE</motion.span>
        <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>VIP-турнир</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: T.muted }}>👀 1 240</span>
      </motion.div>

      {/* прогнозы закрыты + твой прогноз */}
      <motion.div {...appear(0.05)} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: T.ghost, background: T.card, padding: '7px 12px', borderRadius: 999 }}>🔒 Прогнозы закрыты</span>
        {predicted && (
          <motion.span initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            style={{ fontSize: 13, fontWeight: 900, color: T.gold, background: T.goldSoft, padding: '7px 12px', borderRadius: 999 }}>
            🎯 Твой прогноз: 🐺 {PLAYERS[0].name} · ×3
          </motion.span>
        )}
      </motion.div>

      {/* текущий раунд */}
      <motion.div {...appear(0.08)}>
        <Card tone="elev" pad={18} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} style={{ fontSize: 30 }}>🎲</motion.div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Раунд 3 из 4 · Микс</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.muted, marginTop: 2 }}>вопрос 2 из 5 · идёт ответ</div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 900, color: T.accent, background: T.accentSoft, padding: '6px 12px', borderRadius: 999 }}>3/4</span>
        </Card>
      </motion.div>

      {/* живая таблица */}
      <motion.div {...appear(0.14)}>
        <Card pad={8}>
          {ROWS.map(({ p, s }, i) => (
            <motion.div key={p.id} layout transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: radius.md,
                background: i === 0 ? T.elev2 : 'transparent', marginBottom: 2,
              }}>
              <span style={{ width: 26, fontSize: 16, fontWeight: 900, color: i < 3 ? [T.gold, T.silver, T.bronze][i] : T.ghost }}>{i + 1}</span>
              <span style={{ fontSize: 24 }}>{p.emoji}</span>
              <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: T.text }}>{p.name}</span>
              <motion.span key={s} initial={{ scale: 1.3, color: T.accent }} animate={{ scale: 1, color: T.text }}
                style={{ fontSize: 18, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{s}</motion.span>
            </motion.div>
          ))}
        </Card>
      </motion.div>

      <ReactionBar onSend={send} />
    </div>
  )
}

export default function WatchScreen({ demo }: { demo?: { variant?: 'lobby' | 'live'; sheet?: boolean; predicted?: boolean } }) {
  if (demo?.variant === 'lobby') return <SpectatorLobby openSheet={!!demo.sheet} />
  return <LiveWatch predicted={demo?.predicted} />
}
