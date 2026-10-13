// ═══════════════════════════════════════════════════════════════════════════
// use_spire_friends_refresh.ts — ручное обновление ряда «Друзья на этой неделе» (потянуть экран Шпиля).
//
// зачем (смета Firebase 13.10, п. 5; координатор): профили друзей живут в кэше 30 мин, обновить их раньше можно вручную. Идёт мимо кэша; повторное потягивание
// во время загрузки игнорируется (один вызов, а не пачка); сбой не стирает ряд (spireLoadFriendChips вернёт null); смена числа чипов — плавным переходом.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useRef } from 'react';
import type { SpireLang } from '../../modules/spire/report_queue';
import type { SpireFriendChip } from '../../components/spire/spire_room_types';
import { DebugLogger } from '../debug-logger';
import { animateNextLayoutTransition } from '../smooth_layout';
import { spireLoadFriendChips } from './spire_friends_client';
import type { SpireLiveGate } from './spire_live_gate';

const LOG = '[SPIRE]';

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
