import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'trainer.tsx'), 'utf8');

describe('trainer active-theme typography', () => {
  it('derives practice accents from the active theme instead of the statistics palette', () => {
    expect(SOURCE).toContain('const accent = t.accent;');
    expect(SOURCE).not.toContain('statsThemeAccent(themeMode)');
    expect(SOURCE).not.toContain('statsThemeSoftBg(themeMode');
  });

  it('keeps the empty-state headline readable with normal word spacing', () => {
    expect(SOURCE).toContain('heroBig: { fontWeight: \'900\', letterSpacing: 0 }');
    expect(SOURCE).not.toContain("heroBig: { fontWeight: '900', letterSpacing: -2 }");
  });
});
