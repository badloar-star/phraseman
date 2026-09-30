/*
 * Account V2, Пакет 5 — журнал отчёта dry-run и маскировка путей.
 *
 * зачем: отчёт уходит людям и в файлы. В нём только причины, пути полей и
 * счётчики — без значений, без uid (заменён на <uid>) и без того, что похоже
 * на личные данные внутри НЕИЗВЕСТНЫХ ключей (ремонт №1, P3): почта, длинные
 * идентификаторы, не-ASCII (имена) → `<masked>`. Известные ключи из таблицы
 * инвентаря печатаются точно — владелец должен видеть, какое поле ждёт домен.
 */

export type Bucket = 'carried' | 'dropped' | 'derived' | 'held' | 'informational' | 'keptInPlace';
export type ReportEntry = Readonly<{ reason: string; path: string; count: number; decisions?: readonly string[] }>;
export type ConflictEntry = Readonly<{ kind: string; path: string; count: number }>;

const MAX_PATH_KEY_LENGTH = 120;
const SEGMENT_SPLIT = /([:/|#])/;
const SAFE_SEGMENT = /^[A-Za-z0-9_-]*$/;
const LONG_ID_MIN_LENGTH = 12;
export const MASK = '<masked>';

export function compare(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function maskSegment(segment: string): string {
  if (!SAFE_SEGMENT.test(segment)) return MASK;
  // зачем: сплошной длинный буквенно-цифровой кусок без «_» — это id/токен, не имя поля.
  if (segment.length >= LONG_ID_MIN_LENGTH && /\d/.test(segment) && !segment.includes('_')) return MASK;
  return segment;
}

/**
 * Путь в отчёт: uid → `<uid>`; для неизвестного ключа (known=false) каждый
 * сегмент между `: / | #` маскируется по правилам выше; длина ограничена.
 */
export function pathKey(key: string, uid: string, known: boolean): string {
  const pieces = key.split(uid).map((piece) => (known
    ? piece
    : piece.split(SEGMENT_SPLIT).map((part) => (SEGMENT_SPLIT.test(part) ? part : maskSegment(part))).join('')));
  const redacted = pieces.join('<uid>');
  return redacted.length > MAX_PATH_KEY_LENGTH ? `${redacted.slice(0, MAX_PATH_KEY_LENGTH)}…` : redacted;
}

type MutableEntry = { bucket: Bucket; reason: string; path: string; count: number; decisions: readonly string[] };

export class Ledger {
  private readonly entries = new Map<string, MutableEntry>();
  private readonly conflictMap = new Map<string, { kind: string; path: string; count: number }>();

  add(bucket: Bucket, reason: string, path: string, decisions: readonly string[] = [], count = 1): void {
    if (count <= 0) return;
    const key = JSON.stringify([bucket, reason, path]);
    const prior = this.entries.get(key);
    if (prior !== undefined) prior.count += count;
    else this.entries.set(key, { bucket, reason, path, count, decisions });
  }

  conflict(kind: string, path: string): void {
    const key = JSON.stringify([kind, path]);
    const prior = this.conflictMap.get(key);
    if (prior !== undefined) prior.count += 1;
    else this.conflictMap.set(key, { kind, path, count: 1 });
  }

  list(bucket: Bucket): ReportEntry[] {
    return [...this.entries.values()]
      .filter((entry) => entry.bucket === bucket)
      .sort((left, right) => compare(left.path, right.path) || compare(left.reason, right.reason))
      .map(({ reason, path, count, decisions }) => (decisions.length > 0
        ? { reason, path, count, decisions: [...decisions] }
        : { reason, path, count }));
  }

  conflicts(): ConflictEntry[] {
    return [...this.conflictMap.values()].sort((left, right) => compare(left.path, right.path) || compare(left.kind, right.kind));
  }
}
