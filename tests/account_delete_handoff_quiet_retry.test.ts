// зачем (правило владельца 22.09 «удаление не имеет права не пройти», окон об удалении нет; координатор 25.10):
// в новых окнах отказ быстрой фазы повторяется сам; окна «Не получилось» нет, человек остаётся в аккаунте; сбой после
// точки невозврата досылает замок при запуске и перед входом (ensureFreshPostDeletionIdentity) — путь проверяем по коду.
import { readSource } from './helpers/read_source';

jest.mock('../app/auth_provider', () => ({}));

/* eslint-disable import/first */
import {
  retryAccountDeleteHandoffQuietly,
  setAccountDeleteHandoffRetryDelaysForTest,
} from '../app/account_delete_handoff_retry';

const okHandoff = { ok: true as const, completion: Promise.resolve({ ok: true, cloudDeleted: true }) };

beforeEach(() => {
  setAccountDeleteHandoffRetryDelaysForTest([0, 0]);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('тихие повторы быстрой фазы удаления', () => {
  it('отказ, потом успех — повтор сам, без окна', async () => {
    const attempt = jest.fn()
      .mockResolvedValueOnce({ ok: false, reason: 'pending_guard_persist_failed' })
      .mockResolvedValueOnce(okHandoff);
    await expect(retryAccountDeleteHandoffQuietly(attempt, 'grace')).resolves.toBe(okHandoff);
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('исключение считается отказом и тоже повторяется', async () => {
    const attempt = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'secure_store_busy' }))
      .mockResolvedValueOnce(okHandoff);
    await expect(retryAccountDeleteHandoffQuietly(attempt, 'now')).resolves.toBe(okHandoff);
    expect(console.warn).toHaveBeenCalledWith('[ACCOUNT-DELETE-UI] handoff_threw attempt=1 mode=now code=secure_store_busy');
  });

  it('потолок: 3 попытки, затем отказ с причиной в журнале', async () => {
    const attempt = jest.fn().mockResolvedValue({ ok: false, reason: 'clean_recovery_transition_active' });
    await expect(retryAccountDeleteHandoffQuietly(attempt, 'grace')).resolves.toEqual({ ok: false, reason: 'clean_recovery_transition_active' });
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenCalledWith('[ACCOUNT-DELETE-UI] handoff_gave_up attempts=3 mode=grace reason=clean_recovery_transition_active');
  });
});

describe('окно удаления: новые окна без окон отказа, прежнее — как было', () => {
  const modal = readSource('components/DeleteAccountConfirmModal.tsx');
  const confirm = modal.slice(modal.indexOf('const handleConfirmDelete'), modal.indexOf('const handleCancel'));

  it('вариант Б: тихие повторы и ранний выход без showInfoAlert — и при отказе, и при исключении', () => {
    expect(confirm).toContain('const res = variantB ? await retryAccountDeleteHandoffQuietly(attemptHandoff, mode) : await attemptHandoff();');
    const rejected = confirm.slice(confirm.indexOf('if (!res.ok) {'), confirm.indexOf("traceAccountDeleteUi('local_delete_committed');"));
    expect(rejected.indexOf('if (variantB) {')).toBeLessThan(rejected.indexOf('showInfoAlert('));
    expect(rejected).toContain('[ACCOUNT-DELETE-UI] handoff_failed_silent');
    const threw = confirm.slice(confirm.indexOf('} catch (error: unknown) {'));
    expect(threw.indexOf('if (variantB) {')).toBeLessThan(threw.indexOf('showInfoAlert('));
  });

  it('сбой после точки невозврата досылается при запуске и перед входом (замок удаления)', () => {
    const layout = readSource('app/_layout.tsx');
    expect(layout).toContain("const freshIdentity = await ensureFreshPostDeletionIdentity('startup');");
    const auth = readSource('app/auth_provider.ts');
    expect(auth).toContain('const result = await ensureFreshPostDeletionIdentity(\'foreground\');');
    // повтор постановки шлёт тот же номер операции → признак «навсегда» (account_delete_now) сохраняется
    expect(auth).toContain('const op = startCloudDeletionEnqueue(lock.stableId, proof, ...retryAccountsV2Args);');
  });
});
