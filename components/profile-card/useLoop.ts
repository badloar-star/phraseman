// ─── Бесконечная анимация визитки на UI-потоке ─────────────────────────────
// зачем: все живые детали визитки (вращение фольги, орбиты, дрейф пятен, покачивание
// монеты) — только transform/opacity через reanimated, как требует макет
// («анимации только transform/opacity, невидимые визитки на паузе»). Выключено
// (enabled=false: уменьшение движения, превью-плитка, визитка закрыта) — значение
// стоит на месте, цикл не крутится и не ест кадры.
import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export type LoopOptions = Readonly<{
  /** true — туда-обратно (как animation-direction: alternate / ease-in-out 0→50→100%). */
  yoyo?: boolean;
  delayMs?: number;
  linear?: boolean;
  /** Кадр, в котором замирает выключенный цикл (0..1). */
  restAt?: number;
}>;

export function useLoop(durationMs: number, enabled: boolean, options: LoopOptions = {}): SharedValue<number> {
  const { yoyo = false, delayMs = 0, linear = false, restAt = 0 } = options;
  const progress = useSharedValue(restAt);
  useEffect(() => {
    if (!enabled) {
      cancelAnimation(progress);
      progress.value = restAt;
      return undefined;
    }
    progress.value = 0;
    const timing = withTiming(1, {
      duration: yoyo ? durationMs / 2 : durationMs,
      easing: linear ? Easing.linear : Easing.inOut(Easing.sin),
    });
    progress.value = withDelay(delayMs, withRepeat(timing, -1, yoyo));
    return () => cancelAnimation(progress);
  }, [delayMs, durationMs, enabled, linear, progress, restAt, yoyo]);
  return progress;
}
