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

  it('сессия: возврат только при нуле реплик — на итоге и при уходе с экрана', () => {
    const at = src.indexOf('const refundEmptyDialogue = (where');
    expect(at).toBeGreaterThan(-1);
    const fn = src.slice(at, at + 900);
    expect(fn).toContain('if (learnerTurnsNow > 0) {');
    expect(fn).toContain("'[DIALOG-ENERGY-REFUND] zero learner turns → refund'");
    expect(fn).toContain("settleEnergy('refund', where === 'summary' ? 'dialogue_zero_learner_turns' : 'dialogue_left_without_turns');");
    expect(src).toContain("useEffect(() => () => { refundEmptyDialogueRef.current('leave'); }, []);");
    expect(src).toContain("if (learnerTurns === 0) refundEmptyDialogue('summary');");
  });
});
