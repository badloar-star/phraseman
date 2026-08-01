import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('removed Onyx theme contract', () => {
  it('does not expose Onyx in the theme catalog or settings label', () => {
    const picker = read('app/settings_themes.tsx');
    const settings = read('app/(tabs)/settings.tsx');
    const options = picker.slice(picker.indexOf('const THEME_OPTIONS'), picker.indexOf('function themeSwatches'));
    const labels = settings.slice(settings.indexOf('const currentThemeLabel'), settings.indexOf('const refreshSupplementalAccessState'));

    expect(options).not.toContain("mode: 'minimalDark'");
    expect(options).not.toMatch(/Оникс|Онікс|Onyx|Ónix|Ônix|Oniks|Onyks/);
    expect(labels).not.toContain('minimalDark:');
    expect(labels).not.toMatch(/Оникс|Онікс|Onyx|Ónix|Ônix|Oniks|Onyks/);
  });

  it('migrates existing Onyx selections to the current default theme', () => {
    const source = read('components/ThemeContext.tsx');
    const cycleLine = source.split('\n').find(line => line.startsWith('const CYCLE:')) ?? '';
    const premiumLine = source.split('\n').find(line => line.startsWith('const PREMIUM_ONLY_THEMES:')) ?? '';

    expect(cycleLine).not.toContain('minimalDark');
    expect(premiumLine).not.toContain('minimalDark');
    expect(source).toContain("'minimalDark'");
    expect(source).not.toContain("migrated === 'minimalDark'");
  });
});
