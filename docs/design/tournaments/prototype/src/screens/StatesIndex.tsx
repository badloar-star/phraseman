import { motion } from 'framer-motion'
import { Card, appear } from '../components/ui'
import { T } from '../data/players'
import { STATES, type DemoState } from '../states'

const GROUPS = ['Главная', 'Лобби', 'Раунд', 'Раунд: интро и режимы', 'Таблица', 'Результаты', 'Сезон', 'VIP и банк', 'Билеты', 'Шеринг и серия', 'Профиль и онбординг', 'Сервисные состояния', 'Прочее', 'Ассеты']

export default function StatesIndex({ onPick, onBack }: { onPick: (s: DemoState) => void; onBack: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '8px 16px 120px' }}>
      <motion.div {...appear(0)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ width: 44, height: 44, borderRadius: 16, border: 'none', background: T.card, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.045)', color: T.text, fontSize: 20, cursor: 'pointer' }}>‹</button>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, color: T.text }}>Состояния</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ghost }}>{STATES.length} макетов · тап — открыть</div>
        </div>
      </motion.div>

      {GROUPS.map((g, gi) => {
        const items = STATES.filter((s) => s.group === g)
        if (!items.length) return null
        return (
          <motion.div key={g} {...appear(0.05 + gi * 0.03)}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: T.ghost, margin: '0 4px 8px' }}>{g}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((s) => (
                <Card key={s.id} onClick={() => onPick(s)} pad={16}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>{s.title}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, marginTop: 2 }}>{s.sub}</div>
                    </div>
                    <span style={{ fontSize: 20, color: T.ghost }}>›</span>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
