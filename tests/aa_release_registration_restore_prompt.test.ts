/**
 * Релизный пол 10.10: окно входа (Настройки / после урока / после «Выйти»)
 * на `account_delete_pending` предлагает «Восстановить аккаунт?», как онбординг.
 */
import fs from 'fs';
import path from 'path';

const alerts: Array<{ title: string; buttons: Array<{ text: string; ghost?: boolean; onPress?: () => void }> }> = [];
jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (options: Record<string, unknown>) => options.android ?? options.default },
  Alert: {
    alert: (title: string, _body: string, buttons: Array<{ text: string; onPress?: () => void }>) => {
      alerts.push({ title, buttons });
    },
  },
}));
// зачем (координатор 13.10, auth-gap-007): окно «Восстановить аккаунт?» идёт через тёмную очередь, не через Alert.
// Кнопка очереди → та же запись { text, onPress }; dismissLast — системная «назад».
let lastChoiceResolve: ((value: string) => void) | null = null;
jest.mock('../app/themed_blocking_alert_queue', () => ({
  THEMED_ALERT_DISMISSED: 'dismiss',
  enqueueThemedBlockingInfoAlert: () => Promise.resolve(),
  enqueueThemedBlockingChoiceAlert: (title: string, _message: string, actions: Array<{ label: string; value: string; ghost?: boolean }>) =>
    new Promise<string>((resolve) => {
      lastChoiceResolve = resolve;
      alerts.push({ title, buttons: actions.map((action) => ({ text: action.label, ghost: action.ghost, onPress: () => resolve(action.value) })) });
    }),
}));
const statusMock = jest.fn();
const restoreMock = jest.fn();
jest.mock('../app/account_delete_restore_client', () => ({
  fetchAccountDeleteStatus: () => statusMock(),
  restoreDeletedAccount: () => restoreMock(),
}));

import { promptAccountRestoreAfterSignInRefusal } from '../app/account_delete_restore_prompt';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

async function answer(choiceIndex: number): Promise<void> {
  for (let i = 0; i < 20 && alerts.length === 0; i += 1) await Promise.resolve();
  alerts[alerts.length - 1].buttons[choiceIndex].onPress?.();
}

beforeEach(() => {
  alerts.length = 0;
  statusMock.mockReset();
  restoreMock.mockReset();
});

describe('accountRestorePromptMessage — число дней без «дн.» и «(s)»', () => {
  it('правильные формы слова «день» на 9 языках', () => {
    const { accountRestorePromptMessage } = require('../app/account_delete_restore_prompt');
    expect(accountRestorePromptMessage('ru', 1)).toContain('через 1 день ');
    expect(accountRestorePromptMessage('ru', 3)).toContain('через 3 дня ');
    expect(accountRestorePromptMessage('ru', 14)).toContain('через 14 дней ');
    expect(accountRestorePromptMessage('ru', 21)).toContain('через 21 день ');
    expect(accountRestorePromptMessage('uk', 2)).toContain('через 2 дні ');
    expect(accountRestorePromptMessage('uk', 5)).toContain('через 5 днів ');
    expect(accountRestorePromptMessage('en', 1)).toContain('in 1 day ');
    expect(accountRestorePromptMessage('en', 9)).toContain('in 9 days ');
    expect(accountRestorePromptMessage('es', 1)).toContain('en 1 día:');
    expect(accountRestorePromptMessage('pt-BR', 4)).toContain('em 4 dias:');
    expect(accountRestorePromptMessage('pl', 1)).toContain('za 1 dzień ');
    expect(accountRestorePromptMessage('pl', 5)).toContain('za 5 dni ');
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      const text = accountRestorePromptMessage(lang, 7);
      expect(text).not.toMatch(/дн\.|\(s\)|día\(s\)|dia\(s\)/);
      expect(text).toContain('7');
    }
  });
});

describe('промпт восстановления удалённого аккаунта', () => {
  it('согласие — сервер снимает удаление → restored', async () => {
    statusMock.mockResolvedValue({ pending: true, restorable: true, daysLeft: 9 });
    restoreMock.mockResolvedValue({ ok: true });
    const pending = promptAccountRestoreAfterSignInRefusal('ru');
    await answer(1);
    await expect(pending).resolves.toBe('restored');
    expect(alerts[0].title).toBe('Восстановить аккаунт?');
  });

  it('отказ — удаление не трогаем → declined', async () => {
    statusMock.mockResolvedValue({ pending: true, restorable: true, daysLeft: 3 });
    const pending = promptAccountRestoreAfterSignInRefusal('ru');
    await answer(0);
    await expect(pending).resolves.toBe('declined');
    expect(restoreMock).not.toHaveBeenCalled();
  });

  it('тёмное окно: «Не восстанавливать» — прозрачная, «Восстановить» — основная; «назад» = отказ', async () => {
    statusMock.mockResolvedValue({ pending: true, restorable: true, daysLeft: 5 });
    const pending = promptAccountRestoreAfterSignInRefusal('ru');
    for (let i = 0; i < 20 && alerts.length === 0; i += 1) await Promise.resolve();
    expect(alerts[0].buttons.map((b) => [b.text, b.ghost === true])).toEqual([['Не восстанавливать', true], ['Восстановить', false]]);
    lastChoiceResolve?.('dismiss');
    await expect(pending).resolves.toBe('declined');
    expect(restoreMock).not.toHaveBeenCalled();
    expect(read('app/account_delete_restore_prompt.ts')).not.toMatch(/Alert\.alert\(|from 'react-native'/);
  });

  it('срок вышел / восстановить нельзя — без окна → not_restorable', async () => {
    statusMock.mockResolvedValue({ pending: true, restorable: false });
    await expect(promptAccountRestoreAfterSignInRefusal('ru')).resolves.toBe('not_restorable');
    expect(alerts).toHaveLength(0);
  });

  it('сбой сервера при восстановлении — restore_failed (общая ошибка дальше)', async () => {
    statusMock.mockResolvedValue({ pending: true, restorable: true, daysLeft: 1 });
    restoreMock.mockResolvedValue({ ok: false, reason: 'network' });
    const pending = promptAccountRestoreAfterSignInRefusal('ru');
    await answer(1);
    await expect(pending).resolves.toBe('restore_failed');
  });

  it('окно входа зовёт промпт на account_delete_pending до общей ошибки', () => {
    const modal = read('components/RegistrationPromptModal.tsx');
    const branch = modal.indexOf("result.error === 'account_delete_pending'");
    const generic = modal.indexOf("ru: 'Не получилось войти. Попробуй позже.'");
    expect(branch).toBeGreaterThan(-1);
    expect(generic).toBeGreaterThan(branch);
    expect(modal.slice(branch, branch + 300)).toContain('promptAccountRestoreAfterSignInRefusal(lang)');
  });

  // зачем (аудит Optimistic UI 12.10): неудачное «Восстановить» прежде показывалось как «аккаунт ещё удаляется».
  it('неудачное восстановление — свой текст и повтор в окне входа и в онбординге; сбой статуса в онбординге не уходит в общий catch', () => {
    const modal = read('components/RegistrationPromptModal.tsx');
    const branch = modal.indexOf("if (restore === 'restore_failed') {");
    expect(branch).toBeGreaterThan(modal.indexOf('promptAccountRestoreAfterSignInRefusal(lang)'));
    expect(modal.slice(branch, branch + 260)).toContain('showInlineError(failedCopy.title, failedCopy.body)');
    expect(modal.slice(branch, branch + 260)).toContain('setRetryProvider(provider)');

    const onboarding = read('components/CleanOnboarding.tsx');
    expect(onboarding.match(/if \(restoreOutcome === 'restore_failed'\) \{\s*setAuthError\(\(uiLang\) => \{\s*const failedCopy = accountRestoreFailedCopy\(uiLang\);/g)).toHaveLength(2);
    const fn = onboarding.slice(onboarding.indexOf('async function offerAccountRestore('), onboarding.indexOf('function describeAuthError('));
    expect(fn).toMatch(/try \{\s*status = await fetchAccountDeleteStatus\(\);\s*\} catch/);
    for (const line of ['[ACCOUNT-RESTORE] onboarding status_failed', '[ACCOUNT-RESTORE] onboarding not_restorable', '[ACCOUNT-RESTORE] onboarding declined', '[ACCOUNT-RESTORE] onboarding restore ok=']) {
      expect(fn).toContain(line);
    }
    expect(fn).toContain("return outcome.ok ? 'restored' : 'restore_failed';");
  });

  it('текст предложения совпадает с утверждённым в онбординге (паритет)', () => {
    const onboarding = read('components/CleanOnboarding.tsx');
    const prompt = read('app/account_delete_restore_prompt.ts');
    for (const phrase of [
      "ru: 'Восстановить аккаунт?'",
      // 12.10: текст про дни — общая функция accountRestorePromptMessage (формы «1 день / 3 дня / 5 дней»).
      'accountRestorePromptMessage(lang, days)',
      "ru: 'Не восстанавливать'",
      "ru: 'Восстановить'",
    ]) {
      expect(onboarding).toContain(phrase);
      expect(prompt).toContain(phrase);
    }
  });
});
