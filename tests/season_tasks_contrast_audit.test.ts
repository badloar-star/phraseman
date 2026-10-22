// зачем (координатор 22.10: «проверь контраст и тона в СВЕТЛОЙ теме на новых экранах — Сезон 46 %, задания №23; аудит как scene-contrast-audit, промахи чини токенами»):
// сторож читаемости. Сезон: белый текст на обложках глав по всем урокам × главам, обе темы; задания №23: пары токенов светлой темы по всем 23 темам × 3 уровням цвета.
// Нормы: обычный текст ≥ 4,5:1, графика/индикаторы ≥ 3:1.
import { readSource } from './helpers/read_source';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { seasonArt, seasonChapterHue } from '../components/learning-v2/season/season_art';
import { paywallPlateBg, paywallSheetBg } from '../components/paywall/paywall_surfaces';
import { buildOnboardingPalette } from '../components/onboarding_palette';

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

describe('Диалоги: панель, чипы тем и карточки (светлая и тёмная, 23 темы × 3 уровня; аудит 22.10)', () => {
  const overA = (fg8: string, bg: string, forceAlpha?: number): string => {
    const a = forceAlpha ?? (fg8.length >= 9 ? parseInt(fg8.slice(7, 9), 16) / 255 : 1);
    return over(fg8.slice(0, 7), a, bg);
  };
  const rows: { pair: string; ratio: number; need: number; tag: string }[] = [];
  for (const appearance of ['light', 'dark'] as const) {
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const level of ['calm', 'accent', 'max'] as const) {
        const g = liquidGlassTokens(id, { level, appearance } as never);
        const tag = `${appearance}/${id}/${level}`;
        const push = (pair: string, ratio: number, need: number): void => { rows.push({ pair, ratio, need, tag }); };
        const card = g.opaqueCard;
        const ctl = g.opaqueControl;
        push('панель: заголовок', contrastRatio(g.text, card), TEXT);
        push('панель: счётчик', contrastRatio(g.secondary, card), TEXT);
        push('чип выбранный: ctaInk на cta', contrastRatio(g.ctaInk, g.cta), TEXT);
        push('чип обычный: текст', contrastRatio(g.text, ctl), TEXT);
        for (const [name, bg] of [['обычная', ctl], ['текущая', overA(g.accentText, card, 0.16)]] as const) {
          push(`карточка ${name}: название`, contrastRatio(g.text, bg), TEXT);
          push(`карточка ${name}: мир и цели`, contrastRatio(g.secondary, bg), TEXT);
          push(`карточка ${name}: буква аватара`, contrastRatio(g.text, overA(g.selected, bg)), TEXT);
          push(`карточка ${name}: кольцо цели`, contrastRatio(g.accentText, bg), TEXT);
          push(`карточка ${name}: значок замка`, contrastRatio(g.secondary, overA(g.selected, bg)), GRAPHIC);
          push(`карточка ${name}: шеврон`, contrastRatio(g.text, overA(g.selected, bg)), GRAPHIC);
        }
        // галочка «пройдено»: чернила — лучшие из ctaInk темы и белого (как tickInk в DialogCard)
        const tick = Math.max(contrastRatio(g.ctaInk, g.good), contrastRatio(WHITE, g.good));
        push('карточка «пройдена»: галочка на заливке good', tick, GRAPHIC);
      }
    }
  }

  it('в панели «Диалоги» выбор чернил галочки сделан токеном, не голым ctaInk', () => {
    const panel = readSource('components/dialogs/scene/DialogsScenePanel.tsx');
    expect(panel).toContain("const tickInk = contrastRatio(g.ctaInk, g.good) >= contrastRatio('#FFFFFF', g.good) ? g.ctaInk : '#FFFFFF';");
    expect(panel).toContain('color={tickInk}');
  });
  it('ни одна пара не ниже нормы', () => {
    const misses = rows.filter((r) => r.ratio < r.need).map((r) => `${r.tag} · ${r.pair}: ${r.ratio.toFixed(2)} < ${r.need}`);
    expect(misses).toEqual([]);
  });
});

describe('Дуэль друзей: экран, шторка вызова и итог (светлая и тёмная, 23 темы × 3 уровня; аудит 22.10)', () => {
  const rows: { pair: string; ratio: number; need: number; tag: string }[] = [];
  const overA = (fg8: string, bg: string): string => over(fg8.slice(0, 7), fg8.length >= 9 ? parseInt(fg8.slice(7, 9), 16) / 255 : 1, bg);
  for (const appearance of ['light', 'dark'] as const) {
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const level of ['calm', 'accent', 'max'] as const) {
        const g = liquidGlassTokens(id, { level, appearance } as never);
        const tag = `${appearance}/${id}/${level}`;
        const push = (pair: string, ratio: number, need: number): void => { rows.push({ pair, ratio, need, tag }); };
        const sheet = g.opaqueSheet;
        const card = g.opaqueCard;
        const ctl = g.opaqueControl;
        push('шторка: заголовок', contrastRatio(g.text, sheet), TEXT);
        push('шторка: текст', contrastRatio(g.secondary, sheet), TEXT);
        push('таблица итога: шапка', contrastRatio(g.secondary, card), TEXT);
        push('кнопка primary: opaqueCard на text', contrastRatio(card, g.text), TEXT);
        push('кнопка danger: dangerInk на dangerFill', contrastRatio(g.dangerInk, g.dangerFill), TEXT);
        push('кнопка bare: bad на шторке', contrastRatio(g.bad, sheet), TEXT);
        push('кнопка off: secondary на ctl', contrastRatio(g.secondary, ctl), TEXT);
        push('кнопка secondary: text на ctl', contrastRatio(g.text, ctl), TEXT);
        push('полоса «нет сети»: текст на warnSoft', contrastRatio(g.text, overA(g.warnSoft, sheet)), TEXT);
        push('полоса «нет сети»: значок warn', contrastRatio(g.warn, overA(g.warnSoft, sheet)), GRAPHIC);
        push('итог: значок good на goodSoft', contrastRatio(g.good, overA(g.goodSoft, card)), GRAPHIC);
        push('итог: значок warn на warnSoft', contrastRatio(g.warn, overA(g.warnSoft, card)), GRAPHIC);
        push('итог: значок secondary на ctl', contrastRatio(g.secondary, ctl), GRAPHIC);
        push('плейсхолдер ответа: mutedText на фоне', contrastRatio(g.mutedText, g.bg), TEXT);
        push('вердикт: тело secondary на goodSoft', contrastRatio(g.secondary, over(six(g.good), 0.12, card)), TEXT);
      }
    }
  }
  it('ни одна пара не ниже нормы', () => {
    const misses = rows.filter((r) => r.ratio < r.need).map((r) => `${r.tag} · ${r.pair}: ${r.ratio.toFixed(2)} < ${r.need}`);
    expect(misses).toEqual([]);
  });
});

describe('Пейвол Plus: лист, плашки, кнопка (светлая и тёмная, 23 темы × 3 уровня; аудит 22.10)', () => {
  const rows: { pair: string; ratio: number; need: number; tag: string }[] = [];
  for (const appearance of ['light', 'dark'] as const) {
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const level of ['calm', 'accent', 'max'] as const) {
        const g = liquidGlassTokens(id, { level, appearance } as never);
        const tag = `${appearance}/${id}/${level}`;
        const push = (pair: string, ratio: number, need: number): void => { rows.push({ pair, ratio, need, tag }); };
        const sheet = paywallSheetBg(g);
        const plate = paywallPlateBg(g);
        for (const [name, bg] of [['лист', sheet], ['плашка', plate]] as const) {
          push(`пейвол ${name}: заголовок и текст`, contrastRatio(g.text, bg), TEXT);
          push(`пейвол ${name}: secondary`, contrastRatio(g.secondary, bg), TEXT);
          push(`пейвол ${name}: mutedText (мелкий, цены, ссылки)`, contrastRatio(g.mutedText, bg), TEXT);
        }
        push('пейвол: CTA ctaFillInk на ctaFill', contrastRatio(g.ctaFillInk, g.ctaFill), TEXT);
        push('пейвол: CTA (форма) ctaFill к листу', contrastRatio(g.ctaFill, sheet), GRAPHIC);
        push('пейвол: галочка accentInk на accent', contrastRatio(g.accentInk, g.accent), GRAPHIC);
        push('пейвол: кромка выбранного тарифа accentGraphic к листу', contrastRatio(g.accentGraphic, sheet), GRAPHIC);
      }
    }
  }
  it('бейдж скидки: чернила на золоте ≥ 4,5', () => {
    expect(contrastRatio('#3A2700', '#FFD27A')).toBeGreaterThanOrEqual(TEXT);
  });
  it('ни одна пара не ниже нормы', () => {
    const misses = rows.filter((r) => r.ratio < r.need).map((r) => `${r.tag} · ${r.pair}: ${r.ratio.toFixed(2)} < ${r.need}`);
    expect(misses).toEqual([]);
  });
});

describe('Онбординг и приветствие: палитра из токенов темы и экран выбора языка (аудит 22.10)', () => {
  const rows: { pair: string; ratio: number; need: number; tag: string }[] = [];
  for (const appearance of ['light', 'dark'] as const) {
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const level of ['calm', 'accent', 'max'] as const) {
        const g = liquidGlassTokens(id, { level, appearance } as never);
        const p = buildOnboardingPalette(g, `${appearance}/${id}/${level}`);
        const tag = p.key;
        const push = (pair: string, ratio: number, need: number): void => { rows.push({ pair, ratio, need, tag }); };
        for (const [name, bg] of [['фон', p.bg], ['фон сверху', p.bgTop], ['фон снизу', p.bgBottom], ['карточка', p.card], ['плитка', p.soft]] as const) {
          push(`онбординг ${name}: text`, contrastRatio(p.text, bg), TEXT);
          push(`онбординг ${name}: secondary`, contrastRatio(p.secondary, bg), TEXT);
          push(`онбординг ${name}: muted`, contrastRatio(p.muted, bg), TEXT);
        }
        push('онбординг: ctaInk на ctaFill', contrastRatio(p.ctaInk, p.ctaFill), TEXT);
        push('онбординг: ctaFill к фону (форма)', contrastRatio(p.ctaFill, p.bg), GRAPHIC);
        push('онбординг: goodText на карточке', contrastRatio(p.goodText, p.card), TEXT);
        push('онбординг: тело знака markBody к фону', Math.min(contrastRatio(p.markBody, p.bg), contrastRatio(p.markBody, p.bgTop), contrastRatio(p.markBody, p.bgBottom)), GRAPHIC);
      }
    }
  }
  it('палитра онбординга: ни одна пара не ниже нормы', () => {
    const misses = rows.filter((r) => r.ratio < r.need).map((r) => `${r.tag} · ${r.pair}: ${r.ratio.toFixed(2)} < ${r.need}`);
    expect(misses).toEqual([]);
  });

  // экран выбора языка — самостоятельная фиксированная тёмная палитра до выбора темы (app/language_welcome.tsx, theme-exempt)
  it('экран выбора языка: тексты и кнопка на фоне #07111F', () => {
    const bg = '#07111F';
    const card = over('#FFFFFF', 0.06, bg);
    const selected = over('#7B8CFF', 0.16, bg);
    expect(contrastRatio('#F7FAFF', bg)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio('#C6D3FF', bg)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio('#EAF0FF', card)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio('#EAF0FF', selected)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio('#8AB9FF', bg)).toBeGreaterThanOrEqual(TEXT);
    for (const stop of ['#E3ECFF', '#7B8CFF', '#C95CFF']) expect(contrastRatio('#07111F', stop)).toBeGreaterThanOrEqual(TEXT);
    for (const stop of ['#7B8CFF', '#C95CFF']) expect(contrastRatio(stop, bg)).toBeGreaterThanOrEqual(GRAPHIC);
  });
});
