import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('removed Candy Blue theme contract', () => {
  it('does not expose Candy Blue in the theme catalog or settings label', () => {
    const picker = read('app/settings_themes.tsx');
    const settings = read('app/(tabs)/settings.tsx');
    const options = picker.slice(picker.indexOf('const THEME_OPTIONS'), picker.indexOf('function themeSwatches'));
    const labels = settings.slice(settings.indexOf('const currentThemeLabel'), settings.indexOf('const refreshSupplementalAccessState'));

    expect(options).not.toContain("mode: 'candyBlue'");
    expect(options).not.toMatch(/Кенди Блу|Кенді Блу|Azul caramelo|Azul candy|Xanh kẹo|Biru permen|Şeker mavisi|Cukrowy błękit/);
    expect(labels).not.toContain('candyBlue:');
    expect(labels).not.toMatch(/Кенди Блу|Кенді Блу|Azul caramelo|Azul candy|Xanh kẹo|Biru permen|Şeker mavisi|Cukrowy błękit/);
  });

  it('migrates existing Candy Blue selections to the current default theme', () => {
    const source = read('components/ThemeContext.tsx');
    const cycleLine = source.split('\n').find(line => line.startsWith('const CYCLE:')) ?? '';
    const premiumLine = source.split('\n').find(line => line.startsWith('const PREMIUM_ONLY_THEMES:')) ?? '';

    expect(cycleLine).not.toContain('candyBlue');
    expect(premiumLine).not.toContain('candyBlue');
    expect(source).toContain("'candyBlue'");
    expect(source).not.toContain("migrated === 'candyBlue'");
  });
});
