import * as fs from 'fs';
import * as path from 'path';
import {
  ACCOUNTS_V2_CLIENT_TOO_OLD,
  ACCOUNTS_V2_CLIENT_VERSION_FIELD,
  accountsV2ClientTooOld,
  parseMinClientVersion,
  splitClientVersion,
} from './accounts_v2_client_version';
import { parseAccountsV2Flags, type AccountsV2FlagsReader } from './accounts_v2_flags';
import { handleAccountsV2SyncGated } from './accounts_v2_adapter/callable';
import { handleAccountsV2PullMine } from './accounts_v2_adapter/pull_mine';
import { handleAccountsV2MigrateMine } from './accounts_v2_adapter/migrate_mine';

/*
 * Пакет 8F (PM-235 T2): сервер V2 отвечает client_too_old сборкам ниже
 * config/accounts_v2.minClientVersion; минимум 0 — поведение не меняется.
 */

const AUTH = { uid: 'uid-8f' };

function flagsWith(minClientVersion?: number): AccountsV2FlagsReader {
  return {
    read: async () => ({
      ok: true,
      flags: { syncEnabled: true, deletionPurgeEnabled: false, everEnabled: true, ...(minClientVersion === undefined ? {} : { minClientVersion }) },
    }),
  };
}

/** Любое обращение к хранилищу — ошибка: проверка версии обязана быть до чтений. */
function untouchable<T>(): T {
  return new Proxy({}, { get: (_target, key) => { throw new Error(`storage_touched:${String(key)}`); } }) as T;
}

async function reasonOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'resolved';
  } catch (error) {
    const details = (error as { details?: { code?: string } }).details;
    return details?.code ?? (error as Error).message;
  }
}

describe('8F — версия клиента: чистые функции', () => {
  it('минимум: целое ≥ 1, иначе 0 (выкл)', () => {
    expect(parseMinClientVersion(131)).toBe(131);
    for (const raw of [0, -1, 1.5, '131', null, undefined, Number.NaN]) expect(parseMinClientVersion(raw)).toBe(0);
  });

  it('флаги: minClientVersion только при ≥ 1, иначе ключа нет (старые сравнения флагов не меняются)', () => {
    expect(parseAccountsV2Flags({ syncEnabled: true, minClientVersion: 131 })).toEqual({
      syncEnabled: true, deletionPurgeEnabled: false, everEnabled: false, minClientVersion: 131,
    });
    expect(parseAccountsV2Flags({ syncEnabled: true, minClientVersion: 0 })).not.toHaveProperty('minClientVersion');
    expect(parseAccountsV2Flags({ syncEnabled: true, minClientVersion: 'x' })).not.toHaveProperty('minClientVersion');
  });

  it('split: версия из данных, данные без поля; нет поля / порча — версия 0', () => {
    expect(splitClientVersion({ cursor: null, limit: 5, clientVersion: 130 })).toEqual({ clientVersion: 130, data: { cursor: null, limit: 5 } });
    const original = { cursor: null };
    expect(splitClientVersion(original)).toEqual({ clientVersion: 0, data: original });
    expect(splitClientVersion({ clientVersion: '130' }).clientVersion).toBe(0);
    expect(splitClientVersion({ clientVersion: 0 }).clientVersion).toBe(0);
    expect(splitClientVersion(null)).toEqual({ clientVersion: 0, data: null });
  });

  it('client_too_old: только при минимуме > 0 и версии ниже', () => {
    expect(accountsV2ClientTooOld(undefined, 0)).toBe(false);
    expect(accountsV2ClientTooOld(0, 0)).toBe(false);
    expect(accountsV2ClientTooOld(131, 130)).toBe(true);
    expect(accountsV2ClientTooOld(131, 131)).toBe(false);
    expect(accountsV2ClientTooOld(131, 0)).toBe(true);
  });

  it('паритет: клиент шлёт то же поле и тот же код отказа', () => {
    const root = path.join(__dirname, '..', '..');
    const client = fs.readFileSync(path.join(root, 'modules', 'account-session-v2', 'account_v2_client_version.ts'), 'utf8');
    const transport = fs.readFileSync(path.join(root, 'modules', 'account-session-v2', 'account_sync_callable_transport.ts'), 'utf8');
    expect(client).toContain(`export const ACCOUNT_V2_CLIENT_VERSION_FIELD = '${ACCOUNTS_V2_CLIENT_VERSION_FIELD}';`);
    expect(transport).toContain(`export const ACCOUNTS_V2_CLIENT_TOO_OLD_CODE = '${ACCOUNTS_V2_CLIENT_TOO_OLD}';`);
  });
});

describe('8F — ворота V2-функций', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => warn.mockRestore());

  it('ниже минимума: sync / pull / migrate — client_too_old ДО любых чтений и записей', async () => {
    const data = { cursor: null, limit: 5, clientVersion: 130 };
    expect(await reasonOf(handleAccountsV2SyncGated(untouchable(), { auth: AUTH, data }, flagsWith(131)))).toBe('client_too_old');
    expect(await reasonOf(handleAccountsV2PullMine(untouchable(), { auth: AUTH, data }, flagsWith(131)))).toBe('client_too_old');
    expect(await reasonOf(handleAccountsV2MigrateMine(untouchable(), { auth: AUTH, data: { clientVersion: 130 } }, flagsWith(131)))).toBe('client_too_old');
    // старая сборка без поля = версия 0
    expect(await reasonOf(handleAccountsV2PullMine(untouchable(), { auth: AUTH, data: { cursor: null, limit: 5 } }, flagsWith(131)))).toBe('client_too_old');
    expect(warn.mock.calls.map((args) => String(args[0])).filter((line) => line.includes('reason=client_too_old'))).toHaveLength(4);
  });

  it('минимум 0 / нет / версия не ниже: ворота пропускают, поле версии строгий разбор не ломает', async () => {
    // pull: дошли до хранилища (а не invalid_request request_unknown_field)
    expect(await reasonOf(handleAccountsV2PullMine(untouchable(), { auth: AUTH, data: { cursor: null, limit: 5, clientVersion: 130 } }, flagsWith())))
      .toMatch(/^(storage_touched:|retryable$)/);
    expect(await reasonOf(handleAccountsV2PullMine(untouchable(), { auth: AUTH, data: { cursor: null, limit: 5, clientVersion: 131 } }, flagsWith(131))))
      .toMatch(/^(storage_touched:|retryable$)/);
    // sync: без входа — дошли до проверки входа (ворота пройдены)
    expect(await reasonOf(handleAccountsV2SyncGated(untouchable(), { auth: null, data: { clientVersion: 130 } }, flagsWith(0)))).not.toBe('client_too_old');
    // migrate: дошли до хранилища
    expect(await reasonOf(handleAccountsV2MigrateMine(untouchable(), { auth: AUTH, data: { clientVersion: 140 } }, flagsWith(131))))
      .not.toBe('client_too_old');
  });
});
