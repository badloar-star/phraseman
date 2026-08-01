import { HttpsError } from 'firebase-functions/v2/https';
import {
  MAX_EVENTS_PER_AUTH_DAY,
  applyOnboardingFunnelEvent,
  buildOnboardingFunnelPrivacyKeys,
  parseOnboardingFunnelEventInput,
  summarizeOnboardingFunnelRows,
  type OnboardingFunnelRepository,
  type OnboardingFunnelTransaction,
} from './onboarding_funnel';

type Receipt = { createdAtMs: number; expiresAtMs: number };
type Rate = { started: number; completed: number; expiresAtMs: number };
type Daily = { date: string; platform: 'ios' | 'android' | 'web'; started: number; completed: number };

class MemoryRepository implements OnboardingFunnelRepository {
  readonly receipts = new Map<string, Receipt>();
  readonly rates = new Map<string, Rate>();
  readonly daily = new Map<string, Daily>();

  async runTransaction<T>(work: (tx: OnboardingFunnelTransaction) => Promise<T>): Promise<T> {
    return work({
      hasReceipt: async (key) => this.receipts.has(key),
      getRate: async (key) => this.rates.get(key) ?? null,
      createReceipt: (key, value) => {
        if (this.receipts.has(key)) throw new Error('receipt_already_exists');
        this.receipts.set(key, value);
      },
      setRate: (key, value) => this.rates.set(key, value),
      incrementDaily: (docId, date, platform, event) => {
        const current = this.daily.get(docId) ?? { date, platform, started: 0, completed: 0 };
        current[event] += 1;
        this.daily.set(docId, current);
      },
    });
  }

  async listDaily(): Promise<Daily[]> {
    return [...this.daily.values()];
  }
}

const START = { event: 'started', platform: 'ios', attemptId: '2c94f265-76a8-44d4-a36d-f03d679afb22' } as const;
const UID = 'firebase-anonymous-uid-that-must-never-be-stored';
const NOW = new Date('2026-07-28T12:00:00.000Z');

describe('onboarding funnel input boundary', () => {
  it('accepts only the event, platform, and opaque attempt id allowlist', () => {
    expect(parseOnboardingFunnelEventInput(START)).toEqual(START);

    for (const sensitiveField of ['uid', 'name', 'deviceId', 'stableId', 'email']) {
      expect(() => parseOnboardingFunnelEventInput({ ...START, [sensitiveField]: 'leak' }))
        .toThrow(HttpsError);
    }
  });

  it('rejects unknown events, platforms, and guessable attempt ids', () => {
    expect(() => parseOnboardingFunnelEventInput({ ...START, event: 'viewed' })).toThrow(HttpsError);
    expect(() => parseOnboardingFunnelEventInput({ ...START, platform: 'iphone-15-pro' })).toThrow(HttpsError);
    expect(() => parseOnboardingFunnelEventInput({ ...START, attemptId: 'install-1' })).toThrow(HttpsError);
  });
});

describe('privacy-safe onboarding funnel writes', () => {
  it('increments a daily/platform aggregate once for a replayed start', async () => {
    const repository = new MemoryRepository();

    const first = await applyOnboardingFunnelEvent(repository, UID, START, NOW);
    const replay = await applyOnboardingFunnelEvent(repository, UID, START, NOW);

    expect(first).toEqual({ ok: true, duplicate: false });
    expect(replay).toEqual({ ok: true, duplicate: true });
    expect([...repository.daily.values()]).toEqual([
      { date: '2026-07-28', platform: 'ios', started: 1, completed: 0 },
    ]);
  });

  it('records completion only after the same attempt has a start receipt', async () => {
    const repository = new MemoryRepository();
    const completion = { ...START, event: 'completed' as const };

    await expect(applyOnboardingFunnelEvent(repository, UID, completion, NOW))
      .rejects.toMatchObject({ code: 'failed-precondition' });

    await applyOnboardingFunnelEvent(repository, UID, START, NOW);
    await applyOnboardingFunnelEvent(repository, UID, completion, NOW);

    expect([...repository.daily.values()][0]).toEqual({
      date: '2026-07-28',
      platform: 'ios',
      started: 1,
      completed: 1,
    });
  });

  it('stores no raw uid, name, device id, stable id, or attempt id', async () => {
    const repository = new MemoryRepository();
    await applyOnboardingFunnelEvent(repository, UID, START, NOW);

    const persisted = JSON.stringify({
      receiptKeys: [...repository.receipts.keys()],
      receipts: [...repository.receipts.values()],
      rateKeys: [...repository.rates.keys()],
      rates: [...repository.rates.values()],
      daily: [...repository.daily.values()],
    });
    expect(persisted).not.toContain(UID);
    expect(persisted).not.toContain(START.attemptId);
    expect(persisted).not.toMatch(/stableId|deviceId|name|email/i);
    for (const key of [...repository.receipts.keys(), ...repository.rates.keys()]) {
      expect(key).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('limits distinct attempts per authenticated user and UTC day', async () => {
    const repository = new MemoryRepository();
    for (let index = 0; index < MAX_EVENTS_PER_AUTH_DAY; index += 1) {
      await applyOnboardingFunnelEvent(repository, UID, {
        ...START,
        attemptId: `attempt-${String(index).padStart(2, '0')}-opaque-token-1234567890`,
      }, NOW);
    }

    await expect(applyOnboardingFunnelEvent(repository, UID, {
      ...START,
      attemptId: 'attempt-over-limit-opaque-token-1234567890',
    }, NOW)).rejects.toMatchObject({ code: 'resource-exhausted' });
  });

  it('uses unlinkable-looking hashes instead of raw auth values as storage keys', () => {
    const keys = buildOnboardingFunnelPrivacyKeys(UID, START, '2026-07-28');
    expect(keys.receiptKey).toMatch(/^[a-f0-9]{64}$/);
    expect(keys.rateKey).toMatch(/^[a-f0-9]{64}$/);
    expect(keys.receiptKey).not.toContain(UID);
    expect(keys.receiptKey).not.toContain(START.attemptId);
  });
});

describe('onboarding funnel admin summary', () => {
  it('returns started, completed, and conversion for the selected platform', () => {
    const result = summarizeOnboardingFunnelRows([
      { date: '2026-07-27', platform: 'ios', started: 8, completed: 6 },
      { date: '2026-07-27', platform: 'android', started: 10, completed: 5 },
      { date: '2026-07-28', platform: 'ios', started: 2, completed: 2 },
    ], 'ios');

    expect(result).toEqual({ started: 10, completed: 8, conversionPercent: 80 });
  });

  it('does not invent a conversion when there are no starts', () => {
    expect(summarizeOnboardingFunnelRows([], 'all')).toEqual({
      started: 0,
      completed: 0,
      conversionPercent: null,
    });
  });
});
