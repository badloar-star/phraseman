// зачем (координатор 12.10, E10): сессия диалога не стартовала — человек ничего не получил, энергию возвращаем ровно один раз
// на попытку; поздний первый ответ после возврата не закрепляет и не возвращает повторно. Сторож двойного возврата и гонки.
import fs from 'fs';
import path from 'path';

import { createDialogueEnergySettler, type DialogueEnergySettleActions } from '../app/dialogue_v2_energy_settle';

const OP = 'op_dialogue_e10_1';

const makeActions = (overrides: Partial<DialogueEnergySettleActions> = {}) => {
  const actions = {
    acknowledge: jest.fn(async () => true),
    refund: jest.fn(async () => undefined),
    ...overrides,
  };
  return actions;
};

describe('[ENERGY-REFUND] диалог: одно решение «закрепить / вернуть» на попытку', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    log.mockRestore();
    warn.mockRestore();
  });

  it('сессия не стартовала → один возврат и один тост', async () => {
    const actions = makeActions();
    const onRefunded = jest.fn();
    const settler = createDialogueEnergySettler(OP, { getActions: () => actions, onRefunded });
    await expect(settler.settle('refund', 'dialogue_session_start_failed')).resolves.toBe('refunded');
    expect(actions.refund).toHaveBeenCalledWith(OP, 'dialogue_session_start_failed');
    expect(onRefunded).toHaveBeenCalledTimes(1);
  });

  it('двойной возврат (две причины подряд) → журнал зовут один раз, тост один', async () => {
    const actions = makeActions();
    const onRefunded = jest.fn();
    const settler = createDialogueEnergySettler(OP, { getActions: () => actions, onRefunded });
    const first = await settler.settle('refund', 'dialogue_session_start_failed');
    const second = await settler.settle('refund', 'dialogue_first_turn_service_failed');
    expect([first, second]).toEqual(['refunded', 'skipped_already_settled']);
    expect(actions.refund).toHaveBeenCalledTimes(1);
    expect(onRefunded).toHaveBeenCalledTimes(1);
  });

  it('гонка: возврат и первый ответ в одном такте → ровно одно действие', async () => {
    let releaseRefund: () => void = () => undefined;
    const actions = makeActions({
      refund: jest.fn(() => new Promise<void>((resolve) => { releaseRefund = resolve; })),
    });
    const onRefunded = jest.fn();
    const settler = createDialogueEnergySettler(OP, { getActions: () => actions, onRefunded });
    const refunding = settler.settle('refund', 'dialogue_session_start_failed');
    const acknowledging = settler.settle('acknowledge', 'first_turn_ok');
    releaseRefund();
    await expect(Promise.all([refunding, acknowledging])).resolves.toEqual(['refunded', 'skipped_already_settled']);
    expect(actions.refund).toHaveBeenCalledTimes(1);
    expect(actions.acknowledge).not.toHaveBeenCalled();
  });

  it('поздний старт после возврата: первый ответ не закрепляет и не возвращает повторно', async () => {
    const actions = makeActions();
    const settler = createDialogueEnergySettler(OP, { getActions: () => actions, onRefunded: jest.fn() });
    await settler.settle('refund', 'dialogue_session_start_failed');
    await expect(settler.settle('acknowledge', 'first_turn_ok')).resolves.toBe('skipped_already_settled');
    await expect(settler.settle('refund', 'dialogue_first_turn_service_failed')).resolves.toBe('skipped_already_settled');
    expect(actions.acknowledge).not.toHaveBeenCalled();
    expect(actions.refund).toHaveBeenCalledTimes(1);
  });

  it('первый ответ уже закрепил энергию → возврат на сбое старта не идёт', async () => {
    const actions = makeActions();
    const settler = createDialogueEnergySettler(OP, { getActions: () => actions, onRefunded: jest.fn() });
    await settler.settle('acknowledge', 'first_turn_ok');
    await expect(settler.settle('refund', 'dialogue_session_start_failed')).resolves.toBe('skipped_already_settled');
    expect(actions.refund).not.toHaveBeenCalled();
  });

  it('сбой записи возврата → тоста нет, id возвращён, следующий повтор возвращает один раз', async () => {
    const refund = jest.fn()
      .mockRejectedValueOnce(new Error('energy_session_refund_failed:storage'))
      .mockResolvedValueOnce(undefined);
    const actions = makeActions({ refund });
    const onRefunded = jest.fn();
    const settler = createDialogueEnergySettler(OP, { getActions: () => actions, onRefunded });
    await expect(settler.settle('refund', 'dialogue_session_start_failed')).resolves.toBe('failed');
    expect(onRefunded).not.toHaveBeenCalled();
    expect(settler.peek()).toEqual({ operationId: OP, settledAs: null });
    expect(warn).toHaveBeenCalled();
    await expect(settler.settle('refund', 'dialogue_session_start_failed')).resolves.toBe('refunded');
    expect(refund).toHaveBeenCalledTimes(2);
    expect(onRefunded).toHaveBeenCalledTimes(1);
  });

  it('Plus / вход без списания (нет energyOp) → ничего не делаем', async () => {
    const actions = makeActions();
    const settler = createDialogueEnergySettler(null, { getActions: () => actions, onRefunded: jest.fn() });
    await expect(settler.settle('refund', 'dialogue_session_start_failed')).resolves.toBe('skipped_no_operation');
    expect(actions.refund).not.toHaveBeenCalled();
  });

  it('энергия ещё не смонтирована → id не забираем, решение можно принять позже', async () => {
    const actions = makeActions();
    let mounted: DialogueEnergySettleActions | null = null;
    const settler = createDialogueEnergySettler(OP, { getActions: () => mounted, onRefunded: jest.fn() });
    await expect(settler.settle('refund', 'dialogue_session_start_failed')).resolves.toBe('skipped_no_actions');
    mounted = actions;
    await expect(settler.settle('refund', 'dialogue_session_start_failed')).resolves.toBe('refunded');
    expect(actions.refund).toHaveBeenCalledTimes(1);
  });

  it('контракт экрана: возврат на «сессия не стартовала», через одноразовый расчёт, лог в журнале энергии', () => {
    const session = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_session.tsx'), 'utf8');
    expect(session).toContain("if (serverSessionState !== 'unavailable') return;");
    expect(session).toContain("settleEnergy('refund', 'dialogue_session_start_failed');");
    expect(session).toContain('createDialogueEnergySettler(');
    expect(session).toContain('void energySettlerRef.current?.settle(outcome, reason);');
    const energy = fs.readFileSync(path.join(__dirname, '..', 'components', 'EnergyContext.tsx'), 'utf8');
    expect(energy).toContain("console.log('[ENERGY-REFUND] ledger'");
  });
});
