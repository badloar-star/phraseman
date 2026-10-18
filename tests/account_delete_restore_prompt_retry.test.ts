// зачем (владелец 18.10 «ни один вход без ошибки, кроме «нет сети»»; разбор sign-in-refusals-audit п.5/6):
// статус удаления и «Восстановить» повторяются тихо при сбое сети; «замок снят» и «статус не получен» — отдельные исходы,
// а не общая карточка «Вход не завершился».
jest.mock('../app/themed_blocking_alert_queue', () => ({
  THEMED_ALERT_DISMISSED: 'dismiss',
  enqueueThemedBlockingInfoAlert: () => Promise.resolve(),
  // Кнопка «Восстановить» нажимается сразу.
  enqueueThemedBlockingChoiceAlert: () => Promise.resolve('restore'),
}));
const statusMock = jest.fn();
const restoreMock = jest.fn();
jest.mock('../app/account_delete_restore_client', () => ({
  fetchAccountDeleteStatus: () => statusMock(),
  restoreDeletedAccount: () => restoreMock(),
}));

import {
  promptAccountRestoreAfterSignInRefusal,
  setAccountRestoreRetryDelaysForTest,
} from '../app/account_delete_restore_prompt';

beforeEach(() => {
  statusMock.mockReset();
  restoreMock.mockReset();
  setAccountRestoreRetryDelaysForTest([0, 0]);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

const restorable = { pending: true, restorable: true, daysLeft: 5 };

test('сбой сети при «Восстановить» повторяется тихо; со второго раза — restored', async () => {
  statusMock.mockResolvedValue(restorable);
  restoreMock.mockResolvedValueOnce({ ok: false, reason: 'network' }).mockResolvedValueOnce({ ok: true });
  await expect(promptAccountRestoreAfterSignInRefusal('ru')).resolves.toBe('restored');
  expect(restoreMock).toHaveBeenCalledTimes(2);
});

test('сеть так и не ответила — restore_failed после трёх попыток', async () => {
  statusMock.mockResolvedValue(restorable);
  restoreMock.mockResolvedValue({ ok: false, reason: 'network' });
  await expect(promptAccountRestoreAfterSignInRefusal('ru')).resolves.toBe('restore_failed');
  expect(restoreMock).toHaveBeenCalledTimes(3);
});

test('not_restorable от сервера не повторяется', async () => {
  statusMock.mockResolvedValue(restorable);
  restoreMock.mockResolvedValue({ ok: false, reason: 'not_restorable' });
  await expect(promptAccountRestoreAfterSignInRefusal('ru')).resolves.toBe('restore_failed');
  expect(restoreMock).toHaveBeenCalledTimes(1);
});

test('статус: сбой сети повторяется тихо; не получен совсем — status_unavailable («нет сети»)', async () => {
  statusMock.mockResolvedValueOnce(null).mockResolvedValueOnce(restorable);
  restoreMock.mockResolvedValue({ ok: true });
  await expect(promptAccountRestoreAfterSignInRefusal('ru')).resolves.toBe('restored');
  expect(statusMock).toHaveBeenCalledTimes(2);

  statusMock.mockReset();
  statusMock.mockResolvedValue(null);
  await expect(promptAccountRestoreAfterSignInRefusal('ru')).resolves.toBe('status_unavailable');
  expect(statusMock).toHaveBeenCalledTimes(3);
});

test('удаления больше нет (pending=false) — lock_released: вход можно тихо повторить', async () => {
  statusMock.mockResolvedValue({ pending: false, restorable: false });
  await expect(promptAccountRestoreAfterSignInRefusal('ru')).resolves.toBe('lock_released');
  expect(restoreMock).not.toHaveBeenCalled();
});

test('срок вышел (pending, но не restorable) — по-прежнему not_restorable', async () => {
  statusMock.mockResolvedValue({ pending: true, restorable: false });
  await expect(promptAccountRestoreAfterSignInRefusal('ru')).resolves.toBe('not_restorable');
});
