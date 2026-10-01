export type MyPacksReadStatus = 'ready' | 'stale';

export type StrictArrayRead<T> = {
  items: T[];
  status: MyPacksReadStatus;
};

export async function runAccountScopedStorageTransaction<Token, Lease, Result>({
  token,
  isCurrent,
  withLock,
  work,
  inheritedLease,
}: {
  token: Token;
  isCurrent: (token: Token) => boolean;
  withLock: (work: (lease: Lease) => Promise<Result>, inheritedLease?: Lease) => Promise<Result>;
  work: (lease: Lease) => Promise<Result>;
  inheritedLease?: Lease;
}): Promise<Result> {
  return withLock(async (lease) => {
    if (!isCurrent(token)) throw new Error('Account changed');
    const result = await work(lease);
    if (!isCurrent(token)) throw new Error('Account changed');
    return result;
  }, inheritedLease);
}

export async function readArrayWithStatus<T>(
  read: () => Promise<T[]>,
): Promise<StrictArrayRead<T>> {
  try {
    return { items: await read(), status: 'ready' };
  } catch {
    return { items: [], status: 'stale' };
  }
}

/** Required v1 fields only; later optional fields remain backward-compatible. */
export function isValidLocalAuthorPackStorageItem(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const pack = value as Record<string, unknown>;
  return pack.v === 1
    && typeof pack.id === 'string'
    && pack.id.trim().length > 0
    && typeof pack.title === 'string'
    && typeof pack.description === 'string'
    && typeof pack.cardThemeKey === 'string'
    && Array.isArray(pack.cards)
    && typeof pack.createdAt === 'number'
    && Number.isFinite(pack.createdAt)
    && typeof pack.updatedAt === 'number'
    && Number.isFinite(pack.updatedAt);
}

/** Late account-owned results are commit-safe only inside the same active scope. */
export function canCommitAccountScopedResult(
  operationScope: string | null,
  currentScope: string | null,
): boolean {
  return operationScope !== null && operationScope === currentScope;
}

/** A readable but structurally corrupt payload is not equivalent to true empty. */
export function parseStrictArrayJson<T>(
  raw: string | null,
  isItem: (value: unknown) => value is T,
): StrictArrayRead<T> {
  if (raw == null) return { items: [], status: 'ready' };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(isItem)) return { items: [], status: 'stale' };
    return { items: parsed, status: 'ready' };
  } catch {
    return { items: [], status: 'stale' };
  }
}

/** Small insertion-ordered cache; account generations cannot accumulate forever. */
export class BoundedScopeCache<T> {
  readonly #entries = new Map<string, T>();

  constructor(readonly maxEntries: number) {
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
      throw new Error('BoundedScopeCache maxEntries must be a positive integer');
    }
  }

  get size(): number {
    return this.#entries.size;
  }

  get(key: string): T | undefined {
    return this.#entries.get(key);
  }

  set(key: string, value: T): void {
    this.#entries.delete(key);
    this.#entries.set(key, value);
    while (this.#entries.size > this.maxEntries) {
      const oldest = this.#entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.#entries.delete(oldest);
    }
  }

  clear(): void {
    this.#entries.clear();
  }
}

export function mergeOwnedIdReads(
  reads: readonly { ids: readonly string[]; status: MyPacksReadStatus }[],
  warmIds: readonly string[],
): { ids: string[]; status: MyPacksReadStatus } {
  const status = reads.every((read) => read.status === 'ready') ? 'ready' : 'stale';
  const ids = status === 'ready'
    ? reads.flatMap((read) => read.ids)
    : [...warmIds, ...reads.flatMap((read) => read.ids)];
  return { ids: [...new Set(ids)], status };
}

/**
 * Пакет 8C: `missingPackIds` — наборы, которых ТОЧНО нет (каталог прочитан полностью и
 * набора в нём нет; документ набора в облаке не существует). Такой набор не держит экран
 * в загрузке: остальные показываются, отсутствующий тихо не показывается (лог [MY-PACKS]).
 * Сбой сети/чтения — не «отсутствует»: id остаётся нерешённым → 'stale' (тихий повтор).
 */
export function classifyMyPacksResolution({
  sourceStatuses,
  ownedIds,
  resolvedPackIds,
  missingPackIds = [],
}: {
  sourceStatuses: readonly MyPacksReadStatus[];
  ownedIds: readonly string[];
  resolvedPackIds: readonly string[];
  missingPackIds?: readonly string[];
}): MyPacksReadStatus {
  if (!sourceStatuses.every((status) => status === 'ready')) return 'stale';
  const resolved = new Set([...resolvedPackIds, ...missingPackIds]);
  return ownedIds.every((id) => resolved.has(id)) ? 'ready' : 'stale';
}

/** 8C: «набора нет» на сессию — 30 мин; потом проверяем снова (набор могли вернуть в каталог). */
export const MY_PACKS_MISSING_TTL_MS = 30 * 60 * 1000;

/**
 * 8C: кэш отрицательного ответа «документа набора нет». зачем: без него каждый фокус
 * экрана и каждый тихий повтор заново читали бы из Firestore наборы, которых нет
 * (лишние чтения на каждом рендере). Ограничен по размеру; время подаётся снаружи.
 */
export class MissingPackCache {
  readonly #until: BoundedScopeCache<number>;

  constructor(readonly maxEntries: number, readonly ttlMs: number) {
    // зачем: в конструкторе, не в инициализаторе поля — поле инициализируется раньше параметров.
    this.#until = new BoundedScopeCache<number>(maxEntries);
  }

  isMissing(key: string, nowMs: number): boolean {
    const until = this.#until.get(key);
    return until !== undefined && until > nowMs;
  }

  markMissing(key: string, nowMs: number): void {
    this.#until.set(key, nowMs + this.ttlMs);
  }

  clear(): void {
    this.#until.clear();
  }
}
