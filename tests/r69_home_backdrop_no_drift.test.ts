// зачем (R69 «шов под статус-баром», Сверка 15.10): на Главной зона под статус-баром #eaebfe (y 0–23) и фон #f3f4fd с y=24, ~9 уровней. Причина: оболочка вкладок сдвигала слой полотна вниз на
// HOME_ENTRANCE.bgDriftPx (9 dp = 24 px на плотности 2,625), верхние 9 dp открывали лежащий под полотном bgPrimary другого тона. Полотно 2.0 статично — сдвиг игнорируется.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('R69: Главная — слой полотна не сдвигается вниз', () => {
  it('ScreenGradient игнорирует staticParallaxY при полотне 2.0', () => {
    const grad = read('components/ScreenGradient.tsx');
    expect(grad).toContain('const V2_BACKDROP_ENABLED = true;');
    expect(grad).toContain('const staticY = V2_BACKDROP_ENABLED ? undefined : staticParallaxY;');
    expect(grad).not.toContain('const staticY = staticParallaxY;');
  });

  it('причина шва — число: 9 dp дрейфа × 2,625 = 24 px, ровно граница шва на кадре Сверки', () => {
    expect(read('constants/motion.ts')).toContain('bgDriftPx: 9,');
    expect(Math.round(9 * 2.625)).toBe(24);
    expect(read('app/(tabs)/_layout.tsx')).toContain('const scaffoldStaticParallaxY = visualIdx === 0 ? HOME_ENTRANCE.bgDriftPx : undefined;');
  });
});
