import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Card } from '../components/ui'
import { T, radius } from '../data/players'

const MODES: Record<string, { icon: string; name: string }> = {
  mix: { icon: '🎲', name: 'Микс' },
  translate: { icon: '⚡', name: 'Перевод на скорость' },
  timeattack: { icon: '⏱', name: 'Тайм-атака' },
  voice: { icon: '🎙', name: 'Голосовой раунд' },
}

export default function RoundIntro({ demo, onDone }: { demo?: { round?: number; mode?: string }; onDone?: () => void }) {
  const round = demo?.round ?? 2
  const mode = MODES[demo?.mode ?? 'mix']
  const [n, setN] = useState(3)
  useEffect(() => {
    if (n <= 1) {
      if (onDone) {
        const go = setTimeout(onDone, 900)
        return () => clearTimeout(go)
      }
      return
    }
    const id = setTimeout(() => setN((v) => v - 1), 900)
    return () => clearTimeout(id)
  }, [n, onDone])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: '24px 20px 120px', minHeight: '92%' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{ width: '100%' }}
      >
        <Card tone="elev" pad={30} style={{ textAlign: 'center' }}>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: 64, lineHeight: 1 }}
          >{mode.icon}</motion.div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: T.accent, marginTop: 18 }}>Раунд {round}</div>
          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1, color: T.text, marginTop: 6 }}>{mode.name}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 18 }}>
            {[1, 2, 3, 4].map((i) => (
              <span key={i} style={{
                width: 34, height: 8, borderRadius: 999,
                background: i <= round ? T.accent : T.elev2,
                boxShadow: i <= round ? '0 0 8px rgba(71,200,112,.5)' : 'none',
              }} />
            ))}
          </div>
        </Card>
      </motion.div>

      {/* 3-2-1 */}
      <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.span
          key={n}
          initial={{ scale: 2.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 16 }}
          style={{
            fontSize: 96, fontWeight: 900, letterSpacing: -4, lineHeight: 1,
            color: n === 1 ? T.gold : T.text,
            textShadow: n === 1 ? '0 0 32px rgba(255,200,0,.5)' : 'none',
            fontVariantNumeric: 'tabular-nums',
          }}
        >{n}</motion.span>
      </div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        style={{ fontSize: 15, fontWeight: 700, color: T.ghost, background: T.card, padding: '10px 18px', borderRadius: radius.sm }}
      >Отвечай быстро — очки за скорость</motion.div>
    </div>
  )
}
