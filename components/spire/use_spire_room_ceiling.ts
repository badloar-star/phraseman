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
 * Трасса ветки отрисовки «Пика» [PIK-LOAD] render — какое значение решило, что показать (скелет экрана / замок / подиум-скелет / готово).
 * зачем (Макеты 18.10, кадр pik_guest_c2a45 через +4,3 с: всё ещё скелет, хотя room:first_frame 0,15 с и ready play=enabled 0,34 с —
 * правило «сперва логи»): пишет строку только когда меняется решение; inst отличает два смонтированных экземпляра экрана.
 */
export function useSpirePikRenderTrace(v: Readonly<{
  langLocked: boolean; configNull: boolean; unlocked: boolean; preview: boolean; live: boolean; roomLoad: SpireRoomLoad | null;
  members: number | null; tierNull: boolean; showAll: boolean; podiumSkeleton: boolean; ceilingPassed: boolean;
}>): void {
  const [inst] = useState(() => Math.random().toString(36).slice(2, 7));
  const paused = v.roomLoad?.status === 'paused' && !v.roomLoad.room;
  const branch = v.langLocked ? 'lang_lock' : v.configNull ? 'screen_skeleton(config=null)' : !v.unlocked ? 'locked(unlocked=false)'
    : paused ? 'locked(paused)' : v.showAll && v.members !== null ? 'all_members' : v.podiumSkeleton ? 'home+podium_skeleton' : 'home';
  const key = `${branch}|${v.preview}|${v.live}|${v.roomLoad?.status ?? 'null'}|${v.members}|${v.tierNull}|${v.ceilingPassed}`;
  useEffect(() => {
    logPikLoad('render', {
      inst, branch, preview: v.preview, configNull: v.configNull, unlocked: v.unlocked, live: v.live,
      roomStatus: v.roomLoad?.status ?? null, roomReason: v.roomLoad?.reason ?? null, members: v.members, tierNull: v.tierNull,
      podiumSkeleton: v.podiumSkeleton, ceilingPassed: v.ceilingPassed,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: строка журнала только при смене решения (key)
  }, [key]);
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
