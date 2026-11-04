// зачем (дизайн-аудит ночных новинок 05.11): рельса сужается при крупном шрифте, затемнение шторки — токен кита, строки топа компактные.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const num = (src: string, name: string): number => Number((src.match(new RegExp('export const ' + name + ' = (\\d+);')) ?? [])[1]);

describe('аудит экрана Пика B', () => {
  it('рельса башни уже при крупном шрифте и узком экране', () => {
    const screen = read('components/spire/peak/PeakScreenV2.tsx');
    expect(num(screen, 'PEAK_RAIL_WIDTH_NARROW')).toBeLessThan(num(screen, 'PEAK_RAIL_WIDTH'));
    expect(screen).toContain('fontScale > 1.15 || width < 360 ? PEAK_RAIL_WIDTH_NARROW : PEAK_RAIL_WIDTH');
    expect(num(screen, 'PEAK_ROW_COIN_SIZE')).toBeLessThanOrEqual(36);
  });

  it('затемнение шторки рекорда — токен кита, без литерала непрозрачности', () => {
    const sheet = read('components/spire/peak/PeakStepSheet.tsx');
    expect(sheet).toContain('KIT_MOTION.dimOpacity');
    expect(sheet).not.toMatch(/rgba\(0,0,0,0\.\d+\)/);
  });
});
