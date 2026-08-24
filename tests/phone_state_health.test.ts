import {
  createPhoneStateHealth,
  type PhoneStateCriticalFailure,
  type PhoneStateHealthStorage,
} from '../app/phone_state_health';

function memoryStorage(initial: string | null = null): PhoneStateHealthStorage & {
  writes: string[];
} {
  let value = initial;
  const writes: string[] = [];
  return {
    writes,
    read: async () => value,
    write: async (canonical) => {
      value = canonical;
      writes.push(canonical);
    },
  };
}

describe('PhoneState fail-local health gate', () => {
  test.each<PhoneStateCriticalFailure>([
    'lost_operation',
    'duplicate_result',
    'orphan_debit',
    'projection_downgrade',
    'account_leak',
  ])('%s disables local cutover immediately and survives restart', async (failure) => {
    const storage = memoryStorage();
    const health = createPhoneStateHealth({ storage, nowMs: () => 1_000 });
    await health.hydrate();
    expect(health.isCutoverAllowed()).toBe(true);

    const pending = health.recordCritical(failure);
    expect(health.isCutoverAllowed()).toBe(false);
    await pending;

    const restarted = createPhoneStateHealth({ storage, nowMs: () => 2_000 });
    await restarted.hydrate();
    expect(restarted.isCutoverAllowed()).toBe(false);
    expect(restarted.snapshot()).toMatchObject({ criticalFailure: failure, journalPreserved: true });
  });

  test('uninitialized or malformed durable health fails closed without deleting journal state', async () => {
    const storage = memoryStorage('{bad json');
    const health = createPhoneStateHealth({ storage, nowMs: () => 1_000 });
    expect(health.isCutoverAllowed()).toBe(false);
    await health.hydrate();
    expect(health.isCutoverAllowed()).toBe(false);
    expect(health.snapshot().criticalFailure).toBe('health_state_corrupt');
    expect(storage.writes).toHaveLength(0);
  });

  test('privacy-safe operational counters are finite, non-negative, and bounded', async () => {
    const health = createPhoneStateHealth({ storage: memoryStorage(), nowMs: () => 1_000 });
    await health.hydrate();
    await health.recordMetrics({
      pendingAgeMs: -1,
      retries: Number.POSITIVE_INFINITY,
      cursorLag: 4,
      duplicates: 2,
      quarantine: 3,
      replayMismatch: 1,
      firestoreReads: 9,
      firestoreWrites: 5,
    });
    expect(health.snapshot().metrics).toEqual({
      pendingAgeMs: 0,
      retries: 0,
      cursorLag: 4,
      duplicates: 2,
      quarantine: 3,
      replayMismatch: 1,
      firestoreReads: 9,
      firestoreWrites: 5,
    });
  });
});
