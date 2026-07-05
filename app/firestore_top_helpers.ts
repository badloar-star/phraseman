// ═══════════════════════════════════════════════════════════════════════════
// firestore_top_helpers.ts — данные борда «Топ хелперов» (Top Helpers).
//
// Борд показывает топ-10 пользователей, чьи баг-репорты/жалобы подтвердились.
// Источник рейтинга — публичная проекция top_helpers/{uid}, которую пишет
// Cloud Function adminReplyToReport в той же транзакции, что и инкремент
// счётчика титула progress.helpful_error_reports_confirmed_v1 (см.
// functions/src/report_replies.ts). Приватные users/{uid} читать нельзя (rules),
// поэтому имя/аватар/премиум денормализованы в проекцию — ровно те же поля, что
// рисует Зал славы, чтобы UI борда совпадал с лигой.
//
// ДЁШЕВО ПО FIRESTORE (требование владельца):
//   • один запрос orderBy(confirmed desc).limit(10);
//   • обновление ТОЛЬКО при заходе на экран (fresh start) и не чаще, чем раз в 3 ч
//     (кулдаун в AsyncStorage) — как arena/friends. Никаких onSnapshot/поллинга;
//   • последний успешный снимок кэшируется и показывается мгновенно (в т.ч. офлайн).
//
// Модуль самодостаточен: описание борда и тумблер вкл/выкл читаются напрямую из
// remote_config/app (как remote_config_client.ts), без завязки на remote_flags.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getStableId } from './stable_id';

const TOP_HELPERS_COLLECTION = 'top_helpers';
const REMOTE_CONFIG_COLLECTION = 'remote_config';
const REMOTE_CONFIG_DOC = 'app';

const TOP_HELPERS_LIMIT = 10;

/** Кэш последнего снимка топа (мгновенный первый кадр + офлайн). */
// v2 (2026-07-04): смена версии = сброс старого кэша у всех устройств. Старые снапшоты
// (_v1) содержали «—»/уровень 1 из-за прежнего бага источника профиля — при v2 клиент
// их не видит и подтягивает свежие данные из Firestore. Кулдаун-логика не тронута.
const SNAPSHOT_CACHE_KEY = 'top_helpers_snapshot_v2';
/** Таймстамп последнего успешного запроса к Firestore (кулдаун 3 ч). */
const REMOTE_REFRESH_AT_KEY = 'top_helpers_remote_at_v2';
/** Кулдаун обновления топа — 3 часа (требование: дёшево по Firebase). */
export const TOP_HELPERS_REFRESH_COOLDOWN_MS = 3 * 60 * 60 * 1000;

/** Ключи пульта (remote_config/app). Читаются напрямую, вне remote_flags. */
export const TOP_HELPERS_ENABLED_FLAG = 'top_helpers_enabled';
export const TOP_HELPERS_DESCRIPTION_TEXT = 'top_helpers_description';

/** Одна строка борда — денормализованная проекция профиля + счётчик. */
export interface TopHelperRow {
  uid: string;
  place: number;
  confirmed: number;
  displayName: string;
  avatar?: string;
  aura?: string;
  frame?: string;
  isPremium: boolean;
  isVip: boolean;
  isLifetime: boolean;
  profileCardLevel?: number;
  /** Настоящий игровой уровень (цифра на аватарке). НЕ profileCardLevel (тот — флаг 0..1). */
  gameLevel?: number;
  profileCardTheme?: string;
  leagueCrownExpiresAt?: number;
  leagueCrownCount?: number;
}

/** Снимок борда: строки + мой uid (чтобы подсветить «Ты») + описание/включённость. */
export interface TopHelpersSnapshot {
  rows: TopHelperRow[];
  myUid: string;
  description: string;
  enabled: boolean;
  fromCache: boolean;
}

type FirestoreLike = {
  collection: (name: string) => {
    doc: (id: string) => {
      get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
    };
    orderBy: (field: string, dir: 'asc' | 'desc') => {
      limit: (n: number) => {
        get: () => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>;
      };
    };
  };
};

function getFirestore(): FirestoreLike | null {
  if (Platform.OS === 'web' || IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default() as FirestoreLike;
  } catch {
    return null;
  }
}

function toStr(v: unknown, max = 64): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function toInt(v: unknown): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Парсит документ проекции top_helpers/{uid} в строку борда (место проставит вызвавший). */
export function parseHelperDoc(id: string, data: Record<string, unknown> | undefined): TopHelperRow | null {
  if (!data) return null;
  const confirmed = toInt(data.confirmed);
  if (confirmed <= 0) return null;
  const name = toStr(data.displayName, 60);
  // Нет имени в проекции (юзер без онбординга/ника) → осмысленный плейсхолдер
  // «Игрок #xxxx» по хвосту uid, как в остальном проекте (не голое «—»).
  const fallbackName = `Игрок #${id.slice(-4)}`;
  const row: TopHelperRow = {
    uid: id,
    place: 0,
    confirmed,
    displayName: name || fallbackName,
    isPremium: !!data.isPremium,
    isVip: !!data.isVip,
    isLifetime: !!data.isLifetime,
  };
  const avatar = toStr(data.avatar);
  if (avatar) row.avatar = avatar;
  const aura = toStr(data.aura);
  if (aura) row.aura = aura;
  const frame = toStr(data.frame);
  if (frame) row.frame = frame;
  const cardLevel = toInt(data.profileCardLevel);
  if (cardLevel > 0) row.profileCardLevel = cardLevel;
  const gameLevel = toInt(data.gameLevel);
  if (gameLevel > 0) row.gameLevel = gameLevel;
  const cardTheme = toStr(data.profileCardTheme);
  if (cardTheme) row.profileCardTheme = cardTheme;
  const crownCount = toInt(data.leagueCrownCount);
  if (crownCount > 0) row.leagueCrownCount = crownCount;
  const crownExpires = toInt(data.leagueCrownExpiresAt);
  if (crownExpires > 0) row.leagueCrownExpiresAt = crownExpires;
  return row;
}

async function readCachedSnapshot(): Promise<{ rows: TopHelperRow[]; description: string; enabled: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows?: unknown; description?: unknown; enabled?: unknown };
    const rows = Array.isArray(parsed.rows) ? (parsed.rows as TopHelperRow[]) : [];
    return {
      rows,
      description: typeof parsed.description === 'string' ? parsed.description : '',
      enabled: parsed.enabled !== false, // отсутствие в старом кэше = включено
    };
  } catch {
    return null;
  }
}

async function writeCachedSnapshot(rows: TopHelperRow[], description: string, enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify({ rows, description, enabled }));
  } catch {
    // best-effort
  }
}

/** Не пора ли обновлять из сети: прошло ≥3 ч с последнего успешного запроса. */
export async function shouldRefreshTopHelpers(nowMs: number): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(REMOTE_REFRESH_AT_KEY);
    const last = raw ? Number(raw) : 0;
    if (!Number.isFinite(last) || last <= 0) return true;
    return nowMs - last >= TOP_HELPERS_REFRESH_COOLDOWN_MS;
  } catch {
    return true;
  }
}

/** Чистая функция окна кулдауна — вынесена для тестов. */
export function isCooldownElapsed(lastMs: number, nowMs: number): boolean {
  if (!Number.isFinite(lastMs) || lastMs <= 0) return true;
  return nowMs - lastMs >= TOP_HELPERS_REFRESH_COOLDOWN_MS;
}

async function markRefreshed(nowMs: number): Promise<void> {
  try {
    await AsyncStorage.setItem(REMOTE_REFRESH_AT_KEY, String(nowMs));
  } catch {
    // best-effort
  }
}

/** Читает пульт (описание + включённость) из remote_config/app. Мягко: ошибка → дефолты. */
async function fetchBoardConfig(db: FirestoreLike): Promise<{ description: string; enabled: boolean }> {
  try {
    const snap = await db.collection(REMOTE_CONFIG_COLLECTION).doc(REMOTE_CONFIG_DOC).get();
    const data = (snap.exists ? snap.data() : undefined) as
      | { texts?: Record<string, unknown>; bools?: Record<string, unknown> }
      | undefined;
    const description = toStr(data?.texts?.[TOP_HELPERS_DESCRIPTION_TEXT], 600);
    const rawEnabled = data?.bools?.[TOP_HELPERS_ENABLED_FLAG];
    // Дефолт true = kill-switch: борд включён, пока админ не выключит его из «Пульта».
    const enabled = rawEnabled === false ? false : true;
    return { description, enabled };
  } catch {
    return { description: '', enabled: true };
  }
}

/**
 * Загрузить снимок борда. Стратегия (дёшево по Firebase):
 *   1) мгновенно вернуть кэш, если он есть (fromCache: true);
 *   2) если кулдаун 3 ч истёк ИЛИ кэша нет — один сетевой запрос (топ-10 + пульт),
 *      обновить кэш и таймстамп.
 * Вызывать при ЗАХОДЕ на экран. Никаких подписок.
 */
export async function loadTopHelpers(nowMs: number, opts?: { force?: boolean }): Promise<TopHelpersSnapshot> {
  const myUid = await getStableId().catch(() => '');
  const cached = await readCachedSnapshot();

  const db = getFirestore();
  const needRefresh = opts?.force === true || (await shouldRefreshTopHelpers(nowMs));

  // Есть свежий кэш и обновляться не пора — отдаём его без сети.
  if (cached && !needRefresh) {
    return { rows: cached.rows, myUid, description: cached.description, enabled: cached.enabled, fromCache: true };
  }

  // Нет сети (web/Expo Go/cloud off) — отдаём кэш или пусто.
  if (!db) {
    return {
      rows: cached?.rows ?? [],
      myUid,
      description: cached?.description ?? '',
      enabled: cached?.enabled ?? true,
      fromCache: true,
    };
  }

  try {
    const [topSnap, config] = await Promise.all([
      db.collection(TOP_HELPERS_COLLECTION).orderBy('confirmed', 'desc').limit(TOP_HELPERS_LIMIT).get(),
      fetchBoardConfig(db),
    ]);
    const rows: TopHelperRow[] = [];
    topSnap.docs.forEach((docSnap) => {
      const row = parseHelperDoc(docSnap.id, docSnap.data());
      if (row) {
        row.place = rows.length + 1;
        rows.push(row);
      }
    });
    await Promise.all([writeCachedSnapshot(rows, config.description, config.enabled), markRefreshed(nowMs)]);
    return { rows, myUid, description: config.description, enabled: config.enabled, fromCache: false };
  } catch {
    // Сеть упала — отдаём кэш (или пусто), кулдаун не двигаем (попробуем позже).
    return {
      rows: cached?.rows ?? [],
      myUid,
      description: cached?.description ?? '',
      enabled: cached?.enabled ?? true,
      fromCache: true,
    };
  }
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}
