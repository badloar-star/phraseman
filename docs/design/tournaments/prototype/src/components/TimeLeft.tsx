// Единый рендер отсчётов. Правила:
//  < 1 часа   → MM:SS          (04:21)
//  < 24 часов → H:MM:SS        (3:41:56)
//  24+ часов  → [3д] 14:32     (дни — отдельный бейдж, без наложений)
import { T, radius } from '../data/players'

const pad = (n: number) => String(n).padStart(2, '0')

export function TimeLeft({ seconds, size = 34, color = T.text, badge }: {
  seconds: number
  size?: number
  color?: string
  badge?: boolean
}) {
  const sec = Math.max(0, Math.floor(seconds))
  const days = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60

  const main = days > 0
    ? `${h}:${pad(m)}`
    : sec >= 3600
      ? `${h}:${pad(m)}:${pad(s)}`
      : `${pad(m)}:${pad(s)}`

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: Math.max(8, size * 0.2) }}>
      {days > 0 && (
        <span style={{
          fontSize: size * 0.42, fontWeight: 900, lineHeight: 1,
          color: badge === false ? color : T.muted,
          background: T.elev2, borderRadius: radius.sm,
          padding: `${size * 0.12}px ${size * 0.18}px`,
          transform: `translateY(${-size * 0.09}px)`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          {days}д
        </span>
      )}
      <span style={{
        fontSize: size, fontWeight: 900, letterSpacing: -size * 0.035, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums', color,
      }}>
        {main}
      </span>
    </span>
  )
}
