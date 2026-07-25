import { motion } from 'framer-motion'
import { Card } from '../components/ui'
import { T, radius } from '../data/players'

type Variant = 'translate' | 'timeattack' | 'voice'

function Header({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: T.accent, background: T.accentSoft, padding: '6px 12px', borderRadius: 999 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: T.muted, background: T.card, padding: '6px 12px', borderRadius: 999, fontVariantNumeric: 'tabular-nums' }}>Вопрос 3 из 5</span>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  )
}

function TranslateMode() {
  const bank = ['погоды', 'как', 'сегодня', 'какая']
  const placed = ['What', 'is', 'the']
  return (
    <>
      <Header label="Перевод на скорость" right={
        <span style={{ fontSize: 15, fontWeight: 900, color: T.text, fontVariantNumeric: 'tabular-nums', background: T.card, padding: '6px 12px', borderRadius: 999 }}>⏱ 0:07</span>
      } />
      <Card tone="elev" pad={26}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ghost }}>Собери перевод</div>
        <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, color: T.text, marginTop: 10 }}>«Какая сегодня погода?»</div>
      </Card>
      {/* строка ответа */}
      <div style={{ minHeight: 64, borderRadius: radius.md, background: T.card, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', flexWrap: 'wrap', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)' }}>
        {placed.map((w, i) => (
          <motion.span key={w} layout initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.12, type: 'spring', stiffness: 400, damping: 18 }}
            style={{ background: T.elev2, color: T.text, fontSize: 17, fontWeight: 800, padding: '8px 14px', borderRadius: radius.sm }}>{w}</motion.span>
        ))}
        <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.9, repeat: Infinity }}
          style={{ width: 3, height: 26, background: T.accent, borderRadius: 2 }} />
      </div>
      {/* банк слов */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {bank.map((w, i) => (
          <motion.button key={w} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }} whileTap={{ scale: 0.94 }}
            style={{ border: 'none', cursor: 'pointer', background: T.elev, color: T.text, fontSize: 17, fontWeight: 800, padding: '12px 18px', borderRadius: radius.sm, boxShadow: '0 3px 0 rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,0.05)' }}>{w}</motion.button>
        ))}
      </div>
    </>
  )
}

function TimeAttackMode() {
  return (
    <>
      <Header label="Тайм-атака" right={
        <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1, repeat: Infinity }}
          style={{ fontSize: 15, fontWeight: 900, color: T.danger, background: T.dangerSoft, padding: '6px 12px', borderRadius: 999, fontVariantNumeric: 'tabular-nums' }}>0:42</motion.span>
      } />
      <Card tone="elev" pad={26} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ghost }}>Верных ответов за 60 секунд</div>
        <motion.div key={7} initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          style={{ fontSize: 64, fontWeight: 900, letterSpacing: -2, color: T.accent, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>7</motion.div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{ width: 10, height: 10, borderRadius: 999, background: i < 7 ? T.accent : T.elev2 }} />
          ))}
        </div>
      </Card>
      <Card pad={22}>
        <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, color: T.text }}>«Hit the sack»</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {['Пойти спать', 'Ударить мешок'].map((o, i) => (
            <motion.button key={o} whileTap={{ scale: 0.96 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}
              style={{
                flex: 1, minHeight: 72, border: 'none', cursor: 'pointer', borderRadius: radius.md,
                background: i === 0 ? 'rgba(71,200,112,.2)' : T.elev, color: i === 0 ? T.accent : T.text,
                fontSize: 17, fontWeight: 800, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}>{o}{i === 0 && ' ✓'}</motion.button>
          ))}
        </div>
      </Card>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.ghost, textAlign: 'center' }}>+10 за верный · −5 за ошибку</div>
    </>
  )
}

function VoiceMode() {
  return (
    <>
      <Header label="Голосовой раунд" right={
        <motion.span animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
          style={{ fontSize: 15, fontWeight: 900, color: T.streak, background: 'rgba(251,146,60,.14)', padding: '6px 12px', borderRadius: 999 }}>🔥 ×1.5</motion.span>
      } />
      <Card tone="elev" pad={26} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ghost }}>Произнеси фразу</div>
        <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, color: T.text, marginTop: 10, lineHeight: 1.25 }}>«Break a leg!»</div>
        {/* волна */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 54, marginTop: 18 }}>
          {Array.from({ length: 21 }).map((_, i) => (
            <motion.span key={i}
              animate={{ height: [8, 14 + Math.sin(i * 0.9) * 16 + (i % 3) * 6, 8] }}
              transition={{ duration: 0.9 + (i % 5) * 0.12, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 5, borderRadius: 999, background: `linear-gradient(180deg, ${T.accent}, ${T.accentDark})` }}
            />
          ))}
        </div>
      </Card>
      {/* микрофон */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <motion.div animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.6, repeat: Infinity }}
          style={{ position: 'absolute', width: 108, height: 108, borderRadius: 999, background: 'rgba(255,91,108,.18)', marginTop: 0 }} />
        <motion.button whileTap={{ scale: 0.92 }}
          style={{
            width: 96, height: 96, borderRadius: 999, border: 'none', cursor: 'pointer',
            background: `linear-gradient(180deg, ${T.danger}, #E04556)`, fontSize: 40,
            boxShadow: '0 6px 0 #7a2530, inset 0 2px 0 rgba(255,255,255,0.3)', position: 'relative',
          }}>🎙</motion.button>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.muted }}>Говорите… распознаём</div>
      </div>
    </>
  )
}

export default function RoundAlt({ demo }: { demo?: { variant?: Variant } }) {
  const v = demo?.variant ?? 'translate'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 120px' }}>
      {v === 'translate' && <TranslateMode />}
      {v === 'timeattack' && <TimeAttackMode />}
      {v === 'voice' && <VoiceMode />}
    </div>
  )
}
