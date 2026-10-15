// зачем (координатор 15.10, сценарий Сверки моментов v3 на эмуляторе): окно D191 вызывается dev-ссылкой dev_state?spireWeek=… без итога
// недели с сервера — только в dev-сборке (в стор-сборке заглушка отдаёт null); решения m09 и кольца m11 видны в журнале одной строкой.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('моменты v3 · крючки сценария эмулятора', () => {
  it('D191: dev-итог недели подставляется после проверок флага/вкладки/языка и до проверки времени и сети', () => {
    const gate = read('app/spire/spire_week_moment_gate.ts');
    const dev = gate.indexOf('const devResult = getDevSpireWeekResultOverride();');
    expect(dev).toBeGreaterThan(gate.indexOf("return { show: false, reason: 'flag_off' }"));
    expect(dev).toBeGreaterThan(gate.indexOf("return { show: false, reason: 'no_uid' }"));
    expect(dev).toBeLessThan(gate.indexOf('const timing = decideSpireWeekMomentTiming(nowMs, shownWeek);'));
    expect(gate).toContain('ПОКАЗЫВАЕМ (dev spireWeek)');
  });

  it('стор-сборка: заглушка dev_spire_tier отдаёт null — ветка мёртвая', () => {
    expect(read('store_release_stubs/dev_state/dev_spire_tier_stub.ts')).toContain('export function getDevSpireWeekResultOverride(): null { return null; }');
  });

  it('журнал: решение m09 и кольца m11', () => {
    expect(read('app/lesson_complete.tsx')).toContain("console.log('[MOMENT-m09] decision'");
    expect(read('components/streak/moments/TodayRingsSlot.tsx')).toContain("console.log('[MOMENT-m11] rings'");
  });
});
