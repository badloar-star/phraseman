// Разовый бонус осколков за волну релиза. Только для тех, кто **обновил** приложение, не чистая установка.
// См. app_last_recorded_native_build_id_v1 + getEffectiveLastNativeBuild.
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { RELEASE_WAVE_BONUS_SHARDS, RELEASE_WAVE_BONUS_VERSION, CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getAppReleaseBuildId } from './app_build_id';
import { getCanonicalUserId } from './user_id_policy';
import { withStorageLock } from './storage_mutex';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { addShardsRaw, getShardsBalance } from './shards_system';

const REWARD_CLAIMS_COLLECTION = 'reward_claims';

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
  } catch {}
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
  } catch {}
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

const logReleaseWaveToShardLog = async (amount: number, balanceAfter: number): Promise<void> => {
  try {
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    const uid = await getCanonicalUserId();
    if (!uid) return;
    const db = firestore();
    await db.collection('users').doc(uid).collection('shard_log').add({
      type: 'earn',
      amount,
      reason: 'release_wave_bonus',
      balanceAfter,
      ts: new Date().toISOString(),
    });
  } catch {}
};

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

  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    return true;
  }

  const uid = await getCanonicalUserId();
  if (!uid) {
    return true;
  }

  try {
    const db = firestore();
    const ref = db
      .collection('users')
      .doc(uid)
      .collection(REWARD_CLAIMS_COLLECTION)
      .doc(`release_wave_${wave}`);
    const snap = await ref.get();
    if (snap.exists) {
      await AsyncStorage.setItem(claimKey(wave), '1');
      await setPersistedNativeBuildId(current);
      return false;
    }
  } catch {
    // сеть: покажем модалку; при клике сработает транзакция
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
    } catch {}
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

  // addShardsRaw уже берёт withStorageLock — внешний lock здесь даёт взаимоблокировку (не reentrant).
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) {
    try {
      if (await AsyncStorage.getItem(claimKey(wave))) return false;
      const added = await addShardsRaw(amount, 'release_wave_bonus', {
        showEarnModal: true,
        earnModalKey: 'release_wave_bonus',
      });
      if (added <= 0) return false;
      await AsyncStorage.setItem(claimKey(wave), '1');
      const bal = await getShardsBalance();
      emitAppEvent('shards_balance_updated', { balance: bal });
      return true;
    } catch (e) {
      DebugLogger.error('release_wave_bonus:claim local', e, 'warning');
      return false;
    }
  }

  const uid = await getCanonicalUserId();
  if (!uid) {
    try {
      if (await AsyncStorage.getItem(claimKey(wave))) return false;
      const added = await addShardsRaw(amount, 'release_wave_bonus', {
        showEarnModal: true,
        earnModalKey: 'release_wave_bonus',
      });
      if (added <= 0) return false;
      await AsyncStorage.setItem(claimKey(wave), '1');
      const bal = await getShardsBalance();
      emitAppEvent('shards_balance_updated', { balance: bal });
      return true;
    } catch (e) {
      DebugLogger.error('release_wave_bonus:claim no-uid', e, 'warning');
      return false;
    }
  }

  const localBalance = await getShardsBalance();
  const db = firestore();

  try {
    const newBalance = await db.runTransaction(async (transaction) => {
      const claimRef = db
        .collection('users')
        .doc(uid)
        .collection(REWARD_CLAIMS_COLLECTION)
        .doc(`release_wave_${wave}`);
      const claimSnap = await transaction.get(claimRef);
      if (claimSnap.exists) {
        return null as number | null;
      }

      const userRef = db.collection('users').doc(uid);
      const userSnap = await transaction.get(userRef);
      const cloudShards = userSnap.exists ? parseShardBalance(userSnap.data()?.shards) : null;
      const cloudVal = cloudShards ?? 0;
      const base = Math.max(localBalance, cloudVal);
      const next = base + amount;

      transaction.set(claimRef, {
        source: 'release_wave_bonus',
        wave,
        amount,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      transaction.set(userRef, { shards: next }, { merge: true });
      return next;
    });

    if (newBalance === null || newBalance === undefined) {
      await AsyncStorage.setItem(claimKey(wave), '1');
      return false;
    }

    const storageKey = 'shards_balance';
    await withStorageLock(async () => {
      if (await AsyncStorage.getItem(claimKey(wave))) return;
      await AsyncStorage.multiSet([
        [storageKey, String(newBalance)],
        [claimKey(wave), '1'],
      ]);
    });

    await getShardsBalance();
    await logReleaseWaveToShardLog(amount, newBalance);
    emitAppEvent('shards_earned', { amount, reasonKey: 'release_wave_bonus' });
    emitAppEvent('shards_balance_updated', { balance: newBalance });
    return true;
  } catch (e) {
    DebugLogger.error('release_wave_bonus:claim tx', e, 'warning');
    return false;
  }
}

export async function resetReleaseWaveBonusLocalClaimForTesting(wave: number): Promise<void> {
  if (wave <= 0) return;
  try {
    await AsyncStorage.multiRemove([claimKey(wave), flowClosedKey(wave)]);
  } catch {}
}

export async function resetLastPersistedNativeBuildForTesting(): Promise<void> {
  try {
    await AsyncStorage.removeItem(APP_LAST_RECORDED_NATIVE_BUILD_ID_KEY);
  } catch {}
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
