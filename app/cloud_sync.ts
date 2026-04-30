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
import {
  clearArenaAuthUidCache, getCanonicalUserId, getAuthUserId,
} from './user_id_policy';

// ── Ключи AsyncStorage которые синхронизируются с облаком ────────────────────
const SYNC_KEYS = [
  // ── Идентичность и базовый прогресс ────────────────────────────────────────
  'user_total_xp',
  'user_prev_xp',
  'user_name',
  'user_avatar',
  'user_frame',
  'streak_count',
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
  'week_leaderboard',
  // КРИТИЧНО: реальный счётчик недельных очков для лиги (formula: members.{uid}.points).
  // Если не синкать — после очистки AsyncStorage недельные очки в league_groups
  // обнуляются и юзер падает на дно таблицы. См. leaderboard backfill в
  // functions/src/sync_leaderboard.ts (читает progress.week_points_v2).
  'week_points_v2',
  'daily_tasks_progress',

  // ── Премиум и его плюшки (без них юзер теряет купленные/активные бенефиты) ─
  'premium_plan',
  'admin_premium_override',
  /** UNIX ms когда истекает премиум; 0 или отсутствует = без срока (как оплаченная подписка в RC) */
  'premium_expiry',
  'had_premium_ever',
  'streak_freeze',
  'premium_free_freeze_used',
  'chain_shield',
  'gift_xp_multiplier',

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
  'app_theme',
  'app_font_size',
  'haptics_tap',
  'user_settings',
  'placement_level',
  'device_platform',
  'app_version',
  'user_stats_v1',
  'xp_migration_v2',
  'week_points_migrated_v1',

  // ── Уроки 1..32 (per-lesson) ───────────────────────────────────────────────
  // КРИТИЧНО: lesson{N}_best_score нужен для медалек уроков и для гейта зачёта
  // A1/A2/B1/B2 (требует ≥4.5★ на каждом уроке уровня) и Лингмана (5.0★).
  // Без синка на новом устройстве у юзера откроются все уроки (через unlocked_lessons),
  // но звёзды/медали будут пустые и зачёт сдать он не сможет.
  // pass_count — счётчик количества прохождений для статистики и медалек.
  // Тяжёлые ключи (lesson{N}_progress / _listening_progress — массивы ответов
  // 50 шт. на урок) НЕ синкаем, чтобы не раздувать payload syncToCloud.
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_best_score`),
  ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_pass_count`),
] as const;
const CREATED_AT_SYNC_KEY = 'cloud_created_at_synced_v1';
const LAST_SYNC_SNAPSHOT_KEY = 'cloud_last_sync_snapshot_v1';
const SYNC_DEBOUNCE_MS = 5 * 60_000;
const SYNC_HEARTBEAT_MS = 60 * 60_000;
const ACTIVITY_STAMP_INTERVAL_MS = 45 * 60_000;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<void> | null = null;
let pendingSync = false;
let lastSuccessfulSyncAt = 0;
let lastActivityStampAt = 0;

// ── Lazy getters — грузятся только если пакеты установлены ───────────────────
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
      await auth.signInAnonymously();
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

async function doSyncToCloud(): Promise<void> {
  if (!pendingSync) return;
  pendingSync = false;
  if (!CLOUD_SYNC_ENABLED) return;
  const db = getFirestore();
  if (!db) return;
  const uid = await ensureAnonUser();
  if (!uid) return;
  try {
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
    await docRef.set(
      {
        ...(Object.keys(progressPatch).length > 0 ? { progress: progressPatch } : {}),
        ...(needActivityStamp || needHeartbeat || shouldSendCreatedAt ? { updatedAt: now, last_active_at: now } : {}),
        ...(shouldSendCreatedAt ? { created_at: now } : {}),
      },
      { merge: true }
    );
    lastSuccessfulSyncAt = now;
    if (needActivityStamp || needHeartbeat || shouldSendCreatedAt) {
      lastActivityStampAt = now;
    }
    await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify(data)).catch(() => {});
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

  const localXPRaw = await AsyncStorage.getItem('user_total_xp');
  const localXP = parseInt(localXPRaw ?? '0') || 0;
  const cloudXP = parseInt(cloudData['user_total_xp'] ?? '0') || 0;
  if (localXP >= cloudXP) {
    const stickyKeys = ['premium_plan', 'admin_premium_override', 'premium_expiry'] as const;
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
    if (stickyPairs.length > 0) {
      await AsyncStorage.multiSet(stickyPairs);
      await reconcileRestoredDayDailyStorageIfNeeded(restoredDailyTasksToLocal);
      await AsyncStorage.setItem(LAST_SYNC_SNAPSHOT_KEY, JSON.stringify({ ...cloudData })).catch(() => {});
      return true;
    }
    return false;
  }

  const pairs: [string, string][] = [];
  for (const key of SYNC_KEYS) {
    const val = cloudData[key];
    if (val !== null && val !== undefined) {
      pairs.push([key, val]);
    }
  }
  if (cloudData['achievements_state']) pairs.push(['achievements_v1', cloudData['achievements_state']]);
  if (cloudData['lang']) pairs.push(['app_lang', cloudData['lang']]);
  if (cloudData['user_avatar_frame']) pairs.push(['user_frame', cloudData['user_avatar_frame']]);
  const dailyBlob = cloudData['daily_tasks_progress'];
  const fullRestoreDaily = dailyBlob != null && dailyBlob !== '';
  if (fullRestoreDaily) {
    pairs.push([`daily_tasks_${getTodayKey()}`, String(dailyBlob)]);
  }
  if (pairs.length > 0) {
    await AsyncStorage.multiSet(pairs);
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
      try { await syncInFlight; } catch {}
    }
    // doSyncToCloud глотает ошибки внутри, так что обернём напрямую без try-catch фасада:
    // повторим логику записи минимально-инвазивно, ловя ошибки явно.
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

    const now = Date.now();
    const docRef = db.collection('users').doc(uid);
    const createdAtSynced = await AsyncStorage.getItem(CREATED_AT_SYNC_KEY);
    const shouldSendCreatedAt = !createdAtSynced;
    await docRef.set(
      {
        progress: data,
        updatedAt: now,
        last_active_at: now,
        ...(shouldSendCreatedAt ? { created_at: now } : {}),
      },
      { merge: true },
    );
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
    // Per-lesson (32 × 5)
    ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_best_score`),
    ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_pass_count`),
    ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`),
    ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_listening_progress`),
    ...Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_intro_shown`),
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
    'dialogs_completed', 'dialogs_scores', 'dialogs_tutorial_done',
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
