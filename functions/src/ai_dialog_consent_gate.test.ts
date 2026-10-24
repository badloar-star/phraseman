import { __resetAiDialogConsentCacheForTests, checkAiDialogConsent } from './ai_dialog_consent_gate';

// зачем (Ревизор 22.10, 🔴; координатор): серверный шлюз согласия на ИИ-диалоги. Отказ — только под выключателем
// remote_config/app.bools.ai_dialog_consent_enforced; до включения — журнал would_refuse и пропуск.

type Docs = Record<string, Record<string, unknown> | undefined>;
function fakeDb(docs: Docs, opts: { switchThrows?: boolean; consentThrows?: boolean } = {}) {
  const reads: string[] = [];
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const path = `${name}/${id}`;
          reads.push(path);
          if (opts.switchThrows && path === 'remote_config/app') throw new Error('unavailable');
          if (opts.consentThrows && name === 'user_consents') throw new Error('deadline-exceeded');
          const data = docs[path];
          return { exists: data !== undefined, data: () => data, get: (field: string) => data?.[field] };
        },
      }),
    }),
  };
  return { db: db as never, reads };
}

describe('шлюз согласия на ИИ-диалоги', () => {
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;
  beforeEach(() => {
    __resetAiDialogConsentCacheForTests();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { warn.mockRestore(); log.mockRestore(); });

  test('согласие есть → пропуск; повтор в течение минуты не читает базу', async () => {
    const { db, reads } = fakeDb({ 'user_consents/u1': { aiDialogConsent: 'granted' } });
    await expect(checkAiDialogConsent({ db, stableUid: 'u1', callable: 't', nowMs: 1_000 })).resolves.toBeUndefined();
    await expect(checkAiDialogConsent({ db, stableUid: 'u1', callable: 't', nowMs: 30_000 })).resolves.toBeUndefined();
    expect(reads).toEqual(['user_consents/u1']);
  });

  test('согласия нет, выключатель выключен → журнал would_refuse и пропуск', async () => {
    const { db } = fakeDb({ 'remote_config/app': { bools: {} } });
    await expect(checkAiDialogConsent({ db, stableUid: 'u2', callable: 'premiumDialogSend' })).resolves.toBeUndefined();
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([expect.stringContaining('[AI-CONSENT] would_refuse')]);
  });

  test('согласия нет / отказано, выключатель включён → ai_consent_required', async () => {
    const on = { 'remote_config/app': { bools: { ai_dialog_consent_enforced: true } } };
    await expect(checkAiDialogConsent({ db: fakeDb(on).db, stableUid: 'u3', callable: 't' })).rejects.toThrow('ai_consent_required');
    __resetAiDialogConsentCacheForTests();
    await expect(checkAiDialogConsent({ db: fakeDb({ ...on, 'user_consents/u4': { aiDialogConsent: 'denied' } }).db, stableUid: 'u4', callable: 't' }))
      .rejects.toThrow('ai_consent_required');
  });

  test('выключатель не прочитался → людей не отрезаем (режим журнала), причина в журнале', async () => {
    const { db } = fakeDb({}, { switchThrows: true });
    await expect(checkAiDialogConsent({ db, stableUid: 'u5', callable: 't' })).resolves.toBeUndefined();
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual(expect.arrayContaining([expect.stringContaining('switch_read_failed')]));
  });

  test('согласие не прочиталось → пропуск даже при включённом выключателе, причина в журнале (Ревизор 24.10)', async () => {
    const { db, reads } = fakeDb({ 'remote_config/app': { bools: { ai_dialog_consent_enforced: true } } }, { consentThrows: true });
    await expect(checkAiDialogConsent({ db, stableUid: 'u7', callable: 't' })).resolves.toBeUndefined();
    const lines = warn.mock.calls.map((c) => String(c[0]));
    expect(lines).toEqual([expect.stringContaining('consent_read_failed'), expect.stringContaining('pass_unverified')]);
    expect(lines[0]).toContain('deadline-exceeded');
    expect(reads).toEqual(['user_consents/u7']);
  });

  test('отзыв согласия: отказано не кэшируется, granted живёт не дольше минуты', async () => {
    const docs: Docs = { 'user_consents/u6': { aiDialogConsent: 'granted' }, 'remote_config/app': { bools: { ai_dialog_consent_enforced: true } } };
    const { db } = fakeDb(docs);
    await checkAiDialogConsent({ db, stableUid: 'u6', callable: 't', nowMs: 0 });
    docs['user_consents/u6'] = { aiDialogConsent: 'denied' };
    await expect(checkAiDialogConsent({ db, stableUid: 'u6', callable: 't', nowMs: 61_000 })).rejects.toThrow('ai_consent_required');
  });
});
