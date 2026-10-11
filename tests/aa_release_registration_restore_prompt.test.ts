/**
 * Релизный пол 10.10: окно входа (Настройки / после урока / после «Выйти»)
 * на `account_delete_pending` предлагает «Восстановить аккаунт?», как онбординг.
 */
import fs from 'fs';
import path from 'path';

const alerts: Array<{ title: string; buttons: Array<{ text: string; onPress?: () => void }> }> = [];
jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (options: Record<string, unknown>) => options.android ?? options.default },
  Alert: {
    alert: (title: string, _body: string, buttons: Array<{ text: string; onPress?: () => void }>) => {
      alerts.push({ title, buttons });
    },
  },
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
