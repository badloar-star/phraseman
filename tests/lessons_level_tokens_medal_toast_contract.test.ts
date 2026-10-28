// зачем (Темы R1_THEMEMODE_LEGACY_MAP, координатор 12.10): ThemeContext всегда отдаёт themeMode='dark', поэтому цвет «по id прежней темы» не следовал теме.
// 1) Карточки уровней A1–B2 списка «Обучение» были зелёными пастелями на любой теме → цвета уровней берутся из токенов темы.
// 2) MedalToast брал строку 'indigo' прежней таблицы → без явного themeMode стиль строится из токенов активной темы.
import fs from 'node:fs';
import path from 'node:path';

import { colorContrast } from '../constants/color_contrast';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { medalToastStyleFromTokens } from '../components/medalToastThemeStylesFromTokens';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const;
// ползунок: спокойно / середина / максимум (карточка урока берёт токены ТЕМНОГО оформления в любом приложении)
const DARK_STEPS = [
  { level: 'calm', appearance: 'dark', intensity: 0 },
  { level: 'accent', appearance: 'dark', intensity: 0.5 },
  { level: 'max', appearance: 'dark', intensity: 1 },
] as const;

const darken = (hex: string, factor: number): string => {
  const ch = (i: number) => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * factor)).toString(16).padStart(2, '0');
  return `#${ch(1)}${ch(3)}${ch(5)}`;
};

describe('списки уроков: цвета уровней A1–B2 из токенов темы', () => {
  const src = read('app/(tabs)/lessons.tsx');

  it('bookPalette берёт чернила уровня из токенов, ступень тона урока только в сторону большего контраста', () => {
    expect(src).toContain('function bookPalette(num: number, themeMode = "indigo", glass?: LevelInkTokens): string {');
    expect(src).toContain('glass[`level${cefrKey(num)}` as "levelA1" | "levelA2" | "levelB1" | "levelB2"]');
    expect(src).toContain('scaleHex(ink, glass.isLight ? Math.min(1, step) : Math.max(1, step))');
  });

  it('экран передаёт токены ТЕМНОГО оформления той же темы и шага ползунка (карточка урока всегда тёмная с белым текстом)', () => {
    // зачем (решение владельца 12.10, п.81 (11)): при светлом оформлении плашка светлая и чернила берутся из токенов светлого оформления; при тёмном — как раньше
    expect(src).toContain('appearance: lightLessonCards ? "light" : "dark", intensity: learnGlass.intensity');
    expect(src).toContain('const lightLessonCards = learnGlass.isLight;');
    // 3 прежних вызова + светлая поверхность плашки (п.81 (11))
    expect(src.match(/bookPalette\(num, themeMode, levelInkGlass\)/g)?.length).toBe(4);
  });

  it('акцент уровня читается на тёмной карточке, а белый текст — на карточке: все темы × 3 шага ползунка', () => {
    const failures: string[] = [];
    let checked = 0;
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const variant of DARK_STEPS) {
        const tokens = liquidGlassTokens(id, variant);
        for (const level of LEVELS) {
          const ink = tokens[`level${level}` as 'levelA1'];
          // ступени тона урока 1…1,06 только светлее, card — три слоя градиента darken(0.52/0.42/0.38)
          for (const factor of [1, 1.06]) {
            const accent = darken(ink, factor);
            for (const cardFactor of [0.52, 0.42, 0.38]) {
              const card = darken(ink, cardFactor);
              checked += 2;
              if (colorContrast(accent, card) < 3) failures.push(`${id}/${variant.level}/${level} акцент ${accent} на ${card}`);
              if (colorContrast('#FFFFFF', card) < 4.5) failures.push(`${id}/${variant.level}/${level} белый текст на ${card}`);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
    expect(failures).toEqual([]);
  });
});

describe('MedalToast: стиль из токенов активной темы', () => {
  it('стиль тоста всегда из токенов активной темы (таблица по режиму и проп themeMode сняты 28.10)', () => {
    const src = read('components/MedalToast.tsx');
    expect(src).toContain("import { medalToastStyleFromTokens } from './medalToastThemeStylesFromTokens';");
    expect(src).toContain('const visualTheme = medalToastStyleFromTokens(glassTokens);');
    expect(src).not.toContain('getMedalToastThemeStyle');
    expect(src).not.toContain('themeMode');
  });

  it('читаемость: заголовок и подзаголовок на плашке тоста во всех темах и оттенках, тёмных и светлых', () => {
    const failures: string[] = [];
    let checked = 0;
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const [level, intensity] of [['calm', 0], ['accent', 0.5], ['max', 1]] as const) {
          const tokens = liquidGlassTokens(id, { level, appearance, intensity });
          const style = medalToastStyleFromTokens(tokens);
          for (const stop of style.cardBgColors) {
            checked += 2;
            if (colorContrast(style.titleColor, stop) < 4.5) failures.push(`${id}/${appearance}/${level} заголовок на ${stop}`);
            if (colorContrast(style.subtitleColor, stop) < 4.5) failures.push(`${id}/${appearance}/${level} подзаголовок на ${stop}`);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(failures).toEqual([]);
  });
});

describe('плашка урока: светлая ветка подключена по токенам, а не по названию темы', () => {
  const src = read('app/(tabs)/lessons.tsx');
  it('экран строит светлую поверхность из токенов только при светлом оформлении и странице курса; тексты и подложка закрытой плашки — из неё', () => {
    expect(src).toContain('const lightSurface = lightLessonCards && page === "v2" ? lessonCardLightSurface(bookPalette(num, themeMode, levelInkGlass), learnGlass) : null;');
    expect(src).toContain('lightSurface={lightSurface}');
    expect(src).toContain('? lightSurface.lockedFill[1]');
    expect(src).toContain('const lessonTextColor = lightSurface');
    expect(src).toContain('const lessonMetaColor = lightSurface');
  });
  it('внутри плашки светлая ветка включает светлые градиенты и мелкий текст из токенов (без константы тёмного текста там, где светлая заливка)', () => {
    const start = src.indexOf('const LessonCard = React.memo(');
    const end = src.indexOf('const LearningV2InlineMapRow');
    const card = src.slice(start, end);
    expect(card).toContain('const isSagePorcelainCard = isLightThemeMode(_themeMode) || lightCard !== null;');
    expect(card).toContain('lightCard.fill[0], lightCard.fill[1], lightCard.fill[2]');
    expect(card).toContain('lightCard.lockedFill[0], lightCard.lockedFill[1], lightCard.lockedFill[2]');
    expect(card).toContain('lightCard.progress[0], lightCard.progress[1]');
    expect(card).toContain('const metaInk = lightCard ?');
    // константа тёмного текста осталась только в объявлении metaInk
    expect(card.match(/LESSON_CARD_OPEN_META_TEXT/g)?.length).toBe(1);
  });
});
