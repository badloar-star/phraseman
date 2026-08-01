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
type Daily = {
  date: string;
  platform: 'ios' | 'android' | 'web';
  started: number;
  completed: number;
  consentGranted: number;
  consentDenied: number;
};

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
      incrementDaily: (docId, date, platform, event, analyticsConsent) => {
        const current = this.daily.get(docId)
          ?? { date, platform, started: 0, completed: 0, consentGranted: 0, consentDenied: 0 };
        current[event] += 1;
        if (analyticsConsent === 'granted') current.consentGranted += 1;
        if (analyticsConsent === 'denied') current.consentDenied += 1;
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
    expect([...repository.daily.values()]).toMatchObject([
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

    expect([...repository.daily.values()][0]).toMatchObject({
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

    expect(result).toMatchObject({ started: 10, completed: 8, conversionPercent: 80 });
  });

  it('does not invent a conversion when there are no starts', () => {
    expect(summarizeOnboardingFunnelRows([], 'all')).toMatchObject({
      started: 0,
      completed: 0,
      conversionPercent: null,
    });
  });
});

// зачем: владелец хочет объявлять победителя A/B-теста пейвола по данным, но вся
// продуктовая аналитика гейтится согласием, а ОТКАЗ не оставлял следа нигде —
// знаменателя «сколько всего спросили» не существовало, и долю согласий нельзя
// было узнать в принципе. Считаем её здесь: это счётчик без PII на легитимном
// интересе (как started/completed), а не продуктовая аналитика.
describe('analytics consent rate measurement', () => {
  const COMPLETED = { ...START, event: 'completed' as const };

  async function completeWith(
    repository: MemoryRepository,
    consent?: 'granted' | 'denied',
  ): Promise<void> {
    await applyOnboardingFunnelEvent(repository, UID, START, NOW);
    await applyOnboardingFunnelEvent(
      repository,
      UID,
      consent ? { ...COMPLETED, analyticsConsent: consent } : COMPLETED,
      NOW,
    );
  }

  it('accepts only granted/denied as the consent decision', () => {
    expect(parseOnboardingFunnelEventInput({ ...COMPLETED, analyticsConsent: 'granted' }))
      .toMatchObject({ analyticsConsent: 'granted' });
    expect(parseOnboardingFunnelEventInput({ ...COMPLETED, analyticsConsent: 'denied' }))
      .toMatchObject({ analyticsConsent: 'denied' });

    for (const invalid of ['unset', 'yes', '', true, 1, null]) {
      expect(() => parseOnboardingFunnelEventInput({ ...COMPLETED, analyticsConsent: invalid }))
        .toThrow(HttpsError);
    }
  });

  it('counts a denial even though analytics itself never sees that user', async () => {
    const repository = new MemoryRepository();
    await completeWith(repository, 'denied');

    expect([...repository.daily.values()][0]).toMatchObject({
      completed: 1,
      consentGranted: 0,
      consentDenied: 1,
    });
  });

  it('reports the consent rate that gates every downstream experiment', () => {
    const summary = summarizeOnboardingFunnelRows([
      { date: '2026-07-27', platform: 'ios', started: 100, completed: 80, consentGranted: 20, consentDenied: 60 },
      { date: '2026-07-28', platform: 'ios', started: 100, completed: 20, consentGranted: 5, consentDenied: 15 },
    ], 'ios');

    // 25 согласий из 100 решений = 25%: столько реальной выборки доходит до A/B.
    expect(summary).toMatchObject({
      consentGranted: 25,
      consentDecisions: 100,
      consentRatePercent: 25,
    });
  });

  it('stays backward compatible with rows written before the counter shipped', () => {
    // Старые документы без consent-полей не должны выдумывать 0% или падать.
    expect(summarizeOnboardingFunnelRows([
      { date: '2026-07-01', platform: 'ios', started: 10, completed: 8 },
    ], 'all')).toMatchObject({ consentDecisions: 0, consentRatePercent: null });
  });

  it('never lets the consent decision reach storage as anything but a counter', async () => {
    const repository = new MemoryRepository();
    await completeWith(repository, 'granted');

    const persisted = JSON.stringify([...repository.daily.values()]);
    expect(persisted).not.toContain(UID);
    expect(persisted).not.toContain(START.attemptId);
    expect(persisted).not.toMatch(/granted|denied/);
  });
});
