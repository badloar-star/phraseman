import {
  accountsV2PurgeRequired,
  ACCOUNTS_V2_FLAGS_CACHE_MS,
  ACCOUNTS_V2_FLAGS_DOC,
  ACCOUNTS_V2_FLAGS_OFF,
  ACCOUNTS_V2_FLAGS_ERROR_CACHE_MS,
  createAccountsV2FlagsReader,
  parseAccountsV2Flags,
} from './accounts_v2_flags';

/*
 * Account V2, Пакет 6A — серверный флаг включения.
 * зачем: деплой Пакета 6A не должен ничего менять для людей. Флаг — один
 * документ config/accounts_v2, выключен по умолчанию и при любой порче,
 * читается не чаще раза в 5 минут на инстанс.
 */

describe('parseAccountsV2Flags: выключено по умолчанию', () => {
  it('нет документа — всё выключено', () => {
    expect(parseAccountsV2Flags(null)).toEqual(ACCOUNTS_V2_FLAGS_OFF);
    expect(parseAccountsV2Flags(undefined)).toEqual(ACCOUNTS_V2_FLAGS_OFF);
  });

  it('включает только строгое true', () => {
    expect(parseAccountsV2Flags({ syncEnabled: true, deletionPurgeEnabled: true, everEnabled: true }))
      .toEqual({ syncEnabled: true, deletionPurgeEnabled: true, everEnabled: true });
    expect(parseAccountsV2Flags({ syncEnabled: 'true', deletionPurgeEnabled: 1, everEnabled: 'yes' })).toEqual(ACCOUNTS_V2_FLAGS_OFF);
    expect(parseAccountsV2Flags({ syncEnabled: true })).toEqual({ syncEnabled: true, deletionPurgeEnabled: false, everEnabled: false });
  });

  it('путь документа зафиксирован', () => {
    expect(ACCOUNTS_V2_FLAGS_DOC).toBe('config/accounts_v2');
    expect(ACCOUNTS_V2_FLAGS_CACHE_MS).toBeLessThanOrEqual(5 * 60_000);
  });
});

describe('createAccountsV2FlagsReader: кэш инстанса', () => {
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('одно чтение на окно кэша, затем перечитывает', async () => {
    let now = 1_000;
    const load = jest.fn(async () => ({ syncEnabled: true, everEnabled: true }));
    const reader = createAccountsV2FlagsReader(load, () => now);
    expect(await reader.read()).toEqual({ ok: true, flags: { syncEnabled: true, deletionPurgeEnabled: false, everEnabled: true } });
    now += ACCOUNTS_V2_FLAGS_CACHE_MS - 1;
    await reader.read();
    expect(load).toHaveBeenCalledTimes(1);
    now += 1;
    await reader.read();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('параллельные вызовы делят одно чтение', async () => {
    const load = jest.fn(async () => null);
    const reader = createAccountsV2FlagsReader(load, () => 5);
    await Promise.all([reader.read(), reader.read(), reader.read()]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('сбой чтения — ok:false (решает вызывающий), с логом, короткий кэш отказа', async () => {
    let now = 10;
    const failure = Object.assign(new Error('boom'), { code: 14 });
    const load = jest.fn(async () => { throw failure; });
    const reader = createAccountsV2FlagsReader(load, () => now);
    expect(await reader.read()).toEqual({ ok: false, flags: ACCOUNTS_V2_FLAGS_OFF, lastGood: null });
    await reader.read();
    expect(load).toHaveBeenCalledTimes(1);
    now += ACCOUNTS_V2_FLAGS_ERROR_CACHE_MS;
    await reader.read();
    expect(load).toHaveBeenCalledTimes(2);
    expect(error.mock.calls.join(' ')).toContain('[ACCOUNTS-V2-FLAGS] read_failed');
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});

describe('Ремонт №1 (P2): липкая метка «V2 когда-либо включали»', () => {
  beforeEach(() => {
    for (const level of ['log', 'warn', 'error'] as const) jest.spyOn(console, level).mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('стирание обязательно при любом флаге или метке', () => {
    expect(accountsV2PurgeRequired(ACCOUNTS_V2_FLAGS_OFF)).toBe(false);
    expect(accountsV2PurgeRequired({ ...ACCOUNTS_V2_FLAGS_OFF, syncEnabled: true })).toBe(true);
    expect(accountsV2PurgeRequired({ ...ACCOUNTS_V2_FLAGS_OFF, deletionPurgeEnabled: true })).toBe(true);
    expect(accountsV2PurgeRequired({ ...ACCOUNTS_V2_FLAGS_OFF, everEnabled: true })).toBe(true);
  });

  it('увидел флаг включённым без метки — сперва ставит метку, потом отдаёт «вкл»', async () => {
    const mark = jest.fn(async () => undefined);
    const reader = createAccountsV2FlagsReader(async () => ({ syncEnabled: true }), () => 1, mark);
    expect(await reader.read()).toEqual({ ok: true, flags: { syncEnabled: true, deletionPurgeEnabled: false, everEnabled: true } });
    expect(mark).toHaveBeenCalledTimes(1);
  });

  it('метку записать не удалось — «вкл» не отдаём (ok:false)', async () => {
    const reader = createAccountsV2FlagsReader(async () => ({ deletionPurgeEnabled: true }), () => 1, async () => { throw new Error('down'); });
    expect((await reader.read()).ok).toBe(false);
  });

  it('метка уже стоит или флаги выключены — записи нет', async () => {
    const mark = jest.fn(async () => undefined);
    await createAccountsV2FlagsReader(async () => ({ syncEnabled: true, everEnabled: true }), () => 1, mark).read();
    await createAccountsV2FlagsReader(async () => ({ everEnabled: true }), () => 1, mark).read();
    await createAccountsV2FlagsReader(async () => null, () => 1, mark).read();
    expect(mark).not.toHaveBeenCalled();
  });

  it('сбой чтения после удачного — ok:false с последним удачным значением', async () => {
    let now = 0;
    let fail = false;
    const reader = createAccountsV2FlagsReader(async () => {
      if (fail) throw new Error('down');
      return { everEnabled: true };
    }, () => now);
    await reader.read();
    fail = true;
    now += ACCOUNTS_V2_FLAGS_CACHE_MS;
    expect(await reader.read()).toEqual({
      ok: false, flags: ACCOUNTS_V2_FLAGS_OFF, lastGood: { syncEnabled: false, deletionPurgeEnabled: false, everEnabled: true },
    });
  });
});
