// ═══════════════════════════════════════════════════════════════════════════
// use_spire_friends_refresh.ts — ручное обновление ряда «Друзья на этой неделе» (потянуть экран Шпиля).
//
// зачем (смета Firebase 13.10, п. 5; координатор): профили друзей живут в кэше 30 мин, обновить их раньше можно вручную. Идёт мимо кэша; повторное потягивание
// во время загрузки игнорируется (один вызов, а не пачка); сбой не стирает ряд (spireLoadFriendChips вернёт null); смена числа чипов — плавным переходом.
//
// зачем (Ревизор F02, координатор 15.10, R40): новый друг не появлялся в ряду до ручного потягивания. Теперь ряд следит за снимком друзей
// (app_snapshot_store; его обновляет вкладка «Друзья», в том числе оптимистично при принятии заявки): сменился НАБОР друзей → ряд
// перечитывается из кэша профилей (сеть — только за профилем нового друга). Серия правок склеивается в одно обновление.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef } from 'react';
import { getAppSnapshot, subscribeAppSnapshot } from '../app_snapshot_store';
import type { SpireLang } from '../../modules/spire/report_queue';
import type { SpireFriendChip } from '../../components/spire/spire_room_types';
import { DebugLogger } from '../debug-logger';
import { animateNextLayoutTransition } from '../smooth_layout';
import { spireLoadFriendChips } from './spire_friends_client';
import type { SpireLiveGate } from './spire_live_gate';

const LOG = '[SPIRE]';
const FOLLOW_DEBOUNCE_MS = 400;

/** Набор друзей владельца myUid из снимка (сортированный список uid) или null — снимка нет / он чужой. */
function friendSetKey(myUid: string): string | null {
  const snap = getAppSnapshot().friends;
  if (!snap || snap.canonicalUid !== myUid) return null;
  return snap.friends.map((f) => f.uid).filter(Boolean).sort().join(',');
}
const sizeOf = (key: string | null): number => (key ? key.split(',').length : 0);

type Input = Readonly<{
  gate: SpireLiveGate | null;
  ids: Readonly<{ uid: string; stableId: string }> | null;
  lang: SpireLang | null;
  friendsCount: number;
  setFriends: (chips: readonly SpireFriendChip[]) => void;
}>;

export function useSpireFriendsRefresh({ gate, ids, lang, friendsCount, setFriends }: Input): () => Promise<void> {
  const inFlightRef = useRef(false);
  const countRef = useRef(0);
  countRef.current = friendsCount;
  useEffect(() => {
    if (!gate || !ids || !lang) { DebugLogger.info(LOG, `friends: слежение выключено (gate=${gate ? 'есть' : 'нет'} ids=${ids ? 'есть' : 'нет'} lang=${lang ?? '—'})`); return undefined; }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastKey = friendSetKey(ids.uid); // текущий набор уже загрузил вход на экран — следим только за изменениями
    DebugLogger.info(LOG, `friends: слежу за набором друзей (сейчас ${lastKey === null ? 'снимка нет' : sizeOf(lastKey)})`);
    const unsubscribe = subscribeAppSnapshot(() => {
      const key = friendSetKey(ids.uid);
      if (key === null || key === lastKey) return;
      const before = lastKey;
      lastKey = key;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        DebugLogger.info(LOG, `friends: набор друзей изменился (было ${sizeOf(before)}, стало ${sizeOf(key)}) — обновляю ряд`);
        void spireLoadFriendChips(gate, { myUid: ids.uid, lang }).then((chips) => {
          if (!alive) { DebugLogger.info(LOG, 'friends: обновление пришло после ухода с экрана — не показываю'); return; }
          // без force загрузчик отвечает [] и на сбой — при непустом наборе это не «друзей нет», прежний ряд не стираем
          if (!chips || (chips.length === 0 && sizeOf(key) > 0)) { DebugLogger.info(LOG, `friends: обновление по смене набора не загрузилось (${chips ? 'пусто при непустом наборе' : 'null'}) — прежний ряд остаётся`); return; }
          if (chips.length !== countRef.current) animateNextLayoutTransition();
          setFriends(chips);
        });
      }, FOLLOW_DEBOUNCE_MS);
    });
    return () => { alive = false; unsubscribe(); if (timer) clearTimeout(timer); };
  }, [gate, ids, lang, setFriends]);
  return useCallback(async (): Promise<void> => {
    if (!gate || !ids || !lang) {
      DebugLogger.info(LOG, `friends: потягивание проигнорировано (gate=${gate ? 'есть' : 'нет'} ids=${ids ? 'есть' : 'нет'} lang=${lang ?? '—'})`);
      return;
    }
    if (inFlightRef.current) {
      DebugLogger.info(LOG, 'friends: потягивание проигнорировано — обновление уже идёт');
      return;
    }
    inFlightRef.current = true;
    try {
      const chips = await spireLoadFriendChips(gate, { myUid: ids.uid, lang }, { force: true });
      if (!chips) return;
      if (chips.length !== countRef.current) animateNextLayoutTransition();
      setFriends(chips);
    } finally {
      inFlightRef.current = false;
    }
  }, [gate, ids, lang, setFriends]);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
