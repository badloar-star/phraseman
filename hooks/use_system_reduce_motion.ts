import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * «Уменьшить движение» из системных настроек — напрямую из AccessibilityInfo, без app-хуков.
 * зачем: hooks/use_reduce_motion тянет логгер → firebase → конфиг (Platform) и ломает тесты, которые импортируют
 * компонент с урезанным react-native; общие кит-примитивы (KitProgressFill, KitTouchable) читают настройку отсюда.
 */
export function useSystemReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    const info = AccessibilityInfo;
    if (!info?.isReduceMotionEnabled) return undefined;
    info.isReduceMotionEnabled()
      .then((value) => { if (alive) setReduce(Boolean(value)); })
      .catch((error: unknown) => {
        console.warn('[KIT-REDUCE-MOTION] не удалось прочитать «уменьшить движение», остаётся анимация', error instanceof Error ? error.message : String(error));
      });
    const subscription = info.addEventListener?.('reduceMotionChanged', (value: boolean) => { if (alive) setReduce(Boolean(value)); });
    return () => { alive = false; subscription?.remove?.(); };
  }, []);
  return reduce;
}
