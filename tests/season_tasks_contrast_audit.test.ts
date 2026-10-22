// зачем (координатор 22.10: «проверь контраст и тона в СВЕТЛОЙ теме на новых экранах — Сезон 46 %, задания №23; аудит как scene-contrast-audit, промахи чини токенами»):
// сторож читаемости. Сезон: белый текст на обложках глав по всем урокам × главам, обе темы; задания №23: пары токенов светлой темы по всем 23 темам × 3 уровням цвета.
// Нормы: обычный текст ≥ 4,5:1, графика/индикаторы ≥ 3:1.
import { readSource } from './helpers/read_source';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { seasonArt, seasonChapterHue } from '../components/learning-v2/season/season_art';

const TEXT = 4.5;
const GRAPHIC = 3;
const WHITE = '#FFFFFF';

const hexToRgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: readonly number[]): string => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const over = (fg: string, alpha: number, bg: string): string => {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  return toHex(f.map((v, i) => v * alpha + b[i]! * (1 - alpha)));
};
const six = (c: string): string => c.slice(0, 7);

describe('Сезон: белый текст на обложках глав (аудит 22.10)', () => {
  const view = readSource('components/learning-v2/season/SeasonCourseView.tsx');

  it('светлая тема: HUD шапки на плите цвета карточки темы (энергия и баланс красятся под светлый фон)', () => {
    expect(view).toContain('testID="season-hud-plate"');
    expect(view).toContain('backgroundColor: g.opaqueCard');
    // текст и акцент темы на плите карточки ≥ 4,5 — те же пары, что в аудите заданий ниже (текст, акцент-текст, вторичный на карточке)
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const level of ['calm', 'accent', 'max'] as const) {
        const g = liquidGlassTokens(id, { level, appearance: 'light' } as never);
        expect(contrastRatio(g.text, g.opaqueCard)).toBeGreaterThanOrEqual(TEXT);
        expect(contrastRatio(g.accentText, g.opaqueCard)).toBeGreaterThanOrEqual(TEXT);
      }
    }
  });

  it('светлая тема: пилюля «Урок N» — тёмное стекло, белый текст ≥ 4,5 на всех оттенках глав', () => {
    expect(view).toMatch(/PILL_ON_LIGHT = 'rgba\(0,0,0,0\.18\)'/);
    let min = 99;
    for (let lesson = 1; lesson <= 32; lesson += 1) {
      for (let chapter = 1; chapter <= 7; chapter += 1) {
        const art = seasonArt(seasonChapterHue(lesson, chapter), 0, 'light');
        min = Math.min(min, contrastRatio(WHITE, over('#000000', 0.18, art.from)));
      }
    }
    expect(min).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(['light', 'dark'] as const)('%s: заголовок, подпись и чипы на низе обложки ≥ 4,5, карты эпизодов ≥ 4,5', (theme) => {
    let minBottom = 99;
    let minCard = 99;
    let minPillDark = 99;
    for (let lesson = 1; lesson <= 32; lesson += 1) {
      for (let chapter = 1; chapter <= 7; chapter += 1) {
        for (const shift of [0, 4, 8, 12, 16, 20, 24, 28]) {
          const art = seasonArt(seasonChapterHue(lesson, chapter), shift, theme);
          minCard = Math.min(minCard, contrastRatio(WHITE, art.from), contrastRatio(WHITE, over(art.to, 0.5, art.from)));
          if (shift === 0) {
            const bottom = over('#000000', 0.36, art.to);
            minBottom = Math.min(minBottom, contrastRatio(WHITE, bottom), contrastRatio(over(WHITE, 0.86, bottom), bottom), contrastRatio(WHITE, over(WHITE, 0.16, bottom)));
            if (theme === 'dark') minPillDark = Math.min(minPillDark, contrastRatio(WHITE, over(WHITE, 0.16, art.from)));
          }
        }
      }
    }
    expect(minBottom).toBeGreaterThanOrEqual(TEXT);
    expect(minCard).toBeGreaterThanOrEqual(TEXT);
    if (theme === 'dark') expect(minPillDark).toBeGreaterThanOrEqual(TEXT);
  });
});

describe('Задания №23: пары токенов (светлая и тёмная, все 23 темы × калм/акцент/максимум)', () => {
  const rows: { pair: string; ratio: number; need: number; tag: string }[] = [];
  for (const appearance of ['light', 'dark'] as const) for (const id of LIQUID_GLASS_THEME_IDS) {
    for (const level of ['calm', 'accent', 'max'] as const) {
      const g = liquidGlassTokens(id, { level, appearance } as never);
      const card = g.opaqueCard;
      // --amber эталона экзамена (lv2TaskAmber): светлый rgba(190,118,28,.12), тёмный rgba(230,160,60,.14)
      const amber = appearance === 'light' ? { hex: '#BE761C', alpha: 0.12 } : { hex: '#E6A03C', alpha: 0.14 };
      const tag = `${appearance}/${id}/${level}`;
      const push = (pair: string, ratio: number, need: number): void => { rows.push({ pair, ratio, need, tag }); };
      push('текст на карточке', contrastRatio(g.text, card), TEXT);
      push('вторичный на карточке', contrastRatio(g.secondary, card), TEXT);
      push('вторичный на фоне экрана', contrastRatio(g.secondary, g.bg), TEXT);
      push('вторичный на чипе/таймере', contrastRatio(g.secondary, g.opaqueControl), TEXT);
      push('текст на чипе', contrastRatio(g.text, g.opaqueControl), TEXT);
      push('«верно» на карточке', contrastRatio(g.good, card), TEXT);
      push('«верно» на плитке goodSoft', contrastRatio(g.good, over(six(g.good), 0.12, card)), TEXT);
      push('текст на выбранной плитке (акцент 14 %)', contrastRatio(g.text, over(six(g.accent), 0.14, card)), TEXT);
      push('вторичный на «ситуации» (акцент 9 %)', contrastRatio(g.secondary, over(six(g.accent), 0.09, card)), TEXT);
      push('текст на неверной (amber)', contrastRatio(g.text, over(amber.hex, amber.alpha, card)), TEXT);
      push('вторичный на неверной (amber)', contrastRatio(g.secondary, over(amber.hex, amber.alpha, card)), TEXT);
      push('кнопка: ctaInk на cta', contrastRatio(g.ctaInk, g.cta), TEXT);
      push('прогресс: акцент-график на дорожке', contrastRatio(g.accentGraphic, over(g.text, 0.16, g.bg)), GRAPHIC);
      push('прогресс: акцент-график на фоне', contrastRatio(g.accentGraphic, g.bg), GRAPHIC);
      push('акцент-текст на карточке', contrastRatio(g.accentText, card), TEXT);
    }
  }

  it('ни одна пара не ниже нормы', () => {
    const misses = rows.filter((r) => r.ratio < r.need).map((r) => `${r.tag} · ${r.pair}: ${r.ratio.toFixed(2)} < ${r.need}`);
    expect(misses).toEqual([]);
  });
});
