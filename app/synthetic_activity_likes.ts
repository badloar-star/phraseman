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
// нею — лайки, поставленные ЭТИМ устройством, которые хранятся навсегда и не
// сбрасываются. Один лайк персонажу в сутки, как у живых.
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

/** Сегодняшняя UTC-дата — та же граница суток, что у серверного лайка живым. */
function todayDateKeyUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Прогревает кэш заранее — вызывать при открытии карточки, до первого рендера. */
export async function loadSyntheticActivityLikes(): Promise<void> {
  await load();
}

/** Сколько лайков ЭТО устройство поставило персонажу (сверх базового числа). */
export function syntheticLikesAddedByMe(uid: string): number {
  return peek()[uid]?.count ?? 0;
}

/** Лайкнул ли этот персонаж сегодня — свой лимит на каждого, не общий на всех. */
export function hasLikedSyntheticToday(uid: string): boolean {
  const entry = peek()[uid];
  return !!entry && entry.lastLikedDateKey === todayDateKeyUtc();
}

/**
 * Ставит/снимает лайк персонажу. Хранится навсегда — count никогда не падает
 * ниже уже поставленного максимума при повторных отметках, а сам факт «лайкал
 * ли я его» переживает закрытие приложения (владелец: «сохранялся навсегда»).
 */
export function toggleSyntheticLike(uid: string, liked: boolean): void {
  const current = peek();
  const existing = current[uid] ?? { count: 0, lastLikedDateKey: '' };
  const next: StoredLikes = {
    ...current,
    [uid]: liked
      ? { count: existing.count + 1, lastLikedDateKey: todayDateKeyUtc() }
      // Отмена лайка убирает только СЕГОДНЯШНЮЮ отметку — сумма прошлых
      // лайков остаётся, ровно как «навсегда» и просил владелец.
      : { count: Math.max(0, existing.count - 1), lastLikedDateKey: '' },
  };
  persist(next);
}
