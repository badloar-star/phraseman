// ═══════════════════════════════════════════════════════════════════════════
// spire_friends_client.ts — «Друзья на этой неделе» (пакет B).
//
// зачем (TOWER.md §4.5, PM-282): поле spireFloor друга уже едет в том же батчевом
// callable friendsGetProfiles, которым пользуется вкладка «Друзья» (серверный кэш
// 60 с + модульный кэш 5 мин) — Шпиль не добавляет ни одного чтения на друга.
// Список друзей — из уже прогретого снимка вкладки (friends_tab_swr_v1).
//
// СЕМАНТИКА: friends_profiles.spireFloor = tier + 1 (номер КАМНЯ 1..12), а не
// этаж башни — поэтому чип подписывается именем камня (spire_room_types.ts).
// Друзья с другим языком Шпиля не показываются: у них другая башня.
// ═══════════════════════════════════════════════════════════════════════════
import type { SpireFriendChip } from '../../components/spire/spire_room_types';
import type { SpireLang } from '../../modules/spire/report_queue';
import { DebugLogger } from '../debug-logger';
import { fetchFriendProfilesBatch } from '../friends_profiles_batch';
import { peekFriendsTabSwrWarm, startFriendsTabSwrPrime } from '../friends_tab_swr_warm';
import { spireGateStillOpen, type SpireLiveGate } from './spire_live_gate';
import { spireErrorText } from './spire_net';

const LOG = '[SPIRE]';
/** Больше чипов в ряду не помещается осмысленно; и пачка callable остаётся одной. */
const MAX_FRIENDS = 20;

export async function spireLoadFriendChips(
  gate: SpireLiveGate,
  input: Readonly<{ myUid: string; lang: SpireLang }>,
): Promise<readonly SpireFriendChip[]> {
  try {
    await startFriendsTabSwrPrime();
    const warm = peekFriendsTabSwrWarm();
    if (!warm || warm.canonicalUid !== input.myUid) {
      DebugLogger.info(LOG, `friends: снимка друзей нет (warm=${warm ? 'чужой uid' : 'нет'}) — ряд скрыт`);
      return [];
    }
    const uids = warm.friends.map((f) => f.uid).filter(Boolean).slice(0, MAX_FRIENDS);
    if (uids.length === 0) {
      DebugLogger.info(LOG, 'friends: друзей нет — ряд скрыт, 0 вызовов');
      return [];
    }
    if (!spireGateStillOpen(gate, 'friends')) return [];
    const profiles = await fetchFriendProfilesBatch(uids);
    const chips: SpireFriendChip[] = [];
    for (const uid of uids) {
      const p = profiles[uid];
      if (!p || typeof p.spireFloor !== 'number' || p.spireFloor < 1 || p.spireLang !== input.lang) continue;
      chips.push({
        uid,
        name: p.displayName || warm.profiles[uid]?.name || '—',
        coinRank: typeof p.coinRank === 'number' ? p.coinRank : null,
        tier: Math.trunc(p.spireFloor) - 1,
      });
    }
    DebugLogger.info(LOG, `friends: друзей=${uids.length} в Шпиле ${input.lang} на этой неделе=${chips.length}`);
    return chips;
  } catch (error) {
    DebugLogger.warn(LOG, `friends: не загрузились (${spireErrorText(error)}) — ряд скрыт`);
    return [];
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
