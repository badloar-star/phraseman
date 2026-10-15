// Ревизор 959d29934 (деньги, к R58 #12): защёлка «пейвол закрывает себя сам» ставилась ПОСЛЕ commit покупки —
// commit пишет Plus локально, диспетчер успевал закрыть окно до шага «Напомнить о пробном». Защёлка — ДО commit
// (покупка и восстановление), снимается при неудаче; ветка «аккаунт сменился» закрывает пейвол сама.
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'paywall_purchase.ts'), 'utf8').replace(/\r\n/g, '\n');

describe('защёлка самозакрытия пейвола — до commit, снимается при неудаче', () => {
  it('покупка: markPaywallOwnsClose до commitRevenueCatResultForGeneration, clear на not_applied', () => {
    const mark = src.indexOf("markPaywallOwnsClose('purchase')");
    const commit = src.indexOf('const applied = await commitRevenueCatResultForGeneration', mark);
    expect(mark).toBeGreaterThan(0);
    expect(commit).toBeGreaterThan(mark);
    expect(commit - mark).toBeLessThan(200);
    expect(src).toContain("clearPaywallOwnsClose('purchase_not_applied')");
  });

  it('восстановление: так же до commit и снятие на not_applied', () => {
    const mark = src.indexOf("markPaywallOwnsClose('restore')");
    const commit = src.indexOf('const applied = await commitRevenueCatResultForGeneration', mark);
    expect(mark).toBeGreaterThan(0);
    expect(commit - mark).toBeLessThan(200);
    expect(src).toContain("clearPaywallOwnsClose('restore_not_applied')");
  });

  it('«аккаунт сменился» после применения доступа — пейвол закрывает себя сам (покупка и восстановление)', () => {
    expect(src.match(/окно закрыто самим пейволом/g)).toHaveLength(2);
  });
});
