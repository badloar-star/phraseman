import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import Cancel from './screens/Cancel'
import Leaderboard from './screens/Leaderboard'
import Lobby from './screens/Lobby'
import Results from './screens/Results'
import Round from './screens/Round'
import Season from './screens/Season'
import StatesIndex from './screens/StatesIndex'
import TournamentHome from './screens/TournamentHome'
import RoundIntro from './screens/RoundIntro'
import RoundAlt from './screens/RoundAlt'
import VipEntry from './screens/VipEntry'
import BankScreen from './screens/BankScreen'
import WatchScreen from './screens/WatchScreen'
import Tickets from './screens/Tickets'
import ShareCard from './screens/ShareCard'
import StreakUnlock from './screens/StreakUnlock'
import ProfileScreen from './screens/ProfileScreen'
import Onboarding from './screens/Onboarding'
import EdgeStates from './screens/EdgeStates'
import AssetsGallery from './screens/AssetsGallery'
import { T, radius } from './data/players'
import { readHashState, type DemoState, type ScreenId } from './states'

type Screen = ScreenId | 'states' | 'stub'
type TabKey = 'home' | 'lessons' | 'arena' | 'friends' | 'settings'

/* Реальные иконки табов приложения (home / book / people / settings) + турнирный кубок */
const stroke = { fill: 'none', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const TAB_ICONS: Record<TabKey, React.ReactNode> = {
  home: (
    <svg width="26" height="26" viewBox="0 0 24 24" stroke="currentColor" {...stroke}>
      <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
    </svg>
  ),
  lessons: (
    <svg width="26" height="26" viewBox="0 0 24 24" stroke="currentColor" {...stroke}>
      <path d="M12 6c-1.5-1.8-4-2.5-8-2.5v15c4 0 6.5.7 8 2.5 1.5-1.8 4-2.5 8-2.5v-15c-4 0-6.5.7-8 2.5Z" /><path d="M12 6v15" />
    </svg>
  ),
  arena: (
    <svg width="26" height="26" viewBox="0 0 24 24" stroke="currentColor" {...stroke}>
      <path d="M8 21h8M12 17v4" /><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4a1 1 0 0 0-1 1c0 2.2 1.8 4 4 4M17 6h3a1 1 0 0 1 1 1c0 2.2-1.8 4-4 4" />
    </svg>
  ),
  friends: (
    <svg width="26" height="26" viewBox="0 0 24 24" stroke="currentColor" {...stroke}>
      <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5" /><path d="M16 5.2a3.5 3.5 0 0 1 0 5.9M18.5 14.7c1.8.8 2.9 2.4 3.2 4.6" />
    </svg>
  ),
  settings: (
    <svg width="26" height="26" viewBox="0 0 24 24" stroke="currentColor" {...stroke}>
      <circle cx="12" cy="12" r="3.2" /><path d="M19 12a7 7 0 0 0-.14-1.4l2-1.55-2-3.46-2.36.95A7 7 0 0 0 14 5.1L13.7 2.6h-3.4L10 5.1a7 7 0 0 0-2.5 1.44l-2.36-.95-2 3.46 2 1.55a7 7 0 0 0 0 2.8l-2 1.55 2 3.46 2.36-.95A7 7 0 0 0 10 18.9l.3 2.5h3.4l.3-2.5a7 7 0 0 0 2.5-1.44l2.36.95 2-3.46-2-1.55c.09-.46.14-.93.14-1.4Z" />
    </svg>
  ),
}
const TABS: { key: TabKey; live?: boolean }[] = [
  { key: 'home' },
  { key: 'lessons' },
  { key: 'arena', live: true },
  { key: 'friends' },
  { key: 'settings' },
]

function StubScreen({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, height: '70%', padding: 24 }}>
      <span style={{ fontSize: 56 }}>{emoji}</span>
      <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, color: T.text }}>{title}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: T.ghost, textAlign: 'center' }}>Этот экран вне прототипа</span>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('arena')
  const [tab, setTab] = useState<TabKey>('arena')
  const [round, setRound] = useState(0)
  const [scores, setScores] = useState<number[]>(Array(16).fill(0))
  const [demoState, setDemoState] = useState<DemoState | null>(null)

  // Прямой вход по hash (#s=<id>) — для галереи и скриншотов
  useEffect(() => {
    const s = readHashState()
    if (s) {
      setDemoState(s)
      setTab('arena')
      setScreen(s.screen)
      if (s.preset?.scores) setScores(s.preset.scores as number[])
      if (typeof s.preset?.round === 'number') setRound(s.preset.round as number)
    }
  }, [])

  const pickState = useCallback((s: DemoState) => {
    setDemoState(s)
    setTab('arena')
    if (s.preset?.scores) setScores(s.preset.scores as number[])
    if (typeof s.preset?.round === 'number') setRound(s.preset.round as number)
    setScreen(s.screen)
    window.location.hash = `s=${s.id}`
  }, [])

  const clearDemo = useCallback(() => {
    setDemoState(null)
    window.location.hash = ''
  }, [])

  const startTournament = useCallback(() => {
    clearDemo()
    setScores(Array(16).fill(0))
    setRound(0)
    setTab('arena')
    setScreen('lobby')
  }, [clearDemo])

  const handleRoundEnd = useCallback((youGain: number[], others: number[]) => {
    setScores((prev) => prev.map((s, i) => s + (i === 0 ? youGain[0] : (others[i - 1] ?? 0))))
    setScreen('table')
  }, [])

  const handleTableNext = useCallback(() => {
    if (round >= 3) setScreen('results')
    else { setRound((r) => r + 1); setScreen('roundintro') }
  }, [round])

  const goTab = (key: TabKey) => {
    clearDemo()
    setTab(key)
    setScreen(key === 'arena' ? 'arena' : 'stub')
  }

  const stubs: Record<TabKey, [string, string]> = {
    home: ['⌂', 'Главная'],
    lessons: ['📖', 'Уроки'],
    arena: ['', ''],
    friends: ['👥', 'Друзья'],
    settings: ['⚙️', 'Настройки'],
  }

  const preset = demoState?.preset ?? {}

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 0', background: '#010201', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', width: 560, height: 560, borderRadius: '50%', background: '#0d2b18', filter: 'blur(150px)', opacity: 0.4, top: -180, left: -160, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', width: 440, height: 440, borderRadius: '50%', background: '#241d05', filter: 'blur(150px)', opacity: 0.35, bottom: -180, right: -140, pointerEvents: 'none' }} />

      <div className="desktop-note" style={{ position: 'fixed', left: 44, top: '50%', transform: 'translateY(-50%)', maxWidth: 250, zIndex: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: T.accent }}>Phraseman · прототип</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, color: T.text, margin: '14px 0', lineHeight: 1.1 }}>Режим «Турниры»</h1>
        <p style={{ fontSize: 15, fontWeight: 500, color: T.muted, lineHeight: 1.6 }}>
          16 игроков · 4 раунда · живая таблица · подиум
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 22, fontSize: 14, fontWeight: 600, color: T.ghost }}>
          <span>🏆 Турниры — 3-я иконка в таббаре</span>
          <span>⚙ Кнопка на главной — все состояния</span>
          <span>⚡ Таблица — живые обгоны</span>
        </div>
      </div>
      <style>{`@media (max-width: 1100px) { .desktop-note { display: none } }`}</style>

      {/* Телефон */}
      <div style={{ position: 'relative', zIndex: 10, width: 'min(400px,100vw)', borderRadius: 48, background: '#000', padding: 11, boxShadow: '0 40px 90px rgba(0,0,0,.7), 0 0 0 1px #16241a' }}>
        <div style={{ position: 'relative', borderRadius: 38, overflow: 'hidden', background: T.bgGlow + ', ' + T.bg, height: 'min(810px, calc(100vh - 90px))', minHeight: 620, display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 112, height: 28, background: '#000', borderRadius: 20, zIndex: 30 }} />
          <div style={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 28px 4px', fontSize: 13, fontWeight: 600, color: T.text, position: 'relative', zIndex: 20 }}>
            <span>21:47</span>
            <span style={{ fontSize: 12 }}>📶 🔋</span>
          </div>

          {/* Контент */}
          <div className="phone-scroll" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={screen + round + tab + (demoState?.id ?? '')}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 0.9, 0.3, 1] }}
                style={{ minHeight: '100%' }}
              >
                {screen === 'arena' && <TournamentHome onEnter={startTournament} onOpenSeason={() => setScreen('season')} onOpenStates={() => setScreen('states')} demo={demoState ? preset : undefined} />}
                {screen === 'season' && <Season onBack={() => setScreen('arena')} demo={demoState ? preset : undefined} />}
                {screen === 'lobby' && <Lobby onStart={() => setScreen('roundintro')} demo={demoState ? preset : undefined} />}
                {screen === 'round' && <Round key={`r-${round}-${demoState?.id ?? 'flow'}`} round={round} scores={scores} onRoundEnd={handleRoundEnd} demo={demoState ? preset : undefined} />}
                {screen === 'table' && <Leaderboard key={`t-${round}-${demoState?.id ?? 'flow'}`} scores={scores} round={round + 1} isFinal={round >= 3} onNext={handleTableNext} demo={demoState ? preset : undefined} />}
                {screen === 'results' && <Results scores={scores} onHome={() => { clearDemo(); setScreen('arena') }} onOpenSeason={() => setScreen('season')} demo={demoState ? preset : undefined} />}
                {screen === 'cancel' && <Cancel onHome={() => { clearDemo(); setScreen('arena') }} />}
                {screen === 'roundintro' && <RoundIntro demo={demoState ? preset : { round: round + 1 }} onDone={demoState ? undefined : () => setScreen('round')} />}
                {screen === 'roundalt' && <RoundAlt demo={demoState ? preset : undefined} />}
                {screen === 'vip' && <VipEntry />}
                {screen === 'bank' && <BankScreen />}
                {screen === 'watch' && <WatchScreen demo={demoState ? preset : undefined} />}
                {screen === 'tickets' && <Tickets demo={demoState ? preset : undefined} />}
                {screen === 'sharecard' && <ShareCard demo={demoState ? preset : undefined} />}
                {screen === 'streak' && <StreakUnlock />}
                {screen === 'profile' && <ProfileScreen />}
                {screen === 'onboarding' && <Onboarding />}
                {screen === 'edges' && <EdgeStates demo={demoState ? preset : undefined} />}
                {screen === 'assets' && <AssetsGallery />}
                {screen === 'states' && <StatesIndex onPick={pickState} onBack={() => { clearDemo(); setScreen('arena') }} />}
                {screen === 'stub' && <StubScreen emoji={stubs[tab][0]} title={stubs[tab][1]} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Плавающая кнопка «все состояния» в демо-режиме */}
          {demoState && (
            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setScreen('states')}
              style={{
                position: 'absolute', right: 14, bottom: 76, zIndex: 45,
                height: 40, padding: '0 14px', borderRadius: 999, border: 'none',
                background: 'rgba(3,6,4,.92)', boxShadow: '0 4px 16px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                color: T.accent, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >⚙ {demoState.title}</motion.button>
          )}

          {/* Таббар: 4 иконки приложения + турнирный кубок в центре */}
          <div style={{ flexShrink: 0, height: 64, display: 'flex', justifyContent: 'space-around', alignItems: 'center', background: 'rgba(3,6,4,.92)', position: 'relative', zIndex: 20 }}>
            {TABS.map((t) => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => goTab(t.key)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', width: 56, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: active ? T.accent : 'rgba(138,180,154,.55)' }}
                >
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                      style={{ position: 'absolute', inset: 0, borderRadius: radius.sm, background: T.accentSoft }}
                    />
                  )}
                  <span style={{ position: 'relative', display: 'flex' }}>{TAB_ICONS[t.key]}</span>
                  {t.live && (
                    <motion.span
                      animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                      style={{ position: 'absolute', top: 4, right: 8, width: 8, height: 8, borderRadius: 999, background: T.danger, boxShadow: `0 0 6px ${T.danger}` }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
