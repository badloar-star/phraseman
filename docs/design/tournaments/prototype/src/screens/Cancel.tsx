import { motion } from 'framer-motion'
import { Card, Cta, appear } from '../components/ui'
import { T, radius } from '../data/players'

export default function Cancel({ onHome }: { onHome: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 16px 120px' }}>
      <motion.div {...appear(0)} style={{ textAlign: 'center', paddingTop: 32 }}>
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          style={{ fontSize: 72 }}
        >😴</motion.div>
        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, color: T.text, marginTop: 16 }}>Турнир отменён</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.muted, marginTop: 8, lineHeight: 1.5 }}>
          Не набралось игроков.<br />Ничего страшного — следующий совсем скоро!
        </div>
      </motion.div>

      <motion.div {...appear(0.12)}>
        <Card tone="accent" pad={20}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 48, height: 48, borderRadius: radius.md, background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎟</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Билет возвращён</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>уже на вашем балансе</div>
              </div>
              <span style={{ fontSize: 22, fontWeight: 900, color: T.accent }}>+1</span>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 48, height: 48, borderRadius: radius.md, background: T.goldSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💎</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Компенсация</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>за ожидание</div>
              </div>
              <span style={{ fontSize: 22, fontWeight: 900, color: T.gold }}>+3</span>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div {...appear(0.2)}>
        <Card pad={18}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 26 }}>⏰</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Следующий в 21:00</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.muted }}>напомним за 5 минут до старта</div>
            </div>
          </div>
        </Card>
      </motion.div>

      <Cta onClick={onHome}>На главную</Cta>
    </div>
  )
}
