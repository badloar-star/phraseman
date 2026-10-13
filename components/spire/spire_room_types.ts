// ═══════════════════════════════════════════════════════════════════════════
// spire_room_types.ts — формы данных для «Друзья на этой неделе», пьедестала и
// «Всех участников» (пакет C). Источник данных — пакет B (клиент комнаты недели):
// до него экран передаёт пустой список/null и рисует «—».
// ═══════════════════════════════════════════════════════════════════════════

/** Участник комнаты недели. coinRank — ранг монеты из документа комнаты (13.10); нет — null → базовая монета. */
export type SpireMemberRow = Readonly<{
  uid: string;
  name: string;
  steps: number;
  isMe: boolean;
  coinRank?: number | null;
  /** D162: монеты недели (показ при rankBy='coins'); нет — 0. */
  weekCoins?: number;
}>;

/** D162: чем ранжирована комната на экране — тот же рубильник, что у итога недели. */
export type SpireRankByView = 'steps' | 'coins';

/** D162: порядок пьедестала и «Всех участников» — монеты недели при 'coins' (ничья — ступени), иначе ступени. */
export function spireSortMembers(members: readonly SpireMemberRow[], rankBy: SpireRankByView = 'steps'): SpireMemberRow[] {
  return [...members].sort((a, b) => {
    if (rankBy === 'coins' && (b.weekCoins ?? 0) !== (a.weekCoins ?? 0)) return (b.weekCoins ?? 0) - (a.weekCoins ?? 0);
    return b.steps - a.steps;
  });
}

/** D162: «играл на неделе» для зон — монеты > 0 при 'coins', ступени > 0 при 'steps' (как у сервера). */
export function spireMemberScored(m: SpireMemberRow, rankBy: SpireRankByView = 'steps'): boolean {
  return rankBy === 'coins' ? (m.weekCoins ?? 0) > 0 : m.steps > 0;
}

/**
 * Друг с неделей Шпиля. tier — индекс камня 0..11. ВАЖНО: friends_profiles.spireFloor
 * на сервере = tier + 1 (камень), а НЕ этаж башни 1..15, поэтому подпись чипа — имя
 * камня, а не «N этаж». Перевод: tier = spireFloor - 1.
 */
export type SpireFriendChip = Readonly<{
  uid: string;
  name: string;
  coinRank: number | null;
  tier: number | null;
}>;

export type SpireZones = Readonly<{ up: number; down: number }>;
