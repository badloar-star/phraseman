// Координатор 26.10, аудит скорости Моментов №13 и №12. №13: «Последний шанс» — секундный отсчёт живёт в листьях (часы шапки и строка тела),
// сама шторка раз в секунду не перерисовывается. №12: окно повышения — без пустой перерисовки на метке мерцания, замер строки — стабильный обработчик.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Моменты: перерисовка только там, где меняется число', () => {
  it('«Последний шанс»: интервал один — в useLiveNow; часы и тело — листья memo; в теле шторки «сейчас» нет', () => {
    const sheet = read('components/spire/moments/SpireLastChanceSheet.tsx');
    expect((sheet.match(/setInterval\(/g) ?? []).length).toBe(1);
    expect(sheet).toContain('function useLiveNow(active: boolean): number {');
    expect(sheet).toContain('const LastChanceClock = memo(function LastChanceClock(');
    expect(sheet).toContain('const LastChanceBody = memo(function LastChanceBody(');
    const main = sheet.slice(sheet.indexOf('function SpireLastChanceSheet('));
    // в журнале показа остаётся Date.now() — запрещено только своё состояние «сейчас» и расчёт от него
    expect(main).not.toContain('setNow');
    expect(main).not.toMatch(/- now\b/);
    expect(main).toContain('const live = visible && runtimeActive;');
    expect(main).toContain('<LastChanceClock weekEndsAtMs={weekEndsAtMs} active={live}');
    expect(main).toContain('<LastChanceBody lang={lang} energyReadyAtMs={energyReadyAtMs}');
  });

  it('повышение: нет пустого setPhase({...v}); замер первой строки — useCallback', () => {
    const promo = read('components/spire/moments/MomentPromotion.tsx');
    expect(promo).not.toMatch(/setPhase\(\(v\) => \(\{ \.\.\.v \}\)\)/);
    expect(promo).toContain('const onFirstRowLayout = useCallback((e: LayoutChangeEvent) => setRowH(Math.round(e.nativeEvent.layout.height)), []);');
    expect(promo).toContain('onFirstLayout={i === 0 ? onFirstRowLayout : undefined}');
  });
});
