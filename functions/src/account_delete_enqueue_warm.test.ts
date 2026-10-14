import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// зачем (координатор 14.10): прогрев accountDeleteEnqueue с экрана удаления сокращает ack (холодный старт ≈9,5 с из 17,2 с),
// но НИКОГДА не имеет права поставить удаление. Сторож: ветка warm отвечает до любой работы с данными — Firestore и Auth
// в этом тесте бросают при первом обращении, а значит задача, метка и маркер записаны быть не могут.
jest.mock('firebase-admin', () => {
  const actual = jest.requireActual('firebase-admin');
  const firestore = Object.assign(jest.fn(() => {
    throw new Error('warm_must_not_touch_firestore');
  }), actual.firestore);
  return {
    ...actual,
    firestore,
    auth: jest.fn(() => {
      throw new Error('warm_must_not_touch_auth');
    }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const accountDelete = require('./account_delete') as typeof import('./account_delete');

const SRC = readFileSync(join(__dirname, 'account_delete.ts'), 'utf8');
const JOB_SRC = readFileSync(join(__dirname, 'account_delete_job.ts'), 'utf8');
const WORKER_SRC = readFileSync(join(__dirname, 'account_delete_worker.ts'), 'utf8');

const call = (data: unknown, uid: string | null = 'warm-test-uid') => accountDelete.accountDeleteEnqueue.run({
  auth: uid ? { uid, token: {} } : undefined,
  data,
  rawRequest: { headers: {} },
  app: undefined,
  instanceIdToken: undefined,
} as never);

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('accountDeleteEnqueue: прогрев никогда не ставит удаление', () => {
  it('признак прогрева — только warm === true', () => {
    expect(accountDelete.isAccountDeleteWarmRequest({ warm: true })).toBe(true);
    for (const data of [undefined, null, {}, { warm: 'true' }, { warm: 1 }, 'warm', { warmup: true }]) {
      expect(accountDelete.isAccountDeleteWarmRequest(data)).toBe(false);
    }
  });

  it('warm отвечает { ok, warm } без Firestore и Auth — задача, метка и маркер не пишутся', async () => {
    await expect(call({ warm: true })).resolves.toEqual({ ok: true, warm: true });
  });

  it('warm остаётся прогревом даже с ключом удаления в теле — удаление так не поставить', async () => {
    await expect(call({
      warm: true,
      operationId: 'op-0123456789abcdef',
      capability: 'c'.repeat(64),
      stableId: 'stable-x',
    })).resolves.toEqual({ ok: true, warm: true });
  });

  it('без входа прогрев отклоняется', async () => {
    await expect(call({ warm: true }, null)).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('ветка warm стоит в обработчике раньше трассировки и постановки в очередь', () => {
    const handler = SRC.slice(SRC.indexOf('export const accountDeleteEnqueue = onCall('));
    const warmAt = handler.indexOf('if (isAccountDeleteWarmRequest(request.data))');
    expect(warmAt).toBeGreaterThan(0);
    expect(warmAt).toBeLessThan(handler.indexOf('createAccountDeleteEnqueueTrace()'));
    expect(warmAt).toBeLessThan(handler.indexOf('enqueueAndReleaseAuthenticatedAccount('));
  });
});

describe('[ACCOUNT-DELETE-ENQUEUE] / [ACCOUNT-DELETE-JOB] / [ACCOUNT-DELETE-SWEEP] — сперва логи', () => {
  it('трассировка пишет стадию, длительность стадии и время от старта; сбой — стадию, после которой упало', () => {
    let t = 1_000;
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const trace = accountDelete.createAccountDeleteEnqueueTrace(() => t);
    t = 1_250;
    trace.mark('proof_ok');
    t = 2_000;
    trace.mark('enqueued', { status: 'queued' });
    trace.fail(Object.assign(new Error('boom'), { code: 'unavailable' }));
    const lines = log.mock.calls.map(([line]) => JSON.parse(String(line)));
    expect(lines[0]).toMatchObject({ tag: '[ACCOUNT-DELETE-ENQUEUE]', stage: 'proof_ok', ms: 250, sinceStartMs: 250 });
    expect(lines[1]).toMatchObject({ stage: 'enqueued', ms: 750, sinceStartMs: 1000, status: 'queued' });
    expect(JSON.parse(String(warn.mock.calls[0][0]))).toMatchObject({ afterStage: 'enqueued', code: 'unavailable' });
  });

  it('каждый ранний выход захвата задачи пишет причину', () => {
    const body = JOB_SRC.slice(JOB_SRC.indexOf('export async function processAccountDeletionJob('), JOB_SRC.indexOf('if (!claimed) {'));
    const returns = body.match(/return null;/g)?.length ?? 0;
    expect(returns).toBeGreaterThanOrEqual(5);
    expect(body.match(/skip = \{ reason:/g)?.length ?? 0).toBe(returns);
    expect(JOB_SRC).toContain("event: 'account_delete_job_skip', tag: '[ACCOUNT-DELETE-JOB]'");
    expect(JOB_SRC).not.toMatch(/if \(!claimed\) return;/);
  });

  it('проход крона всегда оставляет итог, даже когда делать нечего', () => {
    expect(WORKER_SRC).toContain("event: 'account_delete_sweep', tag: '[ACCOUNT-DELETE-SWEEP]'");
  });

  it('в журналах удаления нет uid', () => {
    const traceSrc = SRC.slice(SRC.indexOf('export function createAccountDeleteEnqueueTrace'), SRC.indexOf('export type AccountDeleteGuestToken'));
    expect(traceSrc).not.toMatch(/authUid|stableUid|email/);
  });
});
