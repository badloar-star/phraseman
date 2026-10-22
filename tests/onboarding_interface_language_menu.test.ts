import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('onboarding interface-language menu', () => {
  it('uses the persisted language callback and only offers visible interface languages', () => {
    expect(source).toContain('onLangSelect,');
    expect(source).toContain('getVisibleInterfaceLanguageOptions(IS_STORE_RELEASE)');
    expect(source).toContain('onboarding-interface-language-menu');
  });

  it('keeps the language chooser accessible and restores focus to its trigger', () => {
    expect(source).toContain('accessibilityViewIsModal');
    expect(source).toContain('restoreLanguageMenuFocus');
    expect(source).toContain('onboarding-interface-language-option-');
  });

  it('places the welcome trigger below the stable top safe-area inset', () => {
    expect(source).toContain('const insets = useStableSafeAreaInsets();');
    expect(source).toContain('style={[styles.welcomeLanguageMenu, { top: insets.top + 2 }]}');
    expect(source).not.toMatch(/welcomeLanguageMenu:\s*\{[^}]*\btop:\s*2\b/s);
  });

  // зачем (22.10, 🟡 Ревизора): сбой смены языка не молчит — галочка сразу, откат на прежний язык, сообщение на 9 языках, лог.
  it('shows the choice instantly and rolls back with a message when the language change fails', () => {
    expect(source).toContain('const selected = (pendingInterfaceLang ?? lang) === option.code;');
    expect(source).toContain('setPendingInterfaceLang(nextLang);');
    expect(source).toContain('await onLangSelect(previousLang);');
    expect(source).toContain("console.warn('[ONB-LANG-MENU] failed'");
    const toastAt = source.indexOf("ru: 'Не получилось сменить язык'");
    expect(toastAt).toBeGreaterThan(-1);
    const toast = source.slice(toastAt, toastAt + 400);
    for (const key of ['uk:', 'en:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:']) expect(toast).toContain(key);
    expect(source).toContain('setPendingInterfaceLang(null);');
  });
});
