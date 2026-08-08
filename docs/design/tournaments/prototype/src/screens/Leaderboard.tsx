import { LayoutGroup, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Cta } from '../components/ui'
import { ALL, T, radius } from '../data/players'
import { useCountdown } from '../hooks/useAnim'

type Props = {
  scores: number[]
  round: number
  isFinal: boolean
  onNext: () => void
  demo?: { overtakes?: number[] }
}

export default function Leaderboard({ scores, round, isFinal, onNext, demo }: Props) {
  const [grown, setGrown] = useState(false)
  const left = useCountdown(10, !demo, onNext)

  useEffect(() => {
    const id = setTimeout(() => setGrown(true), 300)
    return () => clearTimeout(id)
  }, [])

  const rows = useMemo(() => ALL.map((p, i) => ({ p, s: scores[i] ?? 0 })).sort((a, b) => b.s - a.s), [scores])
  const maxScore = Math.max(1, ...rows.map((r) => r.s))

  const prevPos = useRef<Record<number, number>>({})
  const [overtakes, setOvertakes] = useState<Set<number>>(() => new Set(demo?.overtakes ?? []))
  useEffect(() => {
    if (demo) return
    const now: Record<number, number> = {}
    rows.forEach((r, idx) => (now[r.p.id] = idx))
    const ov = new Set<number>()
    rows.forEach((r, idx) => {
      const before = prevPos.current[r.p.id]
      if (before !== undefined && idx < before && r.s > 0) ov.add(r.p.id)
    })
    setOvertakes(ov)
    prevPos.current = now
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, demo])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, color: T.text }}>{isFinal ? 'Финал' : 'Таблица'}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, marginTop: 2 }}>{isFinal ? 'Подсчёт результатов…' : `Раунд ${round} из 4`}</div>
        </div>
        <div style={{ marginLeft: 'auto', width: 64, height: 64, borderRadius: 999, background: T.card, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 28, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: T.accent }}>{left}</span>
        </div>
      </div>

      <LayoutGroup>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(({ p, s }, idx) => {
            const width = grown ? Math.max(6, (s / maxScore) * 100) : 4
            const medal = idx === 0 ? T.gold : idx === 1 ? T.silver : idx === 2 ? T.bronze : T.ghost
            return (
              <motion.div
                layout
                key={p.id}
                transition={{ type: 'spring', stiffness: 250, damping: 28 }}
                style={{
                  position: 'relative', overflow: 'hidden', borderRadius: radius.md,
                  background: p.isYou ? 'rgba(71,200,112,.18)' : T.card,
                  boxShadow: p.isYou ? '0 0 16px rgba(71,200,112,.14), inset 0 1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.045)',
                }}
              >
                <motion.div
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 1, ease: [0.25, 1, 0.35, 1] }}
                  style={{ position: 'absolute', top: 0, bottom: 0, left: 0, background: `linear-gradient(90deg, ${p.color}1f, ${p.color}40)`, borderRadius: radius.md }}
                />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px' }}>
                  <span style={{ width: 24, textAlign: 'center', fontSize: 16, fontWeight: 900, color: medal }}>{idx + 1}</span>
                  <span style={{ width: 34, height: 34, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, background: p.color + '2e' }}>{p.emoji}</span>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 800, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}{p.streak >= 3 ? ' 🔥' : ''}
                  </span>
                  {overtakes.has(p.id) && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 16 }}
                      style={{ fontSize: 12, fontWeight: 900, color: T.accentText, background: T.accent, padding: '4px 9px', borderRadius: 999 }}
                    >обгон!</motion.span>
                  )}
                  <motion.span key={s} initial={{ scale: 1.3 }} animate={{ scale: 1 }} style={{ fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: T.text }}>{s}</motion.span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </LayoutGroup>

      <Cta onClick={onNext}>{isFinal ? 'Результаты 🏆' : 'Дальше ▶'}</Cta>
    </div>
  )
}
