import type { AccountGenerationToken } from '../app/account_generation';
import { createRevenueDailyQuotaAccess } from '../app/revenue_daily_quota';

// зачем (Ревизор/координатор 15.10, хвост R48): если старт «Моих ошибок» так и не состоялся (гонка энергии, отмена, сбой
// подготовки), суточная попытка уже была списана. Возврат — отдельной отметкой по id попытки: идемпотентно, ровно один раз.
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
const NOW = Date.UTC(2026, 9, 15, 12, 0, 0);

function harness() {
  const facts: Record<string, unknown> = {};
  let commits = 0;
  const deps = {
    now: () => NOW,
    timeZone: () => 'Europe/Warsaw',
    isGateEnabled: () => true,
    isCurrentAccount: () => true,
    withAccountLock: async <T,>(work: (lease: never) => Promise<T>) => work({} as never),
    verifyPaidAccess: async () => false,
    readFacts: async () => Object.freeze({ status: 'available' as const, stableUid: 'uid-a', lineage: 1, facts: Object.freeze({ ...facts }) }),
    commitReceipt: async (_type: unknown, entityId: string, value: unknown) => {
      commits += 1;
      const duplicate = entityId in facts;
      facts[entityId] = value;
      return Object.freeze({ status: 'committed' as const, duplicate });
    },
    readStorage: async () => null,
  };
  return { access: createRevenueDailyQuotaAccess(deps as never), facts, commits: () => commits };
}

const KIND = 'mistake_practice_starts' as const;
const preview = (access: ReturnType<typeof harness>['access']) =>
  access.preview({ kind: KIND, token, accessResolved: true, hasPremiumAccess: false });

describe('revenue_daily_quota — refund of an attempt whose start never happened', () => {
  it('attempt spent → start refused → attempt comes back exactly once', async () => {
    const { access, commits } = harness();
    const spent = await access.consume({ kind: KIND, token, accessResolved: true, receiptId: 'mistakes:a', surface: 'test' });
    expect(spent.used).toBe(1);
    expect((await preview(access)).status).toBe('exhausted');

    const first = await access.refund({ kind: KIND, token, receiptId: 'mistakes:a', reason: 'energy_insufficient' });
    expect(first.status).toBe('refunded');
    const afterFirst = await preview(access);
    expect(afterFirst.status).toBe('allowed');
    expect(afterFirst.used).toBe(0);

    const commitsBefore = commits();
    const second = await access.refund({ kind: KIND, token, receiptId: 'mistakes:a', reason: 'energy_insufficient' });
    expect(second.status).toBe('already_refunded');
    expect(commits()).toBe(commitsBefore); // повтор ничего не пишет
    expect((await preview(access)).used).toBe(0); // не «минус одна»
  });

  it('a refunded attempt does not free more than one slot: the next real start is counted again', async () => {
    const { access } = harness();
    await access.consume({ kind: KIND, token, accessResolved: true, receiptId: 'mistakes:a', surface: 'test' });
    await access.refund({ kind: KIND, token, receiptId: 'mistakes:a', reason: 'prepare_failed' });
    const next = await access.consume({ kind: KIND, token, accessResolved: true, receiptId: 'mistakes:b', surface: 'test' });
    expect(next.used).toBe(1);
    expect((await preview(access)).status).toBe('exhausted');
  });

  it('refund of an unknown receipt changes nothing', async () => {
    const { access, commits } = harness();
    const result = await access.refund({ kind: KIND, token, receiptId: 'mistakes:none', reason: 'energy_insufficient' });
    expect(result.status).toBe('not_found');
    expect(commits()).toBe(0);
  });

  it('replaying a refunded receipt id does not spend it again silently', async () => {
    const { access } = harness();
    await access.consume({ kind: KIND, token, accessResolved: true, receiptId: 'mistakes:a', surface: 'test' });
    await access.refund({ kind: KIND, token, receiptId: 'mistakes:a', reason: 'energy_cancelled' });
    const replay = await access.consume({ kind: KIND, token, accessResolved: true, receiptId: 'mistakes:a', surface: 'test' });
    expect(replay.bypass).toBe('idempotent'); // тот же чек — не новая попытка
    expect((await preview(access)).used).toBe(0);
  });
});
