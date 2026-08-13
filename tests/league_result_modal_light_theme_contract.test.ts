// ════════════════════════════════════════════════════════════════════════════
//  Контракт: модалка «Итоги недели» читается на СВЕТЛОЙ теме.
//
//  Репорт владельца 13.08.2026 (скриншоты на sagePorcelain): вся палитра
//  модалки подбиралась под тёмный фон. На светлой теме зелёный «повышен»
//  давал контраст 2.2:1, серебро подиума — 1.6:1, белая надпись на светло-
//  зелёной кнопке — 2.4:1, а «геройский» блок оставался чёрной плитой посреди
//  белой карточки.
//
//  Здесь фиксируем два уровня защиты:
//   1. Помощник readableOn действительно доводит цвет до WCAG AA и НЕ трогает
//      цвета на тёмном фоне (иначе тёмная тема поедет вслед за светлой).
//   2. Реальные пары «цвет ↔ фон» модалки на палитре sagePorcelain проходят AA.
// ════════════════════════════════════════════════════════════════════════════

import {
  buttonForegroundForBackground,
  colorContrast,
  isLightSurface,
  readableOn,
} from '../constants/color_contrast';
import { SAGE_PORCELAIN, DARK } from '../constants/theme';

/** Цвет с альфой поверх фона — так считаются подложки чипов и моей строки. */
const over = (color: string, alphaHex: string, background: string): string => {
  const alpha = Number.parseInt(alphaHex, 16) / 255;
  const parse = (value: string): number[] => {
    const hex = value.replace(/^#/, '');
    return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  };
  const fg = parse(color);
  const bg = parse(background);
  const channel = (index: number): string => Math.round(fg[index] * alpha + bg[index] * (1 - alpha))
    .toString(16)
    .padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
};

/** Правило модалки: опорный фон — тело карточки, запас 6:1 (см. ink() там же). */
const ink = (color: string): string => readableOn(color, SAGE_PORCELAIN.bgPrimary, 6);

const AA = 4.5;
const AA_LARGE = 3;

// Цвета лиг из league_engine (CLUBS[*].color) и палитры исходов модалки.
const LEAGUE_COLORS = [
  '#7B9BB5', '#5BA88B', '#4A90A4', '#7BA84A', '#C8A84A', '#CD7F32', '#4A90D9',
];
const OUTCOME_COLORS = ['#34C759', '#FF453A'];
const PODIUM_COLORS = ['#FFD24A', '#C7CCD1', '#E0915C'];

describe('readableOn', () => {
  it('поднимает контраст до заданного минимума на светлом фоне', () => {
    const raised = readableOn('#34C759', '#FCFDF9', AA);
    expect(colorContrast('#34C759', '#FCFDF9')).toBeLessThan(AA);
    expect(colorContrast(raised, '#FCFDF9')).toBeGreaterThanOrEqual(AA);
  });

  it('не трогает цвет, которому контраста и так хватает', () => {
    // На тёмной карточке тот же зелёный даёт 8:1 — менять нечего.
    expect(readableOn('#34C759', DARK.bgCard, AA)).toBe('#34C759');
  });

  it('на тёмном фоне осветляет, а не затемняет', () => {
    const raised = readableOn('#1A3A22', DARK.bgCard, AA);
    expect(colorContrast(raised, DARK.bgCard)).toBeGreaterThanOrEqual(AA);
  });

  it('возвращает исходное значение для неразбираемого цвета', () => {
    expect(readableOn('not-a-color', '#FFFFFF', AA)).toBe('not-a-color');
    expect(readableOn('#34C759', 'rgba(0,0,0,0.5)', AA)).toBe('#34C759');
  });
});

describe('isLightSurface', () => {
  it('различает светлые и тёмные поверхности приложения', () => {
    expect(isLightSurface(SAGE_PORCELAIN.bgCard)).toBe(true);
    // businessLight не входит в isLightThemeMode, но по яркости он светлый —
    // именно поэтому модалка смотрит на цвет, а не на имя темы.
    expect(isLightSurface('#FFFFFF')).toBe(true);
    expect(isLightSurface(DARK.bgCard)).toBe(false);
    expect(isLightSurface(DARK.bgPrimary)).toBe(false);
  });
});

describe('палитра модалки на светлой теме', () => {
  const body = SAGE_PORCELAIN.bgPrimary;

  it.each([...OUTCOME_COLORS, ...LEAGUE_COLORS])(
    'цвет %s читается на теле карточки, на чипе исхода и в моей строке',
    (raw) => {
      const primary = ink(raw);
      // Крупное число «Твоё место».
      expect(colorContrast(primary, body)).toBeGreaterThanOrEqual(AA_LARGE);
      // Текст чипа на подложке из этого же цвета (альфа 1A).
      expect(colorContrast(primary, over(primary, '1A', SAGE_PORCELAIN.bgCard)))
        .toBeGreaterThanOrEqual(AA);
      // Очки в моей подсвеченной строке.
      expect(colorContrast(primary, over(primary, '1A', body))).toBeGreaterThanOrEqual(AA);
      // Подпись бонуса лиги поверх полосы того же цвета.
      expect(colorContrast(SAGE_PORCELAIN.textMuted, over(primary, '0F', body)))
        .toBeGreaterThanOrEqual(AA);
    },
  );

  it.each(PODIUM_COLORS)('металл подиума %s читается как текст', (metal) => {
    expect(colorContrast(readableOn(metal, body, AA), body)).toBeGreaterThanOrEqual(AA);
  });

  it.each(PODIUM_COLORS)('колонна подиума %s заметна на карточке', (metal) => {
    const bar = readableOn(metal, '#FFFFFF', 2.2);
    expect(colorContrast(bar, body)).toBeGreaterThan(1.4);
    // Цифра места внутри колонны.
    expect(colorContrast('#000000', bar)).toBeGreaterThanOrEqual(AA_LARGE);
  });

  it.each([...OUTCOME_COLORS, ...LEAGUE_COLORS])(
    'надпись на кнопке читается на заливке из %s',
    (raw) => {
      const fill = readableOn(raw, '#FFFFFF', AA);
      const label = buttonForegroundForBackground(fill);
      expect(colorContrast(label, fill)).toBeGreaterThanOrEqual(AA);
      // Нижняя точка градиента кнопки — темнее, значит контраст только растёт.
      expect(colorContrast(label, readableOn(fill, '#FFFFFF', 6.5))).toBeGreaterThanOrEqual(AA);
    },
  );

  it('золото темы дотянуто до AA для очков топ-3', () => {
    expect(colorContrast(readableOn(SAGE_PORCELAIN.gold, body, AA), body)).toBeGreaterThanOrEqual(AA);
  });
});

describe('золотые ники Plus/VIP', () => {
  // Репорт владельца: «золотые ники не видно на белом фоне».
  const {
    memberNameStatusStyle,
    PREMIUM_MEMBER_NAME_GOLD,
    PREMIUM_MEMBER_NAME_GOLD_LIGHT_CARD,
  } = require('../components/premiumMemberStyles');

  const body = SAGE_PORCELAIN.bgPrimary;
  // Самые тёмные подложки, на которых может оказаться ник в модалке:
  // подсвеченная «моя строка» = цвет исхода с альфой поверх тела карточки.
  const TINTED_ROWS = ['#c8d3c6', '#d4cec5', '#cad3cf'];

  it('на светлой карточке ник читается, а не тонет', () => {
    expect(colorContrast(PREMIUM_MEMBER_NAME_GOLD, body)).toBeLessThan(2);

    const style = memberNameStatusStyle(
      { fontSize: 14 },
      { isPremium: true, themeMode: 'sagePorcelain', surface: body },
    );
    expect(colorContrast(String(style.color), body)).toBeGreaterThanOrEqual(AA);
  });

  it.each(TINTED_ROWS)('ник держит AA и на подсвеченной строке %s', (rowBackground) => {
    const style = memberNameStatusStyle(
      { fontSize: 14 },
      { isPremium: true, themeMode: 'sagePorcelain', surface: body },
    );
    expect(colorContrast(String(style.color), rowBackground)).toBeGreaterThanOrEqual(AA);
  });

  it('остаётся золотом, а не серым: тон тёплый и насыщенный', () => {
    const hex = PREMIUM_MEMBER_NAME_GOLD_LIGHT_CARD.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    // Насыщенность (max-min)/max — у серого она около нуля.
    expect((r - b) / r).toBeGreaterThan(0.6);
  });

  it('на тёмной теме ник остаётся прежним лимонным золотом', () => {
    const style = memberNameStatusStyle(
      { fontSize: 14 },
      { isPremium: true, themeMode: 'dark', surface: DARK.bgPrimary },
    );
    expect(style.color).toBe(PREMIUM_MEMBER_NAME_GOLD);
    expect(style.textShadowRadius).toBe(5);
  });

  it('VIP получает то же оформление, что и Plus', () => {
    const plus = memberNameStatusStyle({}, { isPremium: true, surface: body });
    const vip = memberNameStatusStyle({}, { isVip: true, surface: body });
    expect(vip.color).toBe(plus.color);
  });

  it('обычный участник остаётся с базовым стилем', () => {
    const base = { fontSize: 14, color: SAGE_PORCELAIN.textPrimary };
    expect(memberNameStatusStyle(base, { surface: body })).toBe(base);
  });
});

describe('исходник модалки', () => {
  const source: string = require('node:fs')
    .readFileSync(require('node:path').join(__dirname, '..', 'app', 'LeagueResultModal.tsx'), 'utf8');

  it('определяет светлую тему по яркости поверхности, а не по имени темы', () => {
    expect(source).toContain('isLightSurface(t.bgCard)');
  });

  it('не оставляет подложек «белым по прозрачному» без светлой ветки', () => {
    // Каждая такая подложка обязана иметь пару через onLight.
    expect(source).toContain("onLight ? 'rgba(23,32,29,0.55)' : 'rgba(0,0,0,0.86)'");
    expect(source).toContain("onLight ? 'rgba(23,32,29,0.08)' : 'rgba(255,255,255,0.06)'");
    expect(source).toContain("onLight ? 'rgba(23,32,29,0.06)' : 'rgba(0,0,0,0.32)'");
    expect(source).toContain("onLight ? t.bgSurface : 'rgba(255,255,255,0.04)'");
  });

  it('красит надпись кнопки от реальной заливки, а не «всегда белым»', () => {
    expect(source).toContain('buttonForegroundForBackground(ctaFill)');
    expect(source).toContain('color: ctaTextColor');
  });

  it('красит хало вокруг иконки клуба цветом исхода, а не золотом', () => {
    // Репорт владельца: при повышении крутился жёлтый диск — на светлой
    // карточке 1.2:1, то есть его не видно. Повышение в приложении зелёное.
    expect(source).toContain('const haloColor = ink(basePalette.primary, 3)');
    expect(source).toContain('color={haloColor}');
    expect(source).not.toContain('<ClubHalo active={visible} color={palette.glow}');
  });

  it('хало заметно на светлом фоне для каждого исхода', () => {
    const halo = (raw: string): string => readableOn(raw, SAGE_PORCELAIN.bgPrimary, AA_LARGE);
    // Жёлтый на светлом «геройском» фоне — исходная поломка.
    expect(colorContrast('#FFD24A', '#E2F2E7')).toBeLessThan(1.5);
    expect(colorContrast(halo('#34C759'), '#E2F2E7')).toBeGreaterThanOrEqual(AA_LARGE);
    expect(colorContrast(halo('#FF453A'), '#FAE4E3')).toBeGreaterThanOrEqual(AA_LARGE);
    for (const league of LEAGUE_COLORS) {
      expect(colorContrast(halo(league), SAGE_PORCELAIN.bgCard)).toBeGreaterThanOrEqual(AA_LARGE);
    }
  });

  it('сообщает стилю ника, на какой поверхности он лежит', () => {
    // Без surface помощник падает на определение по имени темы, а оно
    // не знает про businessLight — ник там снова стал бы нечитаемым.
    expect(source.match(/surface: t\.bgPrimary/g)).toHaveLength(2);
  });

  it('оставляет тёмную тему без изменений', () => {
    // Опорные значения тёмной ветки должны сохраниться дословно.
    expect(source).toContain("['#0F2818', '#0A1F12', '#06140A']");
    expect(source).toContain("['#2A0E0C', '#1A0907', '#100404']");
    expect(source).toContain("['#34C759', '#1FA34A']");
  });
});
