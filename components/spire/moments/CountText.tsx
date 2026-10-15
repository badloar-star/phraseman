// CountText.tsx — число, которое «досчитывается» до цели (монеты за этаж, время шага).
// зачем (координатор 15.10, аудит скорости окон моментов): раньше счётчик жил в состоянии родителя (setInterval 40 мс -> setState) и перерисовывал целое окно ~25 раз/с;
// теперь интервал и состояние живут здесь, перерисовывается только это число. Кривая прежняя: 1 - (1 - t)^3. reduceMotion — сразу финальное число.
import React, { memo, useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

export type CountTextProps = Readonly<{
  to: number;
  /** Через сколько мс после показа начать счёт (как метка сценария в родителе). */
  delayMs: number;
  durationMs: number;
  reduceMotion: boolean;
  format: (value: number) => string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}>;

const TICK_MS = 40;

function CountText({ to, delayMs, durationMs, reduceMotion, format, style, testID }: CountTextProps) {
  const [value, setValue] = useState(reduceMotion ? to : 0);
  useEffect(() => {
    if (reduceMotion) { setValue(to); return undefined; }
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      const started = Date.now();
      interval = setInterval(() => {
        const t = Math.min(1, (Date.now() - started) / durationMs);
        const next = Math.round(to * (1 - Math.pow(1 - t, 3)));
        setValue((prev) => (prev === next ? prev : next)); // то же число — без перерисовки
        if (t >= 1 && interval) { clearInterval(interval); interval = null; }
      }, TICK_MS);
    }, delayMs);
    return () => { clearTimeout(start); if (interval) clearInterval(interval); };
  }, [to, delayMs, durationMs, reduceMotion]);
  return <Text style={style} testID={testID}>{format(value)}</Text>;
}

export default memo(CountText);
