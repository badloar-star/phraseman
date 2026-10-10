import fs from 'fs';
import path from 'path';

import { KIT_MOTION } from '../constants/motionHybrid';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

// зачем (координатор 11.10, гейт «приложение = макет»): нажатие кита (kit.css:64–65 `.t` / `.t.down`) — 90 мс вдавливание до .97 с
// затемнением .86 и возврат 240 мс cubic-bezier(.3,1.4,.5,1). Числа живут в одном месте — constants/kitPress.ts (из KIT_MOTION);
// пять общих обёрток обязаны брать их оттуда, а не заводить свою пружину. Source-pin на импорт и на отсутствие spring в нажатии.
describe('kit press numbers', () => {
  test('KIT_MOTION holds the kit.css numbers', () => {
    expect(KIT_MOTION.pressDownMs).toBe(90);
    expect(KIT_MOTION.pressScale).toBe(0.97);
    expect(KIT_MOTION.pressOpacity).toBe(0.86);
    expect(KIT_MOTION.pressMs).toBe(240);
    expect([...KIT_MOTION.pressEase]).toEqual([0.3, 1.4, 0.5, 1]);
  });

  test('constants/kitPress.ts builds every press config from KIT_MOTION', () => {
    const src = read('constants', 'kitPress.ts');
    for (const needle of ['KIT_MOTION.pressDownMs', 'KIT_MOTION.pressMs', 'KIT_MOTION.pressEase', 'KIT_MOTION.pressOpacity', 'KIT_MOTION.pressScale']) {
      expect(src).toContain(needle);
    }
    expect(src).not.toMatch(/withSpring|Animated\.spring/);
  });

  test.each([
    ['components', 'KitTouchable.tsx'],
    ['components', 'TapScale.tsx'],
    ['components', 'PressableScale.tsx'],
    ['components', 'PressableHybrid.tsx'],
    ['components', 'v2/V2Pressable.tsx'],
  ])('%s/%s takes the press numbers from constants/kitPress and has no own spring', (dir, file) => {
    const src = read(dir, ...file.split('/'));
    expect(src).toMatch(/from '(\.\.\/)+constants\/kitPress'|from '\.\.\/constants\/kitPress'/);
    expect(src).toContain('KIT_PRESS_DOWN');
    expect(src).toContain('KIT_PRESS_UP');
    expect(src).toContain('KIT_PRESS_OPACITY_DOWN');
    expect(src).toContain('KIT_PRESS_OPACITY_UP');
    // нажатие не пружинит: ни Animated.spring, ни withSpring в обёртке (перелёт даёт сама кривая кита)
    expect(src).not.toMatch(/Animated\.spring|withSpring/);
    // масштаб по умолчанию — константа кита, а не свой литерал
    expect(src).toContain('KIT_PRESS_SCALE');
  });

  test('the default press scale is the kit constant, not a literal', () => {
    expect(read('components', 'v2', 'V2Pressable.tsx')).toContain('scaleTo = KIT_PRESS_SCALE');
    expect(read('components', 'TapScale.tsx')).toContain('scaleTo = KIT_PRESS_SCALE');
    expect(read('components', 'PressableHybrid.tsx')).toContain('pressScaleTo ?? KIT_PRESS_SCALE');
    expect(read('components', 'PressableScale.tsx')).toContain('KIT_PRESS_SCALE');
  });
});
