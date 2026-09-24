/**
 * D51/D53: миграция «Подарки и спины → монеты».
 *
 * Сторожит денежные свойства: повтор не платит дважды, крах между шагами
 * продолжает с того же места теми же requestId, два аккаунта не смешиваются,
 * потолок 20 спинов, платный спин ≥300, Plus-дни включаются (а не монеты),
 * просроченное не платится, рубильник останавливает прогон.
 *
 * Тест начинает с beginAccountGeneration и не имеет тихих return (урок
 * project_rune_purchase_two_bugs: без активной личности всё отсекается на входе).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from '../app/account_generation';
import { DAILY_JOURNEY_GIFT_CLAIM_RECEIPT_PREFIX } from '../constants/daily_journey_gift_storage_keys';
import {
  __giftsToCoinsTestHooks,
  giftsToCoinsWalKey,
  runGiftsToCoinsMigration,
  type GiftsToCoinsDeps,
  type GiftsToCoinsReportPayload,
  type GiftsToCoinsWal,
} from '../app/gifts_to_coins_migration_v1';
import {
  coinDenominationGiftIds,
  roundCoinsUp,
  valueGiftForCoins,
  valuePaidSpinPrize,
} from '../app/gifts_to_coins_table_v1';
import {
  dailyJourneySpinCompensationGrants,
  reserveDailyJourneySpinCompensation,
} from '../app/gifts_to_coins_spin_cap_v1';
import {
  LEVEL_SPIN_BALANCE_CACHE_KEY,
  LEVEL_SPIN_GIFT_JOURNAL_KEY,
  UNCLAIMED_DUAL_GIFTS_KEY,
  UNCLAIMED_GIFTS_KEY,
  UNCLAIMED_GIFT_RECEIVED_AT_KEY,
} from '../app/level_up_storage_keys';

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;
const PAID_REQ = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const FREE_REQ = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
const EXPIRED_REQ = 'cccccccc-dddd-eeee-ffff-000000000000';

type Harness = {
  deps: GiftsToCoinsDeps;
  enqueued: { requestId: string; giftId: string; owner: string }[];
  plus: { giftId: string; occurrenceId: string }[];
  acks: string[];
  reports: GiftsToCoinsReportPayload[];
  setNow: (ms: number) => void;
  setEnabled: (value: boolean) => void;
  setDailyJourney: (value: DjPending[]) => void;
  failEnqueueAt: Set<number>;
  failPlus: { value: boolean };
  failReport: { value: boolean };
  onEnqueue: { hook: ((index: number) => void) | null };
};

type DjPending = Awaited<ReturnType<GiftsToCoinsDeps['readDailyJourneyPending']>>[number];

function harness(): Harness {
  let now = NOW;
  let enabled = true;
  let dailyJourney: DjPending[] = [];
  const h: Harness = {
    enqueued: [], plus: [], acks: [], reports: [],
    setNow: (ms) => { now = ms; },
    setEnabled: (value) => { enabled = value; },
    setDailyJourney: (value) => { dailyJourney = value; },
    failEnqueueAt: new Set(),
    failPlus: { value: false },
    failReport: { value: false },
    onEnqueue: { hook: null },
    deps: undefined as unknown as GiftsToCoinsDeps,
  };
  let enqueueCalls = 0;
  const seen = new Set<string>();
  h.deps = {
    now: () => now,
    isEnabled: () => enabled,
    readDailyJourneyPending: async () => dailyJourney,
    applyPlus: async (giftId, occurrenceId) => {
      if (h.failPlus.value) return false;
      h.plus.push({ giftId, occurrenceId });
      return true;
    },
    enqueueCoins: async ({ token, requestId, giftId }: { token: AccountGenerationToken; requestId: string; giftId: string }) => {
      const index = enqueueCalls;
      enqueueCalls += 1;
      h.onEnqueue.hook?.(index);
      // Как настоящий кошелёк: при смене аккаунта отказывает.
      if (!isCurrentAccountGeneration(token, token.stableId)) throw new Error('level_spin_star_identity_changed');
      if (h.failEnqueueAt.has(index)) throw new Error('simulated_crash');
      expect(requestId).toMatch(/^[A-Za-z0-9_-]{16,80}$/);
      expect(giftId).toMatch(/^stars_(10|20|50|100|250|500|1000|2000)$/);
      // Как настоящий кошелёк: тот же requestId второй раз не начисляет.
      if (seen.has(requestId)) return;
      seen.add(requestId);
      h.enqueued.push({ requestId, giftId, owner: String(token.stableId) });
    },
    syncCoins: async () => {},
    acknowledgePaidSpin: async (requestId) => { h.acks.push(requestId); },
    cancelExpiringPush: async () => {},
    sendReport: async (payload) => {
      if (h.failReport.value) throw new Error('functions/not-found');
      h.reports.push(payload);
    },
  };
  return h;
}

function coinsOf(entries: { giftId: string }[]): number {
  return entries.reduce((sum, entry) => sum + Number(entry.giftId.replace('stars_', '')), 0);
}

async function readWal(owner: string): Promise<GiftsToCoinsWal> {
  const raw = await AsyncStorage.getItem(giftsToCoinsWalKey(owner));
  expect(raw).not.toBeNull();
  return JSON.parse(String(raw)) as GiftsToCoinsWal;
}

function spinState(owner: string, credits: number, extra: Record<string, unknown> = {}): string {
  const list = Array.from({ length: credits }, (_, index) => ({
    id: `local_spin_v1_${String(index + 2).padStart(3, '0')}`, level: index + 2,
  }));
  return JSON.stringify({
    owner,
    credits: list,
    issuedLevels: list.map((credit) => credit.level),
    issuedCreditIds: list.map((credit) => credit.id),
    activeReceipt: null,
    closedRequestIds: [],
    lessonSpinMisses: 0,
    ...extra,
  });
}

function journalEntry(owner: string, requestId: string, giftId: string, opts: { paid?: boolean; expiresAtMs?: number } = {}) {
  return {
    owner,
    requestId,
    creditId: opts.paid ? `paid_level_spin:${requestId}` : 'local_spin_v1_010',
    level: opts.paid ? 0 : 10,
    receivedAtMs: (opts.expiresAtMs ?? NOW + HOUR) - 72 * HOUR,
    expiresAtMs: opts.expiresAtMs ?? NOW + HOUR,
    localOnly: true,
    occurrences: [{ occurrenceId: `level-spin:${requestId}:base`, lane: 'base', giftId, claimed: false }],
  };
}

function dj(owner: string, operationId: string, kind: DjPending['reward']['kind'], amount: number): DjPending {
  return {
    operationId, ownerStableId: owner, payloadFingerprint: 'f'.repeat(64),
    createdAtMs: NOW - HOUR, reward: { kind, amount },
  };
}

async function seedFullInventory(owner: string, h: Harness): Promise<void> {
  await AsyncStorage.setItem(`local_level_spin_state_v1:${encodeURIComponent(owner)}`, spinState(owner, 3, {
    activeReceipt: {
      schemaVersion: 3, requestId: PAID_REQ, baseGiftId: 'stars_50', expiresAtMs: NOW + HOUR,
    },
  }));
  await AsyncStorage.setItem(LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify([
    journalEntry(owner, FREE_REQ, 'cosmetic_theme'),
    journalEntry(owner, PAID_REQ, 'stars_50', { paid: true }),
    journalEntry(owner, EXPIRED_REQ, 'cosmetic_avatar_aura', { expiresAtMs: NOW - HOUR }),
    journalEntry('someone-else', 'dddddddd-eeee-ffff-0000-111111111111', 'cosmetic_theme'),
  ]));
  await AsyncStorage.setItem(UNCLAIMED_GIFTS_KEY, JSON.stringify({
    5: { id: 'energy_full' },
    6: { id: 'hint_1' },
  }));
  await AsyncStorage.setItem(UNCLAIMED_DUAL_GIFTS_KEY, JSON.stringify({
    7: { f2p: { id: 'hint_3' }, prem: { id: 'plus_days_3' } },
  }));
  await AsyncStorage.setItem(UNCLAIMED_GIFT_RECEIVED_AT_KEY, JSON.stringify({
    5: NOW - HOUR, 6: NOW - 80 * HOUR, 7: NOW - HOUR,
  }));
  h.setDailyJourney([
    dj(owner, 'dj-op-runes-0001', 'runes', 300),
    dj(owner, 'dj-op-spins-0001', 'spins', 2),
    dj(owner, 'dj-op-pearl-0001', 'pearls', 10),
  ]);
}

// 3 спина ×130 + тема 2000 + платный max(300, 50) + энергия 50 + hint_3 30
// + руны 300 + 2 спина ×130 + жемчуг 10×10. Просроченные аура и hint_1 — 0.
const FULL_EXPECTED_COINS = 390 + 2000 + 300 + 50 + 30 + 300 + 260 + 100;

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
  __resetAccountGenerationForTests();
  __giftsToCoinsTestHooks.resetScheduler();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('таблица «Средне»', () => {
  it('платный спин не меньше 300, дороже — по ценности приза', () => {
    expect(valuePaidSpinPrize('stars_10').coins).toBe(300);
    expect(valuePaidSpinPrize('cosmetic_theme').coins).toBe(2000);
    expect(valuePaidSpinPrize('plus_days_7').kind).toBe('plus');
  });

  it('Plus-дни — не монеты, жемчуг ×10, руны 1:1, выбор из 3 — самый дорогой', () => {
    expect(valueGiftForCoins('plus_days_30')).toEqual({ coins: 0, kind: 'plus' });
    expect(valueGiftForCoins('pearls_20').coins).toBe(200);
    expect(valueGiftForCoins('stars_250').coins).toBe(250);
    expect(valueGiftForCoins('choice_3_level', ['hint_1', 'cosmetic_avatar_common', 'xp_50']).coins).toBe(900);
    expect(valueGiftForCoins('xp_bank_600').coins).toBe(25);
  });

  it('итог округляется вверх до 10 и раскладывается на номиналы без остатка', () => {
    expect(roundCoinsUp(3431)).toBe(3440);
    const ids = coinDenominationGiftIds(3440);
    expect(coinsOf(ids.map((giftId) => ({ giftId })))).toBe(3440);
  });
});

describe('миграция', () => {
  it('полный прогон: монеты, Plus, списание, метка и строка-итог', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await seedFullInventory(owner, h);

    await expect(runGiftsToCoinsMigration({ trigger: 'test', deps: h.deps })).resolves.toBe('done');

    expect(coinsOf(h.enqueued)).toBe(FULL_EXPECTED_COINS);
    expect(h.plus.map((entry) => entry.giftId)).toEqual(['plus_days_3']);
    expect(h.acks).toEqual([PAID_REQ]);

    const wal = await readWal(owner);
    expect(wal.phase).toBe('done');
    expect(wal.totalCoins).toBe(FULL_EXPECTED_COINS);
    expect(wal.expired).toEqual({ spin_prize: 1, level_gift: 1 });

    const state = JSON.parse(String(await AsyncStorage.getItem(`local_level_spin_state_v1:${owner}`)));
    expect(state.credits).toEqual([]);
    expect(state.issuedLevels).toEqual([2, 3, 4]);
    expect(state.activeReceipt).toBeNull();
    expect(state.closedRequestIds).toContain(PAID_REQ);
    expect(JSON.parse(String(await AsyncStorage.getItem(LEVEL_SPIN_BALANCE_CACHE_KEY)))).toEqual({ owner, balance: 0 });

    const journal = JSON.parse(String(await AsyncStorage.getItem(LEVEL_SPIN_GIFT_JOURNAL_KEY)));
    const claimed = (req: string) => journal.find((entry: { requestId: string }) => entry.requestId === req).occurrences[0].claimed;
    expect(claimed(FREE_REQ)).toBe(true);
    expect(claimed(PAID_REQ)).toBe(true);
    // Просроченное и чужое не трогаем.
    expect(claimed(EXPIRED_REQ)).toBe(false);
    expect(claimed('dddddddd-eeee-ffff-0000-111111111111')).toBe(false);

    const single = JSON.parse(String(await AsyncStorage.getItem(UNCLAIMED_GIFTS_KEY)));
    expect(Object.keys(single)).toEqual(['6']);
    expect(JSON.parse(String(await AsyncStorage.getItem(UNCLAIMED_DUAL_GIFTS_KEY)))).toEqual({});

    const receiptKey = `${DAILY_JOURNEY_GIFT_CLAIM_RECEIPT_PREFIX}${owner}:dj-op-runes-0001`;
    const receipt = JSON.parse(String(await AsyncStorage.getItem(receiptKey)));
    expect(receipt).toMatchObject({
      schemaVersion: 'daily-journey-gift-claim-receipt.v1',
      claimOperationId: 'daily-journey-gift-claim:dj-op-runes-0001',
      reward: { kind: 'runes', amount: 300 },
    });

    expect(h.reports).toHaveLength(1);
    expect(h.reports[0]).toMatchObject({
      ownerStableId: owner,
      totalCoins: FULL_EXPECTED_COINS,
      counts: { spin_credit: 3, spin_prize: 1, paid_spin: 1, level_gift: 3, daily_journey: 3, plus_days: 1 },
    });
    expect((await readWal(owner)).report.status).toBe('sent');
  });

  it('двойной запуск не платит второй раз', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await seedFullInventory(owner, h);
    await expect(runGiftsToCoinsMigration({ trigger: 'first', deps: h.deps })).resolves.toBe('done');
    const firstCount = h.enqueued.length;
    await expect(runGiftsToCoinsMigration({ trigger: 'second', deps: h.deps })).resolves.toBe('already_done');
    expect(h.enqueued).toHaveLength(firstCount);
    expect(h.plus).toHaveLength(1);
  });

  it('параллельный запуск не стартует второй прогон', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await seedFullInventory(owner, h);
    const [a, b] = await Promise.all([
      runGiftsToCoinsMigration({ trigger: 'a', deps: h.deps }),
      runGiftsToCoinsMigration({ trigger: 'b', deps: h.deps }),
    ]);
    expect([a, b].sort()).toEqual(['busy', 'done']);
    expect(coinsOf(h.enqueued)).toBe(FULL_EXPECTED_COINS);
  });

  it('крах посреди зачисления: повтор продолжает с той же операции, опись заморожена', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await seedFullInventory(owner, h);
    h.failEnqueueAt.add(1);
    await expect(runGiftsToCoinsMigration({ trigger: 'crash', deps: h.deps })).resolves.toBe('credit_failed');
    const mid = await readWal(owner);
    expect(mid.phase).toBe('plus_applied');
    expect(mid.creditedOps).toBe(1);

    // Между запусками появился новый кредит спина — в ЭТОТ прогон он не входит.
    await AsyncStorage.setItem(`local_level_spin_state_v1:${owner}`, spinState(owner, 4, {
      activeReceipt: { schemaVersion: 3, requestId: PAID_REQ, baseGiftId: 'stars_50', expiresAtMs: NOW + HOUR },
    }));

    await expect(runGiftsToCoinsMigration({ trigger: 'resume', deps: h.deps })).resolves.toBe('done');
    const done = await readWal(owner);
    expect(done.hash).toBe(mid.hash);
    expect(coinsOf(h.enqueued)).toBe(FULL_EXPECTED_COINS);
    expect(new Set(h.enqueued.map((entry) => entry.requestId)).size).toBe(h.enqueued.length);
    // Списываются только описанные кредиты: новый остаётся у человека.
    const state = JSON.parse(String(await AsyncStorage.getItem(`local_level_spin_state_v1:${owner}`)));
    expect(state.credits.map((credit: { level: number }) => credit.level)).toEqual([5]);
  });

  it('крах на списании: повтор не зачисляет заново, а доводит списание', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await seedFullInventory(owner, h);
    const multiSet = AsyncStorage.multiSet as jest.Mock;
    const original = multiSet.getMockImplementation();
    // Первая запись — план (журнал + учёт потолка), вторая — списание: роняем её.
    multiSet
      .mockImplementationOnce(original as (...args: unknown[]) => Promise<void>)
      .mockImplementationOnce(async () => { throw new Error('disk_full'); });
    await expect(runGiftsToCoinsMigration({ trigger: 'crash', deps: h.deps })).resolves.toBe('retire_failed');
    expect((await readWal(owner)).phase).toBe('credited');
    const afterCrash = h.enqueued.length;
    multiSet.mockImplementation(original);

    await expect(runGiftsToCoinsMigration({ trigger: 'resume', deps: h.deps })).resolves.toBe('done');
    expect(h.enqueued).toHaveLength(afterCrash);
    expect(coinsOf(h.enqueued)).toBe(FULL_EXPECTED_COINS);
    const state = JSON.parse(String(await AsyncStorage.getItem(`local_level_spin_state_v1:${owner}`)));
    expect(state.credits).toEqual([]);
  });

  it('два аккаунта: у каждого свой журнал и свои requestId; смена аккаунта посреди прогона', async () => {
    const h = harness();
    beginAccountGeneration('owner-A');
    await AsyncStorage.setItem('local_level_spin_state_v1:owner-A', spinState('owner-A', 2));
    await AsyncStorage.setItem('local_level_spin_state_v1:owner-B', spinState('owner-B', 1));
    // На первой операции А человек переключается на Б.
    h.onEnqueue.hook = (index) => { if (index === 0) beginAccountGeneration('owner-B'); };
    await expect(runGiftsToCoinsMigration({ trigger: 'a', deps: h.deps })).resolves.toBe('account_changed');
    expect(h.enqueued).toHaveLength(0);
    h.onEnqueue.hook = null;

    await expect(runGiftsToCoinsMigration({ trigger: 'b', deps: h.deps })).resolves.toBe('done');
    expect(coinsOf(h.enqueued)).toBe(130);
    expect(h.enqueued.every((entry) => entry.owner === 'owner-B')).toBe(true);

    beginAccountGeneration('owner-A');
    await expect(runGiftsToCoinsMigration({ trigger: 'a2', deps: h.deps })).resolves.toBe('done');
    const aOps = h.enqueued.filter((entry) => entry.owner === 'owner-A');
    expect(coinsOf(aOps)).toBe(260);
    const bIds = new Set(h.enqueued.filter((entry) => entry.owner === 'owner-B').map((entry) => entry.requestId));
    expect(aOps.some((entry) => bIds.has(entry.requestId))).toBe(false);
    expect((await readWal('owner-A')).phase).toBe('done');
    expect((await readWal('owner-B')).phase).toBe('done');
  });

  it('потолок 20 бесплатных спинов на человека (кредиты + «Дневной путь»)', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await AsyncStorage.setItem(`local_level_spin_state_v1:${owner}`, spinState(owner, 18));
    h.setDailyJourney([dj(owner, 'dj-op-spins-0005', 'spins', 5)]);
    await expect(runGiftsToCoinsMigration({ trigger: 'cap', deps: h.deps })).resolves.toBe('done');
    expect(coinsOf(h.enqueued)).toBe(20 * 130);
    expect((await readWal(owner)).cappedSpins).toBe(3);
  });

  it('платный спин с дешёвым призом даёт 300', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await AsyncStorage.setItem(LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify([
      journalEntry(owner, PAID_REQ, 'hint_1', { paid: true }),
    ]));
    await expect(runGiftsToCoinsMigration({ trigger: 'paid', deps: h.deps })).resolves.toBe('done');
    expect(coinsOf(h.enqueued)).toBe(300);
    expect(h.acks).toEqual([PAID_REQ]);
  });

  it('Plus-дни включаются; сбой включения — повтор, монеты не зачисляются', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await AsyncStorage.setItem(LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify([
      journalEntry(owner, FREE_REQ, 'plus_days_7'),
      journalEntry(owner, EXPIRED_REQ, 'stars_100'),
    ]));
    h.failPlus.value = true;
    await expect(runGiftsToCoinsMigration({ trigger: 'plus-fail', deps: h.deps })).resolves.toBe('plus_failed');
    expect(h.enqueued).toHaveLength(0);
    h.failPlus.value = false;
    await expect(runGiftsToCoinsMigration({ trigger: 'plus-ok', deps: h.deps })).resolves.toBe('done');
    expect(h.plus.map((entry) => entry.giftId)).toEqual(['plus_days_7']);
    // Plus не превращается в монеты: платим только за руны.
    expect(coinsOf(h.enqueued)).toBe(100);
  });

  it('просроченное не платится', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await AsyncStorage.setItem(LEVEL_SPIN_GIFT_JOURNAL_KEY, JSON.stringify([
      journalEntry(owner, EXPIRED_REQ, 'cosmetic_theme', { expiresAtMs: NOW - 1 }),
    ]));
    await AsyncStorage.setItem(UNCLAIMED_GIFTS_KEY, JSON.stringify({ 9: { id: 'cosmetic_theme' } }));
    await AsyncStorage.setItem(UNCLAIMED_GIFT_RECEIVED_AT_KEY, JSON.stringify({ 9: NOW - 73 * HOUR }));
    await expect(runGiftsToCoinsMigration({ trigger: 'expired', deps: h.deps })).resolves.toBe('done');
    expect(h.enqueued).toHaveLength(0);
    const wal = await readWal(owner);
    expect(wal.totalCoins).toBe(0);
    expect(wal.expired).toEqual({ spin_prize: 1, level_gift: 1 });
  });

  it('рубильник выключен — ничего не пишем и не платим', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await seedFullInventory(owner, h);
    h.setEnabled(false);
    await expect(runGiftsToCoinsMigration({ trigger: 'off', deps: h.deps })).resolves.toBe('flag_off');
    expect(await AsyncStorage.getItem(giftsToCoinsWalKey(owner))).toBeNull();
    expect(h.enqueued).toHaveLength(0);
    h.setEnabled(true);
    await expect(runGiftsToCoinsMigration({ trigger: 'on', deps: h.deps })).resolves.toBe('done');
    expect(coinsOf(h.enqueued)).toBe(FULL_EXPECTED_COINS);
  });

  it('битое состояние спинов: остальное мигрирует, спины ждут, повтор раз в сутки', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await AsyncStorage.setItem(`local_level_spin_state_v1:${owner}`, '{broken');
    await AsyncStorage.setItem(UNCLAIMED_GIFTS_KEY, JSON.stringify({ 5: { id: 'energy_full' } }));
    await expect(runGiftsToCoinsMigration({ trigger: 'corrupt', deps: h.deps })).resolves.toBe('blocked');
    expect(coinsOf(h.enqueued)).toBe(50);
    expect(await AsyncStorage.getItem(`local_level_spin_state_v1:${owner}`)).toBe('{broken');
    await expect(runGiftsToCoinsMigration({ trigger: 'soon', deps: h.deps })).resolves.toBe('blocked_backoff');

    await AsyncStorage.setItem(`local_level_spin_state_v1:${owner}`, spinState(owner, 2));
    h.setNow(NOW + 25 * HOUR);
    await expect(runGiftsToCoinsMigration({ trigger: 'next-day', deps: h.deps })).resolves.toBe('done');
    expect(coinsOf(h.enqueued)).toBe(50 + 260);
    const wal = await readWal(owner);
    expect(wal.run).toBe(2);
    expect(wal.history).toHaveLength(1);
  });

  it('кэш баланса как источник, когда основного ключа спинов нет', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await AsyncStorage.setItem(LEVEL_SPIN_BALANCE_CACHE_KEY, JSON.stringify({ owner, balance: 2 }));
    await expect(runGiftsToCoinsMigration({ trigger: 'cache', deps: h.deps })).resolves.toBe('done');
    expect(coinsOf(h.enqueued)).toBe(260);
    const state = JSON.parse(String(await AsyncStorage.getItem(`local_level_spin_state_v1:${owner}`)));
    expect(state.credits).toEqual([]);
    expect(state.issuedLevels).toEqual([2, 3]);
  });

  it('строка-итог не держит миграцию и дожимается следующим запуском', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await AsyncStorage.setItem(`local_level_spin_state_v1:${owner}`, spinState(owner, 1));
    h.failReport.value = true;
    await expect(runGiftsToCoinsMigration({ trigger: 'offline', deps: h.deps })).resolves.toBe('done');
    expect((await readWal(owner)).report).toMatchObject({ status: 'pending', attempts: 1 });
    h.failReport.value = false;
    await expect(runGiftsToCoinsMigration({ trigger: 'online', deps: h.deps })).resolves.toBe('already_done');
    expect(h.reports).toHaveLength(1);
    expect((await readWal(owner)).report.status).toBe('sent');
    expect(coinsOf(h.enqueued)).toBe(130);
  });

  it('спин «Дневного пути»: миграция и штатная активация платят одними ключами', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    // Активация успела зарезервировать оплату, но не записала квитанцию (крах).
    await reserveDailyJourneySpinCompensation(owner, 'dj-op-spins-race', 2);
    h.setDailyJourney([dj(owner, 'dj-op-spins-race', 'spins', 2)]);
    await expect(runGiftsToCoinsMigration({ trigger: 'race', deps: h.deps })).resolves.toBe('done');
    const shared = await dailyJourneySpinCompensationGrants(owner, 'dj-op-spins-race', 2);
    expect(h.enqueued.map((entry) => entry.requestId).sort()).toEqual(shared.map((grant) => grant.requestId).sort());
    expect(coinsOf(h.enqueued)).toBe(260);
    // Повтор активации теми же ключами кошелёк схлопывает — ни одной новой операции.
    const before = h.enqueued.length;
    for (const grant of shared) {
      await h.deps.enqueueCoins({ token: captureAccountGeneration(), requestId: grant.requestId, giftId: grant.giftId });
    }
    expect(h.enqueued).toHaveLength(before);
  });

  it('общий потолок: спины, оплаченные активацией, уменьшают остаток миграции', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await expect(reserveDailyJourneySpinCompensation(owner, 'dj-op-closed-18', 18))
      .resolves.toMatchObject({ paidSpins: 18 });
    await AsyncStorage.setItem(`local_level_spin_state_v1:${owner}`, spinState(owner, 5));
    await expect(runGiftsToCoinsMigration({ trigger: 'cap-shared', deps: h.deps })).resolves.toBe('done');
    expect(coinsOf(h.enqueued)).toBe(2 * 130);
    expect((await readWal(owner)).cappedSpins).toBe(3);
    // И обратно: после миграции активация новой плитки упирается в потолок.
    await expect(reserveDailyJourneySpinCompensation(owner, 'dj-op-after', 3))
      .resolves.toMatchObject({ paidSpins: 0, cappedSpins: 3 });
  });

  it('без активной личности ничего не делает', async () => {
    const h = harness();
    await expect(runGiftsToCoinsMigration({ trigger: 'boot', deps: h.deps })).resolves.toBe('identity_not_ready');
    expect(h.enqueued).toHaveLength(0);
  });

  it('битый журнал миграции не перезапускается с нуля', async () => {
    const owner = 'owner-A';
    beginAccountGeneration(owner);
    const h = harness();
    await seedFullInventory(owner, h);
    await AsyncStorage.setItem(giftsToCoinsWalKey(owner), '{"schemaVersion":"x"}');
    await expect(runGiftsToCoinsMigration({ trigger: 'wal', deps: h.deps })).resolves.toBe('wal_corrupt');
    expect(h.enqueued).toHaveLength(0);
  });
});
