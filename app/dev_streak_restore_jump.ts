/**
 * DEV: «прыжок серии после восстановления» — для проверки [HOME-RESTORE-JUMP] на эмуляторе.
 *
 * зачем (координатор 12.10): у тестовых аккаунтов серия 0, и строки [HOME-RESTORE-JUMP] ничего не доказывают. Фикстура
 * моделирует настоящий случай: Главная открылась с локальной серией A, затем «пришло облако» с серией B. Пишем A,
 * ждём кадр Главной + 3 с, пишем B и шлём то же событие, что настоящее восстановление (`cloud_profile_hydrated`).
 * Только dev-сборка (вызывается из applyDevState за воротами isDevStateAvailable). `streak_count` клиент в облако не
 * отправляет (серверный ключ), так что облако подделка не задевает.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';

const LOG = '[DEV-STATE] streak_jump';
export const DEV_STREAK_JUMP_DELAY_AFTER_PAINT_MS = 3_000;
export const DEV_STREAK_WRITE_TRACE_MS = 60_000;

type StorageLike = {
  setItem: (key: string, value: string) => Promise<void>;
  multiSet: (pairs: readonly (readonly [string, string])[]) => Promise<void>;
  mergeItem?: (key: string, value: string) => Promise<void>;
  multiMerge?: (pairs: readonly (readonly [string, string])[]) => Promise<void>;
};

let traceUninstall: (() => void) | null = null;

/**
 * DEV: ловушка записи `streak_count` — кто и откуда пишет серию (значение + кадры стека).
 * зачем (координатор 12.10, 🔴 streakJump): облачные 12 через 2 с снова стали 5 — «сперва логи», кто записал 5 после 12.
 * Только на время фикстуры (60 с), снимается сама; в релизе фикстура недоступна (isDevStateAvailable).
 */
export function installStreakWriteTracer(storage: StorageLike = AsyncStorage as unknown as StorageLike, ms = DEV_STREAK_WRITE_TRACE_MS): () => void {
  if (traceUninstall) return traceUninstall;
  const startedAt = Date.now();
  const original = { setItem: storage.setItem, multiSet: storage.multiSet, mergeItem: storage.mergeItem, multiMerge: storage.multiMerge };
  const report = (via: string, value: string | null) => {
    const frames = (new Error().stack ?? '').split('\n').slice(3, 9).map((f) => f.trim()).filter(Boolean);
    console.warn('[STREAK-WRITE]', JSON.stringify({ via, value, sinceTraceMs: Date.now() - startedAt, frames }));
  };
  const pick = (pairs: readonly (readonly [string, string])[]) => pairs.find(([k]) => k === 'streak_count')?.[1] ?? null;
  storage.setItem = (key, value) => { if (key === 'streak_count') report('setItem', value); return original.setItem.call(storage, key, value); };
  storage.multiSet = (pairs) => { const v = pick(pairs); if (v !== null) report('multiSet', v); return original.multiSet.call(storage, pairs); };
  if (original.mergeItem) storage.mergeItem = (key, value) => { if (key === 'streak_count') report('mergeItem', value); return original.mergeItem!.call(storage, key, value); };
  if (original.multiMerge) storage.multiMerge = (pairs) => { const v = pick(pairs); if (v !== null) report('multiMerge', v); return original.multiMerge!.call(storage, pairs); };
  console.log(LOG, JSON.stringify({ step: 'write_tracer_on', ms }));
  const timer = setTimeout(() => uninstall(), ms);
  function uninstall(): void {
    clearTimeout(timer);
    storage.setItem = original.setItem;
    storage.multiSet = original.multiSet;
    if (original.mergeItem) storage.mergeItem = original.mergeItem;
    if (original.multiMerge) storage.multiMerge = original.multiMerge;
    traceUninstall = null;
    console.log(LOG, JSON.stringify({ step: 'write_tracer_off', afterMs: Date.now() - startedAt }));
  }
  traceUninstall = uninstall;
  return uninstall;
}

export type DevStreakJump = Readonly<{ local: number; cloud: number }>;

/** «5:12» → { local: 5, cloud: 12 }; null — неверный формат. */
export function parseDevStreakJump(raw: unknown): DevStreakJump | null {
  if (typeof raw !== 'string') return null;
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(raw.trim());
  if (!match) return null;
  return { local: Number(match[1]), cloud: Number(match[2]) };
}

type Deps = Readonly<{
  whenHomePainted: (ceilingMs: number) => Promise<unknown>;
  wait: (ms: number) => Promise<void>;
  /** Ловушка записи серии (по умолчанию включена; тест выключает). */
  traceWrites?: boolean;
}>;

/** Пишет локальную серию сразу; «облачную» — после кадра Главной и паузы, затем событие восстановления. Не бросает. */
export async function runDevStreakRestoreJump(jump: DevStreakJump, deps: Deps): Promise<void> {
  if (deps.traceWrites !== false) installStreakWriteTracer();
  await AsyncStorage.setItem('streak_count', String(jump.local));
  console.log(LOG, JSON.stringify({ step: 'local_written', local: jump.local }));
  void (async () => {
    try {
      const painted = await deps.whenHomePainted(30_000);
      await deps.wait(DEV_STREAK_JUMP_DELAY_AFTER_PAINT_MS);
      await AsyncStorage.setItem('streak_count', String(jump.cloud));
      console.log(LOG, JSON.stringify({ step: 'cloud_written', cloud: jump.cloud, painted }));
      emitAppEvent('cloud_profile_hydrated');
      console.log(LOG, JSON.stringify({ step: 'event_emitted', event: 'cloud_profile_hydrated' }));
    } catch (error) {
      console.warn(LOG, 'не доиграл', error instanceof Error ? error.message : String(error));
    }
  })();
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
