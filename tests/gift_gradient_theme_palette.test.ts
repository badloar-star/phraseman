// ════════════════════════════════════════════════════════════════════════════
// gift_gradient_theme_palette.test.ts — градиент подарка обязан слушать тему.
//
// зачем 2026-08-03 (владелец): «полностью измени цвета градиентов подарков,
// сделай под каждую тему свои цвета и форму градиента, сейчас она говнянная,
// мне не нравится вообще».
//
// Было: цвет считался ТОЛЬКО от редкости шестью захардкоженными hex (три на
// тёмные темы, три на светлые). Одни и те же цвета показывались во всех 13
// темах — в «Индиго» подарки были жёлтыми, в «Изумруде» синими, тема на них не
// влияла вообще. Стало: палитру задаёт тема, редкость меняет плотность заливки
// и угол градиента.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

import {
  giftGradientAlpha,
  giftGradientBaseColor,
  giftGradientShape,
  type GiftRarity,
} from '../app/gift_gradient_palette';
import type { ThemeMode } from '../constants/theme';

const SCREEN = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'level_gifts_inventory.tsx'),
  'utf8',
);

const THEME_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'constants', 'theme.ts'),
  'utf8',
);

/** Все темы приложения — тест обязан покрывать их все, а не выборку. */
function allThemeModes(): ThemeMode[] {
  const union = /export type ThemeMode =([^;]*);/.exec(THEME_SOURCE);
  if (!union) throw new Error('не найден ThemeMode в constants/theme.ts');
  return Array.from(union[1].matchAll(/'([a-zA-Z]+)'/g)).map((m) => m[1] as ThemeMode);
}

const RARITIES: GiftRarity[] = ['epic', 'rare', 'common'];

describe('цвет берётся из темы, а не из хардкода', () => {
  test('в экране не осталось старых захардкоженных цветов редкости', () => {
    // Комментарии не в счёт: в них эти цвета названы как история правки —
    // проверяем только исполняемый код.
    const code = SCREEN.split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join('\n');
    for (const dead of ['#FFD700', '#60A5FA', '#D6B85C', '#8A6410', '#2C5EA8', '#6B5A2E']) {
      expect(code).not.toContain(dead);
    }
  });

  test('экран передаёт плитке токены АКТИВНОЙ темы', () => {
    expect(SCREEN).toContain('themeAccent={t.accent}');
    expect(SCREEN).toContain('themeGold={t.gold}');
  });

  test('смена темы меняет цвет подарка', () => {
    // Ядро требования: два разных акцента обязаны дать разный цвет.
    const indigo = giftGradientBaseColor('indigo', 'rare', '#6EA8FF', '#E9B949');
    const coral = giftGradientBaseColor('coral', 'rare', '#FF7F50', '#FFD060');
    expect(indigo).not.toBe(coral);
  });

  test('цвет — это РОВНО токен темы, ничего не выдумано', () => {
    const accent = '#123456';
    const gold = '#ABCDEF';
    for (const mode of allThemeModes()) {
      for (const rarity of RARITIES) {
        const color = giftGradientBaseColor(mode, rarity, accent, gold);
        expect([accent, gold]).toContain(color);
      }
    }
  });

  test('в золотых темах эпический звучит золотом, а не акцентом', () => {
    // Иначе высшая редкость теряется на золотом фоне самой темы.
    for (const mode of ['gold', 'midnight', 'ember'] as ThemeMode[]) {
      expect(giftGradientBaseColor(mode, 'epic', '#111111', '#FFD700')).toBe('#FFD700');
    }
  });
});

describe('редкость различима внутри одной темы', () => {
  test('эпический плотнее редкого, редкий плотнее обычного', () => {
    for (const isLight of [false, true]) {
      const epic = parseInt(giftGradientAlpha('epic', isLight), 16);
      const rare = parseInt(giftGradientAlpha('rare', isLight), 16);
      const common = parseInt(giftGradientAlpha('common', isLight), 16);
      expect(epic).toBeGreaterThan(rare);
      expect(rare).toBeGreaterThan(common);
    }
  });

  test('в светлой теме заливка мягче — иначе цвет забивает белый фон', () => {
    for (const rarity of RARITIES) {
      const dark = parseInt(giftGradientAlpha(rarity, false), 16);
      const light = parseInt(giftGradientAlpha(rarity, true), 16);
      expect(light).toBeLessThan(dark);
    }
  });

  test('альфа — валидные две hex-цифры', () => {
    for (const rarity of RARITIES) {
      for (const isLight of [false, true]) {
        expect(giftGradientAlpha(rarity, isLight)).toMatch(/^[0-9A-F]{2}$/);
      }
    }
  });
});

describe('форма градиента', () => {
  test('у каждой редкости своя форма — владелец просил менять и форму', () => {
    const shapes = RARITIES.map((rarity) => JSON.stringify(giftGradientShape(rarity)));
    expect(new Set(shapes).size).toBe(RARITIES.length);
  });

  test('точки градиента лежат в допустимых границах 0..1', () => {
    for (const rarity of RARITIES) {
      const { start, end } = giftGradientShape(rarity);
      for (const value of [start.x, start.y, end.x, end.y]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  test('градиент не вырожден — начало и конец различаются', () => {
    for (const rarity of RARITIES) {
      const { start, end } = giftGradientShape(rarity);
      expect(start.x !== end.x || start.y !== end.y).toBe(true);
    }
  });

  test('эпический льётся круче обычного — разницу видно боковым зрением', () => {
    const epic = giftGradientShape('epic');
    const common = giftGradientShape('common');
    const epicDrop = Math.abs(epic.end.y - epic.start.y);
    const commonDrop = Math.abs(common.end.y - common.start.y);
    expect(epicDrop).toBeGreaterThan(commonDrop);
  });

  test('экран использует форму из палитры, а не свою', () => {
    expect(SCREEN).toContain('start={gradientShape.start}');
    expect(SCREEN).toContain('end={gradientShape.end}');
    expect(SCREEN).toContain('giftTone(accent, gradientAlpha)');
  });
});
