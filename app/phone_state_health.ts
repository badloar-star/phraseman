import type {
  PhoneStateStoreDatabase,
  PhoneStateStoreTransaction,
} from '../modules/phone-state/store';

export type PhoneStateCriticalFailure =
  | 'lost_operation'
  | 'duplicate_result'
  | 'orphan_debit'
  | 'projection_downgrade'
  | 'account_leak';

type DurableCriticalFailure = PhoneStateCriticalFailure | 'health_state_corrupt';

export type PhoneStateHealthMetrics = Readonly<{
  pendingAgeMs: number;
  retries: number;
  cursorLag: number;
  duplicates: number;
  quarantine: number;
  replayMismatch: number;
  firestoreReads: number;
  firestoreWrites: number;
}>;

export type PhoneStateHealthSnapshot = Readonly<{
  schemaVersion: 'phone-state-health.v1';
  hydrated: boolean;
  criticalFailure: DurableCriticalFailure | null;
  criticalAtMs: number;
  journalPreserved: true;
  metrics: PhoneStateHealthMetrics;
  updatedAtMs: number;
}>;

export type PhoneStateHealthStorage = Readonly<{
  read(): Promise<string | null>;
  write(canonical: string): Promise<void>;
}>;

export type PhoneStateHealth = Readonly<{
  hydrate(): Promise<PhoneStateHealthSnapshot>;
  recordCritical(failure: PhoneStateCriticalFailure): Promise<PhoneStateHealthSnapshot>;
  recordMetrics(metrics: Partial<PhoneStateHealthMetrics>): Promise<PhoneStateHealthSnapshot>;
  isCutoverAllowed(): boolean;
  snapshot(): PhoneStateHealthSnapshot;
}>;

const EMPTY_METRICS: PhoneStateHealthMetrics = Object.freeze({
  pendingAgeMs: 0,
  retries: 0,
  cursorLag: 0,
  duplicates: 0,
  quarantine: 0,
  replayMismatch: 0,
  firestoreReads: 0,
  firestoreWrites: 0,
});

function boundedCounter(value: unknown, max = 1_000_000_000): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(max, Math.floor(parsed))
    : 0;
}

function metricsFrom(value: unknown): PhoneStateHealthMetrics {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.freeze({
    pendingAgeMs: boundedCounter(row.pendingAgeMs, 365 * 24 * 60 * 60 * 1000),
    retries: boundedCounter(row.retries),
    cursorLag: boundedCounter(row.cursorLag),
    duplicates: boundedCounter(row.duplicates),
    quarantine: boundedCounter(row.quarantine),
    replayMismatch: boundedCounter(row.replayMismatch),
    firestoreReads: boundedCounter(row.firestoreReads),
    firestoreWrites: boundedCounter(row.firestoreWrites),
  });
}

function initialSnapshot(): PhoneStateHealthSnapshot {
  return Object.freeze({
    schemaVersion: 'phone-state-health.v1',
    hydrated: false,
    criticalFailure: null,
    criticalAtMs: 0,
    journalPreserved: true,
    metrics: EMPTY_METRICS,
    updatedAtMs: 0,
  });
}

function canonical(snapshot: PhoneStateHealthSnapshot): string {
  return JSON.stringify({
    schemaVersion: snapshot.schemaVersion,
    criticalFailure: snapshot.criticalFailure,
    criticalAtMs: snapshot.criticalAtMs,
    journalPreserved: true,
    metrics: snapshot.metrics,
    updatedAtMs: snapshot.updatedAtMs,
  });
}

function parseDurable(raw: string): PhoneStateHealthSnapshot | null {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.schemaVersion !== 'phone-state-health.v1' || value.journalPreserved !== true) return null;
    const failure = value.criticalFailure;
    const allowed: readonly DurableCriticalFailure[] = [
      'lost_operation',
      'duplicate_result',
      'orphan_debit',
      'projection_downgrade',
      'account_leak',
      'health_state_corrupt',
    ];
    if (failure !== null && !allowed.includes(failure as DurableCriticalFailure)) return null;
    return Object.freeze({
      schemaVersion: 'phone-state-health.v1',
      hydrated: true,
      criticalFailure: failure as DurableCriticalFailure | null,
      criticalAtMs: boundedCounter(value.criticalAtMs, Number.MAX_SAFE_INTEGER),
      journalPreserved: true,
      metrics: metricsFrom(value.metrics),
      updatedAtMs: boundedCounter(value.updatedAtMs, Number.MAX_SAFE_INTEGER),
    });
  } catch {
    return null;
  }
}

export function createPhoneStateHealth(options: Readonly<{
  storage: PhoneStateHealthStorage;
  nowMs?: () => number;
}>): PhoneStateHealth {
  const nowMs = options.nowMs ?? Date.now;
  let current = initialSnapshot();
  let tail: Promise<void> = Promise.resolve();

  const serialize = async <T>(task: () => Promise<T>): Promise<T> => {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  };

  const hydrateUnlocked = async (): Promise<PhoneStateHealthSnapshot> => {
    if (current.hydrated) return current;
    const stored = await options.storage.read();
    if (stored === null) {
      current = Object.freeze({ ...initialSnapshot(), hydrated: true });
      return current;
    }
    const parsed = parseDurable(stored);
    current = parsed ?? Object.freeze({
      ...initialSnapshot(),
      hydrated: true,
      criticalFailure: 'health_state_corrupt',
      criticalAtMs: Math.max(0, Math.floor(nowMs())),
      updatedAtMs: Math.max(0, Math.floor(nowMs())),
    });
    return current;
  };

  const hydrate = (): Promise<PhoneStateHealthSnapshot> => serialize(hydrateUnlocked);

  const recordCritical = async (failure: PhoneStateCriticalFailure): Promise<PhoneStateHealthSnapshot> => {
    const timestamp = Math.max(0, Math.floor(nowMs()));
    if (!current.hydrated) current = Object.freeze({ ...current, hydrated: true });
    if (current.criticalFailure === null) {
      current = Object.freeze({
        ...current,
        criticalFailure: failure,
        criticalAtMs: timestamp,
        journalPreserved: true,
        updatedAtMs: timestamp,
      });
    }
    const stopped = current;
    await serialize(async () => {
      await options.storage.write(canonical(stopped));
    });
    return current;
  };

  const recordMetrics = (patch: Partial<PhoneStateHealthMetrics>): Promise<PhoneStateHealthSnapshot> => serialize(async () => {
    if (!current.hydrated) await hydrateUnlocked();
    const timestamp = Math.max(0, Math.floor(nowMs()));
    current = Object.freeze({
      ...current,
      metrics: metricsFrom({ ...current.metrics, ...patch }),
      updatedAtMs: timestamp,
    });
    await options.storage.write(canonical(current));
    return current;
  });

  return Object.freeze({
    hydrate,
    recordCritical,
    recordMetrics,
    isCutoverAllowed: () => current.hydrated && current.criticalFailure === null,
    snapshot: () => current,
  });
}

const HEALTH_DOMAIN = '__phone_state_health__';
const SELECT_HEALTH = `
/* phone-state:select-health */
SELECT canonical_state
FROM projections
WHERE domain = ?
LIMIT 1;
`;
const UPSERT_HEALTH = `
/* phone-state:upsert-health */
INSERT INTO projections (
  domain, reducer_version, canonical_state, through_operation_count
) VALUES (?, 1, ?, 0)
ON CONFLICT(domain) DO UPDATE SET
  reducer_version = excluded.reducer_version,
  canonical_state = excluded.canonical_state;
`;

export function createPhoneStateHealthSqlStorage(
  database: PhoneStateStoreDatabase,
): PhoneStateHealthStorage {
  return Object.freeze({
    read: async () => {
      const row = await database.getFirstAsync<{ canonical_state: string }>(SELECT_HEALTH, HEALTH_DOMAIN);
      return typeof row?.canonical_state === 'string' ? row.canonical_state : null;
    },
    write: async (value: string) => {
      await database.withExclusiveTransactionAsync(async (transaction: PhoneStateStoreTransaction) => {
        await transaction.runAsync(UPSERT_HEALTH, HEALTH_DOMAIN, value);
      });
    },
  });
}

let globalHealth: PhoneStateHealth | null = null;

export async function configurePhoneStateHealthStorage(
  storage: PhoneStateHealthStorage | null,
): Promise<void> {
  globalHealth = storage ? createPhoneStateHealth({ storage }) : null;
  await globalHealth?.hydrate();
}

export function isPhoneStateHealthCutoverAllowed(): boolean {
  return globalHealth?.isCutoverAllowed() === true;
}

export async function recordPhoneStateCriticalFailure(
  failure: PhoneStateCriticalFailure,
): Promise<void> {
  await globalHealth?.recordCritical(failure);
}

export async function recordPhoneStateHealthMetrics(
  metrics: Partial<PhoneStateHealthMetrics>,
): Promise<void> {
  await globalHealth?.recordMetrics(metrics);
}

export function getPhoneStateHealthSnapshot(): PhoneStateHealthSnapshot | null {
  return globalHealth?.snapshot() ?? null;
}

export default function __RouteShim() { return null; }
