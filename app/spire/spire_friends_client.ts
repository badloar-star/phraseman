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
import { countFreshFriendProfiles, FRIENDS_BATCH_LONG_TTL_MS, fetchFriendProfilesBatch } from '../friends_profiles_batch';
import { peekFriendsTabSwrWarm, startFriendsTabSwrPrime } from '../friends_tab_swr_warm';
import { spireGateStillOpen, type SpireLiveGate } from './spire_live_gate';
import { spireErrorText } from './spire_net';

const LOG = '[SPIRE]';
/** Больше чипов в ряду не помещается осмысленно; и пачка callable остаётся одной. */
const MAX_FRIENDS = 20;

/**
 * зачем (смета Firebase 13.10, п. 5; координатор): профили друзей для ряда живут в кэше 30 мин (было 5) — рейтинг друзей не меняется ежеминутно, а каждый вход
 * стоил 8 + 5 × F серверных чтений. `force` — ручное обновление потягиванием: идёт мимо кэша, и сбой вызова НЕ стирает ряд (возврат null = «оставь прежний»).
 */
export async function spireLoadFriendChips(
  gate: SpireLiveGate,
  input: Readonly<{ myUid: string; lang: SpireLang }>,
  options: Readonly<{ force?: boolean }> = {},
): Promise<readonly SpireFriendChip[] | null> {
  try {
    await startFriendsTabSwrPrime();
    const warm = peekFriendsTabSwrWarm();
    if (!warm || warm.canonicalUid !== input.myUid) {
      DebugLogger.info(LOG, `friends: снимка друзей нет (warm=${warm ? 'чужой uid' : 'нет'}) — ${options.force ? 'ручное обновление, прежний ряд остаётся' : 'ряд скрыт'}`);
      return options.force ? null : [];
    }
    const uids = warm.friends.map((f) => f.uid).filter(Boolean).slice(0, MAX_FRIENDS);
    if (uids.length === 0) {
      DebugLogger.info(LOG, 'friends: друзей нет — ряд скрыт, 0 вызовов');
      return [];
    }
    if (!spireGateStillOpen(gate, 'friends')) return options.force ? null : [];
    const freshBefore = countFreshFriendProfiles(uids, FRIENDS_BATCH_LONG_TTL_MS);
    const startedAt = Date.now();
    const profiles = await fetchFriendProfilesBatch(uids, { force: options.force === true, maxAgeMs: FRIENDS_BATCH_LONG_TTL_MS });
    const resolved = uids.filter((uid) => profiles[uid]).length;
    DebugLogger.info(LOG, `friends: источник=${options.force ? 'сеть (ручное обновление)' : freshBefore === uids.length ? 'кэш 30 мин' : `сеть (в кэше свежих ${freshBefore} из ${uids.length})`} профилей получено ${resolved} из ${uids.length}, ${Date.now() - startedAt} мс`);
    if (options.force && resolved === 0) {
      DebugLogger.warn(LOG, `friends: ручное обновление не дало ни одного профиля из ${uids.length} — оставляю прежний ряд`);
      return null;
    }
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
    DebugLogger.warn(LOG, `friends: не загрузились (${spireErrorText(error)}) — ${options.force ? 'ручное обновление, прежний ряд остаётся' : 'ряд скрыт'}`);
    return options.force ? null : [];
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
