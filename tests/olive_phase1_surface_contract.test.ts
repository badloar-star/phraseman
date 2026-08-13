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

  it('keeps shared Olive CTAs and shards shop borderless with dark champagne foregrounds', () => {
    const button = read('components/ui/PrimaryButton.tsx');
    const choice = read('components/ThemedChoiceModal.tsx');
    const confirm = read('components/ThemedConfirmModal.tsx');
    const shop = read('app/shards_shop.tsx');
    for (const source of [button, choice, confirm]) {
      expect(source).toContain("const isOliveTheme = themeMode === 'olive';");
      expect(source).toContain('OLIVE_GRADIENTS.primaryButton');
      expect(source).toContain('OLIVE_RICH.piano');
    }
    expect(button).toContain("const foreground = isOliveTheme && isDisabled\n    ? t.textMuted");
    expect(button).toContain(": t.correctText;");
    expect(shop).toContain("return mode === 'dark' || mode === 'gold' || mode === 'olive';");
    expect(shop).toContain("const isOliveTheme = themeMode === 'olive';");
    expect(shop).toContain('OLIVE_GRADIENTS.raisedPanel');
    expect(shop).not.toContain('isOliveTheme && <GoldBevel');
  });
});
