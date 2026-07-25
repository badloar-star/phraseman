import { motion } from 'framer-motion'
import { Card, Cta, appear } from '../components/ui'
import { TimeLeft } from '../components/TimeLeft'
import { T } from '../data/players'

export default function VipEntry() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 16px 120px' }}>
      {/* hero */}
      <motion.div {...appear(0)}>
        <Card tone="gold" pad={30} style={{ textAlign: 'center' }}>
          <motion.div animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }} style={{ fontSize: 72, lineHeight: 1 }}>👑</motion.div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: T.gold, marginTop: 14 }}>VIP-турнир · воскресенье</div>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1.4, color: T.text, marginTop: 6 }}>Большой банк</div>
          <motion.div
            animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 2.2, repeat: Infinity }}
            style={{ fontSize: 64, fontWeight: 900, letterSpacing: -2.5, color: T.gold, marginTop: 10, textShadow: '0 0 30px rgba(255,200,0,.35)', fontVariantNumeric: 'tabular-nums' }}
          >2 480 💎</motion.div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.muted }}>банк недели · растёт от каждого турнира</div>
        </Card>
      </motion.div>

      {/* цена входа */}
      <motion.div {...appear(0.12)}>
        <Card pad={20}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 64, height: 80, borderRadius: 14, background: 'linear-gradient(160deg, #3a2f08, #241d05)',
                boxShadow: 'inset 0 1.5px 0 rgba(255,212,59,.35), 0 8px 20px rgba(0,0,0,.4)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              }}>
              <span style={{ fontSize: 24 }}>🎟</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: T.gold, letterSpacing: 1 }}>VIP</span>
            </motion.div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.text }}>Вход · 5 билетов</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.muted, marginTop: 3 }}>У вас 3 🎟 · не хватает 2</div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* что внутри */}
      <motion.div {...appear(0.2)}>
        <Card pad={20}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            {[['🏆', '50% банка', 'победителю'], ['⚡', '×2 очки', 'весь турнир'], ['🎖', 'Титул', '«VIP недели»']].map(([e, a, b]) => (
              <div key={b}>
                <div style={{ fontSize: 26 }}>{e}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginTop: 4 }}>{a}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.ghost }}>{b}</div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div {...appear(0.28)}><Cta gold>Играть за 5 🎟</Cta></motion.div>
      <motion.div {...appear(0.33)}><Cta ghost>Добрать билеты за 40 💎</Cta></motion.div>
      <motion.div {...appear(0.38)} style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: T.muted }}>
        До старта <TimeLeft seconds={2 * 86400 + 5 * 3600 + 12 * 60} size={16} />
      </motion.div>
    </div>
  )
}
