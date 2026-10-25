// lessons_coin_pill_fallback.ts — число на пилюле монет «Обучения» без пустого кадра.
// зачем (Сверка 25.10, [COIN-PILL] lessons shown «—» trusted:false hydrated:false на холодном старте; правило владельца «без пустых
// кадров»): пока привязка баланса и ранга не подтверждена, пилюля показывает последнее известное число из общего показа Ядра
// (peekDisplayedRunes — снимок + ожидающие Пика), а после гидратации — подтверждённое значение того же источника, без скачка.
// «—» остаётся только когда снимка прогресса нет вовсе (первый запуск): выдумывать 0 нельзя.
import { useEffect, useState } from 'react';
import { getAppSnapshot } from './app_snapshot_store';
import { peekDisplayedRunes, subscribeDisplayedRunes } from './runes_system';

/** Последнее показанное число монет из кэша; null — снимка прогресса ещё нет. */
export function peekLessonsCoinPillFallbackV1(): number | null {
  return getAppSnapshot().progress ? peekDisplayedRunes() : null;
}

/** Значение пилюли: подтверждённое, а до него — кэш общего показа (с подпиской на его изменения). */
export function useLessonsCoinPillValueV1(trusted: number | null): Readonly<{ value: number | null; source: 'trusted' | 'cache' | 'none' }> {
  const [cached, setCached] = useState<number | null>(peekLessonsCoinPillFallbackV1);
  useEffect(() => {
    if (trusted !== null) return undefined;
    setCached(peekLessonsCoinPillFallbackV1());
    return subscribeDisplayedRunes(() => setCached(peekLessonsCoinPillFallbackV1()));
  }, [trusted]);
  if (trusted !== null) return { value: trusted, source: 'trusted' };
  return { value: cached, source: cached === null ? 'none' : 'cache' };
}

export default function __RouteShim() { return null; }
