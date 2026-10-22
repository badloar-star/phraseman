// learning_v2_not_from_start_once_v1.ts — «Не хочу с начала» (вход в распределение) — один раз на аккаунт.
// зачем (владелец 22.10 через координатора): «кнопка "не хочу с начала" только 1 раз на аккаунт! после того как он прошёл и
// открылось ему что-то или нет, второго раза уже не должно быть!». Флаг ставит телефон в момент нажатия (сразу, без сети),
// облачная синхронизация только хранит его (ключ в SYNC_KEYS, слияние «стоит хоть где-то — стоит везде»), поэтому он
// переживает переустановку и вход с другого телефона. Журнал [PLACEMENT-ONCE].
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration } from './account_generation';

export const LEARNING_V2_NOT_FROM_START_USED_KEY_V1 = 'learning_v2_not_from_start_used_v1';
const LOG = '[PLACEMENT-ONCE]';

// зачем: кэш процесса привязан к владельцу — после смены аккаунта новый аккаунт читает свой флаг, а не чужой
let cached: Readonly<{ owner: string | null; used: boolean }> | null = null;
const ownerNow = (): string | null => { const t = captureAccountGeneration(); return t.phase === 'active' ? t.stableId?.trim() || null : null; };
const listeners = new Set<(used: boolean) => void>();

/** Уже нажимали? Память процесса, иначе AsyncStorage (там же лежит восстановленное из облака). */
export async function readLearningV2NotFromStartUsedV1(): Promise<boolean> {
  const owner = ownerNow();
  if (cached !== null && cached.owner === owner) return cached.used;
  try {
    const raw = await AsyncStorage.getItem(LEARNING_V2_NOT_FROM_START_USED_KEY_V1);
    cached = { owner, used: raw === '1' };
    console.log(LOG, 'read', JSON.stringify({ used: cached.used, hasOwner: owner !== null, source: 'AsyncStorage' })); // guard-ok: откуда значение
  } catch (error) {
    // не знаем — кнопку прячем: показать второй раз хуже, чем не показать (правило владельца)
    console.warn(LOG, 'read_failed', JSON.stringify({ reason: error instanceof Error ? error.message : String(error), decided: 'hide' })); // guard-ok: catch пишет причину
    return true;
  }
  return cached.used;
}

/** Нажатие «Не хочу с начала»: флаг ставится сразу в памяти и на телефоне; облако подхватит при синке. */
export async function markLearningV2NotFromStartUsedV1(from: string): Promise<void> {
  const before = cached?.used ?? null;
  cached = { owner: ownerNow(), used: true };
  listeners.forEach((listener) => listener(true));
  console.log(LOG, 'mark', JSON.stringify({ from, before, after: true })); // guard-ok: вход и решение
  try {
    await AsyncStorage.setItem(LEARNING_V2_NOT_FROM_START_USED_KEY_V1, '1');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { syncToCloud } = require('./cloud_sync') as typeof import('./cloud_sync');
    void syncToCloud().catch((error: unknown) => console.warn(LOG, 'sync_failed', JSON.stringify({ reason: error instanceof Error ? error.message : String(error) }))); // guard-ok: облако догонит при следующем синке
  } catch (error) {
    // флаг в памяти уже стоит — до перезапуска кнопки не будет; на диск не лёг — после перезапуска кнопка может вернуться
    console.warn(LOG, 'persist_failed', JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
  }
}

export function subscribeLearningV2NotFromStartUsedV1(listener: (used: boolean) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export default function __RouteShim() { return null; }
