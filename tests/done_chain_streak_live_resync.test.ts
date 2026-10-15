// зачем (Сверка 15.10, «Серия — 0 дней / сегодня засчитан» у свежего гостя): строка серии цепочки m10 не должна терять запись дня,
// пришедшую между первым чтением стора и подпиской, а каждый шаг пишется в [STREAK-RESULT] (сперва логи).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('цепочка m10: живая серия и журнал [STREAK-RESULT]', () => {
  const chain = read('components/completion/V2DoneChain.tsx');
  const gate = read('components/completion/done_chain_gate.ts');
  const signal = read('app/streak_day_signal.ts');

  it('после подписки стор перечитывается и расхождение журналируется', () => {
    const hook = chain.slice(chain.indexOf('function useLiveStreak()'), chain.indexOf('function useLiveToday()'));
    expect(hook.indexOf('const afterSubscribe = peekStreakDayState();')).toBeGreaterThan(hook.indexOf('subscribeStreakDayState('));
    expect(hook).toContain('return missed ? afterSubscribe : prev;');
    expect(hook).toContain('[STREAK-RESULT] live:subscribed');
    expect(hook).toContain('[STREAK-RESULT] live:update');
  });

  it('снимок «до», строка серии и каждая запись стора — в журнале', () => {
    expect(gate).toContain('[STREAK-RESULT] before:snapshot');
    expect(chain).toContain('[STREAK-RESULT] row до=');
    expect(signal).toContain('[STREAK-RESULT] publish было=');
  });
});
