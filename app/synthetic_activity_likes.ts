// ═══════════════════════════════════════════════════════════════════════════
// synthetic_activity_likes.ts — лайки синтетическим персонажам (жителям лиг,
// ботам турниров).
//
// зачем (владелец, 2026-08-04): «поставка боту лайка не сохраняла его,
// сделай чтобы лайк боту сохранялся у него навсегда и число росло всегда как
// у живых». У живого игрока лайк пишется в Firestore
// (users/{uid}/activity_like_stats/summary.total) и остаётся навсегда. У
// синтетического персонажа такого документа нет и быть не может — сеть для
// него намеренно заглушена (аудит 2026-08-04, isSyntheticUid), поэтому лайк
// нужно хранить локально: тот же принцип, что и у заявки в друзья
// (synthetic_friend_requests.ts).
//
// Число лайков растущее: базовая часть — функция от опыта персонажа
// (residentBaseLikes, растёт вместе с его прогрессом каждые 6 часов), поверх
// неё — один лайк, поставленный ЭТИМ устройством, который хранится навсегда.
// Один активный лайк на одну карточку персонажа — без суточного лимита.
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'synthetic_activity_likes_v1';

type StoredLikes = Record<string, { count: number; lastLikedDateKey: string }>;

let cache: StoredLikes | null = null;

async function load(): Promise<StoredLikes> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    cache = (parsed && typeof parsed === 'object') ? parsed as StoredLikes : {};
  } catch {
    cache = {};
  }
  return cache;
}

/** Мгновенный синхронный доступ к уже загруженному кэшу (для первого кадра). */
function peek(): StoredLikes {
  return cache ?? {};
}

function persist(next: StoredLikes): void {
  cache = next;
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {
    // Промах записи не откатываем — в памяти состояние уже верное, следующий
    // лайк перезапишет файл целиком (тот же принцип, что у заявок в друзья).
  });
}

/** Прогревает кэш заранее — вызывать при открытии карточки, до первого рендера. */
export async function loadSyntheticActivityLikes(): Promise<void> {
  await load();
}

/** Сколько лайков ЭТО устройство поставило персонажу (сверх базового числа). */
export function syntheticLikesAddedByMe(uid: string): number {
  return (peek()[uid]?.count ?? 0) > 0 ? 1 : 0;
}

/** Активен ли постоянный лайк этого устройства на карточке персонажа. */
export function hasLikedSynthetic(uid: string): boolean {
  return syntheticLikesAddedByMe(uid) === 1;
}

/** @deprecated Likes no longer reset daily. */
export const hasLikedSyntheticToday = hasLikedSynthetic;

/**
 * Ставит/снимает единственный лайк карточки. Факт переживает закрытие приложения;
 * старые накопленные суточные значения автоматически схлопываются до 0/1.
 */
export function toggleSyntheticLike(uid: string, liked: boolean): void {
  const current = peek();
  const next: StoredLikes = {
    ...current,
    [uid]: liked
      ? { count: 1, lastLikedDateKey: 'persistent' }
      : { count: 0, lastLikedDateKey: '' },
  };
  persist(next);
}
