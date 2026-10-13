// зачем (координатор 12.10, «сперва логи»): измерить, сколько кадров в секунду реально даёт «парение» стопки хаба Карточек и останавливается ли оно.
// Только dev: хаб рисует этот компонент лишь при __DEV__ (в сторе его нет). Считает обновления значения анимации на UI-потоке (useAnimatedReaction) и раз в 5 с пишет итог.
import { useEffect } from 'react';
import { useAnimatedReaction, useSharedValue, type SharedValue } from 'react-native-reanimated';

const WINDOW_MS = 5000;
const DEV = typeof __DEV__ !== 'undefined' && __DEV__;
const log = (message: string): void => { if (DEV) console.log(message); };

export function CardsHubAnimProbe({ float, active }: Readonly<{ float: SharedValue<number>; active: boolean }>) {
  const ticks = useSharedValue(0);
  useAnimatedReaction(
    () => float.value,
    (current, previous) => {
      if (current !== previous) ticks.value = ticks.value + 1;
    },
  );
  useEffect(() => {
    if (!active) {
      log('[CARDS-HUB-ANIM] анимация выключена (экран не в фокусе, приложение в фоне, «уменьшить движение» или dev animations=off)'); // i18n-ok: лог трассировки анимации хаба, на экран не выводится
      return undefined;
    }
    const startedAt = Date.now();
    let last = ticks.value;
    log('[CARDS-HUB-ANIM] старт: бесконечное парение (по приказу владельца 11.10), пока экран в фокусе и приложение активно'); // i18n-ok: лог трассировки анимации хаба, на экран не выводится
    const timer = setInterval(() => {
      const now = ticks.value;
      const delta = now - last;
      last = now;
      log(`[CARDS-HUB-ANIM] за ${WINDOW_MS / 1000} с: обновлений анимации=${delta} (${Math.round(delta / (WINDOW_MS / 1000))} к/с), значение=${float.value.toFixed(2)}, с начала=${Date.now() - startedAt} мс`); // i18n-ok: лог трассировки анимации хаба, на экран не выводится
    }, WINDOW_MS);
    return () => {
      clearInterval(timer);
      log(`[CARDS-HUB-ANIM] стоп: экран ушёл из фокуса или размонтирован, работала ${Date.now() - startedAt} мс`); // i18n-ok: лог трассировки анимации хаба, на экран не выводится
    };
  }, [active, float, ticks]);
  return null;
}

export default CardsHubAnimProbe;
