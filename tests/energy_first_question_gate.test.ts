import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  FIRST_QUESTION_GATE_PENDING_KEY,
  __firstQuestionGateBootIdForTests,
  __resetFirstQuestionGateForTests,
  chargeFirstQuestion,
  markFirstQuestionShown,
  readFirstQuestionGateStatus,
  recoverUnshownFirstQuestionCharges,
  refundIfFirstQuestionNotShown,
  type FirstQuestionChargeResult,
  type FirstQuestionGateIntent,
  type FirstQuestionLedgerStatus,
  type FirstQuestionRecoveryDeps,
} from '../app/energy_first_question_gate';

// D72: −1 в момент показа первого вопроса; D87: вопрос не показан → возврат;
// PM-084-A2: remount/retry/prefetch не списывают повторно; D67: новый вход =
// новая попытка; D07: Plus не платит.

const intent = (attemptId: string): FirstQuestionGateIntent => ({
  operationId: `energy:lesson:${attemptId}`,
  grant: { kind: 'lesson', subjectId: '7', attemptId },
});

type FakeLedger = {
  balance: number;
  unlimited: boolean;
  charged: Set<string>;
  acked: Set<string>;
  refunded: Set<string>;
  confirmCalls: number;
  refundCalls: number;
};

function makeDeps(ledger: FakeLedger, overrides: Partial<FirstQuestionRecoveryDeps> = {}): FirstQuestionRecoveryDeps {
  return {
    confirmActivityStart: jest.fn(async (_activity, gateIntent): Promise<FirstQuestionChargeResult> => {
      ledger.confirmCalls += 1;
      if (ledger.unlimited) return 'unlimited';
      // Реестр энергии идемпотентен по operationId — как настоящий ledger.
      if (ledger.charged.has(gateIntent.operationId)) return 'spent';
      if (ledger.balance < 1) return 'insufficient';
      ledger.balance -= 1;
      ledger.charged.add(gateIntent.operationId);
      return 'spent';
    }),
    refundActivityStart: jest.fn(async (operationId: string) => {
      ledger.refundCalls += 1;
      if (ledger.acked.has(operationId)) throw new Error('energy_session_already_acknowledged');
      if (ledger.refunded.has(operationId)) return;
      ledger.refunded.add(operationId);
      ledger.balance += 1;
    }),
    acknowledgeSessionStart: jest.fn(async (operationId: string) => {
      ledger.acked.add(operationId);
      return true;
    }),
    getOwnerId: () => 'owner-1',
    readStartStatus: jest.fn(async (operationId: string): Promise<FirstQuestionLedgerStatus> => {
      if (ledger.acked.has(operationId)) return 'acknowledged';
      if (ledger.refunded.has(operationId)) return 'refunded';
      if (ledger.charged.has(operationId)) return 'charged';
      return 'missing';
    }),
    ...overrides,
  };
}

const freshLedger = (balance = 5): FakeLedger => ({
  balance,
  unlimited: false,
  charged: new Set(),
  acked: new Set(),
  refunded: new Set(),
  confirmCalls: 0,
  refundCalls: 0,
});

async function readJournal(): Promise<Array<{ operationId: string; bootId: string; owner: string }>> {
  const raw = await AsyncStorage.getItem(FIRST_QUESTION_GATE_PENDING_KEY);
  return raw ? JSON.parse(raw) : [];
}

describe('energy first-question gate (D72/D87/PM-084)', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(async () => {
    __resetFirstQuestionGateForTests();
    await AsyncStorage.clear();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('charges exactly once for the first question and confirms the show', async () => {
    const ledger = freshLedger();
    const deps = makeDeps(ledger);
    const attempt = intent('a1');

    await expect(chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 't' })).resolves.toBe('spent');
    expect(ledger.balance).toBe(4);
    expect(await readJournal()).toHaveLength(1);

    await markFirstQuestionShown(deps, attempt.operationId);
    expect(ledger.acked.has(attempt.operationId)).toBe(true);
    expect(readFirstQuestionGateStatus(attempt.operationId)).toBe('shown');
    expect(await readJournal()).toHaveLength(0);
    expect(logSpy.mock.calls.some(([line]) => String(line).startsWith('[ENERGY-GATE]'))).toBe(true);
  });

  it('dedups remount / retry / prefetch of the same attempt (one charge)', async () => {
    const ledger = freshLedger();
    const deps = makeDeps(ledger);
    const attempt = intent('a1');

    const results = await Promise.all([
      chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 'mount-1' }),
      chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 'remount' }),
      chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 'prefetch' }),
    ]);
    const retry = await chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 'retry' });

    expect(results).toEqual(['spent', 'spent', 'spent']);
    expect(retry).toBe('spent');
    expect(ledger.confirmCalls).toBe(1);
    expect(ledger.balance).toBe(4);
  });

  it('re-entering an unfinished lesson is a NEW attempt and charges again (D67)', async () => {
    const ledger = freshLedger();
    const deps = makeDeps(ledger);
    const first = intent('entry-1');
    const second = intent('entry-2');

    await chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: first, screen: 't' });
    await markFirstQuestionShown(deps, first.operationId);
    await chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: second, screen: 't' });
    await markFirstQuestionShown(deps, second.operationId);

    expect(ledger.balance).toBe(3);
  });

  it('refunds when the first question was never shown (load error / crash / leave)', async () => {
    const ledger = freshLedger();
    const deps = makeDeps(ledger);
    const attempt = intent('a1');

    await chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 't' });
    await refundIfFirstQuestionNotShown(deps, attempt.operationId, 'lesson_load_failed');
    // Повторный вызов (retry / второй cleanup) не вернёт дважды.
    await refundIfFirstQuestionNotShown(deps, attempt.operationId, 'lesson_load_failed');

    expect(ledger.balance).toBe(5);
    expect(ledger.refundCalls).toBe(1);
    expect(readFirstQuestionGateStatus(attempt.operationId)).toBe('refunded');
    expect(await readJournal()).toHaveLength(0);
  });

  it('refunds when the screen leaves while the charge is still in flight', async () => {
    const ledger = freshLedger();
    const gate: { release: () => void } = { release: () => {} };
    const deps = makeDeps(ledger);
    const slowDeps: FirstQuestionRecoveryDeps = {
      ...deps,
      confirmActivityStart: async (activity, gateIntent) => {
        await new Promise<void>((resolve) => { gate.release = resolve; });
        return deps.confirmActivityStart(activity, gateIntent);
      },
    };
    const attempt = intent('a1');

    const pending = chargeFirstQuestion(slowDeps, { activity: 'classic_lesson', intent: attempt, screen: 't' });
    await refundIfFirstQuestionNotShown(slowDeps, attempt.operationId, 'unmounted_before_first_question');
    gate.release();
    await pending;

    expect(ledger.balance).toBe(5);
    expect(readFirstQuestionGateStatus(attempt.operationId)).toBe('refunded');
  });

  it('never refunds after the first question was shown', async () => {
    const ledger = freshLedger();
    const deps = makeDeps(ledger);
    const attempt = intent('a1');

    await chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 't' });
    await markFirstQuestionShown(deps, attempt.operationId);
    await refundIfFirstQuestionNotShown(deps, attempt.operationId, 'unmounted_before_first_question');

    expect(ledger.balance).toBe(4);
    expect(ledger.refundCalls).toBe(0);
  });

  it('Plus / unlimited never spends and never journals (D07)', async () => {
    const ledger = { ...freshLedger(), unlimited: true };
    const deps = makeDeps(ledger);
    const attempt = intent('a1');

    await expect(chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 't' })).resolves.toBe('unlimited');
    await markFirstQuestionShown(deps, attempt.operationId);
    await refundIfFirstQuestionNotShown(deps, attempt.operationId, 'x');

    expect(ledger.balance).toBe(5);
    expect(ledger.refundCalls).toBe(0);
    expect(await readJournal()).toHaveLength(0);
  });

  it('insufficient energy clears the attempt so a later retry can charge', async () => {
    const ledger = freshLedger(0);
    const deps = makeDeps(ledger);
    const attempt = intent('a1');

    await expect(chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 't' })).resolves.toBe('insufficient');
    expect(readFirstQuestionGateStatus(attempt.operationId)).toBe('none');
    ledger.balance = 1;
    await expect(chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 't' })).resolves.toBe('spent');
    expect(ledger.balance).toBe(0);
  });

  // зачем (координатор 05.10): окно курса «нет энергии» при восстановлении энергии сразу пускает в занятие
  // (тот же запуск, тот же operationId, плеер монтируется заново) — списание обязано пройти ровно один раз.
  it('energy restored while the no-energy window is open: re-entry of the same run charges exactly once', async () => {
    const ledger = freshLedger(0);
    const deps = makeDeps(ledger);
    const attempt = intent('lv2-run-1');

    await expect(chargeFirstQuestion(deps, { activity: 'learning_v2_session', intent: attempt, screen: 'learning_v2_session' })).resolves.toBe('insufficient');
    ledger.balance = 1; // таймер дошёл: +1
    const [first, remount] = await Promise.all([
      chargeFirstQuestion(deps, { activity: 'learning_v2_session', intent: attempt, screen: 'learning_v2_session' }),
      chargeFirstQuestion(deps, { activity: 'learning_v2_session', intent: attempt, screen: 'learning_v2_session' }),
    ]);
    await markFirstQuestionShown(deps, attempt.operationId);
    const late = await chargeFirstQuestion(deps, { activity: 'learning_v2_session', intent: attempt, screen: 'learning_v2_session' });

    expect([first, remount, late]).toEqual(['spent', 'spent', 'spent']);
    expect(ledger.charged.size).toBe(1);
    expect(ledger.balance).toBe(0);
  });

  it('on next app start refunds a charge from a previous boot whose question was never shown (idempotent)', async () => {
    const ledger = freshLedger(4);
    ledger.charged.add('energy:lesson:crashed');
    ledger.charged.add('energy:lesson:shown-before-crash');
    ledger.acked.add('energy:lesson:shown-before-crash');
    await AsyncStorage.setItem(FIRST_QUESTION_GATE_PENDING_KEY, JSON.stringify([
      { operationId: 'energy:lesson:crashed', activity: 'classic_lesson', owner: 'owner-1', bootId: 'boot-old', chargedAtMs: 1 },
      { operationId: 'energy:lesson:shown-before-crash', activity: 'classic_lesson', owner: 'owner-1', bootId: 'boot-old', chargedAtMs: 2 },
      { operationId: 'energy:lesson:other-account', activity: 'classic_lesson', owner: 'owner-2', bootId: 'boot-old', chargedAtMs: 3 },
    ]));
    const deps = makeDeps(ledger);

    await expect(recoverUnshownFirstQuestionCharges(deps)).resolves.toBe(1);
    // Второй вызов в том же процессе — тот же результат, без повторного возврата.
    await expect(recoverUnshownFirstQuestionCharges(deps)).resolves.toBe(1);

    expect(ledger.balance).toBe(5);
    expect(ledger.refundCalls).toBe(1);
    const left = await readJournal();
    expect(left.map((item) => item.operationId)).toEqual(['energy:lesson:other-account']);
  });

  it('recovery ignores charges of the current boot (the live screen owns them)', async () => {
    const ledger = freshLedger();
    const deps = makeDeps(ledger);
    const attempt = intent('live');
    await chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 't' });

    await expect(recoverUnshownFirstQuestionCharges(deps)).resolves.toBe(0);
    expect(ledger.balance).toBe(4);
    const journal = await readJournal();
    expect(journal).toHaveLength(1);
    expect(journal[0].bootId).toBe(__firstQuestionGateBootIdForTests());
  });

  it('a failed refund keeps the journal entry for the next boot', async () => {
    const ledger = freshLedger();
    const deps = makeDeps(ledger, {
      refundActivityStart: jest.fn(async () => { throw new Error('energy_state_unavailable'); }),
    });
    const attempt = intent('a1');

    await chargeFirstQuestion(deps, { activity: 'classic_lesson', intent: attempt, screen: 't' });
    await refundIfFirstQuestionNotShown(deps, attempt.operationId, 'lesson_load_failed');

    expect(await readJournal()).toHaveLength(1);
    expect(warnSpy.mock.calls.some(([line]) => String(line).includes('[ENERGY-GATE] refund: failed'))).toBe(true);
  });
});
