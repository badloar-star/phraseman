import { useRef, useSyncExternalStore } from 'react';
import type { FriendEntry, FriendRequestEntry } from './firestore_friend_requests';
import type { CustomizationSnapshot } from './customization_snapshot';

export const APP_SNAPSHOT_RESOURCE_LIMITS = {
  friendProfileMaxEntries: 240,
  friendProfileTtlMs: 30 * 24 * 60 * 60 * 1000,
  listSnapshotTtlMs: 24 * 60 * 60 * 1000,
  recentItemsMax: 60,
  leaderboardRowsMax: 100,
  serializedSnapshotBudgetBytes: 300 * 1024,
  refreshCooldownMs: 45 * 1000,
} as const;

export type AppSnapshotSource = 'storage' | 'memory' | 'live' | 'local';

export interface AppSnapshotMeta {
  source: AppSnapshotSource;
  updatedAt: number;
}

export interface AppSnapshotProfile extends AppSnapshotMeta {
  name: string;
  avatar: string;
  frame: string;
  aura?: string;
  premiumActive: boolean;
  premiumPlan?: string;
  vipActive: boolean;
  /**
   * Активный VIP-грант без даты окончания (сертификат/промокод «навсегда»,
   * бессрочная выдача из админки) — такой доступ показывается как «Pro».
   * зачем: снапшот должен знать тир на первом кадре, иначе плашка моргает
   * «Plus» → «Pro» после reload().
   */
  vipLifetime?: boolean;
}

export interface AppSnapshotProgress extends AppSnapshotMeta {
  streak: number;
  studyTarget: string;
  /**
   * Единый баланс звёзд (владелец 2026-08-12, D-05/D-06). Приходит из того же
   * документа игрока, который снапшот и так загружает — ни одного нового
   * слушателя и ни одного дополнительного чтения.
   *
   * Тратимое и заработанное за всё время — РАЗНЫЕ числа: траты не уменьшают
   * второе, именно оно открывает награды (D-10).
   */
  stars?: number;
  starsEarnedTotal?: number;
}

export interface AppSnapshotLessons extends AppSnapshotMeta {
  primedCount: number;
  lastOpenedLesson: string | null;
}

export interface AppSnapshotFriendProfile {
  uid: string;
  name: string;
  streak: number;
  isPremium: boolean;
  avatar: string;
  frame: string;
  aura?: string;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
}

export interface AppSnapshotFriends extends AppSnapshotMeta {
  canonicalUid: string;
  friends: FriendEntry[];
  requests: FriendRequestEntry[];
  profiles: Record<string, AppSnapshotFriendProfile>;
}

export interface AppSnapshotSettings extends AppSnapshotMeta {
  autoCheck: boolean;
  voiceOut: boolean;
  uiSounds: boolean;
  speechRate: number;
  speechVoiceId: string;
  hardMode: boolean;
  autoAdvance: boolean;
  haptics: boolean;
  tapHaptics?: boolean;
  immediateCheck: boolean;
}

export interface AppSnapshot {
  profile?: AppSnapshotProfile;
  progress?: AppSnapshotProgress;
  lessons?: AppSnapshotLessons;
  friends?: AppSnapshotFriends;
  settings?: AppSnapshotSettings;
  customization?: CustomizationSnapshot;
  primedAt?: number;
}

type Listener = () => void;
type Patch = Partial<AppSnapshot> | ((current: Readonly<AppSnapshot>) => Partial<AppSnapshot>);

let snapshot: AppSnapshot = {};
const listeners = new Set<Listener>();

function emitSnapshotChanged(): void {
  listeners.forEach((listener) => listener());
}

function shallowPatchChanged(current: AppSnapshot, patch: Partial<AppSnapshot>): boolean {
  return Object.entries(patch).some(([key, value]) => current[key as keyof AppSnapshot] !== value);
}

function preserveNewerSnapshotSections(
  current: Readonly<AppSnapshot>,
  patch: Partial<AppSnapshot>,
): Partial<AppSnapshot> {
  const storageCannotReplaceLiveProfile = Boolean(
    patch.profile
    && current.profile
    && patch.profile.source === 'storage'
    && current.profile.source === 'live',
  );
  const storageHydrationLostSameTick = Boolean(
    patch.profile
    && current.profile
    && patch.profile.updatedAt === current.profile.updatedAt
    && patch.profile.source === 'storage'
    && current.profile.source !== 'storage',
  );
  const profileMustStayCurrent = Boolean(
    patch.profile
    && current.profile
    && (
      patch.profile.updatedAt < current.profile.updatedAt
      || storageHydrationLostSameTick
    ),
  );
  const progressMustStayCurrent = Boolean(
    patch.progress
    && current.progress
    && patch.progress.source === 'storage'
    && current.progress.source === 'live',
  );
  if (!storageCannotReplaceLiveProfile && !profileMustStayCurrent && !progressMustStayCurrent) {
    return patch;
  }
  const nextPatch: Partial<AppSnapshot> = { ...patch };
  if (storageCannotReplaceLiveProfile && patch.profile && current.profile) {
    // SQLite owns local entitlement/customization fields, but cannot lower the
    // validated cloud identity. Keep the section live so another delayed
    // storage pass is subject to the same rule.
    nextPatch.profile = {
      ...patch.profile,
      source: 'live',
      updatedAt: Math.max(patch.profile.updatedAt, current.profile.updatedAt),
      name: current.profile.name || patch.profile.name,
      avatar: current.profile.avatar && current.profile.avatar !== '1'
        ? current.profile.avatar
        : patch.profile.avatar,
      frame: current.profile.frame || patch.profile.frame,
      aura: current.profile.aura ?? patch.profile.aura,
    };
  } else if (profileMustStayCurrent) {
    nextPatch.profile = current.profile;
  }
  if (progressMustStayCurrent && patch.progress && current.progress) {
    console.log(`[STREAK] snapshot:keep_live streak=${current.progress.streak} rejected_storage=${patch.progress.streak}`);
    nextPatch.progress = {
      ...patch.progress,
      source: 'live',
      updatedAt: Math.max(patch.progress.updatedAt, current.progress.updatedAt),
      streak: current.progress.streak,
    };
  }
  return nextPatch;
}

export function getAppSnapshot(): Readonly<AppSnapshot> {
  return snapshot;
}

export function resolveHydratedProfileName(
  hydrationStartedAt: number,
  hydratedName: string | null | undefined,
): string {
  const candidate = String(hydratedName ?? '').trim();
  const currentProfile = snapshot.profile;
  if (!currentProfile) return candidate;
  if (currentProfile.updatedAt >= hydrationStartedAt) {
    return currentProfile.name || candidate;
  }
  return candidate || currentProfile.name;
}

export function subscribeAppSnapshot(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function patchAppSnapshot(patchOrFn: Patch): void {
  const requestedPatch = typeof patchOrFn === 'function' ? patchOrFn(snapshot) : patchOrFn;
  // зачем: Q5 (координатор 01.10) — сверка Avatar DNA между профилем и
  // кастомизацией снята вместе со «Студией персонажа».
  const patch = requestedPatch
    ? preserveNewerSnapshotSections(snapshot, requestedPatch)
    : requestedPatch;
  if (!patch || !shallowPatchChanged(snapshot, patch)) return;
  snapshot = { ...snapshot, ...patch };
  emitSnapshotChanged();
}

// зачем: D108 — публикация выбора аватара/ауры из редактора косметики удалена
// (редактора и аур больше нет; вызовов в приложении не осталось).

export function patchAppSnapshotFromPersonalProgress(progress: Readonly<{
  streakCount: number;
}>): void {
  patchAppSnapshot((current) => {
    const now = Date.now();
    // зачем (баг 01.10): временная трассировка — локальная серия в снимок Главной.
    console.log(`[STREAK] snapshot:personal streak=${progress.streakCount} prev=${String(current.progress?.streak)}@${String(current.progress?.source)}`);
    return {
      progress: {
        source: 'local' as const,
        updatedAt: now,
        streak: progress.streakCount,
        studyTarget: current.progress?.studyTarget ?? 'en',
        // зачем (владелец, 2026-08-24): «на главной цифра рун постоянно прыгает».
        // Этот патч собирает секцию progress ЗАНОВО, поэтому раньше он молча
        // ронял stars/starsEarnedTotal — а зовут его на каждое начисление рун и
        // смену серии. peekRunes() читал undefined -> 0, счётчик падал в ноль и
        // возвращался, когда level_spin_star_grants публиковал проекцию.
        // Руны здесь не наши — переносим как есть, писатель у них ровно один.
        // зачем (эмулятор 01.10, лог [HOME-COINS]): неизвестные монеты — undefined, не 0; иначе Главная 22 с показывала «0».
        stars: current.progress?.stars,
        starsEarnedTotal: current.progress?.starsEarnedTotal,
      },
    };
  });
}

const AUTHORITATIVE_STREAK_MAX = 100_000;

function authoritativeNonNegativeInt(value: unknown, maximum: number): number | null | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > maximum) return null;
  return parsed;
}

/**
 * Keeps the visible profile usable when AsyncStorage cannot persist a validated
 * server-authoritative restore (for example Android SQLITE_FULL). This is an
 * in-memory UI projection only; it never writes local storage or Firestore.
 */
export function patchAppSnapshotFromAuthoritativeCloudProgress(
  root: Record<string, unknown>,
  now: number = Date.now(),
  mergedStreak?: number,
): boolean {
  if (root.progressServerAuthoritative !== true) return false;
  const rawProgress = root.progress;
  if (!rawProgress || typeof rawProgress !== 'object' || Array.isArray(rawProgress)) return false;
  const progress = rawProgress as Record<string, unknown>;
  const cloudStreak = authoritativeNonNegativeInt(progress.streak_count, AUTHORITATIVE_STREAK_MAX);
  if (cloudStreak === null || cloudStreak === undefined) return false;
  // зачем (баг 01.10, «Дизайн»: Главная «1 день» при серии 6): облако кладёт свою серию в
  // снимок, а сервер узнаёт серию телефона только с событием занятия. Если вызывающий уже
  // слил серию по дате активности (mergeStreakByActivityDate — то же правило, по которому
  // сервер принимает серию телефона за тот же день), показываем слитое значение.
  const streak = mergedStreak !== undefined
    && Number.isSafeInteger(mergedStreak)
    && mergedStreak >= 0
    && mergedStreak <= AUTHORITATIVE_STREAK_MAX
    ? mergedStreak
    : cloudStreak;

  const currentProgress = snapshot.progress;
  // зачем (баг 01.10: Главная «1 день», «Твои результаты» 6): временная трассировка — облако
  // как авторитетный источник серии перезаписывает снимок, из которого читает Главная.
  console.log(`[STREAK] snapshot:authoritative_cloud cloud=${cloudStreak} merged=${String(mergedStreak)} -> ${streak} prev=${String(currentProgress?.streak)}@${String(currentProgress?.source)}`);
  const patch: Partial<AppSnapshot> = {};
  patch.progress = {
    source: 'live',
    updatedAt: now,
    streak,
    studyTarget: currentProgress?.studyTarget ?? 'en',
    // зачем (эмулятор 01.10, лог [HOME-COINS]): неизвестные монеты — undefined, не 0; иначе Главная 22 с показывала «0».
    stars: currentProgress?.stars,
    starsEarnedTotal: currentProgress?.starsEarnedTotal,
  };
  patchAppSnapshot(patch);
  return true;
}

export function resetAppSnapshotForAccountSwitch(): void {
  if (Object.keys(snapshot).length === 0) return;
  snapshot = {};
  emitSnapshotChanged();
}

export function useAppSnapshotSelector<T>(
  selector: (value: Readonly<AppSnapshot>) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const selectedRef = useRef<T>(selector(snapshot));

  return useSyncExternalStore(
    subscribeAppSnapshot,
    () => {
      const next = selector(snapshot);
      if (!isEqual(selectedRef.current, next)) {
        selectedRef.current = next;
      }
      return selectedRef.current;
    },
    () => selectedRef.current,
  );
}

export function limitArray<T>(items: readonly T[] | null | undefined, max: number): T[] {
  if (!Array.isArray(items) || max <= 0) return [];
  return items.slice(0, max);
}

export function pruneBoundedRecord<T>(
  record: Record<string, T> | null | undefined,
  options: {
    maxEntries: number;
    ttlMs?: number;
    nowMs?: number;
    retainKeys?: readonly string[];
    getTimestamp?: (entry: T) => number;
  },
): Record<string, T> {
  if (!record || options.maxEntries <= 0) return {};
  const now = options.nowMs ?? Date.now();
  const retain = new Set(options.retainKeys ?? []);
  const getTimestamp = options.getTimestamp ?? (() => 0);
  const entries = Object.entries(record)
    .filter(([key]) => key.length > 0)
    .filter(([key, entry]) => {
      if (retain.has(key) || !options.ttlMs) return true;
      const ts = Number(getTimestamp(entry)) || 0;
      return ts <= 0 || now - ts <= options.ttlMs;
    })
    .sort((a, b) => {
      const aPinned = retain.has(a[0]) ? 1 : 0;
      const bPinned = retain.has(b[0]) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return (Number(getTimestamp(b[1])) || 0) - (Number(getTimestamp(a[1])) || 0);
    });

  const out: Record<string, T> = {};
  for (const [key, entry] of entries) {
    if (Object.keys(out).length >= options.maxEntries && !retain.has(key)) continue;
    out[key] = entry;
  }
  return out;
}

export default function __RouteShim() { return null; }
