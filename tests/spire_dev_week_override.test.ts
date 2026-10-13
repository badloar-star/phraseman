// зачем (координатор 13.10): Сверке нужны кадры «Итога недели» для повышения, «остаёшься», понижения и высшей лиги без сервера — dev_state?spireWeek=…
// Подмена только в dev-сборке (в стор-сборке заглушка), только карточка итога; значения 1-в-1 из макета spire-leagues.html (раздел «Итог недели»).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const devTier = read('app/dev_spire_tier.ts');
const fixtures = read('app/dev_state_fixtures.ts');
const home = read('components/spire/SpireHomeScreen.tsx');

describe('dev-подмена «Итога недели»', () => {
  it('6 исходов из макета, значения совпадают с образцом', () => {
    for (const kind of ['up', 'stay', 'down', 'top', 'marble', 'obsidian']) expect(devTier).toContain(`  ${kind}: {`);
    expect(devTier).toContain('up: { steps: 47, roomRank: 3, roomTotal: 30, promoted: true, demoted: false, prevTier: 0, newTier: 1, placeCoins: 150, promotionCoins: 100 }'); // «3 место · 47 ступеней · +150 · +100»
    expect(devTier).toContain('top: { steps: 112, roomRank: 1, roomTotal: 30, promoted: true, demoted: false, prevTier: 10, newTier: 11, placeCoins: 300, promotionCoins: 100 }'); // «1 место · 112 ступеней · +300 · +100»
    expect(devTier).toContain('down: { steps: 5, roomRank: 27, roomTotal: 30, promoted: false, demoted: true, prevTier: 2, newTier: 1, placeCoins: 0, promotionCoins: 0 }');
    expect(devTier).toContain('if (!devAvailable() || weekOverride === null) return null;');
  });

  it('параметр ссылки, заглушка в стор-сборке и экран: подмена берётся раньше ответа сервера', () => {
    expect(fixtures).toContain("spireWeek?: 'up' | 'stay' | 'down' | 'top' | 'marble' | 'obsidian' | 'off';");
    expect(fixtures).toContain("setDevSpireWeekResultOverride } = await import('./dev_spire_tier')");
    const stub = read('store_release_stubs/dev_state/dev_spire_tier_stub.ts');
    expect(stub).toContain('export function setDevSpireWeekResultOverride(): boolean { return false; }');
    expect(stub).toContain('export function getDevSpireWeekResultOverride(): null { return null; }');
    expect(home).toContain('const devWeekResult = getDevSpireWeekResultOverride();');
    expect(home).toContain('(devWeekResult ?? game.weekResult)');
  });
});
