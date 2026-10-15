// зачем (координатор 15.10, аудит кнопок №3): приглашение войти после урока 1 рисовалось только в мёртвой legacy-ветке итога —
// гость его не видел, а невидимое окно съедало первое «Назад». Сторож: в 2.0 — одна строка-приглашение (noteAction) один раз,
// тап ведёт в существующее окно входа Настроек; таймер урока 1 больше не взводит невидимое окно.
import fs from 'node:fs';
import path from 'node:path';

// Файлы рабочей копии бывают с CRLF — сравниваем по LF.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('guest sign-in invite after lesson 1 (2.0 result)', () => {
  const lesson = read('app/lesson_complete.tsx');
  const done = read('components/completion/V2DoneScreen.tsx');
  const settings = read('app/(tabs)/settings.tsx');
  const copy = read('app/account_switch_copy.ts');

  it('lesson 1 timer shows the invite line instead of the dead legacy modal', () => {
    const effect = lesson.slice(lesson.indexOf('const shown = await AsyncStorage.getItem(AUTH_PROMPT_SHOWN_KEY);'), lesson.indexOf('}, 1500);'));
    expect(effect).not.toContain('setShowAuthPrompt(true)');
    expect(effect).toContain('setGuestSignInInvite(true)');
    expect(effect).toContain("decision: 'show'");
    expect(effect).toContain("decision: 'skip_shown_before'");
    expect(effect).toContain("decision: 'skip_linked'");
    // один раз: метка ставится при показе
    expect(effect.indexOf("AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1')", effect.indexOf("decision: 'show'"))).toBeGreaterThan(-1);
  });

  it('the invite is a noteAction on the 2.0 result that opens the existing sign-in in Settings', () => {
    expect(lesson).toContain('noteAction={guestSignInInvite ? {');
    expect(lesson).toContain("testID: 'lesson-complete-guest-signin-invite'");
    expect(lesson).toContain("router.push({ pathname: '/(tabs)/settings', params: { [SETTINGS_OPEN_SIGN_IN_PARAM]: '1' } }");
    expect(copy).toContain("export const SETTINGS_OPEN_SIGN_IN_PARAM = 'signIn';");
    expect(settings).toContain('setAuthPromptVisible(true);\n    router.setParams({ [SETTINGS_OPEN_SIGN_IN_PARAM]: undefined });');
  });

  it('V2DoneScreen renders noteAction as an accessible pressable line without a card', () => {
    expect(done).toContain('noteAction?: Readonly<{ label: string; onPress: () => void; testID?: string }>;');
    const fn = done.slice(done.indexOf('function NoteAction('), done.indexOf('export default function V2DoneScreen'));
    expect(fn).toContain('accessibilityRole="button"');
    expect(fn).toContain('hapticTap()');
    expect(fn).not.toMatch(/borderWidth|borderColor|boxShadow/);
  });
});
