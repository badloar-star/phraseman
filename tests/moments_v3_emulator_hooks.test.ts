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

describe('монета «хватает на ранг» · dev-баланс для прогона на эмуляторе', () => {
  it('окно берёт dev_state?coins=N (только dev, заглушка стор-сборки — null), иначе настоящий баланс', () => {
    expect(read('app/use_coin_rank_enough_moment.ts')).toContain('const balance = devBalance ?? peekRunes();');
    expect(read('store_release_stubs/dev_state/dev_coin_rank_stub.ts')).toContain('export function getDevCoinBalanceOverride(): null { return null; }');
  });
});

describe('m08 · шапка урока не прыгает при появлении кольца серии (Сверка 15.10)', () => {
  it('слот держит место под кольцо до порога, плашка «N подряд» в своей полосе, заголовок урока в одну строку', () => {
    const slot = read('components/feedback/ComboHeatSlot.tsx');
    expect(slot).toContain('return <View style={{ width: size, height: size }} testID="lesson1-combo-heat-reserve" />;');
    expect(slot).toContain("tipLane: { position: 'absolute', right: 0, width: TIP_LANE, alignItems: 'flex-end' },");
    expect(slot).not.toMatch(/tip: \{ position: 'absolute'/);
    expect(read('app/lesson1.tsx')).toMatch(/<PracticeHeaderTitle\s+glass=\{glass\}\s+oneLine/);
    expect(read('components/practice/PracticeChrome.tsx')).toContain('<Text numberOfLines={oneLine ? 1 : undefined}');
  });
});
