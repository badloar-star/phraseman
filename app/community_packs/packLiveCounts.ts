/**
 * Живые счётчики набора (♥ лайки, 👥 добавили, 💬 отклики) поверх значений каталога.
 *
 * зачем (жалоба владельца «плитка отстаёт до перезахода»; ревью 11.10, п.2): лайк/отклик ставятся на экране набора,
 * а строка каталога живёт снимком каталога (кэш до 6 ч). Раньше это чинил CommunityPackSocialBar в каждой строке;
 * строка теперь — общий PackRow, поэтому сдвиг держит хаб: события `community_pack_like_changed`,
 * `community_pack_comments_changed`, `community_pack_added` и «+» на плашке складываются в СДВИГ, который
 * накладывается поверх значения каталога. Пришло новое значение каталога (сервер уже учёл действие) — сдвиг
 * отбрасывается, двойного счёта нет. Без сети и без чтений Firestore.
 */
export type PackCounts = Readonly<{ likes: number; added: number; comments: number }>;

type OverlayEntry = Readonly<{ base: PackCounts; delta: PackCounts }>;

export type PackCountsOverlay = Readonly<Record<string, OverlayEntry>>;

export const EMPTY_PACK_COUNTS_OVERLAY: PackCountsOverlay = Object.freeze({});

const ZERO: PackCounts = { likes: 0, added: 0, comments: 0 };

export function packBaseCounts(pack: Readonly<{ likesCount?: number; addedCount?: number; commentsCount?: number }>): PackCounts {
  return {
    likes: Math.max(0, pack.likesCount ?? 0),
    added: Math.max(0, pack.addedCount ?? 0),
    comments: Math.max(0, pack.commentsCount ?? 0),
  };
}

function sameCounts(a: PackCounts, b: PackCounts): boolean {
  return a.likes === b.likes && a.added === b.added && a.comments === b.comments;
}

/** Добавить сдвиг к набору. Если значение каталога сменилось — старый сдвиг уже учтён сервером и начинается с нуля. */
export function bumpPackCounts(
  overlay: PackCountsOverlay,
  packId: string,
  base: PackCounts,
  delta: Partial<PackCounts>,
): PackCountsOverlay {
  const prev = overlay[packId];
  const from = prev && sameCounts(prev.base, base) ? prev.delta : ZERO;
  const next: PackCounts = {
    likes: from.likes + (delta.likes ?? 0),
    added: from.added + (delta.added ?? 0),
    comments: from.comments + (delta.comments ?? 0),
  };
  return { ...overlay, [packId]: { base, delta: next } };
}

/** Что показать: значение каталога + сдвиг (если каталог с тех пор не обновился), не ниже нуля. */
export function livePackCounts(overlay: PackCountsOverlay, packId: string, base: PackCounts): PackCounts {
  const entry = overlay[packId];
  if (!entry || !sameCounts(entry.base, base)) return base;
  return {
    likes: Math.max(0, base.likes + entry.delta.likes),
    added: Math.max(0, base.added + entry.delta.added),
    comments: Math.max(0, base.comments + entry.delta.comments),
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
