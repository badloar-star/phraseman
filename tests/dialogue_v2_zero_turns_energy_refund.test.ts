// зачем (Ревизор 15.10, 🟡 к e4719fc1e): пустой разговор (0 реплик ученика) — энергия возвращается ровно один раз на попытку
// (ключ — energyOp), и только при нуле реплик: итог и уход с экрана — два пути, но один возврат. Журнал [DIALOG-ENERGY-REFUND].
import fs from 'node:fs';
import path from 'node:path';

import { createDialogueEnergySettler } from '../app/dialogue_v2_energy_settle';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_session.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('[DIALOG-ENERGY-REFUND] · пустой разговор возвращает энергию', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('итог с нулём реплик и уход с экрана — один возврат и один тост', async () => {
    const actions = { acknowledge: jest.fn(async () => true), refund: jest.fn(async () => undefined) };
    const onRefunded = jest.fn();
    const settler = createDialogueEnergySettler('op_zero_turns', { getActions: () => actions, onRefunded });
    await expect(settler.settle('refund', 'dialogue_zero_learner_turns')).resolves.toBe('refunded');
    await expect(settler.settle('refund', 'dialogue_left_without_turns')).resolves.toBe('skipped_already_settled');
    expect(actions.refund).toHaveBeenCalledTimes(1);
    expect(onRefunded).toHaveBeenCalledTimes(1);
  });

  it('ученик сказал хоть слово — энергия уже закреплена первым ходом, возврата нет', async () => {
    const actions = { acknowledge: jest.fn(async () => true), refund: jest.fn(async () => undefined) };
    const settler = createDialogueEnergySettler('op_spoke', { getActions: () => actions, onRefunded: jest.fn() });
    await settler.settle('acknowledge', 'first_turn_ok');
    await expect(settler.settle('refund', 'dialogue_left_without_turns')).resolves.toBe('skipped_already_settled');
    expect(actions.refund).not.toHaveBeenCalled();
  });

  it('сессия: итог — только при нуле реплик; уход — если собеседник ни разу не ответил; ход в полёте — решает его исход', () => {
    const at = src.indexOf('const refundEmptyDialogue = (where');
    expect(at).toBeGreaterThan(-1);
    const fn = src.slice(at, at + 2400);
    expect(fn).toContain("if (where === 'summary' && learnerTurnsNow > 0) {");
    expect(fn).toContain("'[DIALOG-ENERGY-REFUND] defer: turn in flight → исход хода решит'");
    expect(fn).toContain("if (energy?.settledAs === 'acknowledge') {");
    expect(fn).toContain("'[DIALOG-ENERGY-REFUND] nothing received → refund'");
    expect(fn).toContain("settleEnergy('refund', reason);");
    expect(src).toContain("useEffect(() => () => { refundEmptyDialogueRef.current('leave'); }, []);");
    expect(src).toContain("if (learnerTurns === 0) refundEmptyDialogue('summary');");
    // Ревизор 15.10: первый ход провалился уже после ухода — finally хода возвращает энергию (удачный ход её уже закрепил).
    const fin = src.slice(src.indexOf('turnInFlightRef.current = false;'), src.indexOf('turnInFlightRef.current = false;') + 500);
    expect(fin).toContain('if (leftScreenRef.current) {');
    expect(fin).toContain("settleEnergy('refund', 'dialogue_left_turn_unanswered');");
  });

  it('ход провалился после ухода — возврат один; ход удался после ухода — энергия закреплена, возврата нет', async () => {
    const failed = { acknowledge: jest.fn(async () => true), refund: jest.fn(async () => undefined) };
    const s1 = createDialogueEnergySettler('op_left_failed', { getActions: () => failed, onRefunded: jest.fn() });
    await expect(s1.settle('refund', 'dialogue_left_turn_unanswered')).resolves.toBe('refunded');
    expect(failed.refund).toHaveBeenCalledTimes(1);
    const ok = { acknowledge: jest.fn(async () => true), refund: jest.fn(async () => undefined) };
    const s2 = createDialogueEnergySettler('op_left_ok', { getActions: () => ok, onRefunded: jest.fn() });
    await s2.settle('acknowledge', 'first_turn_ok');
    await expect(s2.settle('refund', 'dialogue_left_turn_unanswered')).resolves.toBe('skipped_already_settled');
    expect(ok.refund).not.toHaveBeenCalled();
  });
});
