import fs from 'fs';
import path from 'path';

// зачем: 2026-07-26 приложение падало на старте — «Unable to resolve module
// ../assets/images/currency/pearl_business.webp». Сами файлы на диске были, но
// лежали НЕзакоммиченными (untracked): параллельная сессия сгенерировала иконки
// и переписала coin_icons.ts, не добавив ассеты в git. На другой машине и в CI
// это гарантированный краш бандла, а не «просто кэш Metro».
// Тест проверяет, что каждый require() из coin_icons.ts указывает на реально
// существующий валидный WebP и что покрыты все темы из ThemeMode.

const ROOT = path.resolve(__dirname, '..');
const COIN_ICONS_PATH = path.join(ROOT, 'app', 'coin_icons.ts');
const THEME_PATH = path.join(ROOT, 'constants', 'theme.ts');
const THEME_ACCESS_POLICY_PATH = path.join(ROOT, 'app', 'theme_access_policy.ts');
const PEARL_BUILDER_PATH = path.join(ROOT, 'scripts', 'build_theme_pearl_assets.mjs');

function coinIconsSource(): string {
  return fs.readFileSync(COIN_ICONS_PATH, 'utf8');
}

/** Пути ассетов из статических require() — именно их резолвит Metro. */
function requiredAssetPaths(source: string): string[] {
  return [...source.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]);
}

function requiredThemeAssets(source: string): Array<{ theme: string; relativePath: string }> {
  const block = source.match(/PEARL_ICONS[^=]*=\s*\{([\s\S]*?)\}\s*as const;/);
  expect(block).toBeTruthy();

  return [...block![1].matchAll(/(\w+)\s*:\s*require\('([^']+)'\)/g)].map((match) => ({
    theme: match[1],
    relativePath: match[2],
  }));
}

/** Список тем из ThemeMode в constants/theme.ts. */
function themeModes(): string[] {
  const src = fs.readFileSync(THEME_PATH, 'utf8');
  const decl = src.match(/export type ThemeMode\s*=\s*([^;]+);/);
  expect(decl).toBeTruthy();

  return [...decl![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

function selectableThemeModes(): string[] {
  const source = fs.readFileSync(THEME_ACCESS_POLICY_PATH, 'utf8');
  const block = source.match(/SELECTABLE_THEME_MODES\s*=\s*\[([\s\S]*?)\]\s*as const/);
  expect(block).toBeTruthy();
  return [...block![1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function generatedThemeModes(): string[] {
  const source = fs.readFileSync(PEARL_BUILDER_PATH, 'utf8');
  return [...source.matchAll(/^  (\w+): \{ shadow:/gm)].map((match) => match[1]);
}

/** RIFF....WEBP — сигнатура валидного webp-контейнера. */
function isWebp(absPath: string): boolean {
  const head = Buffer.alloc(12);
  const fd = fs.openSync(absPath, 'r');
  try {
    fs.readSync(fd, head, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }

  return head.subarray(0, 4).toString('ascii') === 'RIFF'
    && head.subarray(8, 12).toString('ascii') === 'WEBP';
}

describe('currency icon assets', () => {
  it('каждый require() из coin_icons.ts существует на диске', () => {
    const requires = requiredAssetPaths(coinIconsSource());
    expect(requires.length).toBeGreaterThan(0);

    const missing = requires.filter(
      (rel) => !fs.existsSync(path.resolve(ROOT, 'app', rel)),
    );

    expect(missing).toEqual([]);
  });

  it('все ассеты — непустые валидные webp', () => {
    const broken: string[] = [];

    for (const rel of requiredAssetPaths(coinIconsSource())) {
      const abs = path.resolve(ROOT, 'app', rel);
      if (!fs.existsSync(abs)) continue;

      // Пустой/битый файл Metro «резолвит», но картинка не отрисуется.
      if (fs.statSync(abs).size < 100 || !isWebp(abs)) broken.push(rel);
    }

    expect(broken).toEqual([]);
  });

  it('PEARL_ICONS покрывает ровно все темы ThemeMode', () => {
    const source = coinIconsSource();
    const block = source.match(/PEARL_ICONS[^=]*=\s*\{([\s\S]*?)\}\s*as const;/);
    expect(block).toBeTruthy();

    const keys = [...block![1].matchAll(/(\w+)\s*:\s*require\(/g)].map((m) => m[1]);
    const modes = themeModes();
    expect(modes.length).toBeGreaterThan(0);

    // Без темы иконка на этом оформлении упадёт в undefined → пустое место в UI.
    expect(modes.filter((mode) => !keys.includes(mode))).toEqual([]);
    expect(keys.filter((key) => !modes.includes(key))).toEqual([]);
  });

  it('отдельные жемчужины существуют только для девяти подключённых тем', () => {
    const assets = requiredThemeAssets(coinIconsSource());
    const selectable = selectableThemeModes();

    expect(assets).toHaveLength(themeModes().length);
    expect(assets.map((asset) => asset.theme).sort()).toEqual([...selectable].sort());
    expect(new Set(assets.map((asset) => asset.relativePath)).size).toBe(selectable.length);

    const bundled = fs.readdirSync(path.join(ROOT, 'assets', 'images', 'currency'))
      .filter((name) => /^pearl_.*\.webp$/.test(name))
      .sort();
    expect(bundled).toEqual(selectable.map((theme) => `pearl_${theme}.webp`).sort());
  });

  it('генератор следует реальному порядку тем из пользовательского селектора', () => {
    expect(generatedThemeModes()).toEqual(selectableThemeModes());
  });

});
