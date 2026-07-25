import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Card, Cta, Sheet, appear } from '../components/ui'
import { ALL, T, radius, type Player } from '../data/players'
import { useCountdown } from '../hooks/useAnim'
import { TimeLeft } from '../components/TimeLeft'

type Reaction = { id: number; emoji: string; x: number }

export default function Lobby({ onStart, demo }: { onStart: () => void; demo?: { joined?: number; profile?: boolean } }) {
  const freezeAt = demo?.joined
  const [joined, setJoined] = useState<Player[]>(() => ALL.slice(0, freezeAt ?? 1))
  const [profile, setProfile] = useState<Player | null>(demo?.profile ? ALL[3] : null)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const full = joined.length >= 16
  const left = useCountdown(14, full && !demo, onStart)

  useEffect(() => {
    if (joined.length >= (freezeAt ?? 16)) return
    const id = setTimeout(() => setJoined((j) => [...j, ALL[j.length]]), 450 + Math.random() * 450)
    return () => clearTimeout(id)
  }, [joined, freezeAt])

  const sendReaction = (emoji: string) => {
    const id = Date.now() + Math.random()
    setReactions((r) => [...r.slice(-8), { id, emoji, x: 8 + Math.random() * 78 }])
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 1900)
  }

  const slots = useMemo(() => Array.from({ length: 16 }, (_, i) => joined[i] ?? null), [joined])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 14px 16px', position: 'relative', overflow: 'hidden', minHeight: '100%' }}>
      {/* Летающие реакции — экранный слой поверх лобби */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40, overflow: 'hidden' }}>
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.span key={r.id}
              initial={{ y: 0, opacity: 0, scale: 0.6 }}
              animate={{ y: -260, opacity: [0, 1, 1, 0], scale: 1.5, x: [0, 10, -8, 6] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.9, ease: 'easeOut' }}
              style={{ position: 'absolute', bottom: 150, left: `${r.x}%`, fontSize: 30 }}
            >{r.emoji}</motion.span>
          ))}
        </AnimatePresence>
      </div>
      <motion.div {...appear(0)} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.8, color: T.text }}>Лобби</span>
        <span style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: T.muted }}>{joined.length}<span style={{ color: T.ghost }}>/16</span></span>
      </motion.div>

      {/* Статус: подключение → обратный отсчёт */}
      <motion.div {...appear(0.05)}>
        <Card tone="elev" pad={16}>
          {!full ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <motion.span animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1, repeat: Infinity }}
                style={{ width: 12, height: 12, borderRadius: 999, background: T.accent, boxShadow: `0 0 10px ${T.accent}` }} />
              <span style={{ fontSize: 16, fontWeight: 700, color: T.muted }}>Подключение игроков…</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: T.accent }}>Все на месте!</span>
              <TimeLeft seconds={left} size={30} />
            </div>
          )}
          <div style={{ height: 10, borderRadius: 999, background: T.card, marginTop: 12, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${(joined.length / 16) * 100}%` }}
              transition={{ type: 'spring', stiffness: 140, damping: 22 }}
              style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${T.accentDark}, ${T.accent})`, boxShadow: `0 0 8px rgba(71,200,112,.55)` }}
            />
          </div>
        </Card>
      </motion.div>

      {/* Сетка игроков — фиксированные слоты, поп-ин на месте, без сдвига вёрстки */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, overflow: 'hidden' }}>
        {slots.map((p, i) =>
          p ? (
            <motion.button
              key={p.id}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 19 }}
              onClick={() => setProfile(p)}
              style={{
                position: 'relative', borderRadius: radius.md, padding: '9px 4px 8px', border: 'none', height: 84,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                background: p.isYou ? T.accentSoft : T.card,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)',
                cursor: 'pointer',
              }}
            >
              {p.streak >= 3 && (
                <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  style={{ position: 'absolute', top: -4, right: 3, fontSize: 13, filter: 'drop-shadow(0 0 5px rgba(251,146,60,.8))' }}>🔥</motion.span>
              )}
              <span style={{ width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: p.color + '2e', boxShadow: `0 0 0 2.5px ${p.color}59` }}>{p.emoji}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: T.text, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{p.name}</span>
            </motion.button>
          ) : (
            <div key={`e-${i}`} style={{ borderRadius: radius.md, padding: '9px 4px 8px', height: 84, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'rgba(16,23,16,.5)' }}>
              <motion.span
                animate={{ opacity: [0.25, 0.6, 0.25] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12 }}
                style={{ width: 40, height: 40, borderRadius: 999, background: T.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ghost, fontSize: 17, fontWeight: 900 }}
              >?</motion.span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'transparent', lineHeight: 1.2 }}>.</span>
            </div>
          ),
        )}
      </div>

      {/* Реакции */}
      <motion.div {...appear(0.1)}>
        <Card pad={12}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
            {['👍', '🔥', '😎', '⚔️', '🍀'].map((e) => (
              <motion.button
                key={e} whileTap={{ scale: 0.8 }} onClick={() => sendReaction(e)}
                style={{ width: 48, height: 48, borderRadius: 999, border: 'none', background: T.elev, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)', fontSize: 22, cursor: 'pointer' }}
              >{e}</motion.button>
            ))}
          </div>
        </Card>
      </motion.div>

      <Cta onClick={onStart}>Начать сейчас ▶</Cta>

      {/* Профиль игрока */}
      <AnimatePresence>
        {profile && (
          <Sheet onClose={() => setProfile(null)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ width: 72, height: 72, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, background: profile.color + '2e', boxShadow: `0 0 0 3px ${profile.color}73, 0 0 22px ${profile.color}40` }}>{profile.emoji}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>{profile.name}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.muted, marginTop: 2 }}>{profile.rank}{profile.streak >= 3 ? ` · 🔥 серия ${profile.streak}` : ''}</div>
              </div>
            </div>
            {profile.titles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
                {profile.titles.map((t) => (
                  <span key={t} style={{ fontSize: 13, fontWeight: 800, padding: '7px 12px', borderRadius: 999, background: T.goldSoft, color: T.gold }}>🏆 {t}</span>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
              <div style={{ borderRadius: radius.md, background: T.card, padding: 16, textAlign: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)' }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: T.accent }}>{profile.winRate}%</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ghost, marginTop: 2 }}>побед</div>
              </div>
              <div style={{ borderRadius: radius.md, background: T.card, padding: 16, textAlign: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)' }}>
                <div style={{ fontSize: 30, fontWeight: 900, color: T.text }}>{profile.played}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ghost, marginTop: 2 }}>турниров</div>
              </div>
            </div>
            <div style={{ marginTop: 22 }}>
              <Cta onClick={() => setProfile(null)}>＋ В друзья</Cta>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  )
}
