/**
 * PM-231: mistakeHubAdvice не доверяет `day` клиента, держит суточный потолок
 * платных генераций ДО OpenAI и пишет billing-строку.
 */
export {};

type DocData = Record<string, unknown>;
const docs = new Map<string, DocData>();
let autoId = 0;

function refFor(path: string) {
  return {
    id: path.split('/').pop() || path,
    path,
    get: async () => ({ exists: docs.has(path), data: () => docs.get(path) }),
    set: async (data: DocData, opts?: { merge?: boolean }) => {
      docs.set(path, opts?.merge ? { ...(docs.get(path) ?? {}), ...data } : { ...data });
    },
  };
}

function fakeDb() {
  return {
    collection: (name: string) => ({
      doc: (id?: string) => refFor(`${name}/${id || `auto-${++autoId}`}`),
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: ReturnType<typeof refFor>) => Promise<{ data: () => DocData | undefined }>;
      set: (ref: ReturnType<typeof refFor>, data: DocData, opts?: { merge?: boolean }) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const result = await fn({
        get: (ref) => ref.get(),
        set: (ref, data, opts) => {
          writes.push(() => docs.set(ref.path, opts?.merge ? { ...(docs.get(ref.path) ?? {}), ...data } : { ...data }));
        },
      });
      writes.forEach((write) => write());
      return result;
    },
  };
}

class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));
jest.mock('firebase-functions/params', () => ({ defineSecret: () => ({ value: () => 'sk-test-key' }) }));
jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return { firestore };
});
jest.mock('./auth_identity', () => ({
  resolveStableUidForAuth: jest.fn(async (_db: unknown, authUid: string) => `stable-${authUid}`),
}));
jest.mock('./remote_gates', () => ({ aiGloballyDisabled: jest.fn(async () => false) }));
jest.mock('./openai_jobs_config', () => ({
  resolveJobConfig: jest.fn(async () => ({ enabled: true, model: 'gpt-4o-mini' })),
}));

import { mistakeHubAdvice as rawHandler, HUB_ADVICE_DAILY_GEN_CAP, BILLING_COLLECTION, cleanSummary } from './mistake_hub_advice';
import { PAID_AI_FETCH_TIMEOUT_MS } from './paid_ai_fetch_timeout';

type Req = { auth?: { uid: string }; data: DocData };
const handler = rawHandler as unknown as (req: Req) => Promise<{ ok: true; hub: string; map: string; fromCache: boolean }>;

const RU_ADVICE = JSON.stringify({
  hub: 'Чаще всего ты спотыкаешься на вопросах с do. Начни с них.',
  map: 'Больше всего ошибок приходит из уроков.',
});

function okFetch(): jest.Mock {
  return jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: RU_ADVICE } }],
      usage: { prompt_tokens: 120, completion_tokens: 40, total_tokens: 160 },
    }),
  }));
}

function billingRows(): DocData[] {
  return Array.from(docs.entries()).filter(([path]) => path.startsWith(`${BILLING_COLLECTION}/`)).map(([, d]) => d);
}

const baseData = { lang: 'ru', studyTarget: 'en', facets: [{ facet: 'form', count: 5 }] };

beforeEach(() => {
  docs.clear();
  autoId = 0;
  jest.useFakeTimers().setSystemTime(new Date('2026-09-30T10:00:00.000Z'));
  global.fetch = okFetch() as unknown as typeof fetch;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('mistakeHubAdvice PM-231 cost guards', () => {
  it('ignores the client-supplied day: a forged day is served from the same-day cache', async () => {
    const first = await handler({ auth: { uid: 'u1' }, data: { ...baseData, day: '2030-01-01' } });
    expect(first.fromCache).toBe(false);
    const second = await handler({ auth: { uid: 'u1' }, data: { ...baseData, day: '2031-05-05' } });
    expect(second.fromCache).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(docs.get('mistake_hub_advice/stable-u1')?.day).toBe('2026-09-30');
  });

  it('computes the day on the server in UTC', () => {
    const summary = cleanSummary({ ...baseData, day: '1999-12-31' }, Date.parse('2026-09-30T23:30:00.000Z'));
    expect(summary.day).toBe('2026-09-30');
  });

  it('rejects an unsupported interface language before any paid call', async () => {
    await expect(handler({ auth: { uid: 'u1' }, data: { ...baseData, lang: 'xx' } })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('caps paid generations per user per UTC day even when lang/studyTarget alternate', async () => {
    const combos = [
      { lang: 'ru', studyTarget: 'en' },
      { lang: 'uk', studyTarget: 'en' },
      { lang: 'ru', studyTarget: 'fr' },
    ];
    for (const combo of combos) {
      const lang = combo.lang;
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: lang === 'uk'
            ? JSON.stringify({ hub: 'Найчастіше ти помиляєшся у питаннях з do. Почни з них.', map: 'Більшість помилок з уроків.' })
            : RU_ADVICE } }],
          usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 },
        }),
      })) as unknown as typeof fetch;
      await handler({ auth: { uid: 'u2' }, data: { ...baseData, ...combo } });
    }
    expect(HUB_ADVICE_DAILY_GEN_CAP).toBe(3);
    global.fetch = okFetch() as unknown as typeof fetch;
    await expect(handler({ auth: { uid: 'u2' }, data: { ...baseData, lang: 'ru', studyTarget: 'en' } }))
      .rejects.toMatchObject({ code: 'resource-exhausted' });
    expect(global.fetch).not.toHaveBeenCalled();

    // Следующие UTC-сутки — лимит обнулился.
    jest.setSystemTime(new Date('2026-10-01T00:05:00.000Z'));
    await expect(handler({ auth: { uid: 'u2' }, data: { ...baseData, lang: 'ru', studyTarget: 'en' } }))
      .resolves.toMatchObject({ ok: true, fromCache: false });
  });

  it('writes a billing row with tokens/model/operation and no learner text', async () => {
    await handler({ auth: { uid: 'u3' }, data: { ...baseData, topPhrases: [{ phrase: 'Do you like tea', count: 3, facet: 'form' }] } });
    const rows = billingRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      uid: 'stable-u3',
      authUid: 'u3',
      operation: 'mistake_hub_advice',
      model: 'gpt-4o-mini',
      promptTokens: 120,
      completionTokens: 40,
      totalTokens: 160,
    });
    expect(JSON.stringify(rows[0])).not.toContain('Do you like tea');
  });

  it('passes a fetch timeout below the function ceiling and refunds the daily credit on timeout', async () => {
    const timeoutError = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
    const failing = jest.fn(async (_url: string, init: { signal?: AbortSignal }) => {
      expect(init.signal).toBeDefined();
      throw timeoutError;
    });
    global.fetch = failing as unknown as typeof fetch;
    for (let i = 0; i < HUB_ADVICE_DAILY_GEN_CAP + 1; i += 1) {
      await expect(handler({ auth: { uid: 'u4' }, data: baseData })).rejects.toMatchObject({ code: 'unavailable' });
    }
    // Одна попытка на вызов (не 3×30с), и кредит возвращается — тайм-ауты не сжигают лимит.
    expect(failing).toHaveBeenCalledTimes(HUB_ADVICE_DAILY_GEN_CAP + 1);
    expect(PAID_AI_FETCH_TIMEOUT_MS.mistakeHubAdvice).toBeLessThan(30_000);
    expect(billingRows()).toHaveLength(0);
  });
});
