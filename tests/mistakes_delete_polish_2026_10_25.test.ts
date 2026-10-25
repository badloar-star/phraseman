// Аудит Дизайна 0936a7510 к удалению ошибки: «Вернуть» ставит строку на прежнее место, хаптик только на «Удалить»,
// нажатие во время записи не молчит, у одной ошибки свой текст сбоя.
import fs from 'node:fs';
import path from 'node:path';
import { MISTAKE_CLEAR_ALL_COPY } from '../app/mistake_clear_all_copy';
import { reinsertMistakeAt } from '../app/mistake_list_reinsert';

const row = (id: string) => ({ mistakeId: id, phrase: id, meaning: null, facet: 'grammar', lessonId: null, status: 'active', captureCount: 1, qualifyingDays: 0, ready: true, dueAtMs: 0, correctedAtMs: null, firstCapturedAtMs: 0 }) as never;

describe('mistakes delete polish', () => {
  it('undo puts the row back at its old index, keeping rows deleted meanwhile out', () => {
    const before = [row('a'), row('b'), row('c'), row('d')];
    const current = [row('a'), row('d')]; // b удалили (возвращаем), c удалили позже
    const back = reinsertMistakeAt(current, before, row('b'))!.map((x: { mistakeId: string }) => x.mistakeId);
    expect(back).toEqual(['a', 'b', 'd']);
    expect(reinsertMistakeAt(back.map(row), before, row('b'))!.length).toBe(3);
  });

  it('haptics only on «Удалить»; busy and single-failure have their own texts in 9 languages', () => {
    const list = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistakes_list.tsx'), 'utf8');
    const ask = list.slice(list.indexOf('const askDeleteOne'), list.indexOf('const closeDelete'));
    expect(ask).not.toContain('hapticTap()');
    const open = list.slice(list.indexOf('const openOne'), list.indexOf('const startPractice'));
    expect(open).not.toContain('hapticTap()');
    const del = list.slice(list.indexOf('const deleteOne'), list.indexOf('const openOne'));
    expect(del).toContain('hapticTap()');
    expect(del).toContain('emitMistakeDeleteBusyToast()');
    const flow = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_clear_all_flow.ts'), 'utf8');
    expect(flow).toMatch(/return 'busy'/);
    expect(flow.slice(flow.indexOf('if (inFlight)'), flow.indexOf("return 'busy'"))).toContain('emitMistakeDeleteBusyToast()');
    for (const copy of Object.values(MISTAKE_CLEAR_ALL_COPY)) {
      expect(copy.failedOne.trim()).not.toBe('');
      expect(copy.busy.trim()).not.toBe('');
    }
  });
});
