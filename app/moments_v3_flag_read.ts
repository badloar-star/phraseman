// moments_v3_flag_read.ts — одно чтение и одно правило флага moments_v3 для ворот вне React (окно недели Пика D191, монета «хватает на ранг»,
// окно «С возвращением»). Хук экранов (use_moments_v3_flag в папке моментов серии) считает то же правило из того же кэша.
// зачем (координатор 15.10): ворота читали кэш каждый по-своему и не видели dev-переключатель; теперь правило одно — isMomentsV3Enabled
// (ключа нет → включено, явный false → выключено), а журнал [MOMENTS-V3-FLAG] на каждом чтении называет remote: true|false|absent и итог.
// Ни одного нового чтения Firestore: только кэш remote_config_cache_v1.
import { isMomentsV3Enabled, momentsV3RemoteState } from '../components/spire/moments/moments_flag';
import { readRemoteConfigCacheRaw } from './remote_config_client';

const LOG = '[MOMENTS-V3-FLAG]';
const DEV_KEY = 'dev_moments_v3_override';
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__ === true;

async function readDevOverride(): Promise<boolean | null> {
  if (!IS_DEV) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = (require('@react-native-async-storage/async-storage') as typeof import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(DEV_KEY);
    return raw === '1' ? true : raw === '0' ? false : null;
  } catch (error) {
    console.warn(`${LOG} dev-переключатель не прочитался — берём удалённый флаг (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

/** Итог флага для ворот: dev-переключатель (только __DEV__) → иначе правило isMomentsV3Enabled по кэшу. Битый кэш — как «ключа нет». */
export async function readMomentsV3Flag(source: string): Promise<boolean> {
  const dev = await readDevOverride();
  let bools: Readonly<Record<string, unknown>> | null = null;
  let cache: 'есть' | 'нет' | 'битый' = 'нет';
  try {
    const raw = await readRemoteConfigCacheRaw();
    if (raw) {
      cache = 'есть';
      bools = (JSON.parse(raw) as { bools?: Record<string, unknown> }).bools ?? null;
    }
  } catch (error) {
    cache = 'битый';
    console.warn(`${LOG} кэш конфига не прочитался — правило по умолчанию (${error instanceof Error ? error.message : String(error)})`);
  }
  const remote = momentsV3RemoteState(bools);
  const effective = dev ?? isMomentsV3Enabled(bools);
  console.log(LOG, JSON.stringify({ source, remote, dev, cache, effective })); // guard-ok: одна строка на чтение кэша
  return effective;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
