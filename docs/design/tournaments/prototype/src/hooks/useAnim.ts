import { useEffect, useRef, useState } from 'react'

/** Анимирует число от предыдущего значения к новому (rAF) */
export function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)
  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const e = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(from + (target - from) * e))
      if (p < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

/** Тикающий вверх счётчик (банк) */
export function useTickingCounter(start: number, stepMin = 2, stepMax = 9, everyMs = 2400) {
  const [v, setV] = useState(start)
  useEffect(() => {
    const id = setInterval(() => {
      setV((x) => x + Math.floor(stepMin + Math.random() * (stepMax - stepMin)))
    }, everyMs)
    return () => clearInterval(id)
  }, [stepMin, stepMax, everyMs])
  return v
}

/** Обратный отсчёт в секундах */
export function useCountdown(total: number, active = true, onDone?: () => void) {
  const [left, setLeft] = useState(total)
  const doneRef = useRef(false)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(id)
          if (!doneRef.current) {
            doneRef.current = true
            onDone?.()
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
  return left
}

export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
