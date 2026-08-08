import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Card, Cta, ShardBurst, appear } from '../components/ui'
import { ALL, T, radius } from '../data/players'
import { useAnimatedNumber } from '../hooks/useAnim'

type Props = {
  scores: number[]
  onHome: () => void
  onOpenSeason: () => void
  demo?: { shareFocus?: boolean }
}

const PRIZES = [
  { text: '🎟 + 50 💎 + титул «Чемпион дня»' },
  { text: '🎟 + 25 💎' },
  { text: '10 💎' },
]

const STEP = [
  { h: 110, bg: 'linear-gradient(180deg, rgba(255,212,59,.4), rgba(255,212,59,.06))', glow: '0 0 24px rgba(255,212,59,.3)' },
  { h: 80, bg: 'linear-gradient(180deg, rgba(201,212,220,.3), rgba(201,212,220,.05))', glow: 'none' },
  { h: 62, bg: 'linear-gradient(180deg, rgba(210,154,106,.32), rgba(210,154,106,.05))', glow: 'none' },
]

export default function Results({ scores, onHome, onOpenSeason, demo }: Props) {
  const [shared, setShared] = useState(false)
  useEffect(() => {
    if (demo?.shareFocus) {
      const id = setTimeout(() => document.querySelector('.phone-scroll')?.scrollTo({ top: 9999, behavior: 'auto' }), 400)
      return () => clearTimeout(id)
    }
  }, [demo])
  const rows = useMemo(() => ALL.map((p, i) => ({ p, s: scores[i] ?? 0 })).sort((a, b) => b.s - a.s), [scores])
  const top3 = rows.slice(0, 3)
  const youIdx = rows.findIndex((r) => r.p.isYou)
  const seasonPts = Math.max(2, 22 - youIdx)
  const seasonAnim = useAnimatedNumber(seasonPts, 1100)
  const youWon = youIdx === 0

  // порядок колонок: 2-е, 1-е, 3-е
  const podium = [
    { r: top3[1], step: STEP[1], medal: '🥈' },
    { r: top3[0], step: STEP[0], medal: '🥇' },
    { r: top3[2], step: STEP[2], medal: '🥉' },
  ].filter((x) => x.r)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 120px', position: 'relative' }}>
      <ShardBurst />

      <motion.div {...appear(0)} style={{ textAlign: 'center', paddingTop: 6 }}>
        <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, color: T.text }}>
          {youWon ? '🏆 Победа!' : `#${youIdx + 1} из 16`}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.muted, marginTop: 4 }}>
          {youWon ? 'Вы обыграли 15 игроков' : youIdx < 3 ? 'Так близко к победе!' : 'Хорошая игра!'}
        </div>
      </motion.div>

      {/* Подиум — сцена как в Лиге */}
      <motion.div {...appear(0.06)}>
        <Card tone="elev" pad={24} style={{ paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10 }}>
            {podium.map(({ r, step, medal }, i) => {
              const first = i === 1
              return (
                <div key={r.p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 96 }}>
                  <motion.div
                    initial={{ scale: 0, y: 16 }} animate={{ scale: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.16, type: 'spring', stiffness: 300, damping: 15 }}
                    style={{ position: 'relative' }}
                  >
                    {first && (
                      <motion.span
                        initial={{ y: -34, opacity: 0, rotate: -24 }}
                        animate={{ y: 0, opacity: 1, rotate: -8 }}
                        transition={{ delay: 0.9, type: 'spring', stiffness: 260, damping: 12 }}
                        style={{ position: 'absolute', top: -24, left: '50%', marginLeft: -13, fontSize: 26, zIndex: 2 }}
                      >👑</motion.span>
                    )}
                    <span style={{
                      width: first ? 64 : 54, height: first ? 64 : 54, borderRadius: 999,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: first ? 30 : 25,
                      background: r.p.color + '2e',
                      boxShadow: `0 0 0 3px ${first ? 'rgba(255,212,59,.65)' : r.p.color + '59'}${first ? ', 0 0 22px rgba(255,212,59,.4)' : ''}`,
                    }}>{r.p.emoji}</span>
                  </motion.div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.text, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.p.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: T.muted }}>{r.s} очк.</div>
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: step.h }}
                    transition={{ delay: 0.2 + i * 0.16, type: 'spring', stiffness: 130, damping: 20 }}
                    style={{
                      width: '100%', borderRadius: `${radius.md}px ${radius.md}px 0 0`,
                      background: step.bg, boxShadow: step.glow,
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{medal}</span>
                  </motion.div>
                </div>
              )
            })}
          </div>
        </Card>
      </motion.div>

      {/* Призы */}
      <motion.div {...appear(0.14)}>
        <Card pad={18}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PRIZES.map((pr, i) => (
              <motion.div key={pr.text} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, fontWeight: 700 }}>
                <span style={{ width: 30, height: 30, borderRadius: 10, background: T.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{['🥇', '🥈', '🥉'][i]}</span>
                <span style={{ color: T.muted }}>{pr.text}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Ваша награда */}
      <motion.div {...appear(0.2)}>
        <Card tone="accent" pad={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 34 }}>🦊</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Ваша награда</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.muted, marginTop: 2 }}>+{Math.max(2, 12 - youIdx)} XP кэшбэк</div>
            </div>
            <button onClick={onOpenSeason} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: T.accent }}>+{seasonAnim}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.ghost }}>очков сезона ›</div>
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Шер-карточка */}
      <motion.div {...appear(0.26)}>
        <Card tone="gold" pad={20}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 56, height: 56, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, background: T.accentSoft, boxShadow: `0 0 0 2.5px ${T.accent}` }}>🦊</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: T.text, lineHeight: 1.3 }}>Я обыграл {15 - youIdx} игроков ⚔️</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, marginTop: 3 }}>Турниры · {new Date().toLocaleDateString('ru-RU')}</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <Cta gold onClick={() => setShared(true)}>{shared ? '✓ Скопировано' : 'Поделиться 📤'}</Cta>
          </div>
        </Card>
      </motion.div>

      <Cta ghost onClick={onHome}>На главную</Cta>
    </div>
  )
}
