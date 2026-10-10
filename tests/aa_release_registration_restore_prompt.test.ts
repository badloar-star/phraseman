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
      'ru: `Этот аккаунт помечен на удаление. Осталось ${days} дн. — весь прогресс ещё на месте и вернётся полностью.`',
      "ru: 'Не восстанавливать'",
      "ru: 'Восстановить'",
    ]) {
      expect(onboarding).toContain(phrase);
      expect(prompt).toContain(phrase);
    }
  });
});
