import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Card, Cta, Sheet, appear } from '../components/ui'
import { TimeLeft } from '../components/TimeLeft'
import { SEASON_LEADERS, T, radius } from '../data/players'
import { useAnimatedNumber, useCountdown, useTickingCounter } from '../hooks/useAnim'

type DemoPreset = { variant?: 'countdown' | 'live' | 'noTickets'; confirm?: boolean; bankFirst?: boolean }

export default function TournamentHome({ onEnter, onOpenSeason, onOpenStates, demo }: {
  onEnter: () => void
  onOpenSeason: () => void
  onOpenStates: () => void
  demo?: DemoPreset
}) {
  const variant = demo?.variant ?? 'countdown'
  const live = variant === 'live'
  const noTickets = variant === 'noTickets'
  const [confirm, setConfirm] = useState(!!demo?.confirm)
  const [tickets, setTickets] = useState(noTickets ? 0 : 3)
  const bank = useTickingCounter(240, 1, 3, 2600)
  const bankAnim = useAnimatedNumber(bank, 700)
  const startLeft = useCountdown(4 * 60 + 23)

  const heroCard = (
    <Card tone="elev" pad={24} key="hero">
      <motion.div
        animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 3, repeat: Infinity }}
        style={{ position: 'absolute', top: -90, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(71,200,112,.18), transparent 70%)', pointerEvents: 'none' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: live ? T.danger : T.accent, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {live && <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ width: 8, height: 8, borderRadius: 999, background: T.danger, boxShadow: `0 0 8px ${T.danger}` }} />}
          {live ? 'Турнир идёт' : 'Турнир фраз'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: T.gold, background: T.goldSoft, padding: '5px 10px', borderRadius: 999 }}>🎁 первый вход — бесплатно</span>
      </div>

      {/* Гигантский отсчёт / LIVE */}
      <div style={{ textAlign: 'center', margin: '22px 0 6px' }}>
        {live ? (
          <motion.div
            animate={{ scale: [1, 1.04, 1], textShadow: ['0 0 0 rgba(255,91,108,0)', '0 0 26px rgba(255,91,108,.5)', '0 0 0 rgba(255,91,108,0)'] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ fontSize: 64, fontWeight: 900, letterSpacing: 2, lineHeight: 1, color: T.danger }}
          >LIVE</motion.div>
        ) : (
          <TimeLeft seconds={startLeft} size={64} />
        )}
        <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, marginTop: 8 }}>
          {live ? '12 из 16 мест занято — успей зайти!' : 'до старта · 16 игроков · 4 раунда'}
        </div>
      </div>

      {/* Слоты дня */}
      <div style={{ display: 'flex', gap: 8, margin: '18px 0 22px' }}>
        {[
          { t: '12:00', state: 'done' },
          { t: '19:00', state: 'now' },
          { t: '21:00', state: 'next' },
        ].map((s) => (
          <div key={s.t} style={{
            flex: 1, textAlign: 'center', padding: '12px 0', borderRadius: radius.md,
            background: s.state === 'now' ? T.accentSoft : s.state === 'next' ? T.card : 'transparent',
            color: s.state === 'done' ? T.ghost : s.state === 'now' ? T.accent : T.muted,
            fontSize: 17, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            textDecoration: s.state === 'done' ? 'line-through' : 'none',
            opacity: s.state === 'done' ? 0.55 : 1,
          }}>
            {s.t}
            {s.state === 'now' && <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, marginTop: 2 }}>{live ? 'ИДЁТ' : 'СЕЙЧАС'}</div>}
          </div>
        ))}
      </div>

      {noTickets ? (
        <>
          <Cta ghost>Нет билетов 😔</Cta>
          <div style={{ marginTop: 14, borderRadius: radius.md, background: T.goldSoft, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🎟</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.gold }}>Как получить билеты</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>ежедневные задания · уровни · банк недели</div>
            </div>
          </div>
        </>
      ) : (
        <Cta onClick={() => setConfirm(true)}>{live ? 'В игру · 1 🎟' : 'Играть за 1 🎟'}</Cta>
      )}
    </Card>
  )

  const bankCard = (
    <Card tone="gold" pad={22} key="bank">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <motion.div
          animate={{ scale: [1, 1.06, 1], rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 2.6, repeat: Infinity }}
          style={{ fontSize: 44, filter: 'drop-shadow(0 0 14px rgba(255,212,59,.45))' }}
        >💰</motion.div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: T.goldText }}>Банк недели</div>
          <motion.div
            animate={{ textShadow: ['0 0 0 rgba(255,212,59,0)', '0 0 18px rgba(255,212,59,.5)', '0 0 0 rgba(255,212,59,0)'] }}
            transition={{ duration: 2.6, repeat: Infinity }}
            style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1.5, fontVariantNumeric: 'tabular-nums', color: T.gold, lineHeight: 1.1 }}
          >
            {bankAnim} <span style={{ fontSize: 22 }}>💎</span>
          </motion.div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>👑 VIP</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>вс, 20:00</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.gold, marginTop: 2 }}>вход 3 🎟</div>
        </div>
      </div>
    </Card>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 120px' }}>
      {/* Шапка */}
      <motion.div {...appear(0)} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, color: T.text }}>Турниры</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ height: 40, padding: '0 14px', borderRadius: 999, background: T.card, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 800, color: T.text }}>💎 124</span>
          <span style={{ height: 40, padding: '0 14px', borderRadius: 999, background: noTickets ? T.dangerSoft : T.card, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 800, color: noTickets ? T.danger : T.text }}>🎟 {tickets}</span>
          <button onClick={onOpenStates} title="Все состояния" style={{ width: 40, height: 40, borderRadius: 999, border: 'none', background: T.card, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)', color: T.ghost, fontSize: 17, cursor: 'pointer' }}>⚙</button>
        </div>
      </motion.div>

      {/* HERO + банк (порядок зависит от демо) */}
      <motion.div {...appear(0.06)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {demo?.bankFirst ? [bankCard, heroCard] : [heroCard, bankCard]}
      </motion.div>

      {/* Сезон — тизер-строка */}
      <motion.div {...appear(0.14)}>
        <Card onClick={onOpenSeason} pad={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex' }}>
              {SEASON_LEADERS.slice(0, 3).map((p, i) => (
                <span key={p.name} style={{
                  width: 38, height: 38, borderRadius: 999, marginLeft: i ? -10 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  background: p.color + '33', boxShadow: `0 0 0 3px ${T.card}`,
                }}>{p.emoji}</span>
              ))}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Сезон · вы 6-е</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>до топ-5 — 24 очка</div>
            </div>
            <span style={{ fontSize: 22, color: T.ghost }}>›</span>
          </div>
        </Card>
      </motion.div>

      {/* Подтверждение */}
      <AnimatePresence>
        {confirm && (
          <Sheet onClose={() => setConfirm(false)}>
            <div style={{ textAlign: 'center', fontSize: 44 }}>🏆</div>
            <div style={{ textAlign: 'center', fontSize: 24, fontWeight: 900, color: T.text, marginTop: 8 }}>Войти в турнир?</div>
            <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 600, color: T.muted, margin: '10px 0 26px' }}>Списание: 1 🎟 · останется {tickets - 1}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Cta onClick={() => { setTickets((t) => t - 1); setConfirm(false); onEnter() }}>Погнали!</Cta>
              <Cta ghost onClick={() => setConfirm(false)}>Отмена</Cta>
            </div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  )
}
