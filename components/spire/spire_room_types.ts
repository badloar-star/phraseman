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
}>;

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
