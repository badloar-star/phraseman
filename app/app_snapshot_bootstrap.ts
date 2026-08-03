import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CUSTOMIZATION_STORAGE_KEYS,
  USER_AVATAR_AURA_KEY,
} from '../constants/customization_storage_keys';
import { getLevelFromXP } from '../constants/theme';
import {
  APP_SNAPSHOT_RESOURCE_LIMITS,
  limitArray,
  patchAppSnapshot,
  type AppSnapshotFriends,
  type AppSnapshotProfile,
  type AppSnapshotProgress,
  type AppSnapshotSettings,
} from './app_snapshot_store';
import { startFriendsTabSwrPrime, peekFriendsTabSwrWarm } from './friends_tab_swr_warm';
import { lastOpenedLessonKey, storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { getUserSettingsSnapshot, hydrateUserSettingsFromStorage } from './user_settings_store';
import { buildCustomizationSnapshot } from './customization_snapshot';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import {
  migrateLegacyVipSnapshotOnce,
  readVipSnapshotForGeneration,
  type VipStorageValues,
} from './premium_vip_storage';
import {
  REFERRAL_STATE_STORAGE_KEY,
  hydrateReferralStateFromRaw,
} from './referrals_cache';
import { rememberLeagueStateSnapshot, sanitizeLeagueState } from './league_open_cache_policy';

const BOOT_PROFILE_KEYS = [
  'user_name',
  'user_avatar',
  'user_frame',
  USER_AVATAR_AURA_KEY,
  'user_total_xp',
  'premium_active',
  'premium_plan',
] as const;

const BOOT_PROGRESS_KEYS = [
  'streak_count',
  'shards_balance',
] as const;

const BOOT_SETTINGS_KEYS = [
  'haptics_tap',
] as const;

// B3 (PERF_MASTER_PLAN): app_lang (LangContext) и study_target_v1
// (StudyTargetContext, см. app/study_target.ts STUDY_TARGET_STORAGE_KEY) читаются
// в этом же раннем multiGet, но НЕ могут напрямую разблокировать peek в этих двух
// контекстах в рамках ТЕКУЩЕГО запуска: LangProvider/StudyTargetProvider монтируются
// ВЫШЕ AppContent в дереве (app/_layout.tsx ~2784-2787), а primeAppSnapshotFromStorage
// вызывается уже ВНУТРИ AppContent (~1811) и даже получает studyTarget параметром ИЗ
// уже смонтированного StudyTargetProvider — то есть на первом холодном старте
// провайдеры успевают отрендерить первый кадр раньше, чем prime вообще стартует.
// Решение (см. PERF_MASTER_PLAN, задача B3, "второй вариант"): пишем оба значения
// в модульный peek синхронно ПОСЛЕ multiGet — сам процесс (JS-модуль) переживает
// множество маунтов/ремаунтов провайдеров в рамках сессии (навигация, Fast Refresh,
// возврат из фона), так что 2-й и последующие маунты этих провайдеров в РАМКАХ ОДНОЙ
// сессии уже читают peek без прыжка. С холодного перезапуска приложения (новый JS-
// процесс) peek пуст на первом кадре — это тот же выбор, что уже сделан для
// EnergyContext (B2): false-negative на первом кадре первой сессии допустим,
// false-positive (неверный язык/target) — нет.
const BOOT_LANG_KEY = 'app_lang';
const BOOT_STUDY_TARGET_KEY = 'study_target_v1';
const BOOT_LEAGUE_STATE_KEY = 'league_state_v3';

let peekAppLangState: string | null = null;
let peekStudyTargetState: string | null = null;

/** Синхронный peek языка интерфейса из последнего прайма (см. комментарий выше). */
export function peekAppLang(): string | null {
  return peekAppLangState;
}

/** Синхронный peek study target из последнего прайма (см. комментарий выше). */
export function peekStudyTargetRaw(): string | null {
  return peekStudyTargetState;
}

/** Позволяет контексту обновить peek сразу после собственного чтения AsyncStorage,
 * не дожидаясь следующего прайма (например, после явного setLang/setStoredStudyTarget). */
export function writePeekAppLang(value: string | null): void {
  peekAppLangState = value;
}

export function writePeekStudyTargetRaw(value: string | null): void {
  peekStudyTargetState = value;
}

function mapPairs(pairs: readonly [string, string | null][]): Map<string, string | null> {
  return new Map(pairs);
}

function readInt(raw: string | null | undefined): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function readBool(raw: string | null | undefined): boolean {
  return raw === '1' || raw === 'true';
}

function buildProfileSnapshot(
  values: Map<string, string | null>,
  now: number,
  vipSnapshot: VipStorageValues | null,
): AppSnapshotProfile {
  const totalXp = readInt(values.get('user_total_xp'));
  const vipUntil = Number(vipSnapshot?.vip_until ?? '0') || 0;
  // зачем: пожизненный VIP-грант (сертификат «Pro — навсегда», промокод,
  // бессрочная выдача из админки) не имеет даты окончания — vip_until = 0.
  // Без этого признака он читался как «срок истёк» и на первом кадре терял и
  // доступ, и тир Pro. Зеркалит isLifetimeVipValues в premium_guard.ts.
  const vipPlanRaw = String(vipSnapshot?.vip_plan ?? '').trim().toLowerCase();
  const vipGranted = readBool(vipSnapshot?.vip_active) || !!vipPlanRaw;
  const vipLifetime = vipGranted && vipUntil <= 0;
  const name = values.get('user_name')?.trim() || '';
  const avatar = values.get('user_avatar')?.trim() || '1';
  const frame = values.get('user_frame')?.trim() || '';
  const aura = values.get(USER_AVATAR_AURA_KEY)?.trim() || undefined;

  return {
    source: 'storage',
    updatedAt: now,
    name,
    avatar,
    frame,
    aura,
    totalXp,
    level: getLevelFromXP(totalXp),
    premiumActive: readBool(values.get('premium_active')),
    premiumPlan: values.get('premium_plan')?.trim().toLowerCase() || undefined,
    vipActive: vipUntil > now || vipLifetime,
    vipLifetime,
  };
}

function buildProgressSnapshot(
  values: Map<string, string | null>,
  studyTarget: RuntimeStudyTarget,
  now: number,
): AppSnapshotProgress {
  return {
    source: 'storage',
    updatedAt: now,
    streak: readInt(values.get('streak_count')),
    shards: readInt(values.get('shards_balance')),
    studyTarget: storageStudyTarget(studyTarget),
  };
}

function buildSettingsSnapshot(values: Map<string, string | null>, now: number): AppSnapshotSettings {
  const settings = getUserSettingsSnapshot();
  const tapHapticsRaw = values.get('haptics_tap');
  return {
    source: 'storage',
    updatedAt: now,
    ...settings,
    tapHaptics: tapHapticsRaw == null ? true : tapHapticsRaw !== 'false',
  };
}

async function primeFriendsSnapshot(now: number): Promise<AppSnapshotFriends | null> {
  await startFriendsTabSwrPrime().catch(() => {});
  const warm = peekFriendsTabSwrWarm();
  if (!warm) return null;
  return {
    source: 'storage',
    updatedAt: now,
    canonicalUid: warm.canonicalUid,
    friends: limitArray(warm.friends, APP_SNAPSHOT_RESOURCE_LIMITS.friendProfileMaxEntries),
    requests: limitArray(warm.requests, APP_SNAPSHOT_RESOURCE_LIMITS.recentItemsMax),
    profiles: Object.fromEntries(
      Object.entries(warm.profiles).slice(0, APP_SNAPSHOT_RESOURCE_LIMITS.friendProfileMaxEntries),
    ),
  };
}

export async function primeAppSnapshotFromStorage(studyTarget?: RuntimeStudyTarget): Promise<void> {
  const now = Date.now();
  const accountGeneration = captureAccountGeneration();
  const isAccountCurrent = () => (
    !!accountGeneration.stableId
    && isCurrentAccountGeneration(accountGeneration, accountGeneration.stableId)
  );
  if (!isAccountCurrent()) return;
  await migrateLegacyVipSnapshotOnce(accountGeneration).catch(() => false);
  if (!isAccountCurrent()) return;
  const vipSnapshot = await readVipSnapshotForGeneration(accountGeneration);
  if (!isAccountCurrent()) return;
  const lastOpenedKey = lastOpenedLessonKey(studyTarget);
  const keys = [
    ...BOOT_PROFILE_KEYS,
    ...BOOT_PROGRESS_KEYS,
    ...CUSTOMIZATION_STORAGE_KEYS,
    ...BOOT_SETTINGS_KEYS,
    lastOpenedKey,
    BOOT_LANG_KEY,
    BOOT_STUDY_TARGET_KEY,
    BOOT_LEAGUE_STATE_KEY,
    REFERRAL_STATE_STORAGE_KEY,
  ];
  const [pairs, friends] = await Promise.all([
    AsyncStorage.multiGet(keys).catch(() => [] as [string, string | null][]),
    primeFriendsSnapshot(now),
    hydrateUserSettingsFromStorage().catch(() => {}),
  ]).then(async ([storagePairs, friendsSnapshot]) => [
    storagePairs,
    friendsSnapshot,
  ] as const);

  if (!isAccountCurrent()) return;
  const values = mapPairs(pairs);
  writePeekAppLang(values.get(BOOT_LANG_KEY) ?? null);
  writePeekStudyTargetRaw(values.get(BOOT_STUDY_TARGET_KEY) ?? null);
  try {
    rememberLeagueStateSnapshot(sanitizeLeagueState(JSON.parse(values.get(BOOT_LEAGUE_STATE_KEY) ?? 'null')));
  } catch {
    rememberLeagueStateSnapshot(null);
  }
  hydrateReferralStateFromRaw(
    values.get(REFERRAL_STATE_STORAGE_KEY),
    captureAccountGeneration(),
    now,
  );
  if (!isAccountCurrent()) return;
  const profile = buildProfileSnapshot(values, now, vipSnapshot);
  if (!isAccountCurrent()) return;
  patchAppSnapshot({
    profile,
    progress: buildProgressSnapshot(values, studyTarget, now),
    customization: buildCustomizationSnapshot(values, now, profile.level),
    lessons: {
      source: 'storage',
      updatedAt: now,
      primedCount: 0,
      lastOpenedLesson: values.get(lastOpenedKey) ?? null,
    },
    settings: buildSettingsSnapshot(values, now),
    ...(friends ? { friends } : {}),
    primedAt: now,
  });
}

export default function __RouteShim() { return null; }
