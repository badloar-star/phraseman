import {
  ACCOUNTS_V2_CLIENT_TOO_OLD_CODE,
  AccountsV2ServerDisabledWait,
  accountsV2GateRejection,
  createAccountSyncCallableSend,
  isAccountsV2DisabledError,
} from '../modules/account-session-v2/account_sync_callable_transport';
import {
  __resetAccountsV2ClientVersionForTests,
  parseAccountsV2ClientVersion,
  readAccountsV2ClientVersion,
  withAccountsV2ClientVersion,
} from '../modules/account-session-v2/account_v2_client_version';
import type { AccountSyncWireBatch } from '../modules/account-session-v2/account_sync';

/*
 * Пакет 8F (PM-235 T2), клиент: версия сборки едет в каждом вызове V2; на `client_too_old`
 * отправка останавливается как при «сервер выключен» — без повторов и без карантина.
 */

jest.mock('expo-constants', () => ({ __esModule: true, default: { nativeBuildVersion: '130' } }));

const batch = { schemaVersion: 1, batchId: 'b1', operations: [] } as unknown as AccountSyncWireBatch;
const tooOld = Object.assign(new Error(ACCOUNTS_V2_CLIENT_TOO_OLD_CODE), {
  code: 'functions/failed-precondition', details: { final: true, code: ACCOUNTS_V2_CLIENT_TOO_OLD_CODE },
});

let warn: jest.SpyInstance;
let log: jest.SpyInstance;
beforeEach(() => {
  __resetAccountsV2ClientVersionForTests();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => { warn.mockRestore(); log.mockRestore(); });

describe('8F — версия сборки клиента', () => {
  test('номер сборки: целое ≥ 1, иначе 0', () => {
    expect(parseAccountsV2ClientVersion('130')).toBe(130);
    expect(parseAccountsV2ClientVersion(131)).toBe(131);
    for (const raw of ['', '1.6.24', '0', 'abc', '1e3', '0x10', null, undefined, -3]) expect(parseAccountsV2ClientVersion(raw)).toBe(0);
    expect(readAccountsV2ClientVersion()).toBe(130);
  });

  test('добавление версии не меняет исходные данные', () => {
    const request = { cursor: null, limit: 5 };
    expect(withAccountsV2ClientVersion(request, 130)).toEqual({ cursor: null, limit: 5, clientVersion: 130 });
    expect(request).toEqual({ cursor: null, limit: 5 });
  });
});

describe('8F — транспорт синхронизации', () => {
  test('вызов несёт clientVersion сборки', async () => {
    const call = jest.fn(async () => ({ data: { receipts: [], serverNowMs: 1 } }));
    await createAccountSyncCallableSend({ call, onServerDisabled: () => undefined })(batch);
    expect(call).toHaveBeenCalledWith({ ...batch, clientVersion: 130 });
  });

  test('client_too_old: остановка отправки (как «выключен»), ожидание вместо карантина, лог', async () => {
    const onServerDisabled = jest.fn();
    const send = createAccountSyncCallableSend({ call: async () => { throw tooOld; }, onServerDisabled });
    await expect(send(batch)).rejects.toBeInstanceOf(AccountsV2ServerDisabledWait);
    expect(onServerDisabled).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls.map((args) => String(args[0]))).toContain('[ACCOUNT-V2] client_too_old -> v2_stopped_for_this_build');
  });

  test('распознавание ворот: по details и по тексту; прочие отказы — нет', () => {
    expect(accountsV2GateRejection(tooOld)).toBe('client_too_old');
    expect(accountsV2GateRejection({ code: 'failed-precondition', message: 'client_too_old' })).toBe('client_too_old');
    expect(accountsV2GateRejection({ code: 'failed-precondition', details: { code: 'accounts_v2_disabled' } })).toBe('accounts_v2_disabled');
    expect(isAccountsV2DisabledError({ code: 'failed-precondition', details: { code: 'uid_mismatch' }, message: 'uid_mismatch' })).toBe(false);
    expect(isAccountsV2DisabledError({ code: 'invalid-argument', message: 'client_too_old' })).toBe(false);
  });
});
