// use_spire_room_ceiling.ts — потолок скелета подиума «Комната недели» на вкладке «Пик» и журнал [PIK-LOAD].
//
// зачем (Сверка 18.10 находка 13, кадр modals_1018/walk/05_light_pik.png: гость, светлая тема — белые силуэты пьедестала, «Комната
// недели —», «Играть» неактивна без объяснения): скелет подиума держится, пока game.roomLoad === null. Хук игры ставит комнату
// только если есть идентичность и синхронизация ответила — без идентичности, при исключении или молчании сети скелет не снимался
// никогда. Правило владельца: скелет не дольше ~2,5 с, дальше спокойное состояние (пустой подиум и подпись под «Играть»), поздний
// ответ сети тихо подставит комнату. Таймер живёт здесь, а не в use_spire_game: там свой сторож (звуки без пауз, ≤ 400 строк).
import { useEffect, useState } from 'react';

import type { SpireRoomLoad } from '../../app/spire/spire_room_client';

/** Потолок скелета подиума: дальше — спокойное пустое состояние; загрузка комнаты продолжается фоном. */
export const SPIRE_ROOM_SKELETON_CEILING_MS = 2500;

/** Журнал загрузки Пика [PIK-LOAD]: этапы, флаги, числа, время — без uid и имён. */
export function logPikLoad(stage: string, detail: Readonly<Record<string, unknown>> = {}): void {
  console.log('[PIK-LOAD]', JSON.stringify({ stage, ...detail })); // guard-ok: этапы загрузки Пика, без идентификаторов
}

/**
 * Прошёл ли потолок ожидания комнаты. Отсчёт идёт, пока экран «живой» (ворота открыты) и комнаты нет; пришла комната — сброс.
 * key — смена языка/владельца начинает отсчёт заново.
 */
export function useSpireRoomCeiling(input: Readonly<{ live: boolean; roomLoad: SpireRoomLoad | null; hasRows: boolean; key: string }>): boolean {
  const { live, roomLoad, hasRows, key } = input;
  const waiting = live && roomLoad === null && !hasRows;
  const [passed, setPassed] = useState(false);
  useEffect(() => {
    setPassed(false);
    if (!waiting) {
      logPikLoad('room:state', { live, status: roomLoad?.status ?? null, reason: roomLoad?.reason ?? null, members: roomLoad?.room?.members.length ?? null, hasRows });
      return undefined;
    }
    const startedAt = Date.now();
    logPikLoad('room:waiting', { ceilingMs: SPIRE_ROOM_SKELETON_CEILING_MS });
    const timer = setTimeout(() => {
      logPikLoad('room:ceiling', { waitedMs: Date.now() - startedAt, shown: 'calm_empty', note: 'no_tier' });
      setPassed(true);
    }, SPIRE_ROOM_SKELETON_CEILING_MS);
    return () => clearTimeout(timer);
  }, [waiting, key, live, roomLoad, hasRows]);
  return passed;
}
