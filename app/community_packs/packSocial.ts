/**
 * Cards 2.1 §2 — социальный слой наборов сообщества: счётчик добавлений и лайки активности.
 *
 * Модуль чистый (без Firestore / AsyncStorage / React) — вся арифметика счётчиков,
 * дедупликация, оптимистичные пересчёты и сортировка каталога тестируются юнитами.
 * Побочные эффекты: `packSocialFirestore.ts` (сервер) и `packSocialStorage.ts` (локально).
 *
 * Модель данных набора (документ `community_packs/{packId}`):
 *   likesCount: number   — лайки активности (может отсутствовать у старых документов → 0)
 *   addedCount: number   — сколько людей добавило набор себе
 *   подколлекция `pack_likes/{userId}` — «кто лайкнул» (идемпотентность лайка)
 *   подколлекция `pack_adds/{userId}`  — «кто добавил» (дедупликация счётчика добавлений)
 *
 * Легаси-поле `priceShards` в опубликованных документах игнорируется (Cards 2.1 §1.2).
 */

/** Подколлекция «кто лайкнул»: `community_packs/{packId}/pack_likes/{userId}`. */
export const COMMUNITY_PACK_LIKES_SUBCOLLECTION = 'pack_likes';

/** Подколлекция «кто добавил себе»: `community_packs/{packId}/pack_adds/{userId}`. */
export const COMMUNITY_PACK_ADDS_SUBCOLLECTION = 'pack_adds';

export type PackSocialCounts = {
  likesCount: number;
  addedCount: number;
};

export type PackSocialSnapshot = PackSocialCounts & {
  /** Лайкнул ли текущий пользователь. */
  liked: boolean;
  /** Добавил ли текущий пользователь набор себе. */
  added: boolean;
};

const nonNegativeInt = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
};

/** Счётчики из «сырых» полей документа; отсутствующие/битые значения → 0. */
export function readPackSocialCounts(data: Record<string, unknown> | undefined | null): PackSocialCounts {
  return {
    likesCount: nonNegativeInt(data?.likesCount),
    addedCount: nonNegativeInt(data?.addedCount),
  };
}

/**
 * Оптимистичное состояние лайка: один пользователь — один лайк,
 * повторное нажатие снимает лайк, счётчик не уходит ниже нуля.
 */
export function toggleLikeOptimistic(snapshot: PackSocialSnapshot): PackSocialSnapshot {
  const nextLiked = !snapshot.liked;
  return {
    ...snapshot,
    liked: nextLiked,
    likesCount: Math.max(0, snapshot.likesCount + (nextLiked ? 1 : -1)),
  };
}

/**
 * Оптимистичное состояние «Добавить себе»: цифра растёт сразу, повторное добавление
 * тем же пользователем счётчик не увеличивает (дедупликация по пользователю).
 */
export function addToLibraryOptimistic(snapshot: PackSocialSnapshot): PackSocialSnapshot {
  if (snapshot.added) return snapshot;
  return { ...snapshot, added: true, addedCount: snapshot.addedCount + 1 };
}

/** Слить серверные счётчики в локальное состояние, сохранив уже применённые оптимистичные флаги. */
export function mergeServerCounts(
  local: PackSocialSnapshot,
  server: PackSocialCounts,
): PackSocialSnapshot {
  return {
    liked: local.liked,
    added: local.added,
    likesCount: Math.max(server.likesCount, local.liked ? 1 : 0),
    addedCount: Math.max(server.addedCount, local.added ? 1 : 0),
  };
}

export type PackSocialSortable = {
  id: string;
  likesCount?: number;
  addedCount?: number;
  updatedAt: string;
};

const ts = (iso: string): number => {
  const n = new Date(iso).getTime();
  return Number.isFinite(n) ? n : 0;
};

/**
 * Cards 2.1 §2.3: сортировка каталога — лайки ↓, затем число добавлений ↓, затем свежесть.
 * При полном равенстве — стабильный порядок по id (детерминированная выдача).
 */
export function comparePacksBySocial(a: PackSocialSortable, b: PackSocialSortable): number {
  const likes = nonNegativeInt(b.likesCount) - nonNegativeInt(a.likesCount);
  if (likes !== 0) return likes;
  const added = nonNegativeInt(b.addedCount) - nonNegativeInt(a.addedCount);
  if (added !== 0) return added;
  const fresh = ts(b.updatedAt) - ts(a.updatedAt);
  if (fresh !== 0) return fresh;
  return a.id.localeCompare(b.id);
}

export function sortPacksBySocial<T extends PackSocialSortable>(packs: T[]): T[] {
  return [...packs].sort(comparePacksBySocial);
}

/** Минимум лайков, с которого набор вообще может считаться «в топе». */
export const PACK_TOP_MIN_LIKES = 3;
/** Сколько наборов максимум помечаем бейджем «в топе». */
export const PACK_TOP_MAX_COUNT = 3;

/**
 * Cards 2.1 §2.3: наборы с бóльшим числом лайков визуально выделяются бейджем «в топе».
 * Бейдж — акцент, а не «премиум»: он не связан с оплатой и выдаётся только по лайкам.
 */
export function topLikedPackIds(
  packs: PackSocialSortable[],
  opts?: { minLikes?: number; maxCount?: number },
): string[] {
  const minLikes = opts?.minLikes ?? PACK_TOP_MIN_LIKES;
  const maxCount = opts?.maxCount ?? PACK_TOP_MAX_COUNT;
  return sortPacksBySocial(packs)
    .filter((p) => nonNegativeInt(p.likesCount) >= minLikes)
    .slice(0, Math.max(0, maxCount))
    .map((p) => p.id);
}

/**
 * Суммарное число лайков активности автора — для будущей карточки пользователя (Cards 2.1 §2.2).
 * Чистая функция поверх уже загруженных наборов; серверный вариант — `fetchAuthorActivityLikes`.
 */
export function sumAuthorActivityLikes(
  packs: { authorStableId?: string; likesCount?: number }[],
  authorStableId: string,
): number {
  const author = String(authorStableId ?? '').trim();
  if (!author) return 0;
  return packs.reduce(
    (acc, p) => (String(p.authorStableId ?? '').trim() === author ? acc + nonNegativeInt(p.likesCount) : acc),
    0,
  );
}

/* ── Идемпотентные операции поверх абстрактной транзакции ──────────────────── */

export type PackSocialMembershipKind = 'like' | 'add';

/**
 * Минимальный контракт хранилища для лайка/добавления. Реализация для Firestore —
 * `packSocialFirestore.ts`; в тестах подставляется in-memory реализация.
 */
export type PackSocialTx = {
  hasMembership(kind: PackSocialMembershipKind, packId: string, userId: string): Promise<boolean>;
  setMembership(kind: PackSocialMembershipKind, packId: string, userId: string): Promise<void>;
  deleteMembership(kind: PackSocialMembershipKind, packId: string, userId: string): Promise<void>;
  bumpCounter(field: keyof PackSocialCounts, packId: string, delta: number): Promise<void>;
};

export type PackSocialWriteResult = {
  /** Изменилось ли состояние (false — повторная операция, счётчик не трогали). */
  changed: boolean;
  /** На сколько изменён счётчик набора. */
  delta: number;
};

/**
 * Поставить/снять лайк. Идемпотентно: повторный лайк тем же пользователем
 * не увеличивает `likesCount`, повторное снятие не уменьшает.
 */
export async function applyPackLike(
  tx: PackSocialTx,
  packId: string,
  userId: string,
  nextLiked: boolean,
): Promise<PackSocialWriteResult> {
  const already = await tx.hasMembership('like', packId, userId);
  if (already === nextLiked) return { changed: false, delta: 0 };
  if (nextLiked) {
    await tx.setMembership('like', packId, userId);
    await tx.bumpCounter('likesCount', packId, 1);
    return { changed: true, delta: 1 };
  }
  await tx.deleteMembership('like', packId, userId);
  await tx.bumpCounter('likesCount', packId, -1);
  return { changed: true, delta: -1 };
}

/**
 * Зарегистрировать добавление набора себе. Дедупликация по пользователю:
 * повторное добавление тем же пользователем не увеличивает `addedCount`.
 */
export async function applyPackAdd(
  tx: PackSocialTx,
  packId: string,
  userId: string,
): Promise<PackSocialWriteResult> {
  const already = await tx.hasMembership('add', packId, userId);
  if (already) return { changed: false, delta: 0 };
  await tx.setMembership('add', packId, userId);
  await tx.bumpCounter('addedCount', packId, 1);
  return { changed: true, delta: 1 };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
