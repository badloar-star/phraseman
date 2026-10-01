// ═══════════════════════════════════════════════════════════════════════════
// video_favorites_core.ts — ЧИСТАЯ логика личного избранного видео (PM-111) и
// отображения счётчика уникальных сохранений (PM-112/113). Без Firebase и
// AsyncStorage: всё проверяется тестами напрямую.
//
// зачем отдельный модуль: правила «идемпотентно», «последняя запись побеждает»,
// «чужое состояние не показываем» и «своё сохранение видно сразу, хотя агрегат
// сервера считается раз в 6 ч» ломаются молча. Держим их в одном месте, а
// ввод-вывод — в app/video_favorites.ts.
// ═══════════════════════════════════════════════════════════════════════════

export const VIDEO_FAVORITE_ID_RE = /^[0-9A-Za-z_-]{11}$/;

export type VideoFavoriteEntry = Readonly<{
  saved: boolean;
  /** Момент последнего изменения на этом устройстве (или из облака). */
  changedAtMs: number;
  /** Изменение ещё не подтверждено облаком. */
  pending: boolean;
}>;

export type VideoFavoritesState = Readonly<{
  v: 1;
  /** Чей это список: stable id аккаунта. Чужой список не показывается никогда. */
  ownerId: string;
  items: Readonly<Record<string, VideoFavoriteEntry>>;
  /** Когда список последний раз сверяли с облаком (0 — ни разу). */
  cloudSyncedAtMs: number;
}>;

export type CloudVideoFavorite = Readonly<{ videoId: string; savedAtMs: number }>;

export function isValidFavoriteVideoId(videoId: string): boolean {
  return VIDEO_FAVORITE_ID_RE.test(videoId);
}

export function emptyVideoFavorites(ownerId: string): VideoFavoritesState {
  return { v: 1, ownerId, items: {}, cloudSyncedAtMs: 0 };
}

export function isVideoFavorite(state: VideoFavoritesState | null, videoId: string): boolean {
  return state?.items[videoId]?.saved === true;
}

/** Сохранённые ролики, свежие сверху. Пустой список — нормальное состояние, не ошибка. */
export function favoriteVideoIds(state: VideoFavoritesState | null): string[] {
  if (!state) return [];
  return Object.entries(state.items)
    .filter(([, entry]) => entry.saved)
    .sort((a, b) => b[1].changedAtMs - a[1].changedAtMs)
    .map(([videoId]) => videoId);
}

export type LocalToggle = Readonly<{
  state: VideoFavoritesState;
  changed: boolean;
  previous: VideoFavoriteEntry | undefined;
  changedAtMs: number;
}>;

/**
 * PM-111-A1: сохранить/убрать идемпотентно. Повтор того же действия ничего не
 * меняет и ничего не шлёт в сеть (changed=false).
 */
export function applyLocalFavoriteToggle(
  state: VideoFavoritesState,
  videoId: string,
  saved: boolean,
  nowMs: number,
): LocalToggle {
  const previous = state.items[videoId];
  const current = previous?.saved === true;
  if (current === saved) return { state, changed: false, previous, changedAtMs: previous?.changedAtMs ?? 0 };
  // Время строго растёт для одного ролика: два тапа в одну миллисекунду не
  // должны дать одинаковый changedAtMs, иначе защита от гонок их не различит.
  const changedAtMs = Math.max(nowMs, (previous?.changedAtMs ?? 0) + 1);
  const entry: VideoFavoriteEntry = { saved, changedAtMs, pending: true };
  return {
    state: { ...state, items: { ...state.items, [videoId]: entry } },
    changed: true,
    previous,
    changedAtMs,
  };
}

/**
 * Облако подтвердило запись. Last-write-guard: если после этой записи человек
 * уже успел нажать ещё раз (changedAtMs другой), поздний ответ ничего не трогает.
 */
export function markFavoriteSynced(state: VideoFavoritesState, videoId: string, changedAtMs: number): VideoFavoritesState {
  const entry = state.items[videoId];
  if (!entry || entry.changedAtMs !== changedAtMs || !entry.pending) return state;
  const items = { ...state.items };
  // Подтверждённое «убрано» хранить незачем: облако — правда, записи там нет.
  if (entry.saved) items[videoId] = { ...entry, pending: false };
  else delete items[videoId];
  return { ...state, items };
}

/** Откат при ошибке — только если это всё ещё то самое изменение (без затирания свежего). */
export function rollbackFavoriteToggle(
  state: VideoFavoritesState,
  videoId: string,
  changedAtMs: number,
  previous: VideoFavoriteEntry | undefined,
): VideoFavoritesState {
  const entry = state.items[videoId];
  if (!entry || entry.changedAtMs !== changedAtMs) return state;
  const items = { ...state.items };
  if (previous) items[videoId] = previous;
  else delete items[videoId];
  return { ...state, items };
}

/**
 * Сверка с облаком (вход на новом устройстве, повторный вход). Облако — правда
 * для подтверждённых записей; неподтверждённые локальные изменения сохраняются
 * и будут дописаны.
 */
export function mergeCloudFavorites(
  state: VideoFavoritesState,
  cloud: readonly CloudVideoFavorite[],
  nowMs: number,
): VideoFavoritesState {
  const cloudById = new Map<string, CloudVideoFavorite>();
  for (const row of cloud) if (isValidFavoriteVideoId(row.videoId)) cloudById.set(row.videoId, row);
  const items: Record<string, VideoFavoriteEntry> = {};
  for (const [videoId, entry] of Object.entries(state.items)) {
    if (entry.pending) {
      items[videoId] = entry;
      continue;
    }
    const remote = cloudById.get(videoId);
    // Подтверждённая запись, которой в облаке нет, — её убрали на другом
    // устройстве: забываем.
    if (remote) items[videoId] = { saved: true, changedAtMs: remote.savedAtMs || entry.changedAtMs, pending: false };
  }
  for (const [videoId, remote] of cloudById) {
    if (!items[videoId]) items[videoId] = { saved: true, changedAtMs: remote.savedAtMs || 0, pending: false };
  }
  return { ...state, items, cloudSyncedAtMs: nowMs };
}

/** Неподтверждённые изменения — их дописываем при следующей сверке. */
export function pendingFavoriteChanges(state: VideoFavoritesState): Array<{ videoId: string; entry: VideoFavoriteEntry }> {
  return Object.entries(state.items)
    .filter(([, entry]) => entry.pending)
    .map(([videoId, entry]) => ({ videoId, entry }));
}

/**
 * PM-111-A2: список с диска принимается ТОЛЬКО для того же аккаунта. Любая
 * порча формы или чужой ownerId — пустой список этого аккаунта (не чужой).
 */
export function parseVideoFavoritesState(raw: string | null, ownerId: string): VideoFavoritesState {
  if (!raw) return emptyVideoFavorites(ownerId);
  try {
    const parsed = JSON.parse(raw) as Partial<VideoFavoritesState> | null;
    if (!parsed || parsed.v !== 1 || parsed.ownerId !== ownerId || typeof parsed.items !== 'object' || parsed.items === null) {
      console.warn(`[PM111-FAV] список на диске отброшен: ${parsed?.ownerId && parsed.ownerId !== ownerId ? 'чужой владелец' : 'неверная форма'}`);
      return emptyVideoFavorites(ownerId);
    }
    const items: Record<string, VideoFavoriteEntry> = {};
    for (const [videoId, value] of Object.entries(parsed.items as Record<string, unknown>)) {
      const entry = value as Partial<VideoFavoriteEntry> | null;
      if (!isValidFavoriteVideoId(videoId) || !entry || typeof entry.saved !== 'boolean') continue;
      items[videoId] = {
        saved: entry.saved,
        changedAtMs: Number.isFinite(Number(entry.changedAtMs)) ? Number(entry.changedAtMs) : 0,
        pending: entry.pending === true,
      };
    }
    const cloudSyncedAtMs = Number.isFinite(Number(parsed.cloudSyncedAtMs)) ? Number(parsed.cloudSyncedAtMs) : 0;
    return { v: 1, ownerId, items, cloudSyncedAtMs };
  } catch (error) {
    console.warn(`[PM111-FAV] список избранного на диске не читается — начинаю с пустого: ${String(error)}`);
    return emptyVideoFavorites(ownerId);
  }
}

/**
 * PM-113-A3 (отмеченная eventual consistency): агрегат сервера пересчитывается
 * не чаще раза в 6 ч, а своё нажатие человек должен видеть сразу. Если своё
 * изменение случилось ПОСЛЕ расчёта агрегата, сервер видел прежнее состояние —
 * поправляем на ±1. Чужие сохранения доезжают с пересчётом.
 */
export function displayVideoSaveCount(
  serverCount: number,
  computedAtMs: number,
  own: VideoFavoriteEntry | undefined,
): number {
  const base = Math.max(0, Math.floor(Number.isFinite(serverCount) ? serverCount : 0));
  if (!own || own.changedAtMs <= computedAtMs) return base;
  return Math.max(0, base + (own.saved ? 1 : -1));
}
