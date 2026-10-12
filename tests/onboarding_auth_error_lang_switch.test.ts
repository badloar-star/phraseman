// зачем (§AUTH-0110 п.3, координатор 12.10): ошибка входа в онбординге хранилась готовой строкой — если человек возвращался на шаг языка
// и менял его, текст ошибки оставался на старом языке. Сторож: в состоянии — «язык → текст», текст строится при рендере на текущем языке.
import fs from 'node:fs';
import path from 'node:path';

const onboarding = fs.readFileSync(path.join(__dirname, '..', 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('onboarding sign-in error follows the interface language', () => {
  it('stores a language resolver, not a finished string', () => {
    expect(onboarding).toContain('const [authErrorText, setAuthErrorText] = useState<AuthErrorText | null>(null);');
    expect(onboarding).toContain('const authError = authErrorText ? authErrorText(lang) : null;');
    expect(onboarding).not.toMatch(/useState<string \| null>\(null\);\s*\n[^\n]*setAuthError/);
  });

  it('every setter passes null, a resolver or authErrorFor(code) — never a string built with the current lang', () => {
    const calls = onboarding.match(/setAuthError\([^\n]*/g) ?? [];
    expect(calls.length).toBeGreaterThan(10);
    for (const call of calls) {
      expect(call).toMatch(/^setAuthError\((null\)|\(uiLang\) =>|authErrorFor\()/);
    }
  });

  it('logs the rebuild under [LANG-SWITCH] when the language changes with an error on screen', () => {
    expect(onboarding).toContain('[LANG-SWITCH] onboarding auth_error rebuilt from=');
  });
});
