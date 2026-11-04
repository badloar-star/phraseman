/**
 * Запоминание настроек тренировки карточек: размер сессии, время блица, направление «вспомни и напиши».
 *
 * зачем (удобство №5, владелец одобрил 04.11): колоды и размер пресета уже помнит fc_mode_prefs_v1, а время и направление каждый раз
 * сбрасывались на 60 с / «на язык» — «Начать» не получалось одним тапом. Здесь — только эти три значения по режимам, локально (AsyncStorage,
 * 0 чтений Firebase). Ключ на владельца аккаунта в стираемом семействе `story_events_v1:` (чистится вместе с остальным при выходе/удалении),
 * ключи прогресса не трогаем. Лог: [FC-SETUP-PREFS].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TRAINING_SETUP_PREFS_KEY_PREFIX = 'story_events_v1:cards_training_setup_prefs';
export const trainingSetupPrefsKey = (owner: string): string => `${TRAINING_SETUP_PREFS_KEY_PREFIX}:${owner}`;

export const SETUP_SIZE_IDS: readonly string[] = ['10', '20', 'all'];
export const SETUP_SEC_IDS: readonly string[] = ['30', '60', '90'];
export const SETUP_DIR_IDS: readonly string[] = ['to_target', 'to_source'];

export type TrainingSetupPrefs = Readonly<{ size: string; sec: string; dir: string }>;
type Stored = Readonly<{ v: 1; modes: Readonly<Record<string, TrainingSetupPrefs>> }>;

/** Разбор записи: любое поле вне допустимых значений → запись режима отбрасывается целиком (не ломаем экран старыми данными). */
export function parseTrainingSetupPrefs(raw: string | null | undefined, mode: string): TrainingSetupPrefs | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<Stored> | null;
    const entry = data?.v === 1 ? data.modes?.[mode] : undefined;
    if (!entry) return null;
    if (!SETUP_SIZE_IDS.includes(entry.size) || !SETUP_SEC_IDS.includes(entry.sec) || !SETUP_DIR_IDS.includes(entry.dir)) {
      console.warn('[FC-SETUP-PREFS] запись режима с недопустимым значением — игнор', JSON.stringify({ mode, size: entry.size, sec: entry.sec, dir: entry.dir })); // guard-ok: ранний выход с причиной и значениями
      return null;
    }
    return { size: entry.size, sec: entry.sec, dir: entry.dir };
  } catch (error) {
    console.warn('[FC-SETUP-PREFS] запись не разобрана — игнор', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
    return null;
  }
}

/** Новая запись с обновлённым режимом (без мутации прежней). */
export function mergeTrainingSetupPrefs(raw: string | null | undefined, mode: string, prefs: TrainingSetupPrefs): string {
  let modes: Record<string, TrainingSetupPrefs> = {};
  try {
    const data = raw ? (JSON.parse(raw) as Partial<Stored> | null) : null;
    if (data?.v === 1 && data.modes) modes = { ...data.modes };
  } catch (error) {
    console.warn('[FC-SETUP-PREFS] прежняя запись не разобрана — пишем с нуля', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
  }
  return JSON.stringify({ v: 1, modes: { ...modes, [mode]: prefs } });
}

async function owner(): Promise<string> {
  try {
    const { captureAccountGeneration } = await import('../account_generation');
    const token = captureAccountGeneration();
    if (token.phase === 'active' && token.stableId) return token.stableId;
    console.log('[FC-SETUP-PREFS] owner → device', JSON.stringify({ phase: token.phase })); // guard-ok: ветка и значение
  } catch (error) {
    console.warn('[FC-SETUP-PREFS] владелец не определён — ключ устройства', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
  }
  return 'device';
}

export async function readTrainingSetupPrefs(mode: string): Promise<TrainingSetupPrefs | null> {
  try {
    const key = trainingSetupPrefsKey(await owner());
    const prefs = parseTrainingSetupPrefs(await AsyncStorage.getItem(key), mode);
    console.log('[FC-SETUP-PREFS] read', JSON.stringify({ mode, prefs })); // guard-ok: что восстановили
    return prefs;
  } catch (error) {
    console.warn('[FC-SETUP-PREFS] чтение не удалось — остаются значения по умолчанию', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
    return null;
  }
}

export async function writeTrainingSetupPrefs(mode: string, prefs: TrainingSetupPrefs): Promise<void> {
  try {
    const key = trainingSetupPrefsKey(await owner());
    await AsyncStorage.setItem(key, mergeTrainingSetupPrefs(await AsyncStorage.getItem(key), mode, prefs));
    console.log('[FC-SETUP-PREFS] write', JSON.stringify({ mode, prefs })); // guard-ok: что запомнили
  } catch (error) {
    console.warn('[FC-SETUP-PREFS] запись не удалась — в следующий раз настройки по умолчанию', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
  }
}
