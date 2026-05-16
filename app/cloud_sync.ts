// ════════════════════════════════════════════════════════════════════════════
// cloud_sync.ts — Синхронизация прогресса с Firebase
//
// АКТИВАЦИЯ: когда добавишь Firebase Auth + Firestore:
//   1. npm install @react-native-firebase/auth @react-native-firebase/firestore
//   2. В config.ts: CLOUD_SYNC_ENABLED = true
//   3. Всё остальное работает автоматически
//
// Пока CLOUD_SYNC_ENABLED = false — все функции тихо возвращают без действий.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED } from './config';
import { getTodayKey, getTodayTasksSafe, loadTodayProgress } from './daily_tasks';
import { clearArenaAuthUidCache, getAuthUserId, getCanonicalUserId, ensureArenaAuthUid } from './user_id_policy';
import { processAdminGrantForCelebration } from './premium_celebration_state';
import { invalidatePremiumCache } from './premium_guard';
import { normalizeDevSeededStreakValue, repairDevSeededStreakInStorage } from './streak_safety';

/** Одна строка прогресса по заданию (как TaskProgress в daily_tasks, без лишних импортов). */
type DailyTaskProgressRow = {
  taskId: string;
  current?: number;
  completed?: boolean;
  claimed?: boolean;
  comboPlays?: number;
  comboWins?: number;
};

const taskProgressNum = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

function leagueResultSignature(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  try {
    const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!result || typeof result !== 'object') return null;
    const r = result as Record<string, unknown>;
    return JSON.stringify({
      prevLeagueId: r.prevLeagueId,
      newLeagueId: r.newLeagueId,
      myRank: r.myRank,
      totalInGroup: r.totalInGroup,
      promoted: r.promoted,
      demoted: r.demoted,
    });
  } catch {
    return null;
  }
}

/**
 * Полное восстановление с облака не должно затирать уже накопленный сегодня локальный прогресс
 * устаревшим daily_tasks_progress (например облако ещё не успело отправить актуальный снимок).
 */
export function mergeDailyTasksProgressForRestore(localRaw: string | null | undefined, cloudRaw: string): string {
  let localArr: DailyTaskProgressRow[] = [];
  let cloudArr: DailyTaskProgressRow[] = [];
  try {
    if (localRaw && localRaw.trim()) {
      const p = JSON.parse(localRaw);
      if (Array.isArray(p)) localArr = p;
    }
  } catch {
    localArr = [];
  }
  try {
    const p = JSON.parse(cloudRaw);
    if (Array.isArray(p)) cloudArr = p;
    else return (localRaw && localRaw.trim()) ? localRaw : cloudRaw;
  } catch {
    return (localRaw && localRaw.trim()) ? localRaw : cloudRaw;
  }
  if (localArr.length === 0) return cloudRaw;
  if (cloudArr.length === 0) return localRaw ?? '[]';

  const byId = new Map<string, DailyTaskProgressRow>();
  for (const row of cloudArr) {
    if (row && typeof row.taskId === 'string' && row.taskId) {
      byId.set(row.taskId, { ...row });
    }
  }
  for (const row of localArr) {
    if (!row || typeof row.taskId !== 'string' || !row.taskId) continue;
    const cloud = byId.get(row.taskId);
    if (!cloud) {
      byId.set(row.taskId, { ...row });
      continue;
    }
    byId.set(row.taskId, {
      ...cloud,
      taskId: row.taskId,
      current: Math.max(taskProgressNum(cloud.current), taskProgressNum(row.current)),
      completed: !!(cloud.completed || row.completed),
      claimed: !!(cloud.claimed || row.claimed),
      comboPlays: Math.max(taskProgressNum(cloud.comboPlays), taskProgressNum(row.comboPlays)),
      comboWins: Math.max(taskProgressNum(cloud.comboWins), taskProgressNum(row.comboWins)),
    });
  }
  return JSON.stringify([...byId.values()]);
}

// ── Ключи AsyncStorage которые синхронизируются с облаком ────────────────────
// Экспорт: тот же набор должен учитываться при сбросе локали после merge аккаунта (auth_provider).
export const SYNC_KEYS = [
  // ── Идентичность и базовый прогресс ────────────────────────────────────────
  'user_total_xp',
  'user_prev_xp',
  // XP-01: Weekly XP tracking — synced so users/{uid}.progress.weekly_xp matches device.
  'weekly_xp',
  'weekly_xp_period_start',
  'user_name',
  'user_avatar',
  'user_frame',
  'user_avatar_aura',
  'custom_avatar_owned_v1',
  'custom_avatar_gift_owned_v1',
  'avatar_aura_owned_v1',
  'avatar_aura_gift_owned_v1',
  'profile_card_level',
  'profile_card_theme',
  'profile_card_motion',
  'profile_card_public_focus',
  'gift_xp_bank_v1',
  'streak_count',
  'last_active_date',
  'streak_last_date',
  'unlocked_lessons',
  'flashcards',
  'achievements_state',
  'active_recall_items',
  'onboarding_done',
  'lang',
  'app_lang',

  // ── Лига / еженедельные очки ───────────────────────────────────────────────
  'league_state_v3',
  // Server-side weekly rollover writes this so the Monday result modal survives
  // cloud restore before the local league engine has a chance to recalculate.
  'league_result_pending',
  // Tombstone for the exact league result already dismissed on this account.
  'league_result_consumed_sig',
  'week_leaderboard',
  // КРИТИЧНО: реальный счётчик недельных очков для лиги (formula: members.{uid}.points).
  // Если не синкать — после очистки AsyncStorage недельные очки в league_groups
  // обнуляются и юзер падает на дно таблицы. См. leaderboard backfill в
  // functions/src/sync_leaderboard.ts (читает progress.week_points_v2).
  'week_points_v2',
  'daily_tasks_progress',
  'login_bonus_v1',
  /** Опыт по дням (график статистики) — без синка теряется на новом устройстве. */
  'daily_stats',

  // ── Премиум и его плюшки (без них юзер теряет купленные/активные бенефиты) ─
  'premium_plan',
  'admin_premium_override',
  /** UNIX ms когда истекает премиум; 0 или отсутствует = без срока (как оплаченная подписка в RC) */
  'premium_expiry',
  'premium_rc_product_id',
  'premium_rc_period_type',
  'premium_rc_store',
  'premium_rc_expiry_ms',
  'premium_rc_purchased_at_ms',
  'premium_rc_updated_at',
  'premium_admin_grant_at',
  'had_premium_ever',
  'streak_freeze',
  'premium_free_freeze_used',
  'chain_shield',
  'gift_xp_multiplier',
  'arena_daily_gift_bonus_v1',
  'flashcard_pack_trial_gift_v1',
  'club_gift_free_boost_v1',
  'wager_discount',

  // ── Зачёты уровней A1/A2/B1/B2 (без них unlock B1/B2 откатывается) ─────────
  'level_exam_A1_passed',
  'level_exam_A2_passed',
  'level_exam_B1_passed',
  'level_exam_B2_passed',
  'level_exam_A1_pct',
  'level_exam_A2_pct',
  'level_exam_B1_pct',
  'level_exam_B2_pct',
  'level_exam_A1_best_pct',
  'level_exam_A2_best_pct',
  'level_exam_B1_best_pct',
  'level_exam_B2_best_pct',
  'level_exam_A1_pass_count',
  'level_exam_A2_pass_count',
  'level_exam_B1_pass_count',
  'level_exam_B2_pass_count',

  // ── Финальный экзамен Лингмана: сертификат (объект JSON c именем, score, certId) ─
  // Без синка после переустановки сертификат пропадёт, и юзер не увидит свой
  // диплом, хотя зачёты A1..B2 и звёзды уроков остаются. См. exam_certificate.ts.
  'lingman_certificate_v1',

  // ── Карточки (юзерская библиотека + покупки) ───────────────────────────────
  'custom_flashcards_v2',
  'flashcards_progress_v1',
  'flashcards_owned_packs_v1',
  'community_owned_pack_ids_v1',
  'irregular_verbs_global',

  // ── Осколки: дополнительные ключи (баланс/история — отдельный канал) ───────
  // Сам баланс (shards) живёт в users/{uid}.shards и грузится через
  // loadShardsFromCloud(); здесь только защита от повтора single-time событий
  // и счётчик арены для milestone-бонусов.
  'shards_one_time_events',
  'shards_arena_wins_total',

  // ── UI / поведение ─────────────────────────────────────────────────────────
  // app_theme / app_font_size / haptics_tap — только локально на устройстве (см. wipeLocalAccountData KEEP).
  // Синк с облаком ломал тему: при restore облако перетирало выбор пользователя старым progress.
  'user_settings',
  /** Last diagnostic result: date, score and recommended level. */
  'diagnostic_last',
  'device_platform',
  'app_version',
  'user_stats_v1',
  'xp_migration_v2',
  'week_points_migrated_v1',

  // ── Время в приложении (foreground) — график «Время в приложении» ─────────
  'phraseman_foreground_usage_ms_v1',
  'phraseman_foreground_daily_ms_v1',

  // ── Блок «Весь путь» / метрики статистики (локально накапливаются) ─────────
  'lifetime_quiz_easy_v1',
  'lifetime_quiz_medium_v1',
  'lifetime_quiz_hard_v1',
  'lifetime_quiz_counters_migrated_v1',
  'lifetime_daily_tasks_claimed_v1',
  'shards_lifetime_earned_v1',
  'shards_lifetime_spent_v1',
  /** Посуточные счётчики для графиков «Весь путь» (JSON { дата → метрики }). */
  'stats_daily_breakdown_v1',

  // ── Уроки 1..32 (per-lesson) ───────────────────────────────────────────────
  // КРИТИЧНО: lesson{N}_best_score нужен для медалек уроков и для гейта зачёта
  // A1/A2/B1/B2 (требует ≥4.5★ на каждом уроке уровня) и Лингмана (5.0★).
  // Без синка на новом устройстве у юзера откроются все уроки (через unlocked_lessons),
  // но звёзды/медали будут пустые и зачёт сдать он не сможет.
  // pass_count — счётчик количества прохождений для статистики и медалек.
  // progress / listening / words — чтобы фразы и словарь переживали смену устройства
  // (payload ~десятки–сотни KB; в пределах лимита Firestore merge).
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_best_score`),
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_pass_count`),
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`),
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_listening_progress`),
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_words`),
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_intro_shown`),
] as const;
const CREATED_AT_SYNC_KEY = 'cloud_created_at_synced_v1';
const LAST_SYNC_SNAPSHOT_KEY = 'cloud_last_sync_snapshot_v1';
/** Ожидание чужого syncInFlight без лимита оставляло «Сменить аккаунт» на вечном спиннере при «зависшем» Firestore. */
const FORCE_SYNC_WAIT_INFLIGHT_MS = 25_000;
const FORCE_SYNC_FIRESTORE_WRITE_MS = 35_000;
const ANON_AUTH_READY_TIMEOUT_MS = 8_000;
const SYNC_DEBOUNCE_MS = 5 * 60_000;
const SYNC_HEARTBEAT_MS = 60 * 60_000;
const ACTIVITY_STAMP_INTERVAL_MS = 45 * 60_000;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<void> | null = null;
let pendingSync = false;
let lastSuccessfulSyncAt = 0;
let lastActivityStampAt = 0;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`forceSyncToCloud:${label}`)), ms);
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}

// ── Lazy getters — грузятся только если пакеты установлены ───────────────────
const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseProgressInt = (value: unknown): number => {
  const n = parseInt(String(value ?? '0'), 10);
  return Number.isFinite(n) ? n : 0;
};

const parseProgressFloat = (value: unknown): number => {
  const n = parseFloat(String(value ?? '0'));
  return Number.isFinite(n) ? n : 0;
};

const PREMIUM_PROGRESS_KEYS = new Set([
  'premium_plan',
  'admin_premium_override',
  'premium_expiry',
  'premium_rc_product_id',
  'premium_rc_period_type',
  'premium_rc_store',
  'premium_rc_expiry_ms',
  'premium_rc_purchased_at_ms',
  'premium_rc_updated_at',
  'premium_admin_grant_at',
  'had_premium_ever',
]);

const premiumValuePresent = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  return s !== '' && s !== 'null' && s !== 'undefined';
};

function hasLocalPremiumSyncState(data: Record<string, string | null>): boolean {
  const plan = String(data['premium_plan'] ?? '').trim().toLowerCase();
  if (plan && plan !== 'null' && plan !== 'undefined') return true;
  if (String(data['admin_premium_override'] ?? '').trim() === 'true') return true;
  if (parseProgressInt(data['premium_expiry']) > 0) return true;
  return [
    'premium_rc_product_id',
    'premium_rc_period_type',
    'premium_rc_store',
    'premium_rc_expiry_ms',
    'premium_rc_purchased_at_ms',
    'premium_rc_updated_at',
  ].some((key) => premiumValuePresent(data[key]));
}

export function shouldSyncPremiumProgressField(
  key: string,
  value: string | null,
  data: Record<string, string | null>,
): boolean {
  if (!PREMIUM_PROGRESS_KEYS.has(key)) return true;
  if (!hasLocalPremiumSyncState(data)) return false;
  if (key === 'premium_expiry') return value !== null && value !== undefined && String(value).trim() !== '';
  return premiumValuePresent(value);
}

const LESSON_RESTORE_MERGE_KEYS = Array.from({ length: 32 }, (_, i) => {
  const lessonId = i + 1;
  return [
    `lesson${lessonId}_best_score`,
    `lesson${lessonId}_pass_count`,
    `lesson${lessonId}_progress`,
  ];
}).flat();

function parseLessonProgressArray(raw: unknown): string[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : null;
  } catch {
    return null;
  }
}

function lessonProgressQuality(raw: unknown): { correct: number; wrong: number; total: number } | null {
  const arr = parseLessonProgressArray(raw);
  if (!arr) return null;
  let correct = 0;
  let wrong = 0;
  for (const x of arr) {
    if (x === 'correct' || x === 'replay_correct') correct++;
    else if (x === 'wrong') wrong++;
  }
  return { correct, wrong, total: arr.length };
}

function mergeLessonRestoreValue(
  key: string,
  cloudValue: string,
  localValue: string | null | undefined,
): string {
  if (/^lesson\d+_pass_count$/.test(key)) {
    return String(Math.max(parseProgressInt(cloudValue), parseProgressInt(localValue)));
  }
  if (/^lesson\d+_best_score$/.test(key)) {
    return String(Math.max(parseProgressFloat(cloudValue), parseProgressFloat(localValue)));
  }
  if (/^lesson\d+_progress$/.test(key)) {
    const cloudQuality = lessonProgressQuality(cloudValue);
    const localQuality = lessonProgressQuality(localValue);
    if (!cloudQuality || !localQuality) return cloudValue;
    if (localQuality.correct > cloudQuality.correct) return localValue ?? cloudValue;
    if (localQuality.correct < cloudQuality.correct) return cloudValue;
    if (localQuality.wrong < cloudQuality.wrong) return localValue ?? cloudValue;
    return cloudValue;
  }
  return cloudValue;
}

function latestDateKeyFromJsonMap(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const dates = Object.keys(parsed).filter(isDateKey).sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  } catch {
    return null;
  }
}

export function deriveLastActiveDateForRestore(cloudData: Record<string, string | null>): string | null {
  if (isDateKey(cloudData['last_active_date'])) return cloudData['last_active_date'];
  if (isDateKey(cloudData['streak_last_date'])) return cloudData['streak_last_date'];
  return (
    latestDateKeyFromJsonMap(cloudData['daily_stats']) ??
    latestDateKeyFromJsonMap(cloudData['stats_daily_breakdown_v1'])
  );
}

const getAuth = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/auth').default();
  } catch {
    return null;
  }
};

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

// ── Получить или создать анонимного пользователя ─────────────────────────────
// Возвращает stable ID (переживает переустановку), при наличии Firebase — также входит анонимно.
// ВАЖНО: ждём signInAnonymously чтобы избежать гонки на холодном старте — иначе
// первые Firestore операции (league_groups, leaderboard write) падают с PERMISSION_DENIED.
let _anonAuthReady: Promise<void> | null = null;
function ensureAnonAuthReady(): Promise<void> {
  if (_anonAuthReady) return _anonAuthReady;
  const auth = getAuth();
  if (!auth) return Promise.resolve();
  if (auth.currentUser) return Promise.resolve();
  _anonAuthReady = (async () => {
    try {
      await withTimeout(auth.signInAnonymously(), ANON_AUTH_READY_TIMEOUT_MS, 'anon_auth_ready');
    } catch {
      // офлайн / транзиентная ошибка — следующий вызов ensureAnonUser
      // увидит !currentUser и попробует снова.
      _anonAuthReady = null;
    }
  })();
  return _anonAuthReady;
}

export async function ensureAnonUser(): Promise<string | null> {
  if (!CLOUD_SYNC_ENABLED) return null;
  // Всегда используем canonical stable ID как ключ users/*
  const stableId = await getCanonicalUserId();
  await ensureAnonAuthReady();
  return stableId;
}

/**
 * Сбросить in-memory кеш ensureAnonAuthReady().
 * Вызывается из auth_provider.signOutCurrentProvider() после auth.signOut(),
 * чтобы следующий ensureAnonUser() заново вызвал signInAnonymously().
 * Без этого после force sign-out + любого Firestore write словим PERMISSION_DENIED
 * до перезапуска приложения (currentUser=null, но закешированный resolved Promise
 * убеждает все вызывающие что "анонимная сессия уже готова").
 */
export function resetAnonAuthCacheForSignOut(): void {
  _anonAuthReady = null;
  clearArenaAuthUidCache();
}

// ── Получить uid текущего пользователя ───────────────────────────────────────
export function getCurrentUid(): string | null {
  return getAuthUserId();
}

// ── Синхронизировать прогресс в облако ───────────────────────────────────────
// Вызывать после важных событий: завершение урока, изменение XP, streak и т.д.
export async function syncToCloud(options?: { forceNow?: boolean }): Promise<void> {
  pendingSync = true;
  if (syncInFlight) return;
  if (options?.forceNow) {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    await runSyncNow();
    return;
  }
  const now = Date.now();
  const elapsed = now - lastSuccessfulSyncAt;
  if (elapsed >= SYNC_DEBOUNCE_MS) {
    await runSyncNow();
    return;
  }
  if (syncTimer) return;
  const waitMs = Math.max(500, SYNC_DEBOUNCE_MS - elapsed);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    runSyncNow().catch(() => {});
  }, waitMs);
}

async function runSyncNow(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = doSyncToCloud()
    .catch(() => {})
    .finally(() => {
      syncInFlight = null;
      if (pendingSync) {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
          syncTimer = null;
          runSyncNow().catch(() => {});
        }, SYNC_DEBOUNCE_MS);
      }
    });
  return syncInFlight;
}

/** Після restore зі snapshot старі taskId у JSON — наступний load підтягує getTodayTasksSafe() і перезаписує ключ. */
async function reconcileRestoredDayDailyStorageIfNeeded(hadCloudDaily: boolean): Promise<void> {
  if (!hadCloudDaily) return;
  try {
    const list = await getTodayTasksSafe();
    if (list.length > 0) await loadTodayProgress(list);
  } catch { /* empty */ }
}

function safeParseObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function numField(obj: Record<string, unknown>, key: string): number {
  const n = typeof obj[key] === 'number' ? obj[key] : Number(obj[key]);
  return Number.isFinite(n) ? n : 0;
}

function loginBonusMergeValue(localRaw: string | null, cloudRaw: string | null | undefined): string | null {
  if (cloudRaw === null || cloudRaw === undefined || !String(cloudRaw).trim()) return null;
  const cloud = safeParseObject(cloudRaw);
  const local = safeParseObject(localRaw);
  const cloudLastDate = typeof cloud.lastDate === 'string' ? cloud.lastDate : null;
  const localLastDate = typeof local.lastDate === 'string' ? local.lastDate : null;
  if (!isDateKey(cloudLastDate)) return null;
  if (!isDateKey(localLastDate) || cloudLastDate > localLastDate) return String(cloudRaw);
  if (cloudLastDate === localLastDate && numField(cloud, 'consecutiveDays') > numField(local, 'consecutiveDays')) {
    return String(cloudRaw);
  }
  return null;
}

function newerDateKeyValue(localRaw: string | null, cloudRaw: string | null | undefined): string | null {
  if (!isDateKey(cloudRaw)) return null;
  if (!isDateKey(localRaw) || cloudRaw > localRaw) return cloudRaw;
  return null;
}

async function buildGiftEntitlementStickyPairs(cloudData: Record<string, string | null>): Promise<[string, string][]> {
  const pairs: [string, string][] = [];

  const cloudShield = cloudData['chain_shield'];
  if (cloudShield) {
    const [localRaw, cloud] = await Promise.all([
      AsyncStorage.getItem('chain_shield'),
      Promise.resolve(safeParseObject(cloudShield)),
    ]);
    const local = safeParseObject(localRaw);
    if (numField(cloud, 'daysLeft') > numField(local, 'daysLeft')) {
      pairs.push(['chain_shield', String(cloudShield)]);
    }
  }

  const cloudXpBoost = cloudData['gift_xp_multiplier'];
  if (cloudXpBoost) {
    const [localRaw, cloud] = await Promise.all([
      AsyncStorage.getItem('gift_xp_multiplier'),
      Promise.resolve(safeParseObject(cloudXpBoost)),
    ]);
    const local = safeParseObject(localRaw);
    if (numField(cloud, 'expiresAt') > numField(local, 'expiresAt')) {
      pairs.push(['gift_xp_multiplier', String(cloudXpBoost)]);
    }
  }

  const cloudArenaBonus = cloudData['arena_daily_gift_bonus_v1'];
  if (cloudArenaBonus) {
    const [localRaw, cloud] = await Promise.all([
      AsyncStorage.getItem('arena_daily_gift_bonus_v1'),
      Promise.resolve(safeParseObject(cloudArenaBonus)),
    ]);
    const local = safeParseObject(localRaw);
    if (
      typeof cloud.date === 'string' &&
      (cloud.date !== local.date || numField(cloud, 'extra') > numField(local, 'extra'))
    ) {
      pairs.push(['arena_daily_gift_bonus_v1', String(cloudArenaBonus)]);
    }
  }

  return pairs;
}

async function doSyncToCloud(): Promise<void> {
  if (!pendingSync) return;
  pendingSync = false;
  if (!CLOUD_SYNC_ENABLED) return;
  const db = getFirestore();
  if (!db) return;
  const uid = await ensureAnonUser();
  if (!uid) return;
  try {
    await repairDevSeededStreakInStorage();
    const pairs = await AsyncStorage.multiGet([...SYNC_KEYS]);
    const data: Record<string, string | null> = {};
    for (const [key, value] of pairs) {
      data[key] = value;
    }
    // Маппинг: внутренние ключи → ключи Firestore для аналитики
    const achievementsV1 = await AsyncStorage.getItem('achievements_v1');
    if (achievementsV1) data['achievements_state'] = achievementsV1;
    if (data['app_lang']) data['lang'] = data['app_lang'];
    if (data['user_frame']) data['user_avatar_frame'] = data['user_frame'];

    // Дополнительно синхронизируем сегодняшние задания под фиксированным ключом
    const todayKey = getTodayKey();
    const todayTasks = await AsyncStorage.getItem('daily_tasks_' + todayKey);
    if (todayTasks) data['daily_tasks_progress'] = todayTasks;

    // Сравниваем с последним синкнутым снапшотом и отправляем только изменённые поля.
    // Это снижает сетевой шум и частоту "пустых" write-операций.
    let previousSnapshot: Record<string, string | null> = {};
    try {
      const snapRaw = await AsyncStorage.getItem(LAST_SYNC_SNAPSHOT_KEY);
      if (snapRaw) previousSnapshot = JSON.parse(snapRaw);
    } catch {}
    const progressPatch: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!shouldSyncPremiumProgressField(key, value, data)) continue;
      if (previousSnapshot[key] !== value) progressPatch[key] = value;
    }

    // Set created_at without per-sync read to reduce Firestore read costs.
    // We keep a local marker and send created_at only once per install/session migration.
    const now = Date.now();
    const needHeartbeat = now - lastSuccessfulSyncAt >= SYNC_HEARTBEAT_MS;
    const needActivityStamp = now - lastActivityStampAt >= ACTIVITY_STAMP_INTERVAL_MS;
    if (!needHeartbeat && !needActivityStamp && Object.keys(progressPatch).length === 0) return;
    const docRef = db.collection('users').doc(uid);
    const createdAtSynced = await AsyncStorage.getItem(CREATED_AT_SYNC_KEY);
    const shouldSendCreatedAt = !createdAtSynced;
    // Дружба / friend_requests rules: ключ в пути users/{stableId}/… но senderUid должен доказать
    // связь с текущей Firebase-сессией — см. firestore.rules canonicalUserMatchesAuth + firebaseAuthUid.
    const firebaseAuthUidRow = getAuthUserId();
    await docRef.set(
      {
        ...(firebaseAuthUidRow ? { firebaseAuthUid: firebaseAuthUidRow } : {}),
        ...(data['user_avatar'] ? { user_avatar: data['user_avatar'] } : {}),
        ...(data['user_avatar_frame'] ? { user_avatar_frame: data['user_avatar_frame'] } : {}),
        ...(Object.keys(progressPatch).length > 0 ? { progress: progressPatch } : {}),
        ...(needActivityStamp || needHeartbeat || shouldSendCreatedAt ? { updatedAt: now, last_active_at: now } : {}),
        ...(shouldSendCreatedAt ? { created_at: now } : {}),
      },
      { merge: true }
    );
    // Снимок уровня/аватара на arena_profiles — топ арены читает всем одну коллекцию.
    if (firebaseAuthUidRow) {
      try {
        const arenaUid = await ensureArenaAuthUid();
        if (arenaUid === firebaseAuthUidRow) {
          const totalXp = parseInt(data['user_total_xp'] ?? '0', 10) || 0;
          const avatar = (data['user_avatar'] ?? '').trim();
          const frame = (data['user_frame'] ?? '').trim();
          const aura = (data['user_avatar_aura'] ?? '').trim();
          const profileCardLevel = Math.max(0, Math.min(5, parseInt(data['profile_card_level'] ?? '0', 10) || 0));
          const profileCardTheme = (data['profile_card_theme'] ?? 'classic').trim() || 'classic';
          const profileCardMotion = (data['profile_card_motion'] ?? 'none').trim() || 'none';
          const profileCardPublicFocus = (data['profile_card_public_focus'] ?? 'balanced').trim() || 'balanced';
          await db
            .collection('arena_profiles')
            .doc(arenaUid)
            .set(
              {
                courseTotalXp: totalXp,
                courseAvatar: avatar || null,
                courseFrame: frame || null,
                courseAura: aura || null,
                courseProfileCardLevel: profileCardLevel,
                courseProfileCardTheme: profileCardTheme,
                courseProfileCardMotion: profileCardMotion,
                courseProfileCardPublicFocus: profileCardPublicFocus,
                courseDisplayAt: now,
                mirrorStableId: uid,
              },
              { merge: true },
            );
        }
      } catch {
        /* ignore */
      }
    }
    lastSuccessfulSyncAt = now;
    if (needActivityStamp || needHeartbeat || shouldSendCreatedAt) {
      lastActivityStampAt = now;
    }
    const snapshotData: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(data)) {
      if (shouldSyncPremiumProgressField(key, value, data)) snapshotData[key] = value;
    }
    await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(snapshotData)).catch(() => {});
    if (shouldSendCreatedAt) {
      await AsyncStorage.setItem(CREATED_AT_SYNC_KEY, '1').catch(() => {});
    }

    // leaderboard/{uid} обновляется только через firestore_leaderboard.ts (pushMyScore)
    // + backend reconcile в functions/src/sync_leaderboard.ts.
    // Здесь сознательно НЕ пишем leaderboard, чтобы исключить dual-writer гонки.
  } catch {
    // Синхронизация fire-and-forget: ошибки не ломают основной флоу
  }
}

// ── Восстановить прогресс из документа users/{uid} (без повторного get) ─────
async function applyRestoreFromUserDoc(doc: { exists: boolean; data: () => Record<string, unknown> | undefined }): Promise<boolean> {
  if (!doc.exists) return false;
  const root = doc.data() ?? {};
  if (root.created_at) {
    AsyncStorage.setItem(CREATED_AT_SYNC_KEY, '1').catch(() => {});
  }
  const cloudData: Record<string, string | null> = (root.progress ?? {}) as Record<string, string | null>;
  const restoredLastActiveDate = deriveLastActiveDateForRestore(cloudData);
  if (restoredLastActiveDate && !isDateKey(cloudData['last_active_date'])) {
    cloudData['last_active_date'] = restoredLastActiveDate;
  }
  const normalizedCloudStreak = normalizeDevSeededStreakValue(parseProgressInt(cloudData['streak_count']), cloudData);
  if (String(cloudData['streak_count'] ?? '') !== String(normalizedCloudStreak)) {
    cloudData['streak_count'] = String(normalizedCloudStreak);
  }

  try {
    const { reconcileStatsDailyBreakdownWithCloud } = await import('./stats_daily_breakdown');
    cloudData['stats_daily_breakdown_v1'] = await reconcileStatsDailyBreakdownWithCloud(
      cloudData['stats_daily_breakdown_v1'],
    );
  } catch {
    /* ignore */
  }

  const cloudHasPremiumAdminState =
    cloudData['premium_plan'] !== undefined ||
    cloudData['admin_premium_override'] !== undefined ||
    cloudData['premium_expiry'] !== undefined;

  // Premium granted by admin via admin/index.html: progress.premium_admin_grant_at — unix ms строка.
  // Если timestamp новее нашего last seen marker — поднимает pending для PremiumCelebrationModal.
  // Срабатывает один раз на каждый grant (повторная выдача ставит новый ts → снова сработает).
  // Revoked or expired admin grants can keep the old timestamp in progress.
  const cloudPremiumPlan = String(cloudData['premium_plan'] ?? '').trim();
  const cloudPremiumExpiry = parseProgressInt(cloudData['premium_expiry']);
  const cloudAdminPremiumActive =
    String(cloudData['admin_premium_override'] ?? '').trim() === 'true' &&
    !!cloudPremiumPlan &&
    cloudPremiumPlan !== 'null' &&
    (cloudPremiumExpiry <= 0 || cloudPremiumExpiry > Date.now());
  void processAdminGrantForCelebration(
    cloudAdminPremiumActive ? cloudData['premium_admin_grant_at'] : null,
  );

  const localXPRaw = await AsyncStorage.getItem('user_total_xp');
  const localStreakRaw = await AsyncStorage.getItem('streak_count');
  const localXP = parseProgressInt(localXPRaw);
  const cloudXP = parseProgressInt(cloudData['user_total_xp']);
  const localStreak = parseProgressInt(localStreakRaw);
  const cloudStreak = parseProgressInt(cloudData['streak_count']);
  const shouldRestoreCloudProgress =
    cloudXP > localXP || (cloudXP === localXP && cloudStreak > localStreak);
  if (!shouldRestoreCloudProgress) {
    const stickyKeys = [
      'premium_plan',
      'admin_premium_override',
      'premium_expiry',
      'premium_rc_product_id',
      'premium_rc_period_type',
      'premium_rc_store',
      'premium_rc_expiry_ms',
      'premium_rc_purchased_at_ms',
      'premium_rc_updated_at',
      'premium_admin_grant_at',
    ] as const;
    const stickyPairs: [string, string][] = [];
    for (const key of stickyKeys) {
      const val = cloudData[key];
      if (val !== null && val !== undefined) stickyPairs.push([key, val]);
    }
    // Локальный XP ≥ облачного, но ник мог остаться только в облаке (другой девайс / сбой записи).
    const localNameRaw = await AsyncStorage.getItem('user_name');
    const localName = (localNameRaw ?? '').trim();
    const cloudName = cloudData['user_name'];
    if (!localName && cloudName != null && String(cloudName).trim() !== '') {
      stickyPairs.push(['user_name', String(cloudName).trim()]);
    }
    const cloudLastActive = cloudData['last_active_date'];
    const localLastActive = await AsyncStorage.getItem('last_active_date');
    const mergedLastActive = newerDateKeyValue(localLastActive, cloudLastActive);
    if (mergedLastActive !== null) {
      stickyPairs.push(['last_active_date', mergedLastActive]);
    }
    const cloudLoginBonus = cloudData['login_bonus_v1'];
    const localLoginBonus = await AsyncStorage.getItem('login_bonus_v1');
    const mergedLoginBonus = loginBonusMergeValue(localLoginBonus, cloudLoginBonus);
    if (mergedLoginBonus !== null) {
      stickyPairs.push(['login_bonus_v1', mergedLoginBonus]);
    }
    const cloudDaily = cloudData['daily_tasks_progress'];
    let restoredDailyTasksToLocal = false;
    if (cloudDaily) {
      const dk = `daily_tasks_${getTodayKey()}`;
      const localDaily = await AsyncStorage.getItem(dk);
      if (!localDaily) {
        stickyPairs.push([dk, cloudDaily]);
        restoredDailyTasksToLocal = true;
      }
    }
    const cloudLeaguePending = cloudData['league_result_pending'];
    const cloudLeaguePendingSig = leagueResultSignature(cloudLeaguePending);
    const localConsumedSig = await AsyncStorage.getItem('league_result_consumed_sig');
    const cloudConsumedSig = cloudData['league_result_consumed_sig'];
    const shouldRestoreLeaguePending =
      cloudLeaguePending !== null &&
      cloudLeaguePending !== undefined &&
      cloudLeaguePendingSig !== null &&
      cloudLeaguePendingSig !== localConsumedSig &&
      cloudLeaguePendingSig !== cloudConsumedSig;
    if (shouldRestoreLeaguePending) {
      stickyPairs.push(['league_result_pending', String(cloudLeaguePending)]);
      const cloudLeagueState = cloudData['league_state_v3'];
      if (cloudLeagueState !== null && cloudLeagueState !== undefined) {
        stickyPairs.push(['league_state_v3', String(cloudLeagueState)]);
      }
    }
    stickyPairs.push(...await buildGiftEntitlementStickyPairs(cloudData));
    if (stickyPairs.length > 0) {
      await AsyncStorage.multiSet(stickyPairs);
      if (cloudHasPremiumAdminState) invalidatePremiumCache();
      await reconcileRestoredDayDailyStorageIfNeeded(restoredDailyTasksToLocal);
      await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify({ ...cloudData })).catch(() => {});
      return true;
    }
    return false;
  }

  const pairs: [string, string][] = [];
  const localLessonRestoreMap = Object.fromEntries(
    await AsyncStorage.multiGet(LESSON_RESTORE_MERGE_KEYS),
  ) as Record<string, string | null>;
  const localConsumedSig = await AsyncStorage.getItem('league_result_consumed_sig');
  const cloudConsumedSig = cloudData['league_result_consumed_sig'];
  for (const key of SYNC_KEYS) {
    const val = cloudData[key];
    if (val !== null && val !== undefined) {
      if (key === 'league_result_pending') {
        const pendingSig = leagueResultSignature(val);
        if (pendingSig && (pendingSig === localConsumedSig || pendingSig === cloudConsumedSig)) {
          continue;
        }
      }
      pairs.push([key, mergeLessonRestoreValue(key, String(val), localLessonRestoreMap[key])]);
    }
  }
  if (cloudData['achievements_state']) pairs.push(['achievements_v1', cloudData['achievements_state']]);
  if (cloudData['lang']) pairs.push(['app_lang', cloudData['lang']]);
  if (cloudData['user_avatar_frame']) pairs.push(['user_frame', cloudData['user_avatar_frame']]);
  const dailyBlob = cloudData['daily_tasks_progress'];
  const fullRestoreDaily = dailyBlob != null && dailyBlob !== '';
  if (fullRestoreDaily) {
    const dk = `daily_tasks_${getTodayKey()}`;
    const localDailyForMerge = await AsyncStorage.getItem(dk);
    pairs.push([dk, mergeDailyTasksProgressForRestore(localDailyForMerge, String(dailyBlob))]);
  }
  if (pairs.length > 0) {
    await AsyncStorage.multiSet(pairs);
    if (cloudHasPremiumAdminState) invalidatePremiumCache();
  }
  if (fullRestoreDaily) {
    await reconcileRestoredDayDailyStorageIfNeeded(true);
  }
  await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify({ ...cloudData })).catch(() => {});
  return true;
}

/**
 * Один get users/{uid}: миграция «пустое облако» + мерж прогресса.
 * Снижает чтения Firestore по сравнению с restoreFromCloud + migrateLocalProgressToCloud.
 */
export async function restoreAndMigrateFromCloud(): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED) return false;
  const db = getFirestore();
  if (!db) return false;
  const uid = await ensureAnonUser();
  if (!uid) return false;
  try {
    const doc = await db.collection('users').doc(uid).get();
    const migrated = await AsyncStorage.getItem('cloud_migration_v1');
    if (!migrated) {
      if (!doc.exists) {
        await syncToCloud();
        await AsyncStorage.setItem('cloud_migration_v1', '1').catch(() => {});
        return false;
      }
      await AsyncStorage.setItem('cloud_migration_v1', '1').catch(() => {});
    }
    return await applyRestoreFromUserDoc(doc);
  } catch {
    return false;
  }
}

// ── Восстановить прогресс из облака ─────────────────────────────────────────
// Вызывается при старте приложения ПОСЛЕ того как определён uid.
// Если локальный XP > облачного — локальные данные побеждают (не перезаписываем).
export async function restoreFromCloud(): Promise<boolean> {
  return restoreAndMigrateFromCloud();
}

export const __cloudSyncTestHooks = {
  applyRestoreFromUserDoc,
};

// ── Одноразовая миграция локального прогресса в облако ──────────────────────
// Запускается один раз при первом запуске после обновления.
// Пушит локальные данные в Firestore только если облако пустое.
export async function migrateLocalProgressToCloud(): Promise<void> {
  await restoreAndMigrateFromCloud();
}

// ── Принудительный синк с проверкой результата ───────────────────────────────
// В отличие от syncToCloud({forceNow:true}), эта функция возвращает true/false:
//   true  — данные действительно ушли в облако (или нечего отправлять).
//   false — Firestore недоступен / нет интернета / ошибка записи.
//
// Используется во flow "Сменить аккаунт" перед очисткой локального кеша,
// чтобы не потерять прогресс при отсутствии связи.
export async function forceSyncToCloud(): Promise<boolean> {
  if (!CLOUD_SYNC_ENABLED) return true; // в Expo Go считаем что "локально и так всё"
  const db = getFirestore();
  if (!db) return false;
  const uid = await ensureAnonUser();
  if (!uid) return false;
  try {
    pendingSync = true;
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    // Дожидаемся завершения текущего синка (если он в полёте), затем запускаем свой.
    if (syncInFlight) {
      try {
        await withTimeout(syncInFlight, FORCE_SYNC_WAIT_INFLIGHT_MS, 'wait_inflight');
      } catch {
        pendingSync = false;
        if (__DEV__) console.warn('[cloud_sync] forceSyncToCloud: inflight sync timeout');
        return false;
      }
    }
    // doSyncToCloud глотает ошибки внутри, так что обернём напрямую без try-catch фасада:
    // повторим логику записи минимально-инвазивно, ловя ошибки явно.
    await repairDevSeededStreakInStorage();
    const pairs = await AsyncStorage.multiGet([...SYNC_KEYS]);
    const data: Record<string, string | null> = {};
    for (const [key, value] of pairs) data[key] = value;
    const achievementsV1 = await AsyncStorage.getItem('achievements_v1');
    if (achievementsV1) data['achievements_state'] = achievementsV1;
    if (data['app_lang']) data['lang'] = data['app_lang'];
    if (data['user_frame']) data['user_avatar_frame'] = data['user_frame'];
    const todayKey = getTodayKey();
    const todayTasks = await AsyncStorage.getItem('daily_tasks_' + todayKey);
    if (todayTasks) data['daily_tasks_progress'] = todayTasks;
    for (const [key, value] of Object.entries({ ...data })) {
      if (!shouldSyncPremiumProgressField(key, value, data)) delete data[key];
    }

    const now = Date.now();
    const docRef = db.collection('users').doc(uid);
    const createdAtSynced = await AsyncStorage.getItem(CREATED_AT_SYNC_KEY);
    const shouldSendCreatedAt = !createdAtSynced;
    await withTimeout(
      docRef.set(
        {
          progress: data,
          ...(data['user_avatar'] ? { user_avatar: data['user_avatar'] } : {}),
          ...(data['user_avatar_frame'] ? { user_avatar_frame: data['user_avatar_frame'] } : {}),
          updatedAt: now,
          last_active_at: now,
          ...(shouldSendCreatedAt ? { created_at: now } : {}),
        },
        { merge: true },
      ),
      FORCE_SYNC_FIRESTORE_WRITE_MS,
      'firestore_set',
    );
    const firebaseAuthUidRow = getAuthUserId();
    if (firebaseAuthUidRow) {
      try {
        const arenaUid = await ensureArenaAuthUid();
        if (arenaUid === firebaseAuthUidRow) {
          const totalXp = parseInt(data['user_total_xp'] ?? '0', 10) || 0;
          const avatar = (data['user_avatar'] ?? '').trim();
          const frame = (data['user_frame'] ?? '').trim();
          const aura = (data['user_avatar_aura'] ?? '').trim();
          const profileCardLevel = Math.max(0, Math.min(5, parseInt(data['profile_card_level'] ?? '0', 10) || 0));
          const profileCardTheme = (data['profile_card_theme'] ?? 'classic').trim() || 'classic';
          const profileCardMotion = (data['profile_card_motion'] ?? 'none').trim() || 'none';
          const profileCardPublicFocus = (data['profile_card_public_focus'] ?? 'balanced').trim() || 'balanced';
          await withTimeout(
            db.collection('arena_profiles').doc(arenaUid).set(
              {
                courseTotalXp: totalXp,
                courseAvatar: avatar || null,
                courseFrame: frame || null,
                courseAura: aura || null,
                courseProfileCardLevel: profileCardLevel,
                courseProfileCardTheme: profileCardTheme,
                courseProfileCardMotion: profileCardMotion,
                courseProfileCardPublicFocus: profileCardPublicFocus,
                courseDisplayAt: now,
                mirrorStableId: uid,
              },
              { merge: true },
            ),
            FORCE_SYNC_FIRESTORE_WRITE_MS,
            'arena_profile_set',
          );
        }
      } catch {
        /* ignore */
      }
    }
    lastSuccessfulSyncAt = now;
    lastActivityStampAt = now;
    pendingSync = false;
    await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(data)).catch(() => {});
    if (shouldSendCreatedAt) {
      await AsyncStorage.setItem(CREATED_AT_SYNC_KEY, '1').catch(() => {});
    }
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[cloud_sync] forceSyncToCloud failed', e);
    pendingSync = false;
    return false;
  }
}

// ── Очистка локального прогресса аккаунта ───────────────────────────────────
// Используется во flow "Сменить аккаунт" ПОСЛЕ успешного forceSyncToCloud.
// Удаляет всё что относится к юзеру/прогрессу, но СОХРАНЯЕТ настройки устройства
// (язык, тема, размер шрифта, haptics) — это per-device preferences, а не per-account.
//
// ВАЖНО: stable_id не трогаем тут — это делает clearStableId() в stable_id.ts.
export async function wipeLocalAccountData(): Promise<void> {
  const accountKeys = new Set<string>([
    ...SYNC_KEYS,
    // Доп. ключи которые синкаются под другими именами или субколлекциями:
    'achievements_v1', // мапится на achievements_state
    'daily_tasks_progress',
    // Шарды: баланс и служебные (баланс перетянется loadShardsFromCloud,
    // но для нового аккаунта он стартует с 0).
    'shards_balance',
    // Bookkeeping синка (новый stable_id = новая история синка)
    LAST_SYNC_SNAPSHOT_KEY,
    CREATED_AT_SYNC_KEY,
    'cloud_migration_v1',
    // Сегодняшний день daily_tasks тоже надо снести (у нового аккаунта свой)
    `daily_tasks_${getTodayKey()}`,
    // Кэши лидербордов (содержат предыдущего юзера)
    'global_lb_cache', 'leaderboard_cache_v1', 'last_known_league_rank',
    'league_result_pending', 'week_leaderboard',
    // Прочее account-level
    'last_active_date', 'comeback_active', 'comeback_pending',
    'bug_hunt_shown', 'flashcard_anim_pending', 'flashcard_delete_hint_seen',
    'energy_state', 'energy_onboarding_shown',
    'daily_treasure_state', 'install_date',
    'login_bonus_v1', 'last_opened_lesson',
    'diagnostic_last',
  ]);
  // Сохраняем НЕ-аккаунтные настройки устройства:
  const KEEP = new Set<string>(['app_theme', 'app_font_size', 'haptics_tap']);
  const toRemove = Array.from(accountKeys).filter((k) => !KEEP.has(k));
  try {
    await AsyncStorage.multiRemove(toRemove);
  } catch (e) {
    if (__DEV__) console.warn('[cloud_sync] wipeLocalAccountData partial failure', e);
  }
  // Сбрасываем in-memory bookkeeping синка
  lastSuccessfulSyncAt = 0;
  lastActivityStampAt = 0;
  pendingSync = false;
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}

// ── Удалить все данные пользователя из облака ────────────────────────────────
// Вызывается при нажатии "Удалить аккаунт" в настройках.
export async function deleteCloudData(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED) return;
  const db = getFirestore();
  const auth = getAuth();
  if (!db || !auth) return;
  const canonicalUid = await getCanonicalUserId();
  const authUid = auth.currentUser?.uid ?? null;
  if (!canonicalUid && !authUid) return;
  try {
    // Delete both canonical and auth docs (if different) to avoid identity drift leftovers.
    const docIds = Array.from(new Set([canonicalUid, authUid].filter(Boolean) as string[]));
    await Promise.all(docIds.map((id) => db.collection('users').doc(id).delete().catch(() => {})));
    // Удаляем аккаунт Firebase (требование Apple — удалять, а не только данные)
    await auth.currentUser?.delete();
  } catch {
    // Игнорируем — локальные данные уже удалены через AsyncStorage.clear()
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
