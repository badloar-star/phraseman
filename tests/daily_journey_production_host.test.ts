import { readFileSync } from 'fs';
import path from 'path';

import {
  createDailyJourneyProductionHostController,
  dailyJourneyProductionOperationId,
  millisecondsUntilNextLocalDay,
  type DailyJourneyProductionHostDependencies,
} from '../app/daily_journey_production_host';
import type {
  DailyJourneyGiftInput,
  DailyJourneyGiftOccurrenceV1,
} from '../app/daily_journey_gift_inbox';
import {
  DAILY_JOURNEY_GIFT_ACCOUNT_LOCAL_PREFIXES,
  DAILY_JOURNEY_PRODUCTION_INTENT_PREFIX,
  DAILY_JOURNEY_PRODUCTION_PRESENTED_PREFIX,
} from '../constants/daily_journey_gift_storage_keys';

type Token = Readonly<{ owner: string; generation: number }>;

const OWNER_HASH = 'a'.repeat(64);

function occurrence(input: DailyJourneyGiftInput, revision = 1): DailyJourneyGiftOccurrenceV1 {
  return Object.freeze({
    schemaVersion: 'daily-journey-gift-occurrence.v1',
    operationId: input.operationId,
    ownerStableId: 'owner-a',
    source: input.source,
    cycle: input.cycle,
    day: input.day,
    reward: input.reward,
    revision,
    createdAtMs: revision,
    payloadFingerprint: 'f'.repeat(64),
  });
}

function existing(cycle: number, day: number, localDayKey: string): DailyJourneyGiftOccurrenceV1 {
  return occurrence({
    operationId: dailyJourneyProductionOperationId(OWNER_HASH, cycle, day, localDayKey),
    source: 'daily_journey',
    cycle,
    day,
    reward: { kind: 'pearls', amount: 10 },
  });
}

function harness(options: Readonly<{
  today?: string;
  latest?: DailyJourneyGiftOccurrenceV1 | null;
  freezeRemaining?: number;
  presentedOperationId?: string | null;
  preparedIntent?: unknown;
  onboardingDone?: string | null;
  runtimeOnboardingActive?: boolean;
}> = {}) {
  let generation = 1;
  let latest = options.latest ?? null;
  let presentedOperationId = options.presentedOperationId ?? null;
  const commits: DailyJourneyGiftInput[] = [];
  const freezeUses: string[] = [];
  const writes: string[] = [];
  let preparedIntent: unknown = options.preparedIntent ?? null;
  const reportError = jest.fn();
  const calls: string[] = [];
  const deps: DailyJourneyProductionHostDependencies<Token> = {
    captureToken: () => ({ owner: 'owner-a', generation }),
    isTokenCurrent: (token: Token) => token.generation === generation && token.owner === 'owner-a',
    isRuntimeOnboardingBlocked: () => {
      calls.push('runtime');
      return options.runtimeOnboardingActive ?? false;
    },
    ownerStableId: (token: Token) => token.owner,
    localDayKey: () => options.today ?? '2026-08-31',
    readOnboardingDone: async () => {
      calls.push('onboarding');
      return options.onboardingDone === undefined ? '1' : options.onboardingDone;
    },
    hashOwner: async () => {
      calls.push('hash');
      return OWNER_HASH;
    },
    readLatestOccurrence: async () => {
      calls.push('latest');
      return latest;
    },
    readPresentedOperationId: async () => presentedOperationId,
    writePresentedOperationId: async (_owner: string, operationId: string) => {
      writes.push(operationId);
      presentedOperationId = operationId;
    },
    consumeFreezeBatch: async (useOperationIds: readonly string[]) => {
      if ((options.freezeRemaining ?? 0) < useOperationIds.length) {
        return { status: 'unavailable' as const };
      }
      freezeUses.push(...useOperationIds);
      return { status: 'applied' as const };
    },
    readPreparedIntent: async () => {
      calls.push('intent');
      return preparedIntent;
    },
    clearCorruptPreparedIntent: async () => { preparedIntent = null; },
    writePreparedIntent: async (intent: unknown) => {
      preparedIntent = intent;
      return intent;
    },
    clearPreparedIntent: async () => { preparedIntent = null; },
    commitGift: async (input: DailyJourneyGiftInput) => {
      calls.push('commit');
      commits.push(input);
      latest = occurrence(input, (latest?.revision ?? 0) + 1);
      return { status: 'committed', occurrence: latest };
    },
    reportError,
  } as unknown as DailyJourneyProductionHostDependencies<Token>;
  const controller = createDailyJourneyProductionHostController(deps);
  return {
    controller,
    commits,
    freezeUses,
    writes,
    reportError,
    calls,
    preparedIntent: () => preparedIntent,
    switchAccount: () => { generation += 1; },
  };
}

describe('Daily Journey production host', () => {
  test.each([null, '', '0', 'true'])(
    'does not hash, read, prepare, or commit before onboarding is complete (value %p)',
    async (onboardingDone) => {
      const h = harness({ onboardingDone });

      await expect(h.controller.run()).resolves.toEqual({ status: 'not_eligible' });
      expect(h.calls).toEqual(['runtime', 'onboarding']);
      expect(h.commits).toHaveLength(0);
    },
  );

  test('runtime onboarding blocks before persisted completion or any grant work', async () => {
    const h = harness({ onboardingDone: '1', runtimeOnboardingActive: true });

    await expect(h.controller.run()).resolves.toEqual({ status: 'not_eligible' });
    expect(h.calls).toEqual(['runtime']);
    expect(h.commits).toHaveLength(0);
  });

  test('production modal retries only after onboarding completion and clears a QA restart delivery', () => {
    const controllerSource = readFileSync(path.join(
      process.cwd(),
      'app/daily_journey_production_host.ts',
    ), 'utf8');
    const layoutSource = readFileSync(path.join(process.cwd(), 'app/_layout.tsx'), 'utf8');
    const source = readFileSync(path.join(
      process.cwd(),
      'components/daily_journey/DailyJourneyProductionModalHost.tsx',
    ), 'utf8');
    const completedStart = source.indexOf("onAppEvent('onboarding_completed'");
    const restartStart = source.indexOf("onAppEvent('dev_onboarding_restart'");
    const paywallStart = source.indexOf("onAppEvent('onboarding_paywall_completed'");

    expect(controllerSource).toContain(
      "readOnboardingDone: () => AsyncStorage.getItem('onboarding_done').catch(() => null)",
    );
    expect(controllerSource).toContain(
      'isRuntimeOnboardingBlocked: isForcedOnboardingForQaRuntime',
    );
    expect(layoutSource).toContain(
      'const forceOnboardingForQA = isForcedOnboardingForQaRuntime();',
    );
    expect(completedStart).toBeGreaterThan(-1);
    expect(source.slice(completedStart, completedStart + 220)).toContain('runPresentation()');
    expect(restartStart).toBeGreaterThan(-1);
    expect(source.slice(restartStart, restartStart + 220)).toContain('clearDelivery(true)');
    expect(paywallStart).toBeGreaterThan(-1);
    expect(source.slice(paywallStart, paywallStart + 220)).toContain('clearDelivery(true)');
    expect(source.slice(paywallStart, paywallStart + 220)).not.toContain('runPresentation()');
  });

  test('schedules one wake-up just after the next local calendar boundary', () => {
    const now = new Date(2026, 7, 31, 23, 59, 59, 500).getTime();
    expect(millisecondsUntilNextLocalDay(now)).toBe(1_500);
  });

  test('registers account-scoped intent and presentation keys for normal account cleanup', () => {
    expect(DAILY_JOURNEY_GIFT_ACCOUNT_LOCAL_PREFIXES).toEqual(expect.arrayContaining([
      DAILY_JOURNEY_PRODUCTION_INTENT_PREFIX,
      DAILY_JOURNEY_PRODUCTION_PRESENTED_PREFIX,
    ]));
  });

  test('first eligible local day commits day 1 with deterministic owner/cycle/day identity', async () => {
    const h = harness();

    const first = await h.controller.run();
    const duplicate = await h.controller.run();

    expect(first).toMatchObject({ status: 'ready', occurrence: { source: 'daily_journey', cycle: 1, day: 1 } });
    expect(h.commits).toEqual([expect.objectContaining({
      operationId: `daily_journey:${OWNER_HASH}:c1:d1:2026-08-31`,
      source: 'daily_journey',
      cycle: 1,
      day: 1,
    })]);
    expect(duplicate).toEqual({ status: 'not_eligible' });
  });

  test('same-day restart replays an unpresented occurrence once, then durable presentation suppresses reopening', async () => {
    const latest = existing(2, 7, '2026-08-31');
    const h = harness({ latest });

    const recovered = await h.controller.run();
    expect(recovered).toMatchObject({ status: 'ready', occurrence: { operationId: latest.operationId } });
    if (recovered.status !== 'ready') throw new Error('expected ready');
    await expect(h.controller.markPresented(recovered.occurrence, recovered.token)).resolves.toBe(true);
    h.controller.releasePresentation(recovered.occurrence.operationId);

    expect(await h.controller.run()).toEqual({ status: 'not_eligible' });
    expect(h.commits).toHaveLength(0);
    expect(h.writes).toEqual([latest.operationId]);
  });

  test('next-day restart presents a committed occurrence before creating the current local-day gift', async () => {
    const latest = existing(2, 7, '2026-08-30');
    const h = harness({ today: '2026-08-31', latest });

    const recovered = await h.controller.run();

    expect(recovered).toMatchObject({
      status: 'ready',
      occurrence: { operationId: latest.operationId },
    });
    expect(h.commits).toHaveLength(0);
    if (recovered.status !== 'ready') throw new Error('expected recovered occurrence');

    await expect(h.controller.markPresented(recovered.occurrence, recovered.token)).resolves.toBe(true);
    h.controller.releasePresentation(recovered.occurrence.operationId);

    const current = await h.controller.run();
    expect(current).toMatchObject({
      status: 'ready',
      occurrence: {
        operationId: `daily_journey:${OWNER_HASH}:c2:d8:2026-08-31`,
        cycle: 2,
        day: 8,
      },
    });
    expect(h.commits).toHaveLength(1);
  });

  test('after presenting a recovered old intent, the same host activation advances to the current local day', async () => {
    const baseline = existing(1, 12, '2026-08-29');
    const oldInput: DailyJourneyGiftInput = {
      operationId: dailyJourneyProductionOperationId(OWNER_HASH, 1, 13, '2026-08-30'),
      source: 'daily_journey', cycle: 1, day: 13,
      reward: { kind: 'pearls', amount: 50 },
    };
    const h = harness({
      today: '2026-09-02',
      latest: baseline,
      freezeRemaining: 0,
      preparedIntent: {
        ownerStableId: 'owner-a',
        baselineOperationId: baseline.operationId,
        localDayKey: '2026-08-30',
        freezeUseOperationIds: [],
        input: oldInput,
      },
    });

    const recovered = await h.controller.run();
    expect(recovered).toMatchObject({ status: 'ready', occurrence: { operationId: oldInput.operationId } });
    if (recovered.status !== 'ready') throw new Error('expected recovered occurrence');
    await expect(h.controller.markPresented(recovered.occurrence, recovered.token)).resolves.toBe(true);
    h.controller.releasePresentation(recovered.occurrence.operationId);

    const current = await h.controller.run();
    expect(current).toMatchObject({
      status: 'ready',
      occurrence: {
        operationId: `daily_journey:${OWNER_HASH}:c2:d1:2026-09-02`,
        cycle: 2,
        day: 1,
      },
    });
    expect(h.commits.map((input) => input.operationId)).toEqual([
      oldInput.operationId,
      `daily_journey:${OWNER_HASH}:c2:d1:2026-09-02`,
    ]);
  });

  test('one missed day consumes one stable freeze and keeps the next series day', async () => {
    const h = harness({
      today: '2026-08-31',
      latest: existing(1, 12, '2026-08-29'),
      freezeRemaining: 1,
      presentedOperationId: dailyJourneyProductionOperationId(OWNER_HASH, 1, 12, '2026-08-29'),
    });

    const result = await h.controller.run();

    expect(result).toMatchObject({ status: 'ready', occurrence: { cycle: 1, day: 13 } });
    expect(h.freezeUses).toEqual([
      expect.stringContaining(':c1:2026-08-30'),
    ]);
  });

  test('multiple missed days consume one idempotent freeze per missed calendar date', async () => {
    const h = harness({
      today: '2026-09-02',
      latest: existing(3, 49, '2026-08-29'),
      freezeRemaining: 3,
      presentedOperationId: dailyJourneyProductionOperationId(OWNER_HASH, 3, 49, '2026-08-29'),
    });

    const result = await h.controller.run();

    expect(result).toMatchObject({ status: 'ready', occurrence: { cycle: 3, day: 50 } });
    expect(h.freezeUses.map((id) => id.slice(-10))).toEqual([
      '2026-08-30', '2026-08-31', '2026-09-01',
    ]);
  });

  test('insufficient freezes reset to day 1 of a new cycle without consuming any protection', async () => {
    const h = harness({
      today: '2026-09-02',
      latest: existing(3, 20, '2026-08-29'),
      freezeRemaining: 1,
      presentedOperationId: dailyJourneyProductionOperationId(OWNER_HASH, 3, 20, '2026-08-29'),
    });

    const result = await h.controller.run();

    expect(result).toMatchObject({ status: 'ready', occurrence: { cycle: 4, day: 1 } });
    expect(h.freezeUses).toHaveLength(0);
    expect(h.commits[0]).toMatchObject({ cycle: 4, day: 1 });
  });

  test('day 50 rolls into day 1 of the next economic cycle and clock rollback grants nothing', async () => {
    const rolloverLatest = existing(5, 50, '2026-08-31');
    const rollover = harness({
      today: '2026-09-01',
      latest: rolloverLatest,
      presentedOperationId: rolloverLatest.operationId,
    });
    expect(await rollover.controller.run()).toMatchObject({ status: 'ready', occurrence: { cycle: 6, day: 1 } });

    const rollback = harness({ today: '2026-08-30', latest: existing(5, 10, '2026-08-31') });
    expect(await rollback.controller.run()).toEqual({ status: 'not_eligible' });
    expect(rollback.commits).toHaveLength(0);
  });

  test('ambiguous commit retry reuses the same logical grant identity', async () => {
    const firstInput: DailyJourneyGiftInput[] = [];
    const failing = createDailyJourneyProductionHostController<Token>({
      captureToken: () => ({ owner: 'owner-a', generation: 1 }),
      isRuntimeOnboardingBlocked: () => false,
      readOnboardingDone: async () => '1',
      isTokenCurrent: () => true,
      ownerStableId: (token: Token) => token.owner,
      localDayKey: () => '2026-08-31',
      hashOwner: async () => OWNER_HASH,
      readLatestOccurrence: async () => null,
      readPresentedOperationId: async () => null,
      writePresentedOperationId: async () => undefined,
      readPreparedIntent: async () => null,
      writePreparedIntent: async (intent: unknown) => intent,
      clearPreparedIntent: async () => undefined,
      consumeFreezeBatch: async () => ({ status: 'unavailable' as const }),
      commitGift: async (input: DailyJourneyGiftInput) => {
        firstInput.push(input);
        throw new Error('disk response lost');
      },
      reportError: jest.fn(),
    } as unknown as DailyJourneyProductionHostDependencies<Token>);

    expect(await failing.run()).toEqual({ status: 'failed' });
    expect(await failing.run()).toEqual({ status: 'failed' });
    expect(firstInput[0]?.operationId).toBe(firstInput[1]?.operationId);
  });

  test('quarantines a corrupt prepared intent and deterministically resumes its freeze-protected gift', async () => {
    const latest = existing(1, 12, '2026-08-29');
    let corruptIntentPresent = true;
    const consumedBatches: string[][] = [];
    const commits: DailyJourneyGiftInput[] = [];
    const clearCorruptPreparedIntent = jest.fn(async () => {
      corruptIntentPresent = false;
    });
    const deps = {
      captureToken: () => ({ owner: 'owner-a', generation: 1 }),
      isRuntimeOnboardingBlocked: () => false,
      readOnboardingDone: async () => '1',
      isTokenCurrent: () => true,
      ownerStableId: (token: Token) => token.owner,
      localDayKey: () => '2026-09-02',
      hashOwner: async () => OWNER_HASH,
      readLatestOccurrence: async () => latest,
      readPresentedOperationId: async () => latest.operationId,
      writePresentedOperationId: async () => undefined,
      readPreparedIntent: async () => {
        if (corruptIntentPresent) throw new Error('daily_journey_production_intent_corrupt');
        return null;
      },
      clearCorruptPreparedIntent,
      writePreparedIntent: async (intent: unknown) => intent,
      clearPreparedIntent: async () => undefined,
      consumeFreezeBatch: async (ids: readonly string[]) => {
        consumedBatches.push([...ids]);
        return { status: 'already_applied' as const };
      },
      commitGift: async (input: DailyJourneyGiftInput) => {
        commits.push(input);
        return { status: 'committed' as const, occurrence: occurrence(input, 2) };
      },
      reportError: jest.fn(),
    } as unknown as DailyJourneyProductionHostDependencies<Token>;

    const result = await createDailyJourneyProductionHostController(deps).run();

    expect(result).toMatchObject({ status: 'ready', occurrence: { cycle: 1, day: 13 } });
    expect(clearCorruptPreparedIntent).toHaveBeenCalledTimes(1);
    expect(consumedBatches).toEqual([[
      expect.stringContaining('2026-08-30'),
      expect.stringContaining('2026-08-31'),
      expect.stringContaining('2026-09-01'),
    ]]);
    expect(commits).toHaveLength(1);
  });

  test('recovers the exact older freeze batch when corrupt intent restart happens on a later day', async () => {
    const latest = existing(1, 12, '2026-08-29');
    const oldBatch = [
      'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-08-30',
      'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-08-31',
      'daily-journey-series-gap:aaaaaaaaaaaaaaaaaaaaaaaa:c1:2026-09-01',
    ];
    let corruptIntentPresent = true;
    let prepared: any = null;
    const attemptedBatches: string[][] = [];
    const commits: DailyJourneyGiftInput[] = [];
    const deps = {
      captureToken: () => ({ owner: 'owner-a', generation: 1 }),
      isRuntimeOnboardingBlocked: () => false,
      readOnboardingDone: async () => '1',
      isTokenCurrent: () => true,
      ownerStableId: (token: Token) => token.owner,
      localDayKey: () => '2026-09-03',
      hashOwner: async () => OWNER_HASH,
      readLatestOccurrence: async () => latest,
      readPresentedOperationId: async () => latest.operationId,
      writePresentedOperationId: async () => undefined,
      readPreparedIntent: async () => {
        if (corruptIntentPresent) throw new Error('daily_journey_production_intent_corrupt');
        return prepared;
      },
      clearCorruptPreparedIntent: async () => { corruptIntentPresent = false; },
      writePreparedIntent: async (intent: unknown) => { prepared = intent; return intent; },
      clearPreparedIntent: async () => { prepared = null; },
      consumeFreezeBatch: async (ids: readonly string[]) => {
        attemptedBatches.push([...ids]);
        if (JSON.stringify(ids) === JSON.stringify(oldBatch)) {
          return { status: 'already_applied' as const };
        }
        throw new Error('daily_journey_freeze_operation_conflict');
      },
      commitGift: async (input: DailyJourneyGiftInput) => {
        commits.push(input);
        return { status: 'committed' as const, occurrence: occurrence(input, 2) };
      },
      reportError: jest.fn(),
    } as unknown as DailyJourneyProductionHostDependencies<Token>;

    const result = await createDailyJourneyProductionHostController(deps).run();

    expect(result).toMatchObject({
      status: 'ready',
      occurrence: {
        operationId: `daily_journey:${OWNER_HASH}:c1:d13:2026-09-02`,
        cycle: 1,
        day: 13,
      },
    });
    expect(attemptedBatches.map((ids) => ids.map((id) => id.slice(-10)))).toEqual([
      ['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02'],
      ['2026-08-30', '2026-08-31', '2026-09-01'],
    ]);
    expect(commits).toHaveLength(1);
    expect(prepared).toBeNull();
  });

  test('crash after multiple freeze consumptions leaves an exact durable intent that restart completes', async () => {
    const latest = existing(1, 12, '2026-08-29');
    let prepared: any = null;
    let durableLatest: DailyJourneyGiftOccurrenceV1 | null = latest;
    const consumed = new Set<string>();
    let crash = true;
    const inputs: DailyJourneyGiftInput[] = [];
    const deps = {
      captureToken: () => ({ owner: 'owner-a', generation: 1 }),
      isRuntimeOnboardingBlocked: () => false,
      readOnboardingDone: async () => '1',
      isTokenCurrent: () => true,
      ownerStableId: (token: Token) => token.owner,
      localDayKey: () => '2026-09-02',
      hashOwner: async () => OWNER_HASH,
      readLatestOccurrence: async () => durableLatest,
      readPresentedOperationId: async () => latest.operationId,
      writePresentedOperationId: async () => undefined,
      readPreparedIntent: async () => prepared,
      writePreparedIntent: async (intent: unknown) => { prepared = intent; return intent; },
      clearPreparedIntent: async () => { prepared = null; },
      consumeFreezeBatch: async (ids: readonly string[]) => {
        ids.forEach((id) => consumed.add(id));
        return { status: 'applied' as const };
      },
      commitGift: async (input: DailyJourneyGiftInput) => {
        inputs.push(input);
        if (crash) {
          crash = false;
          throw new Error('crash-before-occurrence');
        }
        durableLatest = occurrence(input, 2);
        return { status: 'committed' as const, occurrence: durableLatest };
      },
      reportError: jest.fn(),
    } as unknown as DailyJourneyProductionHostDependencies<Token>;

    expect(await createDailyJourneyProductionHostController(deps).run()).toEqual({ status: 'failed' });
    expect(prepared).toMatchObject({
      baselineOperationId: latest.operationId,
      input: { cycle: 1, day: 13, source: 'daily_journey' },
      freezeUseOperationIds: [
        expect.stringContaining('2026-08-30'),
        expect.stringContaining('2026-08-31'),
        expect.stringContaining('2026-09-01'),
      ],
    });

    const restarted = await createDailyJourneyProductionHostController(deps).run();
    expect(restarted).toMatchObject({ status: 'ready', occurrence: { cycle: 1, day: 13 } });
    expect(inputs).toHaveLength(2);
    expect(inputs[0]?.operationId).toBe(inputs[1]?.operationId);
    expect(consumed.size).toBe(3);
    expect(prepared).toBeNull();
  });
});
