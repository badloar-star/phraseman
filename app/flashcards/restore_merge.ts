/**
 * Слияния карточек при восстановлении из облака — пп.2–3 решения координатора 11.10.
 *
 * зачем: в ветке «облако главнее» restore писал облачное значение целиком — своя карточка, созданная
 * между последним синком и восстановлением, пропадала, а ответы в тренировке откатывались к облачным.
 *
 * п.2 custom_flashcards_v2 (массив CardItem): объединение по id; карточка есть с обеих сторон —
 * побеждает более свежая правка (updatedAt, иначе addedAt). Облачную карточку, которую человек удалил
 * здесь (журнал удалений 7D) ПОЗЖЕ её последней правки, не воскрешаем — то же правило, что у гидрации 7E.
 * п.3 flashcards_swipe_memory_v1 ({ключ карточки: {seen, lastSeenAt, …}}): по ключу побеждает строка
 * с последним ответом (lastSeenAt, при равенстве — больше показов). flashcards_progress_v1 — это лишь
 * позиция просмотра {cat, idx}, ответов в нём нет, поэтому его не трогаем.
 *
 * Чистые функции без хранилища — тестируются отдельно. Битое облако → оставляем локальное;
 * битое или пустое локальное → облако, как было.
 */

type CardRow = { id: string; updatedAt?: unknown; addedAt?: unknown };
type MemoryRow = { seen?: unknown; lastSeenAt?: unknown };

function parseCardList(raw: string | null | undefined): CardRow[] | null {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return (parsed as CardRow[]).filter((row) => row && typeof row === 'object' && typeof row.id === 'string' && row.id.length > 0);
  } catch {
    // зачем: битое значение не роняет восстановление — сторону выбирает вызывающий по null.
    return null;
  }
}

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const editedAt = (row: CardRow): number => Math.max(num(row.updatedAt), num(row.addedAt));

export type CustomCardsMergeStats = { localOnly: number; cloudOnly: number; both: number; localWon: number; droppedDeleted: number };

export function mergeCustomCardsRestoreValue(
  localRaw: string | null | undefined,
  cloudRaw: string,
  deletedAtById: ReadonlyMap<string, number>,
  stats?: CustomCardsMergeStats,
): string {
  const cloudRows = parseCardList(cloudRaw);
  const localRows = parseCardList(localRaw);
  if (cloudRows === null) return localRaw ?? cloudRaw;
  if (localRows === null) return cloudRaw;
  const cloudById = new Map(cloudRows.map((row) => [row.id, row] as const));
  const localIds = new Set(localRows.map((row) => row.id));
  const merged: CardRow[] = [];
  // Порядок — локальный (так человек видел список на этом телефоне), облачные новые — в конце.
  for (const local of localRows) {
    const cloud = cloudById.get(local.id);
    if (!cloud) {
      if (stats) stats.localOnly += 1;
      merged.push(local);
      continue;
    }
    if (stats) stats.both += 1;
    const localWins = editedAt(local) >= editedAt(cloud);
    if (localWins && stats) stats.localWon += 1;
    merged.push(localWins ? local : cloud);
  }
  for (const cloud of cloudRows) {
    if (localIds.has(cloud.id)) continue;
    const deletedAt = deletedAtById.get(cloud.id);
    if (deletedAt !== undefined && deletedAt >= editedAt(cloud)) {
      if (stats) stats.droppedDeleted += 1;
      continue;
    }
    if (stats) stats.cloudOnly += 1;
    merged.push(cloud);
  }
  return JSON.stringify(merged);
}

function parseMemoryMap(raw: string | null | undefined): Record<string, MemoryRow> | null {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, MemoryRow>;
  } catch {
    // зачем: см. parseCardList.
    return null;
  }
}

export function mergeSwipeMemoryRestoreValue(localRaw: string | null | undefined, cloudRaw: string): string {
  const cloud = parseMemoryMap(cloudRaw);
  const local = parseMemoryMap(localRaw);
  if (cloud === null) return localRaw ?? cloudRaw;
  if (local === null || Object.keys(local).length === 0) return cloudRaw;
  const merged: Record<string, MemoryRow> = { ...cloud };
  for (const [key, localRow] of Object.entries(local)) {
    const cloudRow = merged[key];
    if (!cloudRow || typeof cloudRow !== 'object') {
      merged[key] = localRow;
      continue;
    }
    if (!localRow || typeof localRow !== 'object') continue;
    const localAt = num(localRow.lastSeenAt);
    const cloudAt = num(cloudRow.lastSeenAt);
    if (localAt > cloudAt || (localAt === cloudAt && num(localRow.seen) > num(cloudRow.seen))) {
      merged[key] = localRow;
    }
  }
  return JSON.stringify(merged);
}

/** Журнал удалений (ключ `<язык>:custom:<id>` → время) → id удалённых своих карточек для языка. */
export function customCardDeletionsForTarget(
  journal: ReadonlyMap<string, number> | null,
  target: string,
): ReadonlyMap<string, number> {
  const out = new Map<string, number>();
  if (!journal) return out;
  const prefix = `${target}:custom:`;
  for (const [entryKey, at] of journal) {
    if (entryKey.startsWith(prefix)) out.set(entryKey.slice(prefix.length), at);
  }
  return out;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
