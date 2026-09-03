import fs from 'fs';
import path from 'path';
import ts from 'typescript';

import {
  createDailyJourneyHomeGrantController,
  createDailyJourneyHomeLandingGate,
  createDailyJourneyHomeProjectionController,
  offerDailyJourneyProductionDelivery,
  type DailyJourneyHomeDelivery,
  type DailyJourneyHomeTargetRect,
} from '../app/daily_journey_home_orchestration';
import * as dailyJourneyHomeOrchestration from '../app/daily_journey_home_orchestration';
import * as dailyJourneyStatsUnread from '../app/daily_journey_stats_unread';
import { dailyJourneyRewardPayloadForDay } from '../components/dev/dailyJourneyRewardPreviewModel';
import type { DailyJourneyGiftInput } from '../app/daily_journey_gift_inbox';

const ROOT = path.join(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(ROOT, relative), 'utf8');

type Token = Readonly<{ generation: number; stableId: string | null; phase: 'active' | 'transitioning' }>;

type DeliveryController<TokenValue> = Readonly<{
  setActive: (active: boolean) => void;
  offer: (delivery: DailyJourneyHomeDelivery, token: TokenValue) => 'shown' | 'deferred' | 'stale';
  complete: () => void;
  landed: (occurrenceId: string | null) => 'pulsed' | 'ignored';
  resetForAccount: () => void;
  dispose: () => void;
}>;

type DeliveryControllerFactory = <TokenValue>(dependencies: Readonly<{
  isTokenCurrent: (token: TokenValue) => boolean;
  displayDelivery: (delivery: (DailyJourneyHomeDelivery & Readonly<{ run: number }>) | null) => void;
  startPulse: () => void;
  stopPulse: () => void;
  shouldReduceMotion: () => boolean;
}>) => DeliveryController<TokenValue>;

const maybeCreateDeliveryController = (dailyJourneyHomeOrchestration as unknown as Readonly<{
  createDailyJourneyHomeDeliveryController?: DeliveryControllerFactory;
}>).createDailyJourneyHomeDeliveryController;

const maybeMeasureTarget = (dailyJourneyHomeOrchestration as unknown as Readonly<{
  measureDailyJourneyHomeTarget?: (dependencies: Readonly<{
    measure: (callback: (x: number, y: number, width: number, height: number) => void) => void;
    isCurrent: () => boolean;
    windowHeight: number;
    timeoutMs?: number;
  }>) => Promise<DailyJourneyHomeTargetRect | null>;
}>).measureDailyJourneyHomeTarget;

type StatsUnreadController = Readonly<{
  activate: () => Promise<void>;
  deactivate: () => void;
  reload: () => Promise<void>;
  resetForAccount: () => Promise<void>;
  dispose: () => void;
}>;

type StatsUnreadControllerFactory = <TokenValue>(dependencies: Readonly<{
  captureToken: () => TokenValue;
  isTokenCurrent: (token: TokenValue) => boolean;
  readProjection: (token: TokenValue) => Promise<Readonly<{ unreadCount: number; pendingCount?: number }>>;
  displayUnreadCount: (count: number) => void;
  displayPendingCount?: (count: number) => void;
  startHop: () => void;
  stopHop: () => void;
  shouldReduceMotion: () => boolean;
  reportError: (stage: 'projection', error: unknown) => void;
}>) => StatsUnreadController;

const maybeCreateStatsUnreadController = (dailyJourneyStatsUnread as unknown as Readonly<{
  createDailyJourneyStatsUnreadController?: StatsUnreadControllerFactory;
}>).createDailyJourneyStatsUnreadController;

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
  test('app scope owns production eligibility and durable presentation independently of the active tab', () => {
    const home = read('app/(tabs)/home.tsx');
    const root = read('app/_layout.tsx');
    const host = read('components/daily_journey/DailyJourneyProductionModalHost.tsx');
    expect(root).toContain('<DailyJourneyProductionModalHost />');
    expect(root.indexOf('<OverlayArbiterProvider>')).toBeLessThan(root.indexOf('<DailyJourneyProductionModalHost />'));
    expect(host).toContain("const [appActive, setAppActive] = useState(AppState.currentState === 'active')");
    expect(host).toContain("useOverlayVisible('dailyJourney', appActive && delivery != null)");
    expect(host).toContain('productionHost.run()');
    expect(host).toContain('productionHost.markPresented(');
    expect(host).toContain("AppState.addEventListener('change'");
    expect(host).toContain("if (AppState.currentState !== 'active') return;");
    expect(host).toContain('millisecondsUntilNextLocalDay()');
    expect(host).toContain('subscribeAccountGeneration');
    expect(home).not.toContain('createDefaultDailyJourneyProductionHostController');
    expect(home).not.toContain('dailyJourneyProductionHost.run()');
  });

  test('production presentation survives measurement failure and offers the committed gift with fallback target', async () => {
    const item = occurrence({
      operationId: 'production-measure-failure', cycle: 1, day: 1,
      reward: dailyJourneyRewardPayloadForDay(1),
    });
    const offer = jest.fn(() => 'shown' as const);
    const reportError = jest.fn();
    const releasePresentation = jest.fn();

    await expect(offerDailyJourneyProductionDelivery({
      occurrence: item,
      token: { generation: 1, stableId: 'owner-a', phase: 'active' } as Token,
      runtimeEpoch: 9,
      measureTarget: async () => { throw new Error('measure exploded'); },
      isTokenCurrent: () => true,
      rememberToken: jest.fn(),
      forgetToken: jest.fn(),
      offer,
      releasePresentation,
      reportError,
    })).resolves.toBe('shown');

    expect(offer).toHaveBeenCalledWith(
      Object.freeze({ occurrence: item, targetRect: null }),
      expect.objectContaining({ stableId: 'owner-a' }),
    );
    expect(reportError).toHaveBeenCalledWith('measure', expect.any(Error));
    expect(releasePresentation).not.toHaveBeenCalled();
  });

  test('production offer exceptions settle, report and release the presentation reservation', async () => {
    const item = occurrence({
      operationId: 'production-offer-failure', cycle: 1, day: 2,
      reward: dailyJourneyRewardPayloadForDay(2),
    });
    const reportError = jest.fn();
    const releasePresentation = jest.fn();
    const forgetToken = jest.fn();

    await expect(offerDailyJourneyProductionDelivery({
      occurrence: item,
      token: { generation: 1, stableId: 'owner-a', phase: 'active' } as Token,
      runtimeEpoch: 10,
      measureTarget: async () => null,
      isTokenCurrent: () => true,
      rememberToken: jest.fn(),
      forgetToken,
      offer: () => { throw new Error('offer exploded'); },
      releasePresentation,
      reportError,
    })).resolves.toBe('failed');

    expect(forgetToken).toHaveBeenCalledWith(item.operationId);
    expect(releasePresentation).toHaveBeenCalledWith(item.operationId);
    expect(reportError).toHaveBeenCalledWith('offer', expect.any(Error));
  });

  test('Home gift entry relies on TapScale haptics and does not vibrate twice', () => {
    const home = read('app/(tabs)/home.tsx');
    const start = home.indexOf('testID="home-gift-entry-button"');
    const end = home.indexOf('</TapScale>', start);
    expect(start).toBeGreaterThan(-1);
    expect(home.slice(start, end)).not.toContain('hapticTap()');
  });

  test('Home keeps only target measurement and a one-shot deferred landing pulse', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain("onAppEvent('daily_journey_delivered'");
    expect(home).toContain('dailyJourneyDeferredPulseRef');
    expect(home).toContain('registerDailyJourneyRevealTargetMeasurer');
    expect(home).not.toContain('millisecondsUntilNextLocalDay()');
  });

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

  test('ambiguous Dev commit retry reuses its exact id/day until success, then a deliberate press advances', async () => {
    const inputs: DailyJourneyGiftInput[] = [];
    let uuid = 0;
    let fail = true;
    const controller = createDailyJourneyHomeGrantController<Token>({
      createOperationId: () => `retry-0000-0000-0000-${String(++uuid).padStart(12, '0')}`,
      captureToken: () => ({ generation: 1, stableId: 'owner-a', phase: 'active' }),
      isTokenCurrent: () => true,
      commit: async (input) => {
        inputs.push(input);
        if (fail) {
          fail = false;
          throw new Error('response lost');
        }
        return { status: 'committed' as const, occurrence: occurrence(input) };
      },
      measureTarget: async () => null,
      enqueueModal: jest.fn(),
      reportError: jest.fn(),
    });

    expect(await controller.press()).toBe('failed');
    expect(await controller.press()).toBe('opened');
    expect(await controller.press()).toBe('opened');

    expect(inputs[0]).toMatchObject({ day: 1, cycle: 1 });
    expect(inputs[1]).toEqual(inputs[0]);
    expect(inputs[2]).toMatchObject({ day: 2, cycle: 1 });
    expect(inputs[2]?.operationId).not.toBe(inputs[1]?.operationId);
  });

  test('account reset drops an ambiguous Dev retry instead of committing account A input under account B', async () => {
    let token: Token = { generation: 1, stableId: 'owner-a', phase: 'active' };
    const inputs: DailyJourneyGiftInput[] = [];
    let uuid = 0;
    const controller = createDailyJourneyHomeGrantController<Token>({
      createOperationId: () => `account-retry-${++uuid}`,
      captureToken: () => token,
      isTokenCurrent: (candidate) => candidate.generation === token.generation && candidate.stableId === token.stableId,
      commit: async (input) => {
        inputs.push(input);
        if (token.stableId === 'owner-a') throw new Error('ambiguous A commit');
        return { status: 'committed', occurrence: occurrence(input) };
      },
      measureTarget: async () => null,
      enqueueModal: jest.fn(),
      reportError: jest.fn(),
    });

    await expect(controller.press()).resolves.toBe('failed');
    token = { generation: 2, stableId: 'owner-b', phase: 'active' };
    controller.resetForAccount();
    await expect(controller.press()).resolves.toBe('opened');

    expect(inputs).toHaveLength(2);
    expect(inputs[1].operationId).not.toBe(inputs[0].operationId);
    expect(inputs[1]).toMatchObject({ cycle: 1, day: 1 });
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
    expect(enqueueModal.mock.calls[0][0]).toEqual(expect.objectContaining({ targetRect: null }));
  });

  test('commit completed after blur defers the exact occurrence and focus resumes it once', async () => {
    expect(typeof maybeCreateDeliveryController).toBe('function');
    if (!maybeCreateDeliveryController) return;

    let token: Token = { generation: 1, stableId: 'owner-a', phase: 'active' };
    let runtime = { active: true, epoch: 1 };
    let releaseCommit!: (value: ReturnType<typeof occurrence>) => void;
    const displayed: ((DailyJourneyHomeDelivery & Readonly<{ run: number }>) | null)[] = [];
    const deliveryController = maybeCreateDeliveryController<Token>({
      isTokenCurrent: (candidate) => candidate.generation === token.generation && candidate.stableId === token.stableId,
      displayDelivery: (delivery) => displayed.push(delivery),
      startPulse: jest.fn(),
      stopPulse: jest.fn(),
      shouldReduceMotion: () => false,
    });
    deliveryController.setActive(true);

    const grant = createDailyJourneyHomeGrantController<Token>({
      createOperationId: () => 'blur-commit-0000-0000-000000000001',
      captureToken: () => token,
      isTokenCurrent: (candidate: Token) => candidate.generation === token.generation,
      captureRuntimeEpoch: () => runtime.epoch,
      isRuntimeActive: (epoch: number) => runtime.active && runtime.epoch === epoch,
      commit: (_input: DailyJourneyGiftInput) => new Promise<{ status: 'committed'; occurrence: ReturnType<typeof occurrence> }>((resolve) => {
        releaseCommit = (committedOccurrence) => resolve({ status: 'committed', occurrence: committedOccurrence });
      }),
      measureTarget: async () => ({ x: 1, y: 2, width: 3, height: 4 }),
      enqueueModal: (delivery: DailyJourneyHomeDelivery, ownerToken: Token) => { deliveryController.offer(delivery, ownerToken); },
      deferModal: (delivery: DailyJourneyHomeDelivery, ownerToken: Token) => { deliveryController.offer(delivery, ownerToken); },
      reportError: jest.fn(),
    } as unknown as Parameters<typeof createDailyJourneyHomeGrantController<Token>>[0] & {
      captureRuntimeEpoch: () => number;
      isRuntimeActive: (epoch: number) => boolean;
      deferModal: (delivery: DailyJourneyHomeDelivery, ownerToken: Token) => void;
    });

    const pending = grant.press();
    runtime = { active: false, epoch: 2 };
    deliveryController.setActive(false);
    releaseCommit(occurrence({
      operationId: 'daily_journey_dev:blur-commit-0000-0000-000000000001',
      cycle: 1,
      day: 1,
      reward: dailyJourneyRewardPayloadForDay(1),
    }));

    await expect(pending).resolves.toBe('deferred');
    expect(displayed.filter(Boolean)).toHaveLength(0);
    runtime = { active: true, epoch: 3 };
    deliveryController.setActive(true);
    deliveryController.setActive(true);
    expect(displayed.filter(Boolean)).toHaveLength(1);
    expect(displayed.at(-1)?.occurrence.operationId).toContain('blur-commit');
  });

  test('blur while measurement is pending ignores its rect and safely defers the modal', async () => {
    expect(typeof maybeCreateDeliveryController).toBe('function');
    if (!maybeCreateDeliveryController) return;

    const token: Token = { generation: 1, stableId: 'owner-a', phase: 'active' };
    let runtime = { active: true, epoch: 1 };
    let releaseMeasure!: (rect: DailyJourneyHomeTargetRect) => void;
    const displayed: ((DailyJourneyHomeDelivery & Readonly<{ run: number }>) | null)[] = [];
    const deliveryController = maybeCreateDeliveryController<Token>({
      isTokenCurrent: () => true,
      displayDelivery: (delivery) => displayed.push(delivery),
      startPulse: jest.fn(),
      stopPulse: jest.fn(),
      shouldReduceMotion: () => false,
    });
    deliveryController.setActive(true);
    const measureTarget = jest.fn(() => new Promise<DailyJourneyHomeTargetRect>((resolve) => { releaseMeasure = resolve; }));
    const grant = createDailyJourneyHomeGrantController<Token>({
      createOperationId: () => 'blur-measure-0000-0000-000000000001',
      captureToken: () => token,
      isTokenCurrent: () => true,
      captureRuntimeEpoch: () => runtime.epoch,
      isRuntimeActive: (epoch: number) => runtime.active && runtime.epoch === epoch,
      commit: async (input: DailyJourneyGiftInput) => ({ status: 'committed' as const, occurrence: occurrence(input) }),
      measureTarget,
      enqueueModal: (delivery: DailyJourneyHomeDelivery, ownerToken: Token) => { deliveryController.offer(delivery, ownerToken); },
      deferModal: (delivery: DailyJourneyHomeDelivery, ownerToken: Token) => { deliveryController.offer(delivery, ownerToken); },
      reportError: jest.fn(),
    } as unknown as Parameters<typeof createDailyJourneyHomeGrantController<Token>>[0] & {
      captureRuntimeEpoch: () => number;
      isRuntimeActive: (epoch: number) => boolean;
      deferModal: (delivery: DailyJourneyHomeDelivery, ownerToken: Token) => void;
    });

    const pending = grant.press();
    await Promise.resolve();
    expect(measureTarget).toHaveBeenCalledTimes(1);
    runtime = { active: false, epoch: 2 };
    deliveryController.setActive(false);
    releaseMeasure({ x: 11, y: 12, width: 200, height: 160 });
    await expect(pending).resolves.toBe('deferred');
    runtime = { active: true, epoch: 3 };
    deliveryController.setActive(true);
    expect(displayed.at(-1)?.targetRect).toBeNull();
  });

  test('account switch drops deferred UI and inactive or duplicate landings are true no-ops', () => {
    expect(typeof maybeCreateDeliveryController).toBe('function');
    if (!maybeCreateDeliveryController) return;

    let token: Token = { generation: 1, stableId: 'owner-a', phase: 'active' };
    let reduced = false;
    const displayDelivery = jest.fn();
    const startPulse = jest.fn();
    const stopPulse = jest.fn();
    const deliveryController = maybeCreateDeliveryController<Token>({
      isTokenCurrent: (candidate) => candidate.generation === token.generation && candidate.stableId === token.stableId,
      displayDelivery,
      startPulse,
      stopPulse,
      shouldReduceMotion: () => reduced,
    });
    const oldDelivery = Object.freeze({
      occurrence: occurrence({
        operationId: 'daily_journey_dev:old-account', cycle: 1, day: 1, reward: dailyJourneyRewardPayloadForDay(1),
      }),
      targetRect: null,
    });
    expect(deliveryController.offer(oldDelivery, token)).toBe('deferred');
    token = { generation: 2, stableId: 'owner-b', phase: 'active' };
    deliveryController.resetForAccount();
    deliveryController.setActive(true);
    expect(displayDelivery).not.toHaveBeenCalledWith(expect.objectContaining({ occurrence: oldDelivery.occurrence }));

    const currentDelivery = Object.freeze({
      occurrence: occurrence({
        operationId: 'daily_journey_dev:current-account', cycle: 1, day: 2, reward: dailyJourneyRewardPayloadForDay(2),
      }),
      targetRect: null,
    });
    expect(deliveryController.offer(currentDelivery, token)).toBe('shown');
    expect(deliveryController.landed('wrong-occurrence')).toBe('ignored');
    expect(deliveryController.landed(currentDelivery.occurrence.operationId)).toBe('pulsed');
    const stopsBeforeDuplicate = stopPulse.mock.calls.length;
    expect(deliveryController.landed(currentDelivery.occurrence.operationId)).toBe('ignored');
    expect(startPulse).toHaveBeenCalledTimes(1);
    expect(stopPulse).toHaveBeenCalledTimes(stopsBeforeDuplicate);

    const nextDelivery = Object.freeze({
      occurrence: occurrence({
        operationId: 'daily_journey_dev:next-run', cycle: 1, day: 3, reward: dailyJourneyRewardPayloadForDay(3),
      }),
      targetRect: null,
    });
    expect(deliveryController.offer(nextDelivery, token)).toBe('deferred');
    deliveryController.complete();
    expect(stopPulse).toHaveBeenCalledTimes(stopsBeforeDuplicate + 1);

    deliveryController.setActive(false);
    expect(displayDelivery).toHaveBeenLastCalledWith(null);
    expect(deliveryController.landed(currentDelivery.occurrence.operationId)).toBe('ignored');
    expect(startPulse).toHaveBeenCalledTimes(1);
    reduced = true;
    deliveryController.setActive(true);
    expect(displayDelivery).toHaveBeenLastCalledWith(expect.objectContaining({ occurrence: nextDelivery.occurrence }));
    expect(deliveryController.landed(nextDelivery.occurrence.operationId)).toBe('ignored');
    expect(startPulse).toHaveBeenCalledTimes(1);

    const displaysBeforeDispose = displayDelivery.mock.calls.length;
    deliveryController.dispose();
    expect(displayDelivery).toHaveBeenCalledTimes(displaysBeforeDispose);
  });

  test('measurement times out at 300ms and ignores a late native callback', async () => {
    expect(typeof maybeMeasureTarget).toBe('function');
    if (!maybeMeasureTarget) return;

    jest.useFakeTimers();
    try {
      let nativeCallback!: (x: number, y: number, width: number, height: number) => void;
      const result = maybeMeasureTarget({
        measure: (callback) => { nativeCallback = callback; },
        isCurrent: () => true,
        windowHeight: 800,
      });
      jest.advanceTimersByTime(299);
      let settled = false;
      void result.then(() => { settled = true; });
      await Promise.resolve();
      expect(settled).toBe(false);
      jest.advanceTimersByTime(1);
      await expect(result).resolves.toBeNull();
      nativeCallback(10, 20, 300, 180);
      await expect(result).resolves.toBeNull();
    } finally {
      jest.useRealTimers();
    }
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

    const openedReload = controller.reload();
    controller.markInventoryOpened();
    expect(unread).toEqual([3, 0, 2, 0]);
    pendingReads[4].resolve(7);
    await openedReload;
    expect(unread).toEqual([3, 0, 2, 0]);

    const blurredReload = controller.reload();
    controller.deactivate();
    pendingReads[5].resolve(7);
    await blurredReload;
    expect(unread).toEqual([3, 0, 2, 0]);
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

  /**
   * Владелец 2026-09-01 убрал из хедера Главной дев-кнопку выдачи подарка
   * (и «намёк на аватарке»), оставив только колбу Dev Hub, переключатель плашки
   * и кнопку показа анимаций. Прежняя версия теста требовала СУЩЕСТВОВАНИЯ той
   * кнопки — то есть сторожила отменённое правило и ломала сборку на прямом
   * указании владельца.
   *
   * Теперь сторожим то, что осталось важным: сама механика выдачи подарка жива
   * (контроллер и его сброс при смене аккаунта никуда не делись), а вход в
   * Dev Hub из хедера — единственный, и его удалять нельзя.
   */
  test('keeps Dev Hub entry and the grant controller after the header cleanup', () => {
    expect(home).toContain('testID="home-dev-hub-button"');
    expect(home).toContain('dailyJourneyGrantController');
    expect(home).toContain('dailyJourneyGrantController.resetForAccount()');
    // Кнопки, убранные владельцем, обратно не возвращаем.
    expect(home).not.toContain('testID="home-dev-daily-journey-button"');
    expect(home).not.toContain('testID="home-dev-avatar-nudge-button"');
  });

  test('passes the committed occurrence and measured rect to the modal and closes only on delivery complete', () => {
    expect(home).toContain("useOverlayVisible('dailyJourneyDev', dailyJourneyDelivery != null)");
    expect(home).toContain('<DailyJourneyRewardPreviewModal');
    expect(home).toContain('visible={dailyJourneyOverlayVisible}');
    expect(home).not.toMatch(/<DailyJourneyRewardPreviewModal\s+visible\s+day=/);
    expect(home).toContain('occurrence={dailyJourneyDelivery.occurrence}');
    expect(home).toContain('targetRect={dailyJourneyDelivery.targetRect}');
    expect(home).toContain('onLanded={handleDailyJourneyLanded}');
    expect(home).toContain('onDeliveryComplete={completeDailyJourneyDelivery}');
  });

  test('measures the stable Gift slot and transform-pulses the existing stats card', () => {
    expect(home).toContain('testID="home-stats-card"');
    expect(home).toContain('ref={homeStatsCardRef as React.Ref<View>}');
    expect(home).toContain('ref={homeGiftEntryTargetRef as React.Ref<View>}');
    expect(home).toContain('collapsable={false}');
    expect(home).toContain('measureInWindow');
    expect(home).toContain('toValue: 1.035');
    expect(home).toContain('transform: [{ scale: dailyJourneyPulseAnim }]');
    expect(home).toContain('stopDailyJourneyPulse');
    expect(home).toContain('measureDailyJourneyHomeTarget');
  });

  test('keeps Spin centered and removes the empty action row after unread clears', () => {
    expect(home.indexOf('testID="home-spin-fab"')).toBeLessThan(home.indexOf('testID="home-gift-entry"'));
    expect(home).toMatch(/testID="home-spin-fab"[\s\S]{0,260}alignSelf: 'center'/);
    expect(home).toMatch(/testID="home-gift-entry"[\s\S]{0,500}style=\{homeActionRowBothVisible \? \{[\s\S]{0,300}\} : \{[\s\S]{0,260}position: 'absolute'[\s\S]{0,100}right: 0/);
    expect(home).toMatch(/testID="home-gift-entry-button"[\s\S]{0,1200}nav\.push\('\/level_gifts_inventory'\)/);
    expect(home).toMatch(/testID="home-gift-entry"[\s\S]{0,350}ref=\{homeGiftEntryTargetRef as React\.Ref<View>\}[\s\S]{0,350}collapsable=\{false\}[\s\S]{0,1200}\{dailyJourneyUnreadCount > 0 \? \(/);
    expect(home).toMatch(/\{\(homeSpinBalance > 0 \|\| dailyJourneyUnreadCount > 0\) \? \(\s*<View testID="home-stats-bottom-row"[\s\S]{0,180}height: 44/);
    expect(home).toMatch(/testID="home-gift-entry-target"[\s\S]{0,220}ref=\{homeGiftEntryTargetRef as React\.Ref<View>\}[\s\S]{0,220}pointerEvents="none"[\s\S]{0,300}position: 'absolute'/);
    expect(home).toContain('dailyJourneyProjectionController.markInventoryOpened();');
    expect(home.indexOf('dailyJourneyProjectionController.markInventoryOpened();')).toBeLessThan(home.indexOf("nav.push('/level_gifts_inventory')"));
    expect(home).not.toContain('Сам ряд всегда зарезервирован');
  });

  test('places simultaneous Spin and Gift entries in separate flex slots', () => {
    // Когда обе награды доступны, абсолютный правый слот пересекался с
    // центрированным «Спином». В этом состоянии обе кнопки обязаны быть
    // участниками одного flex-ряда; абсолютное позиционирование остаётся
    // только для одиночного подарка.
    expect(home).toMatch(/testID="home-stats-bottom-row"[\s\S]{0,500}flexDirection: homeActionRowBothVisible \? 'row' : 'column'[\s\S]{0,260}justifyContent: homeActionRowBothVisible \? 'space-between' : 'center'/);
    expect(home).toMatch(/testID="home-gift-entry"[\s\S]{0,500}style=\{homeActionRowBothVisible \? \{[\s\S]{0,300}maxWidth: homeActionMaxW[\s\S]{0,300}\} : \{[\s\S]{0,260}position: 'absolute'/);
  });

  test('renders the Spin and Gift controls without a bottom shadow border', () => {
    const spinStart = home.indexOf('testID="home-spin-fab-button"');
    const giftStart = home.indexOf('testID="home-gift-entry-button"');
    const spinButton = home.slice(spinStart, home.indexOf('</TapScale>', spinStart));
    const giftButton = home.slice(giftStart, home.indexOf('</TapScale>', giftStart));

    expect(spinButton).not.toContain('borderBottomWidth');
    expect(spinButton).not.toContain('borderBottomColor');
    expect(giftButton).not.toContain('borderBottomWidth');
    expect(giftButton).not.toContain('borderBottomColor');
  });

  test('mirrors the elongated Spin control and uses a generated Gift asset', () => {
    // зачем (владелец 2026-09-02): размеры обеих кнопок больше не константы —
    // когда «Спин» и «Подарок» видны одновременно, они наезжали друг на друга
    // на узкой карточке, поэтому кегль/иконка/зазор считаются из ширины ряда.
    // Сторож проверяет ЗЕРКАЛЬНОСТЬ: обе кнопки берут размеры из одних и тех
    // же homeAction*-метрик, а у подарка по-прежнему свой сгенерированный ассет.
    expect(home).toContain('<SpinTicketArt size={homeActionIconSize} accessibilityLabel="" />');
    expect(home).toContain("require('../../assets/images/daily_journey/home_gift_button.webp')");
    expect(home).toContain('const homeActionRowBothVisible = homeSpinBalance > 0 && dailyJourneyUnreadCount > 0;');
    expect(home).toMatch(/testID="home-gift-entry-button"[\s\S]{0,2600}minWidth: Math\.min\(104, homeActionMaxW\)[\s\S]{0,600}flexDirection: 'row'[\s\S]{0,600}gap: homeActionGap/);
    expect(home).toMatch(/testID="home-spin-fab-button"[\s\S]{0,2600}minWidth: Math\.min\(104, homeActionMaxW\)[\s\S]{0,600}gap: homeActionGap/);
    expect(home).toMatch(/testID="home-gift-entry-button"[\s\S]{0,3000}<Image source=\{HOME_DAILY_JOURNEY_GIFT_ART\}[\s\S]{0,300}width: homeActionIconSize, height: homeActionIconSize/);
    expect(home).toMatch(/testID="home-gift-entry-button"[\s\S]{0,3400}ru: 'Подарок'/);
    expect(home.slice(home.indexOf('testID="home-gift-entry-button"'), home.indexOf('</TapScale>', home.indexOf('testID="home-gift-entry-button"'))))
      .not.toContain('<Ionicons name="gift"');
    const assetPath = path.join(ROOT, 'assets/images/daily_journey/home_gift_button.webp');
    expect(fs.existsSync(assetPath)).toBe(true);
    expect(fs.statSync(assetPath).size).toBeLessThan(100_000);
  });

  test('reloads on inbox events and account changes without marking seen on Home', () => {
    expect(home).toContain("onAppEvent('daily_journey_gifts_changed'");
    expect(home).toContain("onAppEvent('daily_journey_delivered'");
    expect(home).toContain('subscribeAccountGeneration');
    expect(home).toContain('resetForAccount()');
    expect(home).toContain('dailyJourneyDeliveryController.setActive(homeRuntimeActive)');
    expect(home).not.toContain('markDailyJourneyGiftSnapshotSeen');
  });
});

describe('Statistics Daily Journey unread controller', () => {
  test('stops an active hop for zero unread, deactivation, and dispose', async () => {
    expect(typeof maybeCreateStatsUnreadController).toBe('function');
    if (!maybeCreateStatsUnreadController) return;

    const unread = [2, 0];
    const startHop = jest.fn();
    const stopHop = jest.fn();
    const controller = maybeCreateStatsUnreadController<Token>({
      captureToken: () => ({ generation: 1, stableId: 'owner-a', phase: 'active' }),
      isTokenCurrent: () => true,
      readProjection: async () => ({ unreadCount: unread.shift() ?? 0 }),
      displayUnreadCount: jest.fn(), startHop, stopHop,
      shouldReduceMotion: () => false, reportError: jest.fn(),
    });
    await controller.activate();
    expect(startHop).toHaveBeenCalledTimes(1);
    await controller.reload();
    expect(stopHop).toHaveBeenCalledTimes(1);
    controller.deactivate();
    controller.dispose();
    expect(stopHop).toHaveBeenCalledTimes(3);
  });

  test('clears a blurred old owner before a failed activation reload can expose it', async () => {
    expect(typeof maybeCreateStatsUnreadController).toBe('function');
    if (!maybeCreateStatsUnreadController) return;

    let token: Token = { generation: 1, stableId: 'owner-a', phase: 'active' };
    const displayed: number[] = [];
    const controller = maybeCreateStatsUnreadController<Token>({
      captureToken: () => token,
      isTokenCurrent: (candidate) => candidate.generation === token.generation && candidate.stableId === token.stableId,
      readProjection: async () => {
        if (token.stableId === 'owner-b') throw new Error('owner-b storage unavailable');
        return { unreadCount: 4 };
      },
      displayUnreadCount: (count) => displayed.push(count),
      startHop: jest.fn(), stopHop: jest.fn(), shouldReduceMotion: () => false, reportError: jest.fn(),
    });
    await controller.activate();
    controller.deactivate();
    token = { generation: 2, stableId: 'owner-b', phase: 'active' };
    await controller.activate();
    expect(displayed).toEqual([4, 0]);
  });

  test('keeps the legacy pending badge separate while projection requests are focus, account, and last-request guarded', async () => {
    expect(typeof maybeCreateStatsUnreadController).toBe('function');
    if (!maybeCreateStatsUnreadController) return;

    let token: Token = { generation: 1, stableId: 'owner-a', phase: 'active' };
    const unread: number[] = [];
    const pending: { resolve: (count: number) => void; reject: (error: Error) => void }[] = [];
    const startHop = jest.fn();
    const stopHop = jest.fn();
    const reportError = jest.fn();
    const controller = maybeCreateStatsUnreadController<Token>({
      captureToken: () => token,
      isTokenCurrent: (candidate) => candidate.generation === token.generation && candidate.stableId === token.stableId,
      readProjection: () => new Promise((resolve, reject) => pending.push({
        resolve: (count) => resolve({ unreadCount: count }),
        reject,
      })),
      displayUnreadCount: (count) => unread.push(count),
      startHop,
      stopHop,
      shouldReduceMotion: () => false,
      reportError,
    });

    const first = controller.activate();
    const second = controller.reload();
    pending[1].resolve(3);
    await second;
    pending[0].resolve(9);
    await first;
    expect(unread).toEqual([3]);
    expect(startHop).toHaveBeenCalledTimes(1);
    expect(stopHop).toHaveBeenCalledTimes(0);

    const failed = controller.reload();
    pending[2].reject(new Error('storage unavailable'));
    await failed;
    expect(unread).toEqual([3]);
    expect(reportError).toHaveBeenCalledWith('projection', expect.any(Error));

    token = { generation: 2, stableId: 'owner-b', phase: 'active' };
    const switched = controller.resetForAccount();
    expect(unread).toEqual([3, 0]);
    expect(stopHop).toHaveBeenCalledTimes(1);
    pending[3].resolve(2);
    await switched;
    expect(unread).toEqual([3, 0, 2]);
    expect(startHop).toHaveBeenCalledTimes(2);

    const late = controller.reload();
    controller.deactivate();
    pending[4].resolve(7);
    await late;
    expect(unread).toEqual([3, 0, 2]);
    expect(stopHop).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  test('keeps a seen but unclaimed Daily Journey gift in the Statistics pending total', async () => {
    expect(typeof maybeCreateStatsUnreadController).toBe('function');
    if (!maybeCreateStatsUnreadController) return;
    const unread: number[] = [];
    const pending: number[] = [];
    const controller = maybeCreateStatsUnreadController<Token>({
      captureToken: () => ({ generation: 1, stableId: 'owner-a', phase: 'active' }),
      isTokenCurrent: () => true,
      readProjection: async () => ({ unreadCount: 0, pendingCount: 1 }),
      displayUnreadCount: (count) => unread.push(count),
      displayPendingCount: (count) => pending.push(count),
      startHop: jest.fn(), stopHop: jest.fn(), shouldReduceMotion: () => false, reportError: jest.fn(),
    });
    await controller.activate();
    expect(unread).toEqual([0]);
    expect(pending).toEqual([1]);
  });

  test('suppresses and resets the hop for reduced motion and zero unread', async () => {
    expect(typeof maybeCreateStatsUnreadController).toBe('function');
    if (!maybeCreateStatsUnreadController) return;

    let reduceMotion = true;
    const startHop = jest.fn();
    const stopHop = jest.fn();
    const controller = maybeCreateStatsUnreadController<Token>({
      captureToken: () => ({ generation: 1, stableId: 'owner-a', phase: 'active' }),
      isTokenCurrent: () => true,
      readProjection: async () => ({ unreadCount: 1 }),
      displayUnreadCount: jest.fn(),
      startHop,
      stopHop,
      shouldReduceMotion: () => reduceMotion,
      reportError: jest.fn(),
    });

    await controller.activate();
    expect(startHop).not.toHaveBeenCalled();
    expect(stopHop).toHaveBeenCalledTimes(1);
    reduceMotion = false;
    await controller.reload();
    expect(startHop).toHaveBeenCalledTimes(1);
    controller.dispose();
  });
});

describe('Statistics source wiring for Daily Journey', () => {
  const stats = read('app/streak_stats.tsx');

  test('keeps pending inventory badge intact and adds a separate unread affordance without marking seen', () => {
    expect(stats).toContain('const [pendingGiftCount, setPendingGiftCount]');
    expect(stats).toContain('const [dailyJourneyUnreadCount, setDailyJourneyUnreadCount]');
    expect(stats).toContain('const [dailyJourneyPendingCount, setDailyJourneyPendingCount]');
    expect(stats).toContain('const combinedPendingGiftCount = pendingGiftCount + dailyJourneyPendingCount');
    expect(stats).toContain('displayPendingCount: setDailyJourneyPendingCount');
    expect(stats).toContain("onAppEvent('daily_journey_gifts_changed'");
    expect(stats).toContain('dailyJourneyUnreadHop');
    expect(stats).toContain('testID="stats-header-daily-journey-unread"');
    expect(stats).toContain('dailyJourneyUnreadCount > 0 ?');
    expect(stats).toContain("router.push('/level_gifts_inventory' as any)");
    expect(stats).not.toContain('markDailyJourneyGiftSnapshotSeen');
  });

  test('uses a bounded transform-only lifecycle-bound hop and accessible combined-count inventory button', () => {
    const parsed = ts.transpileModule(stats, {
      compilerOptions: { jsx: ts.JsxEmit.ReactNative, target: ts.ScriptTarget.ES2022 },
      reportDiagnostics: true,
      fileName: 'streak_stats.tsx',
    });
    expect(parsed.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)).toHaveLength(0);
    expect(stats).toContain('useReduceMotion()');
    expect(stats).toContain('cancelAnimation(dailyJourneyUnreadHop)');
    expect(stats).toContain('withRepeat(withSequence(');
    expect(stats).toContain('transform: [{ translateY: dailyJourneyUnreadHop.value }]');
    expect(stats).toContain('useNativeDriver: true');
    expect(stats).toContain('withDelay(6000, withTiming(0, { duration: 1 }))');
    expect(stats).toContain('duration: 110');
    expect(stats).toContain('duration: 160');
    expect(stats).toContain('Easing.bezier(0.77, 0, 0.175, 1)');
    expect(stats).not.toContain('Easing.in(');
    expect(stats).toContain('statsRuntimeActive');
    expect(stats).toMatch(/testID="stats-header-gifts"[\s\S]{0,2600}dailyJourneyUnreadCount/);
    expect(stats).toMatch(/testID="stats-header-gifts"[\s\S]{0,200}hitSlop=\{8\}[\s\S]{0,5500}width: 48, height: 48/);
    expect(stats).toContain('Unseen Daily Journey gifts');
    expect(stats).toMatch(/testID="stats-header-gifts"[\s\S]{0,500}accessibilityRole="button"/);
    expect(stats).toContain('combinedPendingGiftCount > 0 && dailyJourneyUnreadCount > 0');
    expect(stats).toMatch(/<Reanimated\.View style=\{dailyJourneyUnreadHopStyle\}>\s*<TouchableOpacity[\s\S]{0,2400}testID="stats-header-gifts"/);
    expect(stats).not.toMatch(/<Reanimated\.View style=\{dailyJourneyUnreadHopStyle\}>\s*<TouchableOpacity[\s\S]{0,500}testID="stats-header-spins"/);
  });
});
