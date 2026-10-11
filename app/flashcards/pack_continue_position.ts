/**
 * «Продолжить» по набору — позиция тренировки («12 из 40»), только на устройстве.
 *
 * зачем (координатор 11.10, макет cards-v2.html, блок 1 «Хаб»): герой «Продолжить» показывает набор, на котором человек
 * остановился, и докуда дошёл. Экономия Firebase обязательна — поэтому ни чтений, ни записей в Firestore: позиция живёт
 * в AsyncStorage по языку обучения, первый кадр хаба берёт её синхронно из памяти (`peek…`).
 * Логи: [PACK-CONTINUE].
 *
 * Как подключить (сессии тренировок/хаб):
 *   recordPackContinuePosition(target, { packId, index, total, mode }) — после каждого ответа (запись на диск батчится);
 *   index >= total → позиция снимается сама (набор пройден, продолжать нечего);
 *   latestPackContinue(peekPackContinuePositions(target) ?? {}) — герой хаба; subscribePackContinue — живое обновление.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from '../debug-logger';
import { subscribeAccountGeneration } from '../account_generation';
import { storageStudyTarget, targetKey, type RuntimeStudyTarget } from '../target_storage_keys';

const LOG = '[PACK-CONTINUE]';
/** Больше позиций не храним: старые вытесняются по времени — хватает на «Продолжить» и колоды. */
export const PACK_CONTINUE_MAX_ENTRIES = 50;
/** Запись на диск не чаще раза в N мс: ответ в тренировке не должен ждать AsyncStorage. */
const PERSIST_DEBOUNCE_MS = 600;

export type PackContinuePosition = Readonly<{
  packId: string;
  /** Сколько карточек уже пройдено (0…total). */
  index: number;
  total: number;
  /** Режим тренировки, в котором остановились (blitz / speaking / swipe / recall …) — экран решает, куда вести. */
  mode?: string;
  updatedAtMs: number;
}>;

export type PackContinuePositions = Readonly<Record<string, PackContinuePosition>>;

const memory = new Map<string, PackContinuePositions>();
const loaded = new Set<string>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<(target: string) => void>();

function storageKey(studyTarget?: RuntimeStudyTarget): string {
  return targetKey('flashcards', storageStudyTarget(studyTarget), 'pack_continue_v1');
}

function sanitize(raw: unknown): PackContinuePositions {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, PackContinuePosition> = {};
  for (const [packId, value] of Object.entries(raw as Record<string, unknown>)) {
    const v = value as Record<string, unknown> | null;
    if (!packId || !v || typeof v !== 'object') continue;
    const total = Math.floor(Number(v.total));
    const index = Math.floor(Number(v.index));
    const updatedAtMs = Number(v.updatedAtMs);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(index) || index <= 0 || index >= total) continue;
    if (!Number.isFinite(updatedAtMs)) continue;
    out[packId] = {
      packId,
      index,
      total,
      updatedAtMs,
      ...(typeof v.mode === 'string' && v.mode ? { mode: v.mode } : {}),
    };
  }
  return out;
}

/** Синхронный первый кадр: то, что уже поднято в память. null — ещё не читали с диска. */
export function peekPackContinuePositions(studyTarget?: RuntimeStudyTarget): PackContinuePositions | null {
  const key = storageKey(studyTarget);
  return loaded.has(key) ? (memory.get(key) ?? {}) : null;
}

/** Поднять позиции с диска (один раз на язык; дальше — из памяти). */
export async function loadPackContinuePositions(studyTarget?: RuntimeStudyTarget): Promise<PackContinuePositions> {
  const key = storageKey(studyTarget);
  if (loaded.has(key)) return memory.get(key) ?? {};
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed = raw ? sanitize(JSON.parse(raw)) : {};
    // Пока читали диск, тренировка могла уже записать свежую позицию — свежая память главнее.
    const merged = { ...parsed, ...(memory.get(key) ?? {}) };
    memory.set(key, merged);
    DebugLogger.info(LOG, `source=disk key=${key} наборов ${Object.keys(merged).length}`);
  } catch (error) {
    DebugLogger.error(`${LOG}:load`, error, 'warning');
    if (!memory.has(key)) memory.set(key, {});
  }
  loaded.add(key);
  return memory.get(key) ?? {};
}

function schedulePersist(key: string): void {
  const prev = timers.get(key);
  if (prev) clearTimeout(prev);
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    void AsyncStorage.setItem(key, JSON.stringify(memory.get(key) ?? {})).catch((error: unknown) => {
      DebugLogger.error(`${LOG}:persist`, error, 'warning');
    });
  }, PERSIST_DEBOUNCE_MS));
}

function emit(key: string): void {
  for (const listener of listeners) {
    try { listener(key); } catch (error) { DebugLogger.error(`${LOG}:listener`, error, 'warning'); }
  }
}

function trim(positions: Record<string, PackContinuePosition>): Record<string, PackContinuePosition> {
  const entries = Object.values(positions);
  if (entries.length <= PACK_CONTINUE_MAX_ENTRIES) return positions;
  const kept = entries.sort((a, b) => b.updatedAtMs - a.updatedAtMs).slice(0, PACK_CONTINUE_MAX_ENTRIES);
  return Object.fromEntries(kept.map((p) => [p.packId, p]));
}

/**
 * Запомнить, докуда дошли в наборе. Память обновляется сразу (герой хаба видит без ожидания), диск — фоном.
 * index ≤ 0 или index ≥ total → позиция снимается: продолжать нечего.
 */
export function recordPackContinuePosition(
  studyTarget: RuntimeStudyTarget | undefined,
  input: Readonly<{ packId: string; index: number; total: number; mode?: string; nowMs?: number }>,
): void {
  const key = storageKey(studyTarget);
  const packId = String(input.packId ?? '').trim();
  if (!packId) {
    DebugLogger.warn(LOG, 'record пропущен: пустой packId');
    return;
  }
  const total = Math.floor(Number(input.total));
  const index = Math.floor(Number(input.index));
  const current = { ...(memory.get(key) ?? {}) } as Record<string, PackContinuePosition>;
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(index) || index <= 0 || index >= total) {
    if (!(packId in current)) return;
    delete current[packId];
    DebugLogger.info(LOG, `снята позиция packId=${packId} index=${index} total=${total}`);
  } else {
    current[packId] = {
      packId,
      index,
      total,
      updatedAtMs: input.nowMs ?? Date.now(),
      ...(input.mode ? { mode: input.mode } : {}),
    };
  }
  memory.set(key, trim(current));
  schedulePersist(key);
  emit(key);
}

export function clearPackContinuePosition(studyTarget: RuntimeStudyTarget | undefined, packId: string): void {
  recordPackContinuePosition(studyTarget, { packId, index: 0, total: 0 });
}

/** Последний набор, на котором остановились (герой «Продолжить»); нет — null. */
export function latestPackContinue(positions: PackContinuePositions): PackContinuePosition | null {
  let best: PackContinuePosition | null = null;
  for (const p of Object.values(positions)) if (!best || p.updatedAtMs > best.updatedAtMs) best = p;
  return best;
}

/** Живое обновление героя хаба; возвращает отписку. Слушатель получает ключ языка, который изменился. */
export function subscribePackContinue(listener: (storageKeyForTarget: string) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// зачем: память процесса не должна пережить смену аккаунта — иначе второй человек на том же телефоне увидит чужое
// «Продолжить». После смены генерации позиции перечитываются с диска заново.
subscribeAccountGeneration(() => {
  memory.clear();
  loaded.clear();
  DebugLogger.info(LOG, 'смена аккаунта — память позиций сброшена');
});

export function packContinueStorageKeyForTests(studyTarget?: RuntimeStudyTarget): string {
  return storageKey(studyTarget);
}

export function resetPackContinueForTests(): void {
  memory.clear();
  loaded.clear();
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  listeners.clear();
}
