import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '../components/ui'
import { ALL, QUESTIONS, T, radius } from '../data/players'

type Props = {
  round: number
  scores: number[]
  onRoundEnd: (youGain: number[], others: number[]) => void
  demo?: { picked?: number; timeLeft?: number; streak?: number; question?: number }
}

const QUESTION_TIME = 10
const LETTERS = ['A', 'B', 'C', 'D']
const BATCH = 5 // вопросов в раунде

export default function Round({ round, scores, onRoundEnd, demo }: Props) {
  const frozen = !!demo
  const [qi, setQi] = useState(0) // номер вопроса в батче (0..4)
  const qNum = frozen ? (demo.question ?? 3) : qi + 1 // 1-based для отображения
  const q = QUESTIONS[(round * BATCH + qi) % QUESTIONS.length]
  const [picked, setPicked] = useState<number | null>(demo?.picked ?? null)
  const [timeLeft, setTimeLeft] = useState(demo?.timeLeft ?? QUESTION_TIME)
  const [streak, setStreak] = useState(demo?.streak ?? 0)
  const [shake, setShake] = useState(false)
  const gains = useRef<number[]>([])

  const multiplier = streak >= 3 ? 2 : streak >= 1 ? 1.5 : 1

  // таймер вопроса
  useEffect(() => {
    if (frozen || picked !== null) return
    if (timeLeft <= 0) { answer(-1); return }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, picked, frozen])

  // после ответа: короткий фидбек → следующий вопрос; после 5-го — таблица
  useEffect(() => {
    if (frozen || picked === null) return
    const youGain = picked === q.correct ? Math.round(10 * multiplier) : 0
    gains.current = [...gains.current, youGain]
    const id = setTimeout(() => {
      if (qi < BATCH - 1) {
        setQi((v) => v + 1)
        setPicked(null)
        setTimeLeft(QUESTION_TIME)
        setShake(false)
      } else {
        const others = ALL.slice(1).map((p) =>
          Array.from({ length: BATCH }).reduce<number>(
            (acc) => acc + (Math.random() < p.winRate / 100 + 0.1 ? (Math.random() < 0.3 ? 15 : 10) : 0), 0),
        )
        onRoundEnd([gains.current.reduce((a, b) => a + b, 0)], others)
      }
    }, 1400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked])

  const answer = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    if (i === q.correct) setStreak((s) => s + 1)
    else { setStreak(0); setShake(true) }
  }

  const mini = useMemo(() => {
    const all = ALL.map((p, i) => ({ p, s: scores[i] ?? 0 })).sort((a, b) => b.s - a.s)
    const youIdx = all.findIndex((x) => x.p.isYou)
    const start = Math.max(0, Math.min(youIdx - 1, all.length - 3))
    return { rows: all.slice(start, start + 3), youPos: youIdx + 1 }
  }, [scores])

  const ringOffset = 283 - (timeLeft / QUESTION_TIME) * 283
  const answered = picked !== null
  const correct = picked === q.correct

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 120px' }}>
      {/* Прогресс раунда + стрик + таймер */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: T.muted, whiteSpace: 'nowrap' }}>
          Вопрос {qNum}<span style={{ color: T.ghost }}> из {BATCH}</span>
        </span>
        {/* точки батча */}
        <div style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'center' }}>
          {Array.from({ length: BATCH }).map((_, i) => (
            <motion.span key={`${qi}-${i}`}
              animate={i === qNum - 1 ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 0.6, repeat: i === qNum - 1 ? Infinity : 0, repeatDelay: 0.6 }}
              style={{
                width: i === qNum - 1 ? 22 : 9, height: 9, borderRadius: 999,
                background: i < qNum - 1 ? T.accent : i === qNum - 1 ? `linear-gradient(90deg, ${T.accentDark}, ${T.accent})` : T.elev2,
                boxShadow: i <= qNum - 1 ? '0 0 6px rgba(71,200,112,.4)' : 'none',
              }}
            />
          ))}
        </div>
        <motion.span key={multiplier} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}
          style={{ fontSize: 17, fontWeight: 900, color: multiplier > 1 ? T.streak : T.ghost }}>
          {multiplier > 1 ? `🔥×${multiplier}` : '×1'}
        </motion.span>
        <div style={{ width: 44, height: 44, position: 'relative', flexShrink: 0 }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke={T.card} strokeWidth="13" />
            <motion.circle cx="50" cy="50" r="45" fill="none" strokeLinecap="round" strokeWidth="13"
              stroke={timeLeft <= 3 ? T.danger : T.accent}
              strokeDasharray="283" animate={{ strokeDashoffset: ringOffset }}
              transition={{ duration: 0.9, ease: 'linear' }}
            />
          </svg>
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: timeLeft <= 3 ? T.danger : T.text }}>{timeLeft}</span>
        </div>
      </div>

      {/* Мини-стендинг */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        {mini.rows.map(({ p, s }) => (
          <span key={p.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 800,
            color: p.isYou ? T.accent : T.muted,
            background: p.isYou ? T.accentSoft : T.card,
            padding: '6px 12px', borderRadius: 999,
          }}>
            {p.emoji}<motion.span key={s} initial={{ scale: 1.3 }} animate={{ scale: 1 }} style={{ fontVariantNumeric: 'tabular-nums' }}>{s}</motion.span>
          </span>
        ))}
        <span style={{ fontSize: 14, fontWeight: 800, color: T.ghost }}>#{mini.youPos}</span>
      </div>

      {/* Карточка фразы */}
      <motion.div
        key={`${round}-${qi}`}
        initial={{ opacity: 0, y: 14 }}
        animate={shake ? { x: [0, -8, 8, -6, 6, -4, 4, 0], opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
        transition={{ duration: shake ? 0.4 : 0.35, ease: [0.22, 0.9, 0.3, 1] }}
      >
        <Card tone="elev" pad={26}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ghost }}>{q.hint}</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, lineHeight: 1.25, color: T.text, marginTop: 10 }}>{q.phrase}</div>
        </Card>
      </motion.div>

      {/* Варианты — большие строки без бордеров */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {q.options.map((opt, i) => {
          const isCorrectRow = answered && i === q.correct
          const isErrorRow = answered && picked === i && !correct
          return (
            <motion.button
              key={`${qi}-${opt}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.3, ease: [0.22, 0.9, 0.3, 1] }}
              whileTap={!answered ? { scale: 0.97 } : undefined}
              onClick={() => answer(i)}
              style={{
                display: 'flex', alignItems: 'center', minHeight: 64, padding: '14px 16px',
                borderRadius: radius.md, border: 'none', cursor: answered ? 'default' : 'pointer', textAlign: 'left',
                background: isCorrectRow ? 'rgba(71,200,112,.2)' : isErrorRow ? T.dangerSoft : T.card,
                boxShadow: isCorrectRow ? `0 0 16px rgba(71,200,112,.25), inset 0 1px 0 rgba(255,255,255,0.05)` : 'inset 0 1px 0 rgba(255,255,255,0.045)',
              }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: 10, marginRight: 14, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 900,
                background: isCorrectRow ? T.accent : T.elev,
                color: isCorrectRow ? T.accentText : T.muted,
              }}>{LETTERS[i]}</span>
              <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: isCorrectRow ? T.accent : isErrorRow ? T.danger : T.text }}>{opt}</span>
              {isCorrectRow && <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.25, 1] }} transition={{ duration: 0.35, delay: 0.1 }} style={{ fontSize: 20, color: T.accent }}>✓</motion.span>}
              {isErrorRow && <span style={{ fontSize: 18, color: T.danger }}>✕</span>}
            </motion.button>
          )
        })}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {answered && (
          <motion.div
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            style={{
              borderRadius: radius.lg, padding: '18px 22px',
              background: correct ? 'rgba(71,200,112,.16)' : T.dangerSoft,
              boxShadow: correct ? '0 0 20px rgba(71,200,112,.15)' : 'none',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, color: correct ? T.accent : T.danger }}>{correct ? 'Правильно!' : 'Почти!'}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, marginTop: 4 }}>
              {correct
                ? `+${Math.round(10 * multiplier)} очков${multiplier > 1 ? ` · серия ×${multiplier} 🔥` : ''} · дальше вопрос ${Math.min(qNum + 1, BATCH)}/${BATCH}`
                : `Верно: «${q.options[q.correct]}»`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
