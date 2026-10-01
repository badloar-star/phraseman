import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Account V2, Пакет 6G, ремонт №1 (ревью P3) — единая запись памяти свайпов.
 *
 * зачем: память свайпов пишут ДВА места — экран тренировки (отложенный снимок
 * своей памяти в памяти процесса) и гидрация V2 (новая установка получает SRS
 * с сервера). Оба делали read-modify-write мимо друг друга: экран своим старым
 * снимком затирал слитые с сервера записи, гидрация — свайп, случившийся между
 * её чтением и записью. Теперь:
 *   - все записи ключа идут через одну очередь (withSwipeMemoryLock);
 *   - запись — СЛИЯНИЕ с диском по времени правки: побеждает строка с большим
 *     lastSeenAt; строки, которых нет в снимке пишущего, сохраняются.
 * Лишнее чтение/разбор — один раз на отложенный сброс (не в жесте свайпа).
 */

const LOG = '[SWIPE-MEMORY]';
type Row = Readonly<Record<string, unknown>>;
export type SwipeMemoryRows = Record<string, Row>;

const queues = new Map<string, Promise<unknown>>();

export function withSwipeMemoryLock<T>(storageKey: string, work: () => Promise<T>): Promise<T> {
  const previous = queues.get(storageKey) ?? Promise.resolve();
  const result = previous.then(work, work);
  const tail = result.then(() => undefined, () => undefined);
  queues.set(storageKey, tail);
  void tail.then(() => { if (queues.get(storageKey) === tail) queues.delete(storageKey); });
  return result;
}

function timeOf(row: Row | undefined): number {
  const value = row?.lastSeenAt;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Слияние по времени правки: большее lastSeenAt побеждает, отсутствующие строки сохраняются. */
export function mergeSwipeMemoryRows(disk: SwipeMemoryRows, incoming: SwipeMemoryRows): SwipeMemoryRows {
  const out: SwipeMemoryRows = { ...disk };
  for (const [key, row] of Object.entries(incoming)) {
    if (timeOf(row) >= timeOf(out[key])) out[key] = row;
  }
  return out;
}

export async function readSwipeMemoryRows(storageKey: string): Promise<SwipeMemoryRows | null> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as SwipeMemoryRows : null;
  } catch (error) {
    console.warn(`${LOG} read_unparseable kind=${error instanceof Error ? error.name : typeof error}`);
    return null;
  }
}

/**
 * Записать снимок памяти, слив его с диском (под очередью ключа). Битый диск —
 * пишем снимок как есть (как раньше), с логом. Возвращает записанное.
 */
export function writeSwipeMemoryMerged(
  storageKey: string,
  incoming: SwipeMemoryRows,
  compact: (rows: SwipeMemoryRows) => SwipeMemoryRows = (rows) => rows,
): Promise<SwipeMemoryRows> {
  return withSwipeMemoryLock(storageKey, async () => {
    const disk = await readSwipeMemoryRows(storageKey);
    if (disk === null) console.warn(`${LOG} merge_skipped reason=disk_unparseable`);
    const merged = compact(disk === null ? incoming : mergeSwipeMemoryRows(disk, incoming));
    await AsyncStorage.setItem(storageKey, JSON.stringify(merged));
    return merged;
  });
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
