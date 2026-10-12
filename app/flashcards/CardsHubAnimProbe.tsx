// зачем (координатор 12.10, «сперва логи»): измерить, сколько кадров в секунду реально даёт «парение» стопки хаба Карточек и останавливается ли оно.
// Только dev: хаб рисует этот компонент лишь при __DEV__ (в сторе его нет). Считает обновления значения анимации на UI-потоке (useAnimatedReaction) и раз в 5 с пишет итог.
import { useEffect } from 'react';
import { useAnimatedReaction, useSharedValue, type SharedValue } from 'react-native-reanimated';

const WINDOW_MS = 5000;
const DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const log = (message: string): void => { if (DEV) console.log(message); };

export function CardsHubAnimProbe({ float, active, halfCycles }: Readonly<{ float: SharedValue<number>; active: boolean; halfCycles: number }>) {
  const ticks = useSharedValue(0);
  useAnimatedReaction(
    () => float.value,
    (current, previous) => {
      if (current !== previous) ticks.value = ticks.value + 1;
    },
  );
  useEffect(() => {
    if (!active) {
      log('[CARDS-HUB-ANIM] анимация выключена (экран не в фокусе, приложение в фоне или «уменьшить движение»)');
      return undefined;
    }
    const startedAt = Date.now();
    let last = ticks.value;
    log(`[CARDS-HUB-ANIM] старт: качаний=${halfCycles / 2} (полуциклов ${halfCycles}, по 5 с); дальше стоит на нуле`);
    const timer = setInterval(() => {
      const now = ticks.value;
      const delta = now - last;
      last = now;
      log(`[CARDS-HUB-ANIM] за ${WINDOW_MS / 1000} с: обновлений анимации=${delta} (${Math.round(delta / (WINDOW_MS / 1000))} к/с), значение=${float.value.toFixed(2)}, с начала=${Date.now() - startedAt} мс`);
    }, WINDOW_MS);
    return () => {
      clearInterval(timer);
      log(`[CARDS-HUB-ANIM] стоп: экран ушёл из фокуса или размонтирован, работала ${Date.now() - startedAt} мс`);
    };
  }, [active, float, halfCycles, ticks]);
  return null;
}

export default CardsHubAnimProbe;
