import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('Olive Phase 1 surfaces', () => {
  it('gives lessons explicit matte Olive states without a Gold bevel', () => {
    const source = read('app/(tabs)/lessons.tsx');
    expect(source).toContain('olive: {');
    expect(source).toContain("olive: {\n        A1: { bg:");
    expect(source).toContain("const isOliveTheme = themeMode === 'olive';");
    expect(source).toContain('isOliveTheme ? oliveShadow(');
    expect(source).not.toContain('isOliveTheme && <GoldBevel');
  });

  it('uses a dedicated Olive home, tab, and card-pack shell', () => {
    const home = read('app/(tabs)/home.tsx');
    const tabs = read('app/(tabs)/_layout.tsx');
    const paywall = read('app/flashcards/cardPackPaywallTheme.ts');
    expect(home).toContain("const isOliveTheme = themeMode === 'olive';");
    expect(home).toContain('OLIVE_GRADIENTS.quietPanel');
    expect(home).toContain("isOliveTheme ? 'rgba(13,15,11,0.96)'");
    expect(tabs).toContain("const isOliveTheme = themeMode === 'olive';");
    expect(tabs).toContain('isOliveTheme ? OLIVE_RICH.panel');
    expect(tabs).toContain('isOliveTheme ? OLIVE_RICH.champagne');
    expect(paywall).toContain('function shellOlive(): CardPackPaywallTheme');
    expect(paywall).toContain('olive: shellOlive()');
    expect(paywall).not.toContain('olive: shellGold()');
  });

  it('keeps Olive CTA contracts while shared decision modals use the active Liquid Glass tint', () => {
    const button = read('components/ui/PrimaryButton.tsx');
    const choice = read('components/ThemedChoiceModal.tsx');
    const confirm = read('components/ThemedConfirmModal.tsx');
    expect(button).toContain("const isOliveTheme = themeMode === 'olive';");
    expect(button).toContain('OLIVE_GRADIENTS.primaryButton');
    expect(button).toContain('OLIVE_RICH.piano');
    for (const source of [choice, confirm]) {
      expect(source).toContain('liquidGlassTokens(liquidGlassThemeId)');
      expect(source).not.toContain('OLIVE_GRADIENTS');
      expect(source).not.toContain('OLIVE_RICH');
    }
    expect(button).toContain("const foreground = isOliveTheme && isDisabled\n    ? t.textMuted");
    expect(button).toContain(": t.correctText;");
  });
});
