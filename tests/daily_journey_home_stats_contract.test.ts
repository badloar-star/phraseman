import fs from 'fs';
import path from 'path';

import {
  createDailyJourneyHomeGrantController,
  createDailyJourneyHomeLandingGate,
  createDailyJourneyHomeProjectionController,
  type DailyJourneyHomeTargetRect,
} from '../app/daily_journey_home_orchestration';
import { dailyJourneyRewardPayloadForDay } from '../components/dev/dailyJourneyRewardPreviewModel';

const ROOT = path.join(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(ROOT, relative), 'utf8');

type Token = Readonly<{ generation: number; stableId: string | null; phase: 'active' | 'transitioning' }>;

function occurrence(input: {
  operationId: string;
  cycle: number;
  day: number;
  reward: ReturnType<typeof dailyJourneyRewardPayloadForDay>;
}) {
  return Object.freeze({
    schemaVersion: 'daily-journey-gift-occurrence.v1' as const,
    operationId: input.operationId,
    ownerStableId: 'owner-a',
    source: 'daily_journey_dev' as const,
    cycle: input.cycle,
    day: input.day,
    reward: input.reward,
    revision: input.day,
    createdAtMs: 1,
    payloadFingerprint: 'a'.repeat(64),
  });
}

describe('Daily Journey Home orchestration', () => {
  test('each press owns a fresh operation id, cycles 1..50 without a limit, and opens only after durable commit', async () => {
    let generation = 1;
    const order: string[] = [];
    const committed: { operationId: string; cycle: number; day: number; reward: unknown }[] = [];
    const opened: { operationId: string; targetRect: DailyJourneyHomeTargetRect | null }[] = [];
    let uuid = 0;
    const targetRect = Object.freeze({ x: 10, y: 20, width: 300, height: 196 });
    const controller = createDailyJourneyHomeGrantController<Token>({
      createOperationId: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}`,
      captureToken: () => ({ generation, stableId: 'owner-a', phase: 'active' }),
      isTokenCurrent: (token) => token.generation === generation,
      commit: async (input) => {
        order.push(`commit:${input.day}`);
        committed.push(input);
        return { status: 'committed' as const, occurrence: occurrence(input) };
      },
      measureTarget: async () => {
        order.push('measure');
        return targetRect;
      },
      enqueueModal: (payload) => {
        order.push(`modal:${payload.occurrence.day}`);
        opened.push({ operationId: payload.occurrence.operationId, targetRect: payload.targetRect });
      },
      reportError: jest.fn(),
    });

    for (let press = 0; press < 52; press += 1) {
      await controller.press();
    }

    expect(committed).toHaveLength(52);
    expect(new Set(committed.map((item) => item.operationId)).size).toBe(52);
    expect(committed.map((item) => item.day)).toEqual([...Array.from({ length: 50 }, (_, index) => index + 1), 1, 2]);
    expect(committed.map((item) => item.cycle)).toEqual([...Array(50).fill(1), 2, 2]);
    committed.forEach((item) => expect(item.reward).toEqual(dailyJourneyRewardPayloadForDay(item.day)));
    expect(opened).toHaveLength(52);
    expect(opened.every((item) => item.targetRect === targetRect)).toBe(true);
    for (let index = 0; index < 52; index += 1) {
      expect(order.indexOf(`commit:${committed[index].day}`)).toBeLessThan(order.indexOf(`modal:${committed[index].day}`));
    }
  });

  test('rapid presses reserve distinct ids and days before either commit settles', async () => {
    const releases: (() => void)[] = [];
    const inputs: { operationId: string; cycle: number; day: number; reward: ReturnType<typeof dailyJourneyRewardPayloadForDay> }[] = [];
    let uuid = 0;
    const opened: string[] = [];
    const controller = createDailyJourneyHomeGrantController<Token>({
      createOperationId: () => `rapid-0000-0000-0000-${String(++uuid).padStart(12, '0')}`,
      captureToken: () => ({ generation: 1, stableId: 'owner-a', phase: 'active' }),
      isTokenCurrent: () => true,
      commit: (input) => {
        inputs.push(input);
        return new Promise((resolve) => releases.push(() => resolve({ status: 'committed', occurrence: occurrence(input) })));
      },
      measureTarget: async () => null,
      enqueueModal: ({ occurrence: item }) => opened.push(item.operationId),
      reportError: jest.fn(),
    });

    const first = controller.press();
    const second = controller.press();
    expect(inputs.map((item) => item.day)).toEqual([1, 2]);
    expect(new Set(inputs.map((item) => item.operationId)).size).toBe(2);
    releases[1]();
    releases[0]();
    await Promise.all([first, second]);
    expect(opened).toHaveLength(2);
  });

  test('commit failure reports recoverable feedback and never measures or opens success UI', async () => {
    const measureTarget = jest.fn(async () => null);
    const enqueueModal = jest.fn();
    const reportError = jest.fn();
    const controller = createDailyJourneyHomeGrantController<Token>({
      createOperationId: () => 'failure-0000-0000-0000-000000000001',
      captureToken: () => ({ generation: 1, stableId: 'owner-a', phase: 'active' }),
      isTokenCurrent: () => true,
      commit: async () => { throw new Error('disk full'); },
      measureTarget,
      enqueueModal,
      reportError,
    });

    await expect(controller.press()).resolves.toBe('failed');
    expect(reportError).toHaveBeenCalledWith('commit', expect.any(Error));
    expect(measureTarget).not.toHaveBeenCalled();
    expect(enqueueModal).not.toHaveBeenCalled();
  });

  test('account switch after commit suppresses modal for the old account', async () => {
    let generation = 1;
    const enqueueModal = jest.fn();
    const reportError = jest.fn();
    const controller = createDailyJourneyHomeGrantController<Token>({
      createOperationId: () => 'switch-0000-0000-0000-000000000001',
      captureToken: () => ({ generation, stableId: 'owner-a', phase: 'active' }),
      isTokenCurrent: (token) => token.generation === generation,
      commit: async (input) => {
        generation = 2;
        return { status: 'committed' as const, occurrence: occurrence(input) };
      },
      measureTarget: async () => null,
      enqueueModal,
      reportError,
    });

    await expect(controller.press()).resolves.toBe('stale');
    expect(enqueueModal).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalledWith('account_stale', expect.any(Error));
  });

  test('measurement failure uses the stable modal fallback after a successful commit', async () => {
    const enqueueModal = jest.fn();
    const reportError = jest.fn();
    const controller = createDailyJourneyHomeGrantController<Token>({
      createOperationId: () => 'measure-0000-0000-0000-000000000001',
      captureToken: () => ({ generation: 1, stableId: 'owner-a', phase: 'active' }),
      isTokenCurrent: () => true,
      commit: async (input) => ({ status: 'committed', occurrence: occurrence(input) }),
      measureTarget: async () => { throw new Error('no native target'); },
      enqueueModal,
      reportError,
    });

    await expect(controller.press()).resolves.toBe('opened');
    expect(reportError).toHaveBeenCalledWith('measure', expect.any(Error));
    expect(enqueueModal).toHaveBeenCalledWith(expect.objectContaining({ targetRect: null }));
  });

  test('projection reloads are focus/account/request guarded and source failure preserves the visible count', async () => {
    let token: Token = { generation: 1, stableId: 'owner-a', phase: 'active' };
    const unread: number[] = [];
    const pendingReads: { token: Token; resolve: (count: number) => void; reject: (error: Error) => void }[] = [];
    const reportError = jest.fn();
    const controller = createDailyJourneyHomeProjectionController<Token>({
      captureToken: () => token,
      isTokenCurrent: (candidate) => candidate.generation === token.generation && candidate.stableId === token.stableId,
      readProjection: (candidate) => new Promise((resolve, reject) => pendingReads.push({
        token: candidate,
        resolve: (count) => resolve({ unreadCount: count }),
        reject,
      })),
      displayUnreadCount: (count) => unread.push(count),
      reportError,
    });

    const activation = controller.activate();
    const eventReload = controller.reload();
    pendingReads[1].resolve(3);
    await eventReload;
    pendingReads[0].resolve(9);
    await activation;
    expect(unread).toEqual([3]);

    const failedReload = controller.reload();
    pendingReads[2].reject(new Error('read failed'));
    await failedReload;
    expect(unread).toEqual([3]);
    expect(reportError).toHaveBeenCalledWith('projection', expect.any(Error));

    token = { generation: 2, stableId: 'owner-b', phase: 'active' };
    const accountReload = controller.resetForAccount();
    expect(unread).toEqual([3, 0]);
    pendingReads[3].resolve(2);
    await accountReload;
    expect(unread).toEqual([3, 0, 2]);

    const blurredReload = controller.reload();
    controller.deactivate();
    pendingReads[4].resolve(7);
    await blurredReload;
    expect(unread).toEqual([3, 0, 2]);
    await expect(controller.reload()).resolves.toBeUndefined();
    controller.dispose();
  });

  test('landing gate pulses each committed occurrence once and suppresses reduced motion', () => {
    const gate = createDailyJourneyHomeLandingGate();
    expect(gate.shouldPulse('occurrence-a', false)).toBe(true);
    expect(gate.shouldPulse('occurrence-a', false)).toBe(false);
    expect(gate.shouldPulse('occurrence-b', true)).toBe(false);
    expect(gate.shouldPulse('occurrence-b', false)).toBe(false);
    expect(gate.shouldPulse(null, false)).toBe(true);
    expect(gate.shouldPulse(null, false)).toBe(true);
  });
});

describe('Home source wiring for Daily Journey', () => {
  const home = read('app/(tabs)/home.tsx');

  test('keeps Dev Hub and adds a separately gated 44px Daily Journey grant control', () => {
    expect(home).toContain('testID="home-dev-hub-button"');
    expect(home).toContain('testID="home-dev-daily-journey-button"');
    expect(home).toMatch(/\{ENABLE_DEV_TOOLS && \(\s*<TouchableOpacity\s+testID="home-dev-daily-journey-button"/);
    expect(home).toMatch(/home-dev-daily-journey-button[\s\S]{0,900}minHeight: 46/);
  });

  test('passes the committed occurrence and measured rect to the modal and closes only on delivery complete', () => {
    expect(home).toContain('<DailyJourneyRewardPreviewModal');
    expect(home).toContain('occurrence={dailyJourneyDelivery.occurrence}');
    expect(home).toContain('targetRect={dailyJourneyDelivery.targetRect}');
    expect(home).toContain('onLanded={handleDailyJourneyLanded}');
    expect(home).toContain('onDeliveryComplete={completeDailyJourneyDelivery}');
  });

  test('measures and transform-pulses the existing stats card with lifecycle cancellation', () => {
    expect(home).toContain('testID="home-stats-card"');
    expect(home).toContain('ref={homeStatsCardRef as React.Ref<View>}');
    expect(home).toContain('collapsable={false}');
    expect(home).toContain('measureInWindow');
    expect(home).toContain('toValue: 1.035');
    expect(home).toContain('transform: [{ scale: dailyJourneyPulseAnim }]');
    expect(home).toContain('stopDailyJourneyPulse');
    expect(home).toContain('if (next) stopDailyJourneyPulse();');
  });

  test('keeps Spin centered and routes unread Gift from its independent right slot', () => {
    expect(home.indexOf('testID="home-spin-fab"')).toBeLessThan(home.indexOf('testID="home-gift-entry"'));
    expect(home).toMatch(/testID="home-spin-fab"[\s\S]{0,260}alignSelf: 'center'/);
    expect(home).toMatch(/testID="home-gift-entry"[\s\S]{0,220}position: 'absolute'[\s\S]{0,100}right: 0/);
    expect(home).toMatch(/testID="home-gift-entry-button"[\s\S]{0,1200}nav\.push\('\/level_gifts_inventory'\)/);
    expect(home).toContain('{dailyJourneyUnreadCount > 0 ? (');
  });

  test('reloads on inbox events and account changes without marking seen on Home', () => {
    expect(home).toContain("onAppEvent('daily_journey_gifts_changed'");
    expect(home).toContain('subscribeAccountGeneration');
    expect(home).toContain('resetForAccount()');
    expect(home).not.toContain('markDailyJourneyGiftSnapshotSeen');
  });
});
