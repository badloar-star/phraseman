/**
 * Координатор 25.10 (замер Тем 8bd8aea17): текст сцены Главной обязан читаться — непрозрачная часть героя не пересекает текст
 * ни на ×1,0, ни на ×1,15, ни на ×1,3; герой плавно гаснет к 0 у верха текста; если маска съела бы героя — heroBounded.
 */
import * as fs from 'fs';
import * as path from 'path';

import { HOME_SCENE_HERO_FADE, HOME_SCENE_HERO_MIN_VISIBLE, homeSceneHeroFade } from '../components/home/v2/scene/home_scene_hero_fade';

const HERO = 160;
const HERO_TOP = -8; // HERO_TOP − TOP_SPACE в HomeSceneStage

/** Видимость героя (0..1) на высоте y (координаты героя), как рисует маска. */
function alphaAt(f: ReturnType<typeof homeSceneHeroFade>, y: number): number {
  if (!f.masked) return 1;
  const t = y / HERO;
  if (t <= f.fadeFrom) return 1;
  if (t >= f.fadeTo) return 0;
  return 1 - (t - f.fadeFrom) / (f.fadeTo - f.fadeFrom);
}

describe('герой сцены Главной не ложится под текст', () => {
  // место под героя (высота слота до текста) на 390 × 844: обычный шрифт, ×1,15 (длинный заголовок), крайний случай
  for (const [label, spaceH, fontScale] of [['×1,0', 150, 1], ['×1,15', 128, 1.15], ['×1,3', 96, 1.3], ['узко ×1,0', 100, 1]] as const) {
    it(`${label}: под текстом героя нет`, () => {
      const f = homeSceneHeroFade({ heroTop: HERO_TOP, spaceH, heroH: HERO, fontBounded: fontScale > 1.15 });
      const textTop = spaceH - HERO_TOP;
      if (f.bounded) return; // герой в свободном месте над текстом — пересечения нет по раскладке
      for (let y = Math.ceil(textTop); y < HERO; y += 1) expect(alphaAt(f, y)).toBe(0);
      if (f.masked) {
        expect(f.fadeTo * HERO).toBeCloseTo(textTop, 5);
        expect(f.fadeFrom * HERO).toBeCloseTo(textTop - HOME_SCENE_HERO_FADE, 5);
      }
    });
  }

  it('крупный шрифт и «маска съела бы героя» — heroBounded', () => {
    expect(homeSceneHeroFade({ heroTop: HERO_TOP, spaceH: 140, heroH: HERO, fontBounded: true }).bounded).toBe(true);
    const tooLow = homeSceneHeroFade({ heroTop: HERO_TOP, spaceH: 60, heroH: HERO, fontBounded: false });
    expect(tooLow.bounded).toBe(true);
    expect(tooLow.why).toMatch(/^mask_would_eat/);
    const ok = homeSceneHeroFade({ heroTop: HERO_TOP, spaceH: 150, heroH: HERO, fontBounded: false });
    expect(ok.masked).toBe(true);
    expect(ok.fadeFrom).toBeGreaterThanOrEqual(HOME_SCENE_HERO_MIN_VISIBLE);
  });

  it('героя без перекрытия не трогаем', () => {
    expect(homeSceneHeroFade({ heroTop: HERO_TOP, spaceH: 200, heroH: HERO, fontBounded: false })).toMatchObject({ masked: false, bounded: false });
  });

  it('сцена: маска на герое и правило «поверх текста допустимо» снято', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'components/home/v2/scene/HomeSceneStage.tsx'), 'utf8');
    expect(src).toContain('homeSceneHeroFade({ heroTop: HERO_TOP - TOP_SPACE, spaceH: heroSpaceH, heroH: HERO');
    expect(src).toContain('<MaskedView');
    expect(src).not.toContain('поверх текста допустимо');
    expect(src).toContain('под текстом герой ≤ 16 % в светлом и ≤ 9 % в тёмном');
  });
});
