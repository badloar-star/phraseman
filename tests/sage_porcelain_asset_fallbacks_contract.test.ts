import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const ROOT = path.resolve(__dirname, '..');

// зачем: контракт сторожит, что у светлой темы sagePorcelain не подменят и не
// потеряют пути к её собственной графике. Раньше он сравнивал число слотов с
// эталонной темой businessLight, но та удалена из проекта (осталась лишь в
// levelGiftImages.ts и settings.tsx) — сравнивать не с чем, поэтому ожидания
// теперь абсолютные, по самой Sage.
function source(file: string): string {
  return normalizeEol(readFileSync(path.join(ROOT, file), 'utf8'));
}

// зачем: constants/*.ts периодически прогоняют через Prettier, и вид кавычек
// меняется с одинарных на двойные. Прошлая версия контракта была прибита к
// одинарным кавычкам, из-за чего парсер возвращал пустоту и тест охранял НИЧЕГО
// (класс бага «немой сторож»). Нормализуем кавычки перед любым разбором, чтобы
// будущее переформатирование снова не отключило проверку.
function normalizeQuotes(text: string): string {
  return text.replace(/"((?:[^"\\\n]|\\.)*)"/g, (_match, body: string) => {
    return `'${body.replace(/'/g, "\\'")}'`;
  });
}

// зачем: значение темы может стоять как на той же строке, так и переноситься на
// следующую (Prettier так делает с длинными строками) — поэтому после двоеточия
// пропускаем любые пробелы и переводы строк.
function themeBlocks(text: string, theme: string): string[] {
  const normalized = normalizeQuotes(text);
  const marker = new RegExp(`\\b${theme}:\\s*`, 'g');
  const blocks: string[] = [];
  for (const match of normalized.matchAll(marker)) {
    const start = (match.index ?? 0) + match[0].length;
    if (normalized[start] !== '{') {
      const rest = normalized.slice(start);
      const required = rest.match(/^require\('[^']+'\)/)?.[0] ?? rest.match(/^'[^']*'/)?.[0];
      if (required) blocks.push(required);
      continue;
    }
    let depth = 0;
    for (let index = start; index < normalized.length; index += 1) {
      if (normalized[index] === '{') depth += 1;
      if (normalized[index] === '}') depth -= 1;
      if (depth === 0) {
        blocks.push(normalized.slice(start, index + 1));
        break;
      }
    }
  }
  return blocks;
}

function requires(block: string): string[] {
  return [...normalizeQuotes(block).matchAll(/require\('([^']+)'\)/g)].map((match) => match[1]);
}

function contains(file: string, snippet: string): void {
  expect(normalizeQuotes(source(file))).toContain(snippet);
}

// зачем: из контракта убраны constants/dailyPhraseThemeArt.ts,
// constants/boonIconAssets.ts и constants/leagueBonusGiftImages.ts — этих файлов
// в проекте больше нет (карты «тема → картинка» для недельных бонусов и сундуков
// лиги удалены после чекпойнта 96c32bb97). Тест падал на readFileSync, а не на
// реальной регрессии.
const SAGE_REQUIRE_SLOTS: Array<{ file: string; slots: number }> = [
  { file: 'app/coin_icons.ts', slots: 1 },
  { file: 'constants/streakIconAssets.ts', slots: 1 },
];

describe('sage porcelain static asset coverage', () => {
  it('keeps every Sage require slot wired to dedicated Celadon art', () => {
    for (const { file, slots } of SAGE_REQUIRE_SLOTS) {
      const sagePaths = themeBlocks(source(file), 'sagePorcelain').flatMap(requires);
      expect({ file, count: sagePaths.length }).toEqual({ file, count: slots });
    }
  });

  it('keeps all Sage require paths literal and backed by existing assets', () => {
    for (const { file } of SAGE_REQUIRE_SLOTS) {
      const sagePaths = themeBlocks(source(file), 'sagePorcelain').flatMap(requires);
      expect(sagePaths.length).toBeGreaterThan(0);
      for (const relativePath of sagePaths) {
        expect(relativePath).toMatch(/sagePorcelain/);
        expect(existsSync(path.resolve(path.join(ROOT, path.dirname(file)), relativePath))).toBe(true);
      }
    }
  });

  it('uses Sage-specific streak chrome', () => {
    const streak = normalizeQuotes(source('constants/streakIconAssets.ts'));
    // зачем: тематические огоньки цепочки сняты — с 30.08 действует ТЗ
    // «Единое перо цепочки дней»: один общий набор перьев на все темы
    // (docs/superpowers/specs/2026-08-30-streak-feather-design.md).
    // Сторожим теперь только то, что у Sage остаётся своим: заморозка и хром.
    expect(streak).not.toMatch(/streak-fire-sagePorcelain-\d{3}\.webp/);
    expect(streak).toContain(
      "'assets/images/streak_icons/sagePorcelain/streak-freeze-sagePorcelain.webp'",
    );
    expect(streak).toContain(
      "sagePorcelain: require('../assets/images/streak_icons/sagePorcelain/streak-freeze-sagePorcelain.webp')",
    );
    expect(streak).toContain("sagePorcelain: { rgb: [139, 99, 32], accent: '#315F50' }");
    expect(streak).toContain("sagePorcelain: { rgb: [97, 112, 106], accent: '#52605A' }");
  });
});
