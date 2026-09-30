/*
 * Account V2 (TG-831C22D22486) — выбор операций outbox в пакет (TEMP-контракт (а), (д)).
 *
 * зачем: сервер считает операции ОДНОЙ сущности внутри одного пакета причинно
 * упорядоченными (эффективная база). Разнесённые по пакетам — честный conflict и
 * копящиеся варианты карточки. Поэтому пакет собирается по сущностям:
 *  - первой идёт сущность самой старой операции (голова очереди): берутся её
 *    операции по порядку, сколько поместится (голова всегда продвигается);
 *  - остальные сущности — по порядку первой операции и ТОЛЬКО целиком: не
 *    поместилась вся группа — сущность ждёт следующего пакета и не делится;
 *  - внутри пакета операции идут по порядку outbox (по сущности порядок сохранён).
 * Чужие операции сюда не попадают: кандидаты — только очередь этого outbox.
 * Функция чистая; чтение очереди и окно просмотра — в account_sync_outbox.ts.
 */

export type AccountSyncBatchCandidate = Readonly<{
  sequence: number;
  /** Ключ сущности: JSON.stringify([entityType, entityId]). */
  entityKey: string;
  /** Байты операции на проводе (JSON UTF-8). */
  bytes: number;
}>;

export type AccountSyncBatchLimits = Readonly<{
  maxOperations: number;
  maxBatchUtf8Bytes: number;
  /** Полный размер пакета по сумме байт операций и их числу. */
  batchBytes: (operationBytes: number, operationCount: number) => number;
}>;

export type AccountSyncBatchPlan =
  | Readonly<{ kind: 'selected'; sequences: readonly number[] }>
  | Readonly<{ kind: 'empty' }>
  | Readonly<{ kind: 'head_too_large' }>;

function groupByEntity(
  candidates: readonly AccountSyncBatchCandidate[],
): readonly (readonly AccountSyncBatchCandidate[])[] {
  const groups = new Map<string, AccountSyncBatchCandidate[]>();
  for (const candidate of candidates) {
    const group = groups.get(candidate.entityKey);
    if (group === undefined) groups.set(candidate.entityKey, [candidate]);
    else group.push(candidate);
  }
  return [...groups.values()];
}

/** candidates — живые операции окна в порядке outbox (sequence по возрастанию). */
export function planAccountSyncBatch(
  candidates: readonly AccountSyncBatchCandidate[],
  limits: AccountSyncBatchLimits,
): AccountSyncBatchPlan {
  if (candidates.length === 0) return Object.freeze({ kind: 'empty' as const });
  const selected: number[] = [];
  let bytes = 0;
  const fits = (extraBytes: number, extraCount: number): boolean => (
    selected.length + extraCount <= limits.maxOperations
    && limits.batchBytes(bytes + extraBytes, selected.length + extraCount) <= limits.maxBatchUtf8Bytes
  );
  const groups = groupByEntity(candidates);
  for (let index = 0; index < groups.length && selected.length < limits.maxOperations; index += 1) {
    const group = groups[index];
    if (index === 0) {
      for (const candidate of group) {
        if (!fits(candidate.bytes, 1)) break;
        selected.push(candidate.sequence);
        bytes += candidate.bytes;
      }
      if (selected.length === 0) return Object.freeze({ kind: 'head_too_large' as const });
      continue;
    }
    const groupBytes = group.reduce((total, candidate) => total + candidate.bytes, 0);
    if (!fits(groupBytes, group.length)) continue;
    for (const candidate of group) selected.push(candidate.sequence);
    bytes += groupBytes;
  }
  return Object.freeze({
    kind: 'selected' as const,
    sequences: Object.freeze([...selected].sort((left, right) => left - right)),
  });
}

/** FNV-1a 32 бита по кодовым единицам UTF-16 → 8 hex. Детерминирован, без зависимостей. */
export function accountSyncFnv1aHex(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Id пакета: подряд идущие номера — прежняя форма `sync-v2:first:last`, иначе —
 * с числом операций и хэшем СПИСКА номеров.
 * зачем (TG-7CD73967EF61, P3): у пакетов с «дырами» одинаковые first/last/n давали
 * одинаковый id при разном составе — учёт неудач (он по id пакета) смешивал бы
 * разные пакеты. Хэш — не защита, а различитель; сверка состава всё равно по номерам.
 */
export function accountSyncBatchIdFor(sequences: readonly number[]): string {
  const first = sequences[0];
  const last = sequences[sequences.length - 1];
  const contiguous = last - first + 1 === sequences.length;
  return contiguous
    ? `sync-v2:${String(first)}:${String(last)}`
    : `sync-v2:${String(first)}:${String(last)}:n${String(sequences.length)}`
      + `:h${accountSyncFnv1aHex(sequences.map(String).join(','))}`;
}
