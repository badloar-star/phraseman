import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_LAST = 'trial_last_consumed_at';
const LEGACY_KEY_BOOLEAN = 'trial_used';

/** Один раз на устройство: сброс старых флагов, чтобы снова показать копию «3 дня» на обоих планах (если магазин отдаёт intro). */
const ONE_TIME_GLOBAL_TRIAL_UI_RESET_KEY = 'trial_migrate_all_show_7d_v1';

/**
 * Интервал между «офферами» триала в UI (и локальной логикой).
 * 90 суток ≈ 3 календарных месяца; магазин отдельно решает, даст ли повторный free trial.
 */
export const TRIAL_REOFFER_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

let migrationDone = false;

async function runOneTimeGlobalTrialUiResetIfNeeded(): Promise<void> {
  const done = await AsyncStorage.getItem(ONE_TIME_GLOBAL_TRIAL_UI_RESET_KEY);
  if (done === '1') return;
  await AsyncStorage.multiRemove([STORAGE_KEY_LAST, LEGACY_KEY_BOOLEAN]);
  await AsyncStorage.setItem(ONE_TIME_GLOBAL_TRIAL_UI_RESET_KEY, '1');
}

async function migrateLegacyTrialKeyOnce(): Promise<void> {
  if (migrationDone) return;
  migrationDone = true;

  await runOneTimeGlobalTrialUiResetIfNeeded();

  const hasLast = await AsyncStorage.getItem(STORAGE_KEY_LAST);
  const legacy = await AsyncStorage.getItem(LEGACY_KEY_BOOLEAN);
  if (hasLast) {
    if (legacy === 'true') await AsyncStorage.removeItem(LEGACY_KEY_BOOLEAN);
    return;
  }
  if (legacy === 'true') {
    // Старый «раз и навсегда» без даты — считаем кулдаун истёкшим, снова показываем копию
    // (RevenueCat / App Store сами решат, будет ли фактическая триал-фаза).
    await AsyncStorage.setItem(
      STORAGE_KEY_LAST,
      String(Date.now() - TRIAL_REOFFER_COOLDOWN_MS - 1)
    );
    await AsyncStorage.removeItem(LEGACY_KEY_BOOLEAN);
  }
}

/**
 * @returns timestamp мс или null, если «ещё не потребляли» триал/оформление в нашей логике
 */
export async function getLastTrialOrPurchaseMarker(): Promise<number | null> {
  await migrateLegacyTrialKeyOnce();
  const v = await AsyncStorage.getItem(STORAGE_KEY_LAST);
  if (!v) return null;
  const t = parseInt(v, 10);
  if (Number.isNaN(t) || t <= 0) return null;
  return t;
}

/** true, если в течение кулдауна — не показывать копию про 3 дня (локально). */
export async function getTrialReofferBlockedByCooldown(): Promise<boolean> {
  const last = await getLastTrialOrPurchaseMarker();
  if (last == null) return false;
  return Date.now() - last < TRIAL_REOFFER_COOLDOWN_MS;
}

/** Вызвать после успешной покупки / восстановления, симуляции в dev — таймер 90 д. до снова показа копии. */
export async function markSubscriptionOrTrialFlowConsumedNow(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_LAST, String(Date.now()));
  await AsyncStorage.removeItem(LEGACY_KEY_BOOLEAN);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
