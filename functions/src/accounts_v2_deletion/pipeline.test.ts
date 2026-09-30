import { readDeletionStatus, type DeletionReceiptStore } from './deletion_flow';
import {
  ACCOUNTS_V2_JOB_CURSOR_FIELD,
  ACCOUNTS_V2_JOB_RECEIPT_FIELD,
  AccountsV2PurgeIncompleteError,
  beginAccountsV2DeletionAtPointOfNoReturn,
  completeAccountsV2DeletionAtEnd,
  prepareAccountsV2DeletionAtEnqueue,
  purgeAccountsV2DeletionStage,
  revokeAccountsV2DeletionOnRollback,
  type AccountsV2DeletionPipelineDeps,
} from './pipeline';
import { ACCOUNTS_V2_DELETION_PURPOSE, deletionReceiptDocId, type DeletionPurgeCursor } from './receipt';

/*
 * Account V2, Пакет 6A — встраивание протокола удаления V2 в конвейер account_delete.
 * зачем: доказать на фейках без Firestore, что
 *  - флаг выключен → ноль чтений/записей (кроме одного чтения самого флага);
 *  - квитанция НЕ появляется при постановке, а публикуется только в точке
 *    невозврата (воркер взял созревшую задачу) и закрывается в конце;
 *  - стирание V2 возобновляемо с курсора задачи и укладывается в бюджет времени;
 *  - откат (пломба владельца на повторе) отзывает опубликованную квитанцию.
 */

const NOW = 1_790_000_000_000;
const AUTH_UID = 'AuthUid1234567890abcdefghij';
const STABLE_UID = 'StableUid234567890abcdefghi';
const JOB_ID = 'adel_job';
const key = (seed: number): string => Buffer.from(Array.from({ length: 32 }, (_unused, i) => (i * 29 + seed * 13 + 3) & 255)).toString('base64url');
const CRED = { operationId: 'op-v2-0123456789abcdef', capability: key(4) };
const RECEIPT_ID = deletionReceiptDocId(CRED.operationId);

type FlagSet = { syncEnabled: boolean; deletionPurgeEnabled: boolean; everEnabled: boolean };
type Flags = FlagSet & { ok: boolean; lastGood?: FlagSet | null };

function fakeDeps(options: { flags?: Partial<Flags>; job?: Record<string, unknown> | null } = {}) {
  const receipts = new Map<string, unknown>();
  const jobs = new Map<string, Record<string, unknown>>();
  if (options.job !== null) jobs.set(JOB_ID, { status: 'queued', ...(options.job ?? {}) });
  const counters = { flagReads: 0, receiptTx: 0, jobReads: 0, jobWrites: 0, purgeCalls: [] as { uid: string; cursor: DeletionPurgeCursor; maxCommits: number }[] };
  const flags: Flags = { ok: true, syncEnabled: false, deletionPurgeEnabled: true, everEnabled: false, ...(options.flags ?? {}) };
  let clock = NOW;
  let purgeScript: ({ done: boolean; cursor: DeletionPurgeCursor; deletedDocs: number } | Error)[] = [];
  const store: DeletionReceiptStore = {
    async transact(docId, work) {
      counters.receiptTx += 1;
      const current = receipts.has(docId) ? JSON.parse(JSON.stringify(receipts.get(docId))) : null;
      const { next, result } = work(current);
      if (next === 'delete') receipts.delete(docId);
      else if (next !== null) receipts.set(docId, JSON.parse(JSON.stringify(next)));
      return result;
    },
  };
  const deps: AccountsV2DeletionPipelineDeps = {
    flags: {
      async read() {
        counters.flagReads += 1;
        const set = { syncEnabled: flags.syncEnabled, deletionPurgeEnabled: flags.deletionPurgeEnabled, everEnabled: flags.everEnabled };
        return flags.ok ? { ok: true, flags: set } : { ok: false, flags: { syncEnabled: false, deletionPurgeEnabled: false, everEnabled: false }, lastGood: flags.lastGood ?? null };
      },
    },
    store,
    async purge(uid, purgeOptions) {
      counters.purgeCalls.push({ uid, cursor: purgeOptions.cursor, maxCommits: purgeOptions.maxCommits });
      const next = purgeScript.shift() ?? { done: true, cursor: null, deletedDocs: 3 };
      if (next instanceof Error) throw next;
      return { ...next, commits: 1 };
    },
    jobs: {
      async read(jobId) {
        counters.jobReads += 1;
        const job = jobs.get(jobId);
        return job === undefined ? null : JSON.parse(JSON.stringify(job));
      },
      async merge(jobId, fields) {
        counters.jobWrites += 1;
        jobs.set(jobId, { ...(jobs.get(jobId) ?? {}), ...JSON.parse(JSON.stringify(fields)) });
      },
    },
    nowMs: () => clock,
  };
  return {
    deps,
    receipts,
    jobs,
    counters,
    setPurge(script: typeof purgeScript) { purgeScript = script; },
    tick(ms: number) { clock += ms; },
  };
}

let logs: string[] = [];
beforeEach(() => {
  logs = [];
  for (const level of ['log', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation((...args: unknown[]) => { logs.push(args.join(' ')); });
  }
});
afterEach(() => jest.restoreAllMocks());

const allLogs = (): string => logs.join('\n');
const DEADLINE = NOW + 400_000;

describe('постановка удаления: только заготовка, квитанции нет', () => {
  it('нет ключа V2 — ноль чтений, даже флаг не читается', async () => {
    const fake = fakeDeps();
    expect(await prepareAccountsV2DeletionAtEnqueue(fake.deps, { jobId: JOB_ID, authUid: AUTH_UID, credential: undefined })).toBe('no_credential');
    expect(fake.counters).toMatchObject({ flagReads: 0, receiptTx: 0, jobReads: 0, jobWrites: 0 });
  });

  it('флаг выключен — ключ игнорируется, ноль записей', async () => {
    const fake = fakeDeps({ flags: { deletionPurgeEnabled: false } });
    expect(await prepareAccountsV2DeletionAtEnqueue(fake.deps, { jobId: JOB_ID, authUid: AUTH_UID, credential: CRED })).toBe('disabled');
    expect(fake.counters).toMatchObject({ flagReads: 1, receiptTx: 0, jobReads: 0, jobWrites: 0 });
    expect(fake.jobs.get(JOB_ID)).not.toHaveProperty(ACCOUNTS_V2_JOB_RECEIPT_FIELD);
  });

  it('флаг не прочитан — не готовим (удаление продолжается по-старому)', async () => {
    const fake = fakeDeps({ flags: { ok: false } });
    expect(await prepareAccountsV2DeletionAtEnqueue(fake.deps, { jobId: JOB_ID, authUid: AUTH_UID, credential: CRED })).toBe('flag_unavailable');
    expect(fake.counters.jobWrites).toBe(0);
  });

  it('флаг включён — заготовка в задаче без uid/секрета, квитанции ещё НЕТ', async () => {
    const fake = fakeDeps();
    expect(await prepareAccountsV2DeletionAtEnqueue(fake.deps, { jobId: JOB_ID, authUid: AUTH_UID, credential: CRED })).toBe('prepared');
    expect(fake.receipts.size).toBe(0);
    expect(fake.counters.receiptTx).toBe(0);
    const stored = JSON.stringify(fake.jobs.get(JOB_ID)?.[ACCOUNTS_V2_JOB_RECEIPT_FIELD]);
    expect(stored).toContain(RECEIPT_ID);
    expect(stored).not.toContain(AUTH_UID);
    expect(stored).not.toContain(CRED.capability);
    expect(stored).not.toContain(CRED.operationId);
    // Ключ до точки невозврата ничего не даёт: квитанции нет → отказ.
    await expect(readDeletionStatus(fake.deps.store, { purpose: ACCOUNTS_V2_DELETION_PURPOSE, ...CRED }, NOW))
      .rejects.toMatchObject({ code: 'denied' });
  });

  it('битый ключ — malformed, без записи, без исключения наружу', async () => {
    const fake = fakeDeps();
    expect(await prepareAccountsV2DeletionAtEnqueue(fake.deps, { jobId: JOB_ID, authUid: AUTH_UID, credential: { operationId: 'x', capability: 'y' } })).toBe('malformed');
    expect(fake.counters.jobWrites).toBe(0);
  });

  it('сбой записи заготовки — failed с логом, не бросает (старое удаление не ломается)', async () => {
    const fake = fakeDeps();
    fake.deps.jobs.merge = async () => { throw Object.assign(new Error('down'), { code: 14 }); };
    expect(await prepareAccountsV2DeletionAtEnqueue(fake.deps, { jobId: JOB_ID, authUid: AUTH_UID, credential: CRED })).toBe('failed');
    expect(allLogs()).toContain('enqueue prepare_failed');
  });
});

describe('точка невозврата: публикация квитанции', () => {
  async function prepared() {
    const fake = fakeDeps();
    await prepareAccountsV2DeletionAtEnqueue(fake.deps, { jobId: JOB_ID, authUid: AUTH_UID, credential: CRED });
    fake.tick(14 * 24 * 60 * 60 * 1000);
    return fake;
  }

  it('V2 никогда не включали — одно чтение задачи, ноль квитанций и записей', async () => {
    const fake = fakeDeps({ flags: { deletionPurgeEnabled: false } });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    expect(session.enabled).toBe(false);
    expect(fake.counters).toMatchObject({ flagReads: 1, receiptTx: 0, jobReads: 1, jobWrites: 0 });
    expect(allLogs()).toContain('skipped reason=flag_off');
  });

  it('флаг не прочитан, в задаче состояние V2 есть — не бросает, дочищает с курсора', async () => {
    const fake = fakeDeps({ flags: { ok: false }, job: { [ACCOUNTS_V2_JOB_CURSOR_FIELD]: { uid: AUTH_UID, collection: null, afterDocId: null } } });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    await purgeAccountsV2DeletionStage(fake.deps, session, { uids: [AUTH_UID], deadlineMs: DEADLINE });
    expect(fake.counters.purgeCalls).toHaveLength(1);
  });

  it('ремонт №2 P3: флаг неизвестен на холодном инстансе, задача пустая — стираем, удаление не падает', async () => {
    const fake = fakeDeps({ flags: { ok: false } });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    expect(session.enabled).toBe(true);
    await purgeAccountsV2DeletionStage(fake.deps, session, { uids: [STABLE_UID, AUTH_UID], deadlineMs: DEADLINE });
    expect(fake.counters.purgeCalls.map((call) => call.uid)).toEqual([STABLE_UID, AUTH_UID]);
    expect(allLogs()).toContain('pipeline enabled by=flag_unknown');
  });

  it('P3-1: флаг не прочитан — используется последнее удачное значение', async () => {
    // зачем: последнее удачное «V2 никогда не включали» — стирать нечего, не тратим чтения.
    const fake = fakeDeps({ flags: { ok: false, lastGood: { syncEnabled: false, deletionPurgeEnabled: false, everEnabled: false } } });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    expect(session.enabled).toBe(false);
  });

  it('публикует заготовку — ключ теперь видит accepted; повтор идемпотентен', async () => {
    const fake = await prepared();
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    expect(session).toMatchObject({ enabled: true, published: true });
    expect(fake.receipts.size).toBe(1);
    const status = await readDeletionStatus(fake.deps.store, { purpose: ACCOUNTS_V2_DELETION_PURPOSE, ...CRED }, NOW + 15 * 24 * 60 * 60 * 1000);
    expect(status).toEqual({ stage: 'accepted' });
    const again = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    expect(again.published).toBe(true);
    expect(fake.receipts.size).toBe(1);
  });

  it('нет задачи (мгновенное удаление) — работает без квитанции', async () => {
    const fake = fakeDeps({ job: null });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    expect(session).toMatchObject({ enabled: true, jobExists: false, prepared: null, published: false });
    expect(fake.receipts.size).toBe(0);
  });

  it('битая заготовка в задаче — лог ошибки, без публикации', async () => {
    const fake = fakeDeps({ job: { [ACCOUNTS_V2_JOB_RECEIPT_FIELD]: { receiptId: 'nope', record: {} } } });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    expect(session.prepared).toBeNull();
    expect(allLogs()).toContain('prepared_receipt_invalid');
  });

  it('сбой публикации — лог, удаление продолжается (решение 15: сервер доводит сам)', async () => {
    const fake = await prepared();
    fake.deps.store.transact = async () => { throw Object.assign(new Error('down'), { code: 14 }); };
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    expect(session).toMatchObject({ enabled: true, published: false });
    expect(allLogs()).toContain('publish_failed');
  });
});

describe('шаг стирания V2 в конвейере', () => {
  it('флаг выключен — шаг пропускается с логом, стирания нет', async () => {
    const fake = fakeDeps({ flags: { deletionPurgeEnabled: false } });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    expect(await purgeAccountsV2DeletionStage(fake.deps, session, { uids: [AUTH_UID], deadlineMs: DEADLINE })).toMatchObject({ skipped: true });
    expect(fake.counters.purgeCalls).toHaveLength(0);
    expect(allLogs()).toContain('purge skipped reason=flag_off');
  });

  it('стирает все личности замыкания (без дублей и небезопасных uid)', async () => {
    const fake = fakeDeps();
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    const result = await purgeAccountsV2DeletionStage(fake.deps, session, {
      uids: [STABLE_UID, AUTH_UID, AUTH_UID, '_deletion_receipts_v1', 'a/b'],
      deadlineMs: DEADLINE,
    });
    expect(result).toMatchObject({ skipped: false, deletedDocs: 6 });
    expect(fake.counters.purgeCalls.map((call) => call.uid)).toEqual([STABLE_UID, AUTH_UID]);
    expect(allLogs()).toContain('unsafe_uids=2');
    expect(allLogs()).not.toContain(AUTH_UID);
  });

  it('бюджет исчерпан — курсор в задачу и повторяемая ошибка; повтор продолжает с курсора', async () => {
    const fake = fakeDeps();
    const paused = { collection: 'accounts_v2_entities', afterDocId: 'e'.repeat(10) };
    fake.setPurge([{ done: true, cursor: null, deletedDocs: 1 }, { done: false, cursor: paused, deletedDocs: 450 }]);
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    await expect(purgeAccountsV2DeletionStage(fake.deps, session, { uids: [STABLE_UID, AUTH_UID], deadlineMs: DEADLINE }))
      .rejects.toBeInstanceOf(AccountsV2PurgeIncompleteError);
    expect(fake.jobs.get(JOB_ID)?.[ACCOUNTS_V2_JOB_CURSOR_FIELD]).toEqual({ uid: AUTH_UID, ...paused });

    const retry = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    fake.counters.purgeCalls.length = 0;
    await purgeAccountsV2DeletionStage(fake.deps, retry, { uids: [STABLE_UID, AUTH_UID], deadlineMs: DEADLINE });
    // зачем: STABLE_UID уже дочищен — повтор начинает с AUTH_UID и его курсора.
    expect(fake.counters.purgeCalls).toEqual([{ uid: AUTH_UID, cursor: paused, maxCommits: expect.any(Number) }]);
    expect(fake.jobs.get(JOB_ID)?.[ACCOUNTS_V2_JOB_CURSOR_FIELD]).toBeNull();
  });

  it('maxCommits берётся из остатка времени; нет времени — пауза без стирания', async () => {
    const fake = fakeDeps();
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    await purgeAccountsV2DeletionStage(fake.deps, session, { uids: [AUTH_UID], deadlineMs: NOW + 15_000 });
    expect(fake.counters.purgeCalls[0].maxCommits).toBe(10);
    fake.counters.purgeCalls.length = 0;
    await expect(purgeAccountsV2DeletionStage(fake.deps, session, { uids: [AUTH_UID], deadlineMs: NOW }))
      .rejects.toBeInstanceOf(AccountsV2PurgeIncompleteError);
    expect(fake.counters.purgeCalls).toHaveLength(0);
  });

  it('мгновенное удаление без задачи — курсор не пишется (не создаём задачу)', async () => {
    const fake = fakeDeps({ job: null });
    fake.setPurge([{ done: false, cursor: { collection: 'accounts_v2_ops', afterDocId: 'x' }, deletedDocs: 450 }]);
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    await expect(purgeAccountsV2DeletionStage(fake.deps, session, { uids: [AUTH_UID], deadlineMs: DEADLINE }))
      .rejects.toBeInstanceOf(AccountsV2PurgeIncompleteError);
    expect(fake.counters.jobWrites).toBe(0);
    expect(fake.jobs.size).toBe(0);
  });
});

describe('конец конвейера и откат', () => {
  it('конец конвейера — квитанция completed', async () => {
    const fake = fakeDeps();
    await prepareAccountsV2DeletionAtEnqueue(fake.deps, { jobId: JOB_ID, authUid: AUTH_UID, credential: CRED });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    await purgeAccountsV2DeletionStage(fake.deps, session, { uids: [AUTH_UID], deadlineMs: DEADLINE });
    expect(await completeAccountsV2DeletionAtEnd(fake.deps, session)).toBe('completed');
    const status = await readDeletionStatus(fake.deps.store, { purpose: ACCOUNTS_V2_DELETION_PURPOSE, ...CRED }, NOW + 1);
    expect(status).toEqual({ stage: 'completed' });
  });

  it('конец конвейера при выключенном флаге — ноль обращений', async () => {
    const fake = fakeDeps({ flags: { deletionPurgeEnabled: false } });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    expect(await completeAccountsV2DeletionAtEnd(fake.deps, session)).toBe('skipped');
    expect(fake.counters.receiptTx).toBe(0);
  });

  it('сбой завершения квитанции — лог, не бросает (данные уже стёрты)', async () => {
    const fake = fakeDeps();
    await prepareAccountsV2DeletionAtEnqueue(fake.deps, { jobId: JOB_ID, authUid: AUTH_UID, credential: CRED });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    fake.deps.store.transact = async () => { throw new Error('down'); };
    expect(await completeAccountsV2DeletionAtEnd(fake.deps, session)).toBe('failed');
    expect(allLogs()).toContain('complete_failed');
  });

  it('откат (пломба владельца на повторе) отзывает опубликованную квитанцию', async () => {
    const fake = fakeDeps();
    await prepareAccountsV2DeletionAtEnqueue(fake.deps, { jobId: JOB_ID, authUid: AUTH_UID, credential: CRED });
    await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    expect(fake.receipts.size).toBe(1);
    expect(await revokeAccountsV2DeletionOnRollback(fake.deps, { jobId: JOB_ID })).toBe('revoked');
    expect(fake.receipts.size).toBe(0);
    await expect(readDeletionStatus(fake.deps.store, { purpose: ACCOUNTS_V2_DELETION_PURPOSE, ...CRED }, NOW + 1))
      .rejects.toMatchObject({ code: 'denied' });
  });

  it('откат без заготовки — none, квитанции не читаются', async () => {
    const fake = fakeDeps();
    expect(await revokeAccountsV2DeletionOnRollback(fake.deps, { jobId: JOB_ID })).toBe('none');
    expect(fake.counters.receiptTx).toBe(0);
  });
});

describe('Ремонт №1 (P2): данные V2 не переживают удаление аккаунта', () => {
  const OFF = { syncEnabled: false, deletionPurgeEnabled: false, everEnabled: false };

  it('синхронизация включена, стирание выключено — стираем', async () => {
    const fake = fakeDeps({ flags: { ...OFF, syncEnabled: true } });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    await purgeAccountsV2DeletionStage(fake.deps, session, { uids: [AUTH_UID], deadlineMs: DEADLINE });
    expect(fake.counters.purgeCalls).toHaveLength(1);
  });

  it('оба флага выключены, но V2 когда-то включали (липкая метка) — стираем', async () => {
    const fake = fakeDeps({ flags: { ...OFF, everEnabled: true } });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    await purgeAccountsV2DeletionStage(fake.deps, session, { uids: [AUTH_UID], deadlineMs: DEADLINE });
    expect(fake.counters.purgeCalls).toHaveLength(1);
  });

  it('флаги и метку сняли между попытками, а в задаче заготовка — стираем и завершаем', async () => {
    const fake = fakeDeps();
    await prepareAccountsV2DeletionAtEnqueue(fake.deps, { jobId: JOB_ID, authUid: AUTH_UID, credential: CRED });
    const off = fakeDeps({ flags: OFF });
    off.jobs.set(JOB_ID, fake.jobs.get(JOB_ID) as Record<string, unknown>);
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(off.deps, { jobId: JOB_ID });
    expect(session).toMatchObject({ enabled: true, published: true });
    await purgeAccountsV2DeletionStage(off.deps, session, { uids: [AUTH_UID], deadlineMs: DEADLINE });
    expect(off.counters.purgeCalls).toHaveLength(1);
    expect(await completeAccountsV2DeletionAtEnd(off.deps, session)).toBe('completed');
  });

  it('флаги выключены, но в задаче курсор прерванного стирания — дочищаем', async () => {
    const fake = fakeDeps({ flags: OFF, job: { [ACCOUNTS_V2_JOB_CURSOR_FIELD]: { uid: AUTH_UID, collection: 'accounts_v2_ops', afterDocId: 'k' } } });
    const session = await beginAccountsV2DeletionAtPointOfNoReturn(fake.deps, { jobId: JOB_ID });
    await purgeAccountsV2DeletionStage(fake.deps, session, { uids: [AUTH_UID], deadlineMs: DEADLINE });
    expect(fake.counters.purgeCalls).toEqual([{ uid: AUTH_UID, cursor: { collection: 'accounts_v2_ops', afterDocId: 'k' }, maxCommits: expect.any(Number) }]);
  });
});
