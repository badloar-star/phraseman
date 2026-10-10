import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOTS = ['app', 'components', 'constants', 'hooks', 'lib', 'modules', 'scripts'];
const SOURCE_EXTENSIONS = new Set(['.cjs', '.js', '.jsx', '.json', '.mjs', '.py', '.ts', '.tsx']);

const normalize = (filePath: string) => filePath.replace(/\\/g, '/');

const walkFiles = (relativeRoot: string): string[] => {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  const files: string[] = [];

  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        files.push(normalize(path.relative(ROOT, absolutePath)));
      }
    }
  };

  visit(absoluteRoot);
  return files;
};

describe('removed Coral theme regression guard', () => {
  it('has a dedicated command for the removal gate', () => {
    const packageJson = JSON.parse(normalizeEol(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['test:removed-themes']).toBe(
      'jest --runTestsByPath tests/coral_theme_removal_guard.test.ts --no-cache --runInBand',
    );
  });

  // зачем (10.10): с 30.09 (00d854736) сохранённая тема проходит БЕЛЫЙ СПИСОК LIQUID_GLASS_THEME_IDS с откатом в
  // graphite — отдельное «надгробие» REMOVED_THEME_MODES больше не нужно. Поиск слова «coral» по всему дереву ловил
  // испанское слово «coral» в контенте курса (аудио, генерируемые файлы) — шум, а не тему. Сторож держит суть:
  // Coral нет среди тем, и любое неизвестное сохранённое имя сводится к теме по умолчанию.
  it('keeps Coral out of the theme registry and theme settings', () => {
    const palette = normalizeEol(fs.readFileSync(path.join(ROOT, 'constants', 'liquidGlassThemePalette.ts'), 'utf8'));
    const themeSettings = normalizeEol(fs.readFileSync(path.join(ROOT, 'app', 'settings_themes.tsx'), 'utf8'));
    const legacyPalette = normalizeEol(fs.readFileSync(path.join(ROOT, 'constants', 'theme.ts'), 'utf8'));
    expect(palette).not.toMatch(/coral/i);
    expect(themeSettings).not.toMatch(/coral/i);
    expect(legacyPalette).not.toMatch(/coral/i);
  });

  it('resolves any stored theme through the whitelist with a graphite fallback', () => {
    const palette = normalizeEol(fs.readFileSync(path.join(ROOT, 'constants', 'liquidGlassThemePalette.ts'), 'utf8'));
    const themeContext = normalizeEol(fs.readFileSync(path.join(ROOT, 'components', 'ThemeContext.tsx'), 'utf8'));
    expect(palette).toMatch(/export function resolveLiquidGlassTheme[\s\S]{0,200}LIQUID_GLASS_THEME_IDS\.includes\(id[\s\S]{0,80}: 'graphite';/);
    expect(themeContext).toContain('resolveLiquidGlassTheme(');
    expect(themeContext).toContain("const THEME_STORAGE_KEY = 'liquid_glass_theme';");
  });

});
