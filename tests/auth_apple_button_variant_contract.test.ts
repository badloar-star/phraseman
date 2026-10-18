import fs from 'fs';
import path from 'path';
import { appleButtonColors } from '../components/auth_apple_button_style';

// зачем (координатор 13.10, правило владельца «никакие кнопки не сливаются»): чёрная «Войти через Apple» терялась на тёмной
// плите онбординга. По Apple HIG у Sign in with Apple два официальных стиля: белый на тёмном фоне и чёрный на светлом.
// Стиль выбирается по реальному фону каждого места, а не одним цветом на всё приложение.

const ROOT = process.cwd();
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Атрибуты всех вхождений <AppleSignInButton …/> в файле (по одному тексту на вызов). */
function appleButtonCalls(rel: string): string[] {
  const text = read(rel);
  return [...text.matchAll(/<AppleSignInButton\b([\s\S]*?)\/>/g)].map((m) => m[1]);
}

describe('Sign in with Apple — style follows the surface (dark → white, light → black)', () => {
  it('dark surface: white button, black logo and text', () => {
    expect(appleButtonColors('dark')).toEqual({ background: '#FFFFFF', ink: '#000000' });
  });

  it('light surface: black button, white logo and text', () => {
    expect(appleButtonColors('light')).toEqual({ background: '#000000', ink: '#FFFFFF' });
  });

  it('onboarding: sign-in plate and privacy pill follow the theme surface (light theme → black, dark → white)', () => {
    const calls = appleButtonCalls('components/CleanOnboarding.tsx');
    expect(calls).toHaveLength(2);
    for (const attrs of calls) expect(attrs).toMatch(/variant=\{P\.isLight \? 'light' : 'dark'\}/);
  });

  it('registration sheet: variant follows the app theme (light theme → black, dark → white)', () => {
    // зачем (макет auth-states.html, координатор 18.10): окно входа рисует кнопки через SignInProgressButton; стиль Apple берётся из той же appleButtonColors по яркости шторки
    const text = read('components/RegistrationPromptModal.tsx');
    const appleCalls = [...text.matchAll(/<SignInProgressButton\b([\s\S]*?)\/>/g)].map((m) => m[1]).filter((attrs) => /provider="apple"/.test(attrs));
    expect(appleCalls).toHaveLength(1);
    expect(appleCalls[0]).toMatch(/surface=\{isLightThemeMode\(themeMode\) \? 'light' : 'dark'\}/);
    expect(read('components/auth/SignInProgressButton.tsx')).toContain("appleButtonColors(surface === 'dark' ? 'dark' : 'light')");
  });

  it('the button logs the chosen style once per mount ([AUTH-APPLE-BTN])', () => {
    expect(read('components/AuthProviderButtons.tsx')).toMatch(/\[AUTH-APPLE-BTN\] variant=/);
  });
});
