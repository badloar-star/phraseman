/**
 * Закрытый рангом раздел — БЕЗ экрана-заглушки.
 *
 * зачем (СЛОВО ВЛАДЕЛЬЦА 05.11, через координатора, дословно): «ЗАКРЫТЫЙ РАЗДЕЛ НЕЛЬЗЯ ОТКРЫТЬ, ЕСЛИ РАНГ ЕЩЁ НЕ ОТКРЫТ — ТАКОГО РАЗДЕЛА ПРОСТО НЕТ, ПОКА НЕ ОТКРЫТ РАНГ; экран-заглушку
 * «Откроется на ранге N» вообще не добавлять». Раньше здесь был экран «Откроется с ранга N / К занятиям / Открыть все с Plus» (владелец 30.10) — убран целиком. Теперь маршрут закрытого раздела
 * (deep link, старый ярлык, вкладка) тихо возвращает на Главную; человек не видит ни заголовка, ни кнопок. Plus по-прежнему открывает всё (decideForUser не возвращает 'locked' при Plus).
 * Вход в раздел на самой Главной/вкладках/«Сегодня» не рисуется вовсе (hooks/use_rank_access + home.tsx). Лог: [RANK-GATE] closed_route_redirect.
 */
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import type { RankAccessSurface } from '../../../shared/rank_access_contract';

type Props = Readonly<{ surface: RankAccessSurface; minimumRank: number }>;

export default function RankLockedSection({ surface, minimumRank }: Props) {
  const router = useRouter();
  const doneRef = useRef(false);
  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    console.log('[RANK-GATE] closed_route_redirect', JSON.stringify({ surface, minimumRank, to: '/(tabs)/home' })); // guard-ok: тихий возврат закрытого маршрута на Главную
    try {
      router.replace('/(tabs)/home' as never);
    } catch (error: unknown) {
      console.warn('[RANK-GATE] closed_route_redirect_failed', JSON.stringify({ surface, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    }
  }, [surface, minimumRank, router]);
  return null;
}
