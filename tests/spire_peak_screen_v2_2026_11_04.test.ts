// зачем (владелец 04.11, вариант B «Рельса»): новый экран Пика за флагом (по умолчанию выключен), без обводок, текст ≥15, тап-цели ≥44, башня прежняя.
import fs from 'node:fs';
import path from 'node:path';

import { PEAK_SCREEN_V2_ENABLED } from '../components/spire/peak/peak_screen_flag';
import { peakMaxStep } from '../components/spire/peak/peak_text';

const root = path.join(__dirname, '..');
const dir = path.join(root, 'components/spire/peak');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const peakFiles = fs.readdirSync(dir).filter((n) => n.endsWith('.tsx'));

describe('экран Пика, вариант B', () => {
  it('флаг выключен по умолчанию, старый экран остаётся', () => {
    expect(PEAK_SCREEN_V2_ENABLED).toBe(false);
    const home = read('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('PEAK_SCREEN_V2_ENABLED ? <PeakScreenSlot');
    // зачем (Ревизор 04.11): экран B подгружается лениво, статического импорта в SpireHomeScreen нет
    expect(home).not.toMatch(/import PeakScreenV2 from/);
    expect(fs.readFileSync(path.join(root, 'components/spire/peak/PeakScreenSlot.tsx'), 'utf8')).toContain("require('./PeakScreenV2')");
    expect(home).toContain('scene || PEAK_SCREEN_V2_ENABLED ? null');
  });

  it('башня — прежний SpireTower, не перерисована', () => {
    const screen = read('components/spire/peak/PeakScreenV2.tsx');
    expect(screen).toContain("import SpireTower from '../SpireTower'");
    expect(screen).not.toMatch(/<Svg[\s>]/);
  });

  it('в каркасе нет обводок и сжатия шрифта, текст не мельче 15', () => {
    for (const name of peakFiles) {
      const src = read('components/spire/peak/' + name);
      expect(src).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit/);
      for (const m of src.matchAll(/fontSize:\s*(\d+)/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(15);
    }
  });

  it('тап-цели не меньше 44 dp: этаж, стрелки, плашки ступеней, кнопка «Все участники»', () => {
    const screen = read('components/spire/peak/PeakScreenV2.tsx');
    expect(screen).toContain('minHeight: PEAK_TAP_TARGET');
    expect(screen).toMatch(/all: \{ minHeight: 56/);
    expect(read('components/spire/peak/PeakStepChips.tsx')).toContain('width: PEAK_TAP_TARGET, height: PEAK_TAP_TARGET');
  });

  it('число ступеней на этаже совпадает со схемой адресов рекордов', () => {
    expect(peakMaxStep(1)).toBe(5);
    expect(peakMaxStep(5)).toBe(9);
    expect(peakMaxStep(6)).toBe(10);
    expect(peakMaxStep(15)).toBe(10);
  });

  it('dev-вход ?state=peak_screen есть и только в dev', () => {
    const dev = read('app/dev_spire_preview.tsx');
    expect(dev).toContain("__DEV__ && params.state === 'peak_screen'");
  });
});
