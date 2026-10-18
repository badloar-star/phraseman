/**
 * Метки УСТРОЙСТВА, переживающие выход из аккаунта: «онбординг на этом устройстве пройден» и язык интерфейса устройства.
 *
 * зачем (координатор 18.10 04:16, Ревизор 3.76): onboarding_done и app_lang входят в SYNC_KEYS — если держать их при выходе,
 * при входе другого владельца B они сливаются с его облаком (данные A уходят к B). Поэтому при выходе они стираются, а
 * чтобы человек не проходил онбординг заново, перед стиранием пишутся эти метки. Они НЕ в SYNC_KEYS и НЕ в описи аккаунта:
 * не уходят в облако и не попадают в аварийную копию A. Удаление аккаунта их сбрасывает (account_deleted_notice).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEVICE_ONBOARDING_DONE_KEY = 'device_onboarding_done_v1';
export const DEVICE_UI_LANG_KEY = 'device_ui_lang_v1';
export const DEVICE_ONBOARDING_MARK_KEYS: readonly string[] = Object.freeze([DEVICE_ONBOARDING_DONE_KEY, DEVICE_UI_LANG_KEY]);

const LANG_CODE_RE = /^[a-z]{2}(?:-[A-Z]{2})?$/;

/**
 * Перед стиранием при выходе/смене: если на этом устройстве онбординг пройден и выбран язык — записать метки устройства.
 * Возвращает имена записанных меток (для журнала). Не бросает: сбой — причина в журнал, выход не блокируется.
 */
export async function writeDeviceMarksBeforeSignoutWipe(): Promise<string[]> {
  try {
    const [[, onboardingDone], [, appLang]] = await AsyncStorage.multiGet(['onboarding_done', 'app_lang']);
    const writes: [string, string][] = [];
    if (onboardingDone === '1') writes.push([DEVICE_ONBOARDING_DONE_KEY, '1']);
    if (typeof appLang === 'string' && LANG_CODE_RE.test(appLang)) writes.push([DEVICE_UI_LANG_KEY, appLang]);
    for (const [key, value] of writes) await AsyncStorage.setItem(key, value);
    return writes.map(([key]) => key);
  } catch (error: unknown) {
    console.warn('[ACCOUNT-WIPE]', JSON.stringify({ step: 'device_marks_failed', reason: error instanceof Error ? error.message.slice(0, 80) : typeof error })); // guard-ok: catch пишет причину
    return [];
  }
}

export type BootOnboardingDone = Readonly<{ value: '1' | null; source: 'account' | 'device' | 'none' }>;

/** Шлюз онбординга на старте: отметка аккаунта главнее; без неё — метка устройства (после выхода). */
export function resolveBootOnboardingDone(onboardingDoneRaw: string | null, deviceMarkRaw: string | null): BootOnboardingDone {
  if (onboardingDoneRaw === '1') return { value: '1', source: 'account' };
  if (deviceMarkRaw === '1') return { value: '1', source: 'device' };
  return { value: null, source: 'none' };
}

/** Язык интерфейса устройства из метки (только код; проверку «язык включён» делает вызывающий). */
export async function readDeviceUiLang(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(DEVICE_UI_LANG_KEY);
    return typeof raw === 'string' && LANG_CODE_RE.test(raw) ? raw : null;
  } catch (error: unknown) {
    console.warn('[LANG-SWITCH] device_ui_lang_read_failed', error instanceof Error ? error.message.slice(0, 80) : typeof error); // guard-ok: catch пишет причину
    return null;
  }
}

/* expo-router: keep this utility from being treated as a screen */
export default function __DeviceOnboardingMarksRouteShim() {
  return null;
}
