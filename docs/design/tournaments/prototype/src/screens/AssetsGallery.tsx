import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { ShardBurst } from '../components/ui'
import { T, PLAYERS, radius } from '../data/players'
import { Ticket } from './Tickets'

function Cell({ label, children, tall }: { label: string; children: ReactNode; tall?: boolean }) {
  return (
    <div style={{
      background: T.card, borderRadius: radius.md, padding: '14px 10px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
      minHeight: tall ? 170 : 132, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>{children}</div>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ghost, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: T.ghost, margin: '0 4px 10px' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
    </div>
  )
}

function Frame({ color, glow, children, size = 56 }: { color: string; glow?: boolean; children: ReactNode; size?: number }) {
  return (
    <motion.div
      animate={glow ? { boxShadow: [`0 0 0 3px ${color}, 0 0 14px ${color}55`, `0 0 0 4px ${color}, 0 0 26px ${color}99`, `0 0 0 3px ${color}, 0 0 14px ${color}55`] } : undefined}
      transition={{ duration: 1.6, repeat: Infinity }}
      style={{ width: size, height: size, borderRadius: size * 0.34, background: T.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, boxShadow: `0 0 0 3px ${color}` }}
    >{children}</motion.div>
  )
}

function TimerRing({ pct, color, n }: { pct: number; color: string; n: number }) {
  const C = 2 * Math.PI * 45
  return (
    <div style={{ width: 52, height: 52, position: 'relative' }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="50" cy="50" r="45" fill="none" stroke={T.elev2} strokeWidth="13" />
        <motion.circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeDasharray={C}
          initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C - pct * C }} transition={{ duration: 1, ease: [0.25, 1, 0.35, 1] }} />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color }}>{n}</span>
    </div>
  )
}

function TableRowDemo() {
  return (
    <motion.div layout transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.elev2, borderRadius: radius.sm, padding: '8px 12px', width: '100%' }}>
      <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
        style={{ fontSize: 14, fontWeight: 900, color: T.gold }}>1</motion.span>
      <span style={{ fontSize: 18 }}>🐺</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 800, color: T.text }}>СловоЖора</span>
      <motion.span key="s" initial={{ scale: 1.3, color: T.accent }} animate={{ scale: 1, color: T.text }} style={{ fontSize: 15, fontWeight: 900 }}>75</motion.span>
    </motion.div>
  )
}

export default function AssetsGallery() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 16px 120px' }}>
      <div>
        <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.8, color: T.text }}>Ассеты режима</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.ghost, marginTop: 2 }}>все графические элементы · анимации живые</div>
      </div>

      <Section title="Билеты и валюта">
        <Cell label="Билет обычный"><Ticket /></Cell>
        <Cell label="Билет VIP gold"><Ticket vip /></Cell>
        <Cell label="Билет огненный скин"><Ticket fire /></Cell>
        <Cell label="Гем 💎">
          <motion.span animate={{ scale: [1, 1.15, 1], rotate: [0, 6, -6, 0] }} transition={{ duration: 2.2, repeat: Infinity }} style={{ fontSize: 42 }}>💎</motion.span>
        </Cell>
        <Cell label="Банк-сундук">
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }} style={{ fontSize: 44, position: 'relative' }}>
            🧰<motion.span animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ position: 'absolute', top: -6, right: -10, fontSize: 18 }}>✨</motion.span>
          </motion.div>
        </Cell>
        <Cell label="Множители">
          {['×1.5', '×2'].map((m, i) => (
            <motion.span key={m} initial={{ scale: 0.6 }} animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4 }}
              style={{ fontSize: 18, fontWeight: 900, color: T.streak, background: 'rgba(251,146,60,.14)', padding: '6px 12px', borderRadius: 999 }}>🔥{m}</motion.span>
          ))}
        </Cell>
      </Section>

      <Section title="Кубки и награды">
        <Cell label="Кубки 🥇🥈🥉">
          {['🥇', '🥈', '🥉'].map((m, i) => (
            <motion.span key={m} initial={{ y: 16, opacity: 0 }} animate={{ y: [0, -4, 0], opacity: 1 }} transition={{ delay: i * 0.15, duration: 2, repeat: Infinity }} style={{ fontSize: 34 }}>{m}</motion.span>
          ))}
        </Cell>
        <Cell label="Кубок сезона большой">
          <motion.span animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }} style={{ fontSize: 52, filter: 'drop-shadow(0 0 12px rgba(255,212,59,.45))' }}>🏆</motion.span>
        </Cell>
        <Cell label="Корона 👑">
          <motion.span animate={{ y: [0, -5, 0], rotate: [0, -4, 4, 0] }} transition={{ duration: 2.6, repeat: Infinity }} style={{ fontSize: 44, filter: 'drop-shadow(0 0 10px rgba(255,200,0,.4))' }}>👑</motion.span>
        </Cell>
        <Cell label="Shard-burst частицы" tall>
          <div style={{ position: 'relative', width: 100, height: 90 }}><ShardBurst count={12} /><span style={{ position: 'absolute', top: '30%', left: '38%', fontSize: 30 }}>🏆</span></div>
        </Cell>
      </Section>

      <Section title="Рамки и титулы">
        <Cell label="Рамка «Чемпион дня»"><Frame color={T.gold} glow>🦊</Frame></Cell>
        <Cell label="Рамка «Огненная серия»"><Frame color={T.streak} glow>🐺</Frame></Cell>
        <Cell label="Рамка клановая"><Frame color="#B79CFF">🦉</Frame></Cell>
        <Cell label="Значки титулов">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[['🎖 Чемпион дня', T.gold, T.goldSoft], ['🔥 Неудержимый', T.streak, 'rgba(251,146,60,.14)'], ['🏅 Топ-10', T.text, T.elev]].map(([t, c, bg]) => (
              <span key={t as string} style={{ fontSize: 13, fontWeight: 800, color: c as string, background: bg as string, padding: '6px 12px', borderRadius: 999 }}>{t}</span>
            ))}
          </div>
        </Cell>
        <Cell label="Огонёк серии ×N">
          <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.9, repeat: Infinity }} style={{ fontSize: 20, fontWeight: 900, color: T.streak }}>🔥 ×4</motion.span>
        </Cell>
        <Cell label="LIVE-бейдж">
          <motion.span animate={{ opacity: [1, 0.45, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.5, color: '#FFF', background: T.danger, padding: '5px 12px', borderRadius: 999, boxShadow: `0 0 12px ${T.danger}88` }}>● LIVE</motion.span>
        </Cell>
      </Section>

      <Section title="Игроки и лобби">
        <Cell label="Аватары ботов (8)" tall>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {PLAYERS.slice(0, 8).map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 16 }}
                style={{ width: 40, height: 40, borderRadius: 14, background: T.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: `inset 0 1.5px 0 ${p.color}44` }}>{p.emoji}</motion.div>
            ))}
          </div>
        </Cell>
        <Cell label="Пустой слот лобби (дышит)">
          <motion.div animate={{ opacity: [0.35, 0.9, 0.35], scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ width: 52, height: 52, borderRadius: 18, background: T.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: T.ghost, border: `2px dashed ${T.ghost}55` }}>＋</motion.div>
        </Cell>
        <Cell label="Прогресс-бар лобби" tall>
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: T.muted, marginBottom: 6 }}><span>Лобби</span><span>11/16</span></div>
            <div style={{ height: 10, borderRadius: 999, background: T.bg, overflow: 'hidden' }}>
              <motion.div initial={{ width: '20%' }} animate={{ width: '69%' }} transition={{ duration: 1.2, ease: [0.25, 1, 0.35, 1] }}
                style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${T.accentDark}, ${T.accent})`, boxShadow: '0 0 8px rgba(71,200,112,.5)' }} />
            </div>
          </div>
        </Cell>
        <Cell label="Плашка таблицы (1 строка)"><TableRowDemo /></Cell>
        <Cell label="Пилюля «обгон!»">
          <motion.span initial={{ scale: 0, rotate: -8 }} animate={{ scale: [0, 1.2, 1], rotate: 0 }} transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 1.6 }}
            style={{ fontSize: 13, fontWeight: 900, color: T.accentText, background: T.accent, padding: '6px 12px', borderRadius: 999 }}>⚡ обгон!</motion.span>
        </Cell>
      </Section>

      <Section title="Интерфейс">
        <Cell label="Кольцо таймера (3 состояния)">
          <TimerRing pct={0.8} color={T.accent} n={8} />
          <TimerRing pct={0.45} color={T.gold} n={5} />
          <TimerRing pct={0.18} color={T.danger} n={2} />
        </Cell>
        <Cell label="Таббар: кубок + LIVE-точка" tall>
          <div style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" stroke={T.ghost} fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 21h8M12 17v4" /><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4a1 1 0 0 0-1 1c0 2.2 1.8 4 4 4M17 6h3a1 1 0 0 1 1 1c0 2.2-1.8 4-4 4" />
            </svg>
            <div style={{ position: 'relative' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" stroke={T.accent} fill="none" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 21h8M12 17v4" /><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4a1 1 0 0 0-1 1c0 2.2 1.8 4 4 4M17 6h3a1 1 0 0 1 1 1c0 2.2-1.8 4-4 4" />
              </svg>
              <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                style={{ position: 'absolute', top: -2, right: -4, width: 9, height: 9, borderRadius: 999, background: T.danger, boxShadow: `0 0 6px ${T.danger}` }} />
            </div>
          </div>
        </Cell>
        <Cell label="Реакции" tall>
          <div style={{ display: 'flex', gap: 8 }}>
            {['👍', '🔥', '😎', '⚔️', '🍀'].map((e, i) => (
              <motion.span key={e} animate={{ y: [0, -8, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }} style={{ fontSize: 26 }}>{e}</motion.span>
            ))}
          </div>
        </Cell>
      </Section>
    </div>
  )
}
