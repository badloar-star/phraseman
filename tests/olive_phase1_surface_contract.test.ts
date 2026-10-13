import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('Olive Phase 1 surfaces', () => {
  // зачем (координатор §46, 2026-10-01): в 2.0 экраны красятся токенами темы
  // (стекло/уровни), а не ветками `isOliveTheme` в каждом файле. Olive сохраняет
  // собственные записи в палитрах — это и сторожим; Gold-фаска на Olive запрещена.
  it('keeps explicit Olive entries in the lessons palette without a Gold bevel', () => {
    const source = read('app/(tabs)/lessons.tsx');
    expect(source).toContain('olive: {');
    expect(source).not.toContain('isOliveTheme && <GoldBevel');
  });

  it('keeps a dedicated Olive card-pack shell (Home and tabs use 2.0 theme tokens)', () => {
    const paywall = read('app/flashcards/cardPackPaywallTheme.ts');
    // зачем (регрессия 13.10, 5b1e4a80a): оболочка окна покупки набора построена из токенов темы (cardPackPaywallShellFromTokens), таблиц по id тем (shellOlive/shellGold) больше нет — Olive, как и все темы, идёт по токенам.
    expect(paywall).toContain('cardPackPaywallShellFromTokens');
    expect(paywall).not.toContain('function shellOlive()');
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
    // зачем (координатор 15.10, правка 1ec91fd46): общий вид надписи — accentInk на лице кнопки (запасной correctText), correctText только в выключенном виде;
    // проверяем смысл, а не точную строку: старый correctText на лице t.accent давал контраст 1,01–4,5.
    expect(button).toMatch(/isDisabled\s*\?\s*t\.correctText\s*:\s*\(t\.accentInk\s*\?\?\s*t\.correctText\)/);
  });
});
