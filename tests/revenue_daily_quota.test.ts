import type { AccountGenerationToken } from '../app/account_generation';
import { createRevenueDailyQuotaAccess, revenueDayPassStorageKey } from '../app/revenue_daily_quota';
import { REVENUE_DAILY_LIMITS } from '../app/revenue_daily_limits';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(async () => null) }));
jest.mock('../app/phone_state_practice_bridge', () => ({
  readPhoneStatePracticeFactProjection: jest.fn(),
  commitPhoneStatePracticeReceipt: jest.fn(),
}));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumAccessStatusForAccountLease: jest.fn(async () => false) }));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, stableId: 'uid-a', phase: 'active' }),
  isCurrentAccountGeneration: () => true,
  withAccountTransitionLock: async (work: (lease: unknown) => Promise<unknown>) => work({}),
}));
jest.mock('../app/feature_gates', () => ({ shouldGateFeature: () => true }));

const token: AccountGenerationToken = { generation: 1, stableId: 'uid-a', phase: 'active' };
const NOW = Date.UTC(2026, 8, 13, 12, 0, 0);

function harness(options: { premium?: boolean; gated?: boolean; extra?: number; storageFails?: boolean } = {}) {
  const facts: Record<string, unknown> = {};
  const deps = {
    now: () => NOW,
    timeZone: () => 'Europe/Warsaw',
    isGateEnabled: () => options.gated ?? true,
    isCurrentAccount: () => true,
    withAccountLock: async <T,>(work: (lease: never) => Promise<T>) => work({} as never),
    verifyPaidAccess: async () => options.premium ?? false,
    readFacts: async () => (options.storageFails
      ? Object.freeze({ status: 'unavailable' as const })
      : Object.freeze({ status: 'available' as const, stableUid: 'uid-a', lineage: 1, facts: Object.freeze({ ...facts }) })),
    commitReceipt: async (_type: unknown, entityId: string, value: unknown) => {
      const duplicate = entityId in facts;
      facts[entityId] = value;
      return Object.freeze({ status: 'committed' as const, duplicate });
    },
    readStorage: async (key: string) => (options.extra && key === revenueDayPassStorageKey('uid-a', 'speaking_attempts', '2026-09-13@Europe/Warsaw')
      ? JSON.stringify({ extra: options.extra })
      : null),
  };
  return { access: createRevenueDailyQuotaAccess(deps as never), facts };
}

const consume = (access: ReturnType<typeof harness>['access'], receiptId: string) =>
  access.consume({ kind: 'speaking_attempts', token, accessResolved: true, receiptId, surface: 'test' });

describe('revenue_daily_quota — голосовые попытки обычного аккаунта', () => {
  test('лимит из единого источника, четвёртая попытка за день — exhausted', async () => {
    const { access } = harness();
    const limit = REVENUE_DAILY_LIMITS.speaking_attempts;
    for (let i = 1; i <= limit; i += 1) {
      const result = await consume(access, `r${i}`);
      expect(result.status).toBe('allowed');
      expect(result.used).toBe(i);
      expect(result.limit).toBe(limit);
    }
    const fourth = await consume(access, 'r-extra');
    expect(fourth.status).toBe('exhausted');
    expect(fourth.used).toBe(limit);
    const preview = await access.preview({ kind: 'speaking_attempts', token, accessResolved: true, hasPremiumAccess: false });
    expect(preview.status).toBe('exhausted');
    expect(preview.period).toBe('2026-09-13@Europe/Warsaw');
  });

  test('повтор того же receiptId идемпотентен и не списывает вторую попытку', async () => {
    const { access } = harness();
    await consume(access, 'same');
    const replay = await consume(access, 'same');
    expect(replay.bypass).toBe('idempotent');
    expect(replay.used).toBe(1);
  });

  test('Plus и снятый флаг Пульта — без лимита и без чеков', async () => {
    const plus = harness({ premium: true });
    const plusResult = await consume(plus.access, 'p1');
    expect(plusResult).toMatchObject({ status: 'allowed', limit: null, bypass: 'plus' });
    expect(Object.keys(plus.facts)).toHaveLength(0);
    const free = harness({ gated: false });
    const freeResult = await consume(free.access, 'f1');
    expect(freeResult).toMatchObject({ status: 'allowed', limit: null, bypass: 'remote_config' });
  });

  test('дневной пропуск за жемчужины поднимает лимит текущего окна', async () => {
    const { access } = harness({ extra: 3 });
    const limit = REVENUE_DAILY_LIMITS.speaking_attempts + 3;
    for (let i = 1; i <= limit; i += 1) expect((await consume(access, `x${i}`)).status).toBe('allowed');
    const over = await consume(access, 'x-over');
    expect(over.status).toBe('exhausted');
    expect(over.extra).toBe(3);
    expect(over.limit).toBe(limit);
  });

  test('недоступное хранилище — unavailable, а не exhausted (пейвол не открывается)', async () => {
    const { access } = harness({ storageFails: true });
    expect((await consume(access, 'u1')).status).toBe('unavailable');
    const preview = await access.preview({ kind: 'speaking_attempts', token, accessResolved: true, hasPremiumAccess: false });
    expect(preview.status).toBe('unavailable');
  });

  test('до разрешения entitlement — waiting', async () => {
    const { access } = harness();
    expect((await access.preview({ kind: 'speaking_attempts', token, accessResolved: false, hasPremiumAccess: false })).status).toBe('waiting');
  });
});
