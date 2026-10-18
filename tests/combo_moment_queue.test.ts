// зачем (Сверка m08_1018, координатор 18.10): тост медали не всплывает поверх момента «Молния» — ждёт его конца ([MOMENT-QUEUE]).
import fs from 'node:fs';
import path from 'node:path';
import { __resetComboMomentBusy, comboMomentBusyLeftMs, COMBO_MOMENT_TIMELINE, markComboMomentBusy } from '../components/feedback/combo_moment_gate';

describe('[MOMENT-QUEUE] m08 и тост медали', () => {
  beforeEach(() => __resetComboMomentBusy());

  it('пока момент на экране — остаток > 0, после — 0; повторный удар продлевает', () => {
    markComboMomentBusy(1000, COMBO_MOMENT_TIMELINE.coinStay);
    expect(comboMomentBusyLeftMs(1000)).toBe(COMBO_MOMENT_TIMELINE.coinStay);
    expect(comboMomentBusyLeftMs(1000 + COMBO_MOMENT_TIMELINE.coinStay)).toBe(0);
    markComboMomentBusy(2000, COMBO_MOMENT_TIMELINE.coinStay);
    expect(comboMomentBusyLeftMs(2500)).toBe(COMBO_MOMENT_TIMELINE.coinStay - 500);
  });

  it('урок спрашивает очередь перед тостом медали, слой отмечает занятость на ударе', () => {
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    expect(read('app/lesson1.tsx')).toContain('const waitMs = comboMomentBusyLeftMs(Date.now());');
    expect(read('components/feedback/ComboMomentLayer.tsx')).toContain('markComboMomentBusy(Date.now(), T.coinStay);');
  });
});
