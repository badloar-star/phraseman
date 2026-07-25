import { motion } from 'framer-motion'
import { Cta, ShardBurst, appear } from '../components/ui'
import { T, YOU } from '../data/players'

export default function StreakUnlock() {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, padding: '48px 20px 120px', minHeight: '92%', background: 'rgba(3,6,4,.6)' }}>
      <ShardBurst count={22} />
      {/* огненная рамка */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
        style={{ position: 'relative', marginTop: 12 }}
      >
        <motion.div
          animate={{ boxShadow: [`0 0 0 5px ${T.streak}, 0 0 30px ${T.streak}66`, `0 0 0 7px #FF6B35, 0 0 50px #FF6B3588`, `0 0 0 5px ${T.streak}, 0 0 30px ${T.streak}66`] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          style={{ width: 130, height: 130, borderRadius: 44, background: T.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}
        >{YOU.emoji}</motion.div>
        {['🔥', '🔥', '🔥'].map((f, i) => (
          <motion.span key={i}
            animate={{ y: [0, -8, 0], scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1 + i * 0.2, repeat: Infinity, delay: i * 0.15 }}
            style={{ position: 'absolute', fontSize: 30, top: -18, left: 14 + i * 38 }}>{f}</motion.span>
        ))}
      </motion.div>

      <motion.div {...appear(0.2)} style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1.4, color: T.text }}>Серия 3 🔥!</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.streak, marginTop: 8 }}>Огненная рамка открыта</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, marginTop: 6 }}>теперь аватар горит в каждом лобби · ещё 2 победы до 5 🔥</div>
      </motion.div>

      <motion.div {...appear(0.3)} style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35 + i * 0.1, type: 'spring', stiffness: 300, damping: 12 }}
            style={{
              width: 44, height: 44, borderRadius: 999, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i <= 3 ? 'rgba(251,146,60,.2)' : T.card,
              boxShadow: i <= 3 ? `inset 0 0 0 2px ${T.streak}55` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              filter: i <= 3 ? 'none' : 'grayscale(1) opacity(.4)',
            }}>🔥</motion.span>
        ))}
      </motion.div>

      <motion.div {...appear(0.5)} style={{ width: '100%' }}><Cta>Дальше</Cta></motion.div>
    </div>
  )
}
