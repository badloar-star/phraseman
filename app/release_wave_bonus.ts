// Разовый бонус осколков за волну релиза. Только для тех, кто **обновил** приложение, не чистая установка.
// См. app_last_recorded_native_build_id_v1 + getEffectiveLastNativeBuild.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RELEASE_WAVE_BONUS_SHARDS, RELEASE_WAVE_BONUS_VERSION } from './config';
import { getAppReleaseBuildId } from './app_build_id';
import { DebugLogger } from './debug-logger';
import { commitShardCreditOperation } from './shards_system';

/** Ключ AsyncStorage: последняя нативная сборка, которую зафиксировали. */
export const APP_LAST_RECORDED_NATIVE_BUILD_ID_KEY = 'app_last_recorded_native_build_id_v1';
const LAST_NATIVE_BUILD_KEY = APP_LAST_RECORDED_NATIVE_BUILD_ID_KEY;

const claimKey = (wave: number) => `release_wave_bonus_claimed_v${wave}`;
/** Любое закрытие модалки (крест, фон, получить) — чтобы не крутить вечный isUpdater=1 при buildId=0 в dev. */
const flowClosedKey = (wave: number) => `release_wave_flow_closed_v${wave}`;

const parseShardBalance = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
};

export async function readPersistedNativeBuildId(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_NATIVE_BUILD_KEY);
    if (raw == null || raw === '') return null;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  } catch {
    return null;
  }
}

async function setPersistedNativeBuildId(n: number): Promise<void> {
  try {
    if (!Number.isFinite(n) || n <= 0) return;
    await AsyncStorage.setItem(LAST_NATIVE_BUILD_KEY, String(n));
  } catch (e) {
    if (__DEV__) console.warn('[release_wave_bonus]', e);
  }
}

/**
 * Эффективный «предыдущий» build для сравнения: из storage или, если ключа ещё не было,
 * оценка по прогрессу (только миграция 46→47: было XP/осколки → считаем, что был 46, не 47).
 */
export async function getEffectiveLastNativeBuild(
  targetWave: number,
  currentBuild: number,
): Promise<number | null> {
  const fromStorage = await readPersistedNativeBuildId();
  if (fromStorage !== null) return fromStorage;

  if (currentBuild !== targetWave) return null;

  try {
    const rows = await AsyncStorage.multiGet(['user_total_xp', 'shards_balance']);
    const xp = parseInt(rows[0][1] || '0', 10) || 0;
    const sh = parseInt(rows[1][1] || '0', 10) || 0;
    if (xp > 0 || sh > 0) {
      return Math.max(0, targetWave - 1);
    }
  } catch (e) {
    if (__DEV__) console.warn('[release_wave_bonus]', e);
  }
  return null;
}

/** true = пользователь перешёл на эту сборку **с более старой** (установка из магазина), не fresh install. */
export async function isUserUpdaterFromPreviousBuild(
  targetWave: number,
  currentBuild: number,
): Promise<boolean> {
  const last = await getEffectiveLastNativeBuild(targetWave, currentBuild);
  return last !== null && last < currentBuild;
}

/**
 * true — показать модалку. Не true → вызывающий всё равно должен держать persist в shouldOffer; здесь
 * false всегда с internal persist, кроме... мы делаем persist внутри для всех false.
 */
export async function shouldOfferReleaseWaveBonus(): Promise<boolean> {
  const current = getAppReleaseBuildId();
  const wave = RELEASE_WAVE_BONUS_VERSION;
  if (wave <= 0) {
    await setPersistedNativeBuildId(current);
    return false;
  }
  if (current !== wave) {
    await setPersistedNativeBuildId(current);
    return false;
  }

  // 1) Уже получали или уже отработали сценарий (закрытие) — смотрим ДО isUpdater: иначе
  //    buildId=0 + «миграция 46» дают isUpdater=true вечно и риск ферма/спама модалки.
  try {
    if (await AsyncStorage.getItem(claimKey(wave))) {
      await setPersistedNativeBuildId(current);
      return false;
    }
    if (await AsyncStorage.getItem(flowClosedKey(wave))) {
      await setPersistedNativeBuildId(current);
      return false;
    }
  } catch {
    await setPersistedNativeBuildId(current);
    return false;
  }

  const isUpdater = await isUserUpdaterFromPreviousBuild(wave, current);
  if (!isUpdater) {
    await setPersistedNativeBuildId(current);
    return false;
  }

  return true;
}

/**
 * После закрытия модалки (в т.ч. «Получить», фон, back): маркер «сценарий волны отработан» + build id
 * (если нативный id > 0, иначе в dev только маркер — иначе писали 0 и isUpdater снова true).
 */
export async function persistNativeBuildIdAfterReleaseWaveFlow(): Promise<void> {
  const w = RELEASE_WAVE_BONUS_VERSION;
  if (w > 0) {
    try {
      await AsyncStorage.setItem(flowClosedKey(w), '1');
    } catch (e) {
      if (__DEV__) console.warn('[release_wave_bonus]', e);
    }
  }
  const b = getAppReleaseBuildId();
  if (b > 0) {
    await setPersistedNativeBuildId(b);
  }
}

/** Начисляет осколки. Только для обновившихся (last build < current). */
export async function claimReleaseWaveBonus(): Promise<boolean> {
  const wave = RELEASE_WAVE_BONUS_VERSION;
  const current = getAppReleaseBuildId();
  const amount = RELEASE_WAVE_BONUS_SHARDS;
  if (wave <= 0 || current !== wave) return false;
  if (!Number.isFinite(amount) || amount <= 0) return false;

  const isUpdater = await isUserUpdaterFromPreviousBuild(wave, current);
  if (!isUpdater) return false;

  try {
    if (await AsyncStorage.getItem(claimKey(wave))) return false;
  } catch {
    return false;
  }

  try {
    const result = await commitShardCreditOperation({
      operationId: `release-wave:${wave}`,
      amount,
      reason: 'release_wave_bonus',
      grant: {
        kind: 'release_wave_bonus',
        subjectId: String(wave),
        payload: { wave, amount },
      },
      localWrites: [[claimKey(wave), '1']],
      showEarnModal: true,
    });
    return result.status === 'applied';
  } catch (e) {
    DebugLogger.error('release_wave_bonus:claim', e, 'warning');
    return false;
  }
}

export function getReleaseWaveBonusLabelAmount(): number {
  return RELEASE_WAVE_BONUS_SHARDS;
}

export function getActiveReleaseWaveVersion(): number {
  return RELEASE_WAVE_BONUS_VERSION;
}

export function isUserBuildMatchingReleaseWave(): boolean {
  const w = RELEASE_WAVE_BONUS_VERSION;
  if (w <= 0) return false;
  return getAppReleaseBuildId() === w;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
