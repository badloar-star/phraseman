export {};

/**
 * Тесты бэкстоп-модерации submitExplainReport.
 *
 * In-memory firestore fake — по образцу client_reports.test.ts (поддерживает tx.get/set/create
 * и collection().where().limit().get()), РАСШИРЕН оптимистической блокировкой по версии документа:
 * runTransaction повторяет колбэк, если прочитанный документ изменился между read и commit —
 * как настоящий Firestore. Это делает тест «параллельные репорты не проскакивают порог»
 * реальным (один из двух конкурентов перечитает и не двойного-инкрементит), а не декорацией.
 */

type DocData = Record<string, unknown>;

type FakeRef = {
  id: string;
  path: string;
  get: () => Promise<FakeSnap>;
  set: (data: DocData, opts?: { merge?: boolean }) => Promise<void>;
};

type FakeSnap = {
  id: string;
  exists: boolean;
  data: () => DocData | undefined;
};

const docs = new Map<string, DocData>();
// Версия каждого документа — растёт при любой записи. Транзакция фиксирует версии прочитанных
// документов и откатывается + повторяется, если на момент коммита версия изменилась.
const versions = new Map<string, number>();
let autoId = 0;

function bump(path: string): void {
  versions.set(path, (versions.get(path) ?? 0) + 1);
}

function writeDoc(path: string, data: DocData, merge?: boolean): void {
  docs.set(path, merge ? { ...(docs.get(path) ?? {}), ...data } : { ...data });
  bump(path);
}

function refFor(path: string): FakeRef {
  const id = path.split('/').pop() || path;
  return {
    id,
    path,
    get: async () => snapFor(path),
    set: async (data: DocData, opts?: { merge?: boolean }) => writeDoc(path, data, opts?.merge),
  };
}

function snapFor(path: string): FakeSnap {
  const data = docs.get(path);
  return {
    id: path.split('/').pop() || path,
    exists: data !== undefined,
    data: () => data,
  };
}

function collectionDocs(name: string): Array<{ id: string; path: string; data: DocData }> {
  const prefix = `${name}/`;
  return Array.from(docs.entries())
    .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
    .map(([docPath, data]) => ({ id: docPath.slice(prefix.length), path: docPath, data }));
}

// Глобальный «commit lock»: настоящий Firestore даёт serializable-изоляцию транзакций.
// Моделируем это очередью — каждая попытка транзакции (read+check+commit) выполняется,
// не перемежаясь с другой. Версионный retry остаётся вторичной защитой.
let txChain: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = txChain.then(task, task);
  // Звено цепочки не должно «застревать» на ошибке — гасим, реальную ошибку вернёт next.
  txChain = next.then(() => undefined, () => undefined);
  return next;
}

function fakeDb() {
  return {
    collection: (name: string) => ({
      doc: (id?: string) => refFor(`${name}/${id || `auto-${++autoId}`}`),
      where: (field: string, op: string, value: unknown) => {
        if (op !== '==') throw new Error(`unsupported op ${op}`);
        return {
          limit: (count: number) => ({
            get: async () => {
              const matches = collectionDocs(name)
                .filter((doc) => doc.data[field] === value)
                .slice(0, count)
                .map((doc) => ({ id: doc.id, exists: true, data: () => doc.data }));
              return { empty: matches.length === 0, docs: matches };
            },
          }),
        };
      },
    }),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<FakeSnap>;
      set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => void;
      create: (ref: FakeRef, data: DocData) => void;
    }) => Promise<T>): Promise<T> => {
      for (let attempt = 0; attempt < 16; attempt += 1) {
        // Каждую попытку выполняем под глобальным lock'ом → две транзакции не перемежаются
        // (serializable). read+conflict-check+commit — один непрерывный критический участок.
        const outcome = await serialize(async (): Promise<
          { committed: true; value: T } | { committed: false }
        > => {
          const readVersions = new Map<string, number>();
          const writes: Array<() => void> = [];
          const run = await fn({
            get: async (ref: FakeRef) => {
              readVersions.set(ref.path, versions.get(ref.path) ?? 0);
              return ref.get();
            },
            set: (ref: FakeRef, data: DocData, opts?: { merge?: boolean }) => {
              writes.push(() => writeDoc(ref.path, data, opts?.merge));
            },
            create: (ref: FakeRef, data: DocData) => {
              writes.push(() => {
                if (docs.has(ref.path)) throw new Error('already exists');
                writeDoc(ref.path, data);
              });
            },
          });

          // Конфликт-чек: если версия любого прочитанного документа изменилась — повтор.
          for (const [path, ver] of readVersions) {
            if ((versions.get(path) ?? 0) !== ver) return { committed: false };
          }
          writes.forEach((write) => write());
          return { committed: true, value: run };
        });

        if (outcome.committed) return outcome.value;
      }
      throw new Error('transaction_retries_exhausted');
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

jest.mock('firebase-admin', () => {
  const firestore = jest.fn(() => fakeDb());
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return { firestore };
});

// Хэш считаем тем же каноническим способом, что и CF — чтобы проверять doc id'ы кэша/счётчика.
const { phraseHashFor } = require('./explain_cache');
const { mistakeHashFor, MISTAKE_COLLECTION } = require('./mistake_explain_cache');
const { quizHashFor, QUIZ_COLLECTION } = require('./quiz_explain_cache');
const {
  submitExplainReport,
  REPORT_REJECT_THRESHOLD,
  REPORT_RATE_MAX,
  REPORTS_COLLECTION,
  REPORT_ENTRIES_COLLECTION,
  REPORT_COMMENT_MAX_LEN,
  normalizeReportReason,
  normalizeReportKind,
  sanitizeReportComment,
} = require('./explain_reports');
const EXPLAIN_COLLECTION = 'phrase_explanations';

function entryDocs(): DocData[] {
  return collectionDocs(REPORT_ENTRIES_COLLECTION).map((d) => d.data);
}

const PHRASE = 'Break a leg';
const HASH = phraseHashFor(PHRASE, 'ru');

async function callReport(data: DocData, authUid = 'auth-reporter') {
  return submitExplainReport({ auth: { uid: authUid }, data });
}

function counterDoc(): DocData | undefined {
  return docs.get(`${REPORTS_COLLECTION}/${HASH}`);
}

function cacheDoc(): DocData | undefined {
  return docs.get(`${EXPLAIN_COLLECTION}/${HASH}`);
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-09T12:00:00.000Z'));
  docs.clear();
  versions.clear();
  autoId = 0;
  // resolveStableUidForAuth: users/{authUid} существует → возвращает authUid сразу,
  // без .where()/linkStableAuthUid (изолируем тест от identity-логики).
  docs.set('users/auth-reporter', { firebaseAuthUid: 'auth-reporter' });
  for (let i = 0; i < 8; i += 1) docs.set(`users/auth-r${i}`, { firebaseAuthUid: `auth-r${i}` });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('submitExplainReport — auth & validation', () => {
  test('rejects unauthenticated callers', async () => {
    await expect(submitExplainReport({ data: { phraseEn: PHRASE } })).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  test('rejects empty phrase', async () => {
    await expect(callReport({ phraseEn: '   ' })).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'phrase_required',
    });
  });
});

describe('submitExplainReport — per-user rate limit (copied scaffold)', () => {
  test('allows REPORT_RATE_MAX reports then throws resource-exhausted', async () => {
    // Каждый репорт от ОДНОГО юзера на РАЗНЫЕ фразы (чтобы порог авто-reject не мешал).
    for (let i = 0; i < REPORT_RATE_MAX; i += 1) {
      await callReport({ phraseEn: `phrase number ${i}` });
    }
    await expect(callReport({ phraseEn: 'one more phrase' })).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'rate_limited',
    });
  });
});

describe('submitExplainReport — per-(phrase,lang) counter', () => {
  test('репорт с lang=es бьёт в ДРУГОЙ счётчик, чем ru (кэш per-(phrase,lang))', async () => {
    await callReport({ phraseEn: PHRASE, lang: 'es' }, 'auth-r0');
    const esHash = phraseHashFor(PHRASE, 'es');
    expect(esHash).not.toBe(HASH); // ru-хэш
    expect(docs.get(`${REPORTS_COLLECTION}/${esHash}`)).toMatchObject({ reportCount: 1 });
    expect(counterDoc()).toBeUndefined(); // ru-счётчик не тронут
  });

  test('репорт БЕЗ lang падает в ru (тот же резолвер, что генерация)', async () => {
    await callReport({ phraseEn: PHRASE }, 'auth-r0');
    expect(counterDoc()).toMatchObject({ phraseHash: HASH, reportCount: 1 });
  });
});

describe('submitExplainReport — per-hash counter', () => {
  test('increments the per-hash report counter across distinct users', async () => {
    await callReport({ phraseEn: PHRASE }, 'auth-r0');
    expect(counterDoc()).toMatchObject({ phraseHash: HASH, reportCount: 1 });

    await callReport({ phraseEn: PHRASE }, 'auth-r1');
    expect(counterDoc()).toMatchObject({ reportCount: 2 });

    await callReport({ phraseEn: PHRASE }, 'auth-r2');
    expect(counterDoc()).toMatchObject({ reportCount: 3 });
  });

  test('counts case/punctuation-variant phrases under one hash (server normalization)', async () => {
    await callReport({ phraseEn: 'Break a leg' }, 'auth-r0');
    await callReport({ phraseEn: '  break a LEG!! ' }, 'auth-r1');
    // Обе формы → один phraseHash → один счётчик.
    expect(counterDoc()).toMatchObject({ reportCount: 2 });
  });
});

describe('submitExplainReport — admin moderation queue, no automatic cache removal', () => {
  test('keeps cache live even when the complaint threshold is reached', async () => {
    // Сидируем готовый кэш, чтобы было что отклонять.
    docs.set(`${EXPLAIN_COLLECTION}/${HASH}`, {
      status: 'ready',
      schemaVersion: 2,
      text: 'a fine explanation',
    });

    for (let i = 0; i < REPORT_REJECT_THRESHOLD - 1; i += 1) {
      const res = await callReport({ phraseEn: PHRASE }, `auth-r${i}`);
      expect(res).toMatchObject({ queued: true, flipped: false, rejected: false });
      expect(cacheDoc()).toMatchObject({ status: 'ready' }); // ещё не отклонено
    }

    const final = await callReport({ phraseEn: PHRASE }, `auth-r${REPORT_REJECT_THRESHOLD - 1}`);
    expect(final).toMatchObject({ reportCount: REPORT_REJECT_THRESHOLD, queued: true, flipped: false, rejected: false });
    expect(cacheDoc()).toMatchObject({ status: 'ready', text: 'a fine explanation' });
  });

  test('further reports keep the cached explanation until admin removes it', async () => {
    docs.set(`${EXPLAIN_COLLECTION}/${HASH}`, {
      status: 'ready',
      schemaVersion: 2,
      text: 'a fine explanation',
    });

    for (let i = 0; i < REPORT_REJECT_THRESHOLD; i += 1) {
      await callReport({ phraseEn: PHRASE }, `auth-r${i}`);
    }
    expect(cacheDoc()).toMatchObject({ status: 'ready' });

    const extra = await callReport({ phraseEn: PHRASE }, `auth-r${REPORT_REJECT_THRESHOLD}`);
    expect(extra).toMatchObject({ reportCount: REPORT_REJECT_THRESHOLD + 1, queued: true, flipped: false, rejected: false });
    expect(cacheDoc()).toMatchObject({ status: 'ready', text: 'a fine explanation' });
  });
});

describe('submitExplainReport — concurrency does not race the moderation queue', () => {
  test('two concurrent reports crossing the old threshold keep cache live and do not lose updates', async () => {
    docs.set(`${EXPLAIN_COLLECTION}/${HASH}`, { status: 'ready', schemaVersion: 2, text: 'ok' });

    // Доводим счётчик ровно до THRESHOLD-1: следующий репорт — порог.
    for (let i = 0; i < REPORT_REJECT_THRESHOLD - 1; i += 1) {
      await callReport({ phraseEn: PHRASE }, `auth-r${i}`);
    }
    expect(counterDoc()).toMatchObject({ reportCount: REPORT_REJECT_THRESHOLD - 1 });
    expect(cacheDoc()).toMatchObject({ status: 'ready' });

    // Два КОНКУРЕНТНЫХ репорта от разных юзеров. Без атомарности они могли бы оба прочитать
    // count=THRESHOLD-1, оба записать THRESHOLD (lost update) и оба отклонить кэш (double-flip).
    // С атомарной tx (read-before-write + version-retry) ровно одна транзакция пересекает порог.
    const results = await Promise.all([
      callReport({ phraseEn: PHRASE }, 'auth-r6'),
      callReport({ phraseEn: PHRASE }, 'auth-r7'),
    ]);

    // НЕТ lost update: каждый из двух репортов учтён → счётчик = THRESHOLD+1, а не «застрял» на THRESHOLD.
    expect(counterDoc()).toMatchObject({ reportCount: REPORT_REJECT_THRESHOLD + 1 });
    // Два репорта вернули РАЗНЫЕ последовательные значения счётчика (никто не затёр чужой инкремент).
    const reportCounts = results.map((r) => r.reportCount).sort((a, b) => a - b);
    expect(reportCounts).toEqual([REPORT_REJECT_THRESHOLD, REPORT_REJECT_THRESHOLD + 1]);
    const flips = results.filter((r) => r.flipped === true).length;
    expect(flips).toBe(0);
    expect(results.every((r) => r.queued === true && r.rejected === false)).toBe(true);
    expect(cacheDoc()).toMatchObject({ status: 'ready', text: 'ok' });
  });
});

describe('submitExplainReport — один юзер = ОДИН голос на фразу (дедуп по stableUid)', () => {
  test('повторная жалоба того же юзера НЕ растит счётчик (но лента получает обе записи)', async () => {
    await callReport({ phraseEn: PHRASE }, 'auth-r0');
    await callReport({ phraseEn: PHRASE }, 'auth-r0');
    await callReport({ phraseEn: PHRASE }, 'auth-r0');
    expect(counterDoc()).toMatchObject({ reportCount: 1 });
    expect(entryDocs()).toHaveLength(3); // админ видит каждую отправку
  });

  test('один юзер НЕ может в одиночку добить порог авто-reject (раньше мог: rate 5/ч == порог 5)', async () => {
    docs.set(`${EXPLAIN_COLLECTION}/${HASH}`, { status: 'ready', schemaVersion: 3, text: 'fine' });
    for (let i = 0; i < REPORT_RATE_MAX; i += 1) {
      await callReport({ phraseEn: PHRASE }, 'auth-r0');
    }
    expect(counterDoc()).toMatchObject({ reportCount: 1 });
    expect(docs.get(`${EXPLAIN_COLLECTION}/${HASH}`)).toMatchObject({ status: 'ready' }); // не отклонено
  });
});

describe('submitExplainReport — лента explain_report_entries (раздел админки)', () => {
  test('каждая жалоба пишет полную запись: фраза, язык, причина, комментарий, кто, когда', async () => {
    docs.set(`${EXPLAIN_COLLECTION}/${HASH}`, {
      status: 'ready',
      schemaVersion: 2,
      text: 'Cached explanation visible to admin.',
    });

    await callReport({
      phraseEn: PHRASE,
      lang: 'ru',
      reason: 'incorrect',
      comment: '  Тут перепутано, "am" объяснили как прошедшее время.  ',
    }, 'auth-r0');

    expect(entryDocs()).toHaveLength(1);
    expect(entryDocs()[0]).toMatchObject({
      phraseHash: HASH,
      phraseEn: PHRASE,
      lang: 'ru',
      reason: 'incorrect',
      comment: 'Тут перепутано, "am" объяснили как прошедшее время.',
      stableUid: 'auth-r0',
      status: 'new',
      cacheStatus: 'ready',
      explanationText: 'Cached explanation visible to admin.',
    });
  });

  test('неизвестная причина схлопывается в unclear; комментарий режется по длине', async () => {
    await callReport({
      phraseEn: PHRASE,
      reason: 'hack_the_planet',
      comment: 'x'.repeat(REPORT_COMMENT_MAX_LEN + 500),
    }, 'auth-r0');

    expect(entryDocs()[0]).toMatchObject({ reason: 'unclear' });
    expect(String(entryDocs()[0].comment)).toHaveLength(REPORT_COMMENT_MAX_LEN);
  });

  test('счётчик хранит фразу и язык — админка показывает текст, не только хэш', async () => {
    await callReport({ phraseEn: PHRASE, lang: 'ru' }, 'auth-r0');
    expect(counterDoc()).toMatchObject({ phraseEn: PHRASE, lang: 'ru', lastReason: 'unclear' });
  });
});

describe('normalizeReportReason / sanitizeReportComment — чистые хелперы', () => {
  test('reason: только белый список, иначе unclear', () => {
    expect(normalizeReportReason('incorrect')).toBe('incorrect');
    expect(normalizeReportReason('wrong_language')).toBe('wrong_language');
    expect(normalizeReportReason('other')).toBe('other');
    expect(normalizeReportReason('unclear')).toBe('unclear');
    expect(normalizeReportReason('<script>')).toBe('unclear');
    expect(normalizeReportReason(undefined)).toBe('unclear');
    expect(normalizeReportReason(42)).toBe('unclear');
  });

  test('comment: trim + cap + вычистка control-символов (переводы строк живут)', () => {
    expect(sanitizeReportComment('  привет  ')).toBe('привет');
    expect(sanitizeReportComment(`a${String.fromCharCode(7)}b${String.fromCharCode(0)}c`)).toBe('abc');
    expect(sanitizeReportComment('строка раз\nстрока два')).toBe('строка раз\nстрока два');
    expect(sanitizeReportComment(null)).toBe('');
    expect(sanitizeReportComment('y'.repeat(1000))).toHaveLength(REPORT_COMMENT_MAX_LEN);
  });
});

describe('submitExplainReport — server derives hash, ignores client-supplied hash', () => {
  test('a spoofed `hash` field in the payload is ignored; doc id comes from phraseEn', async () => {
    await callReport({ phraseEn: PHRASE, hash: 'totally-bogus-client-hash', phraseHash: 'also-bogus' }, 'auth-r0');
    // Счётчик лежит под СЕРВЕРНЫМ хэшем фразы, не под подсунутым клиентом.
    expect(docs.get(`${REPORTS_COLLECTION}/${HASH}`)).toMatchObject({ reportCount: 1 });
    expect(docs.get(`${REPORTS_COLLECTION}/totally-bogus-client-hash`)).toBeUndefined();
    expect(docs.get(`${REPORTS_COLLECTION}/also-bogus`)).toBeUndefined();
  });
});

describe('normalizeReportKind — чистый хелпер', () => {
  test('пропускает только phrase/mistake/quiz, всё чужое → phrase', () => {
    expect(normalizeReportKind('phrase')).toBe('phrase');
    expect(normalizeReportKind('mistake')).toBe('mistake');
    expect(normalizeReportKind('quiz')).toBe('quiz');
    expect(normalizeReportKind(undefined)).toBe('phrase'); // старые клиенты
    expect(normalizeReportKind('')).toBe('phrase');
    expect(normalizeReportKind('nonsense')).toBe('phrase');
  });
});

describe('submitExplainReport — kind="mistake" (разбор ошибки)', () => {
  const TARGET = 'I have a cat';
  const WRONG = 'I has a cat';
  // Хэш разбора ошибки учитывает И целевой ответ, И неправильный — другой неправильный = другой док.
  const MISTAKE_HASH = mistakeHashFor(TARGET, WRONG, 'ru');

  test('требует userAnswer для mistake-репорта', async () => {
    await expect(callReport({ kind: 'mistake', phraseEn: TARGET, lang: 'ru' })).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'user_answer_required',
    });
  });

  test('счётчик и кэш-ссылка бьют в mistake_explanations под mistakeHash', async () => {
    // Кэш-док разбора лежит в mistake_explanations, текст в поле full.
    docs.set(`${MISTAKE_COLLECTION}/${MISTAKE_HASH}`, {
      status: 'ready', schemaVersion: 2, full: 'Тут разбор: has→have.',
    });
    const res = await callReport(
      { kind: 'mistake', phraseEn: TARGET, userAnswer: WRONG, lang: 'ru', reason: 'incorrect' },
      'auth-r0',
    );
    expect(res).toMatchObject({ ok: true, reportCount: 1, kind: 'mistake' });

    // Счётчик — под mistakeHash, НЕ под phraseHash.
    const counter = docs.get(`${REPORTS_COLLECTION}/${MISTAKE_HASH}`);
    expect(counter).toMatchObject({
      reportCount: 1,
      kind: 'mistake',
      cacheCollection: MISTAKE_COLLECTION,
      userAnswer: WRONG,
      // Снимок текста кэша — из поля full (не text).
      latestExplanationText: 'Тут разбор: has→have.',
    });
    expect(docs.get(`${REPORTS_COLLECTION}/${phraseHashFor(TARGET, 'ru')}`)).toBeUndefined();

    // Лента: запись с kind/cacheCollection/userAnswer + снимком текста.
    const entries = entryDocs();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: 'mistake',
      cacheCollection: MISTAKE_COLLECTION,
      phraseHash: MISTAKE_HASH,
      userAnswer: WRONG,
      explanationText: 'Тут разбор: has→have.',
    });

    // Кэш-док НЕ удаляется автоматически (как и для фраз).
    expect(docs.get(`${MISTAKE_COLLECTION}/${MISTAKE_HASH}`)).toMatchObject({ status: 'ready' });
  });

  test('разные неправильные ответы на одну фразу = разные счётчики', async () => {
    await callReport({ kind: 'mistake', phraseEn: TARGET, userAnswer: WRONG, lang: 'ru' }, 'auth-r0');
    await callReport({ kind: 'mistake', phraseEn: TARGET, userAnswer: 'I have cat', lang: 'ru' }, 'auth-r1');
    const otherHash = mistakeHashFor(TARGET, 'I have cat', 'ru');
    expect(otherHash).not.toBe(MISTAKE_HASH);
    expect(docs.get(`${REPORTS_COLLECTION}/${MISTAKE_HASH}`)).toMatchObject({ reportCount: 1 });
    expect(docs.get(`${REPORTS_COLLECTION}/${otherHash}`)).toMatchObject({ reportCount: 1 });
  });
});

describe('submitExplainReport — kind="quiz" (ИИ-разбор тематического квиза)', () => {
  const CORRECT = 'Knife';
  const CHOICES = ['Knife', 'Cup', 'Bowl', 'Chair'];
  // Хэш квиза учитывает правильный ответ И весь набор вариантов (порядок не важен — набор сортируется).
  const QUIZ_HASH = quizHashFor(CORRECT, CHOICES, 'ru');

  test('требует choices для quiz-репорта', async () => {
    await expect(callReport({ kind: 'quiz', phraseEn: CORRECT, lang: 'ru' })).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'choices_required',
    });
  });

  test('счётчик и кэш-ссылка бьют в quiz_explanations под quizHash', async () => {
    // Кэш-док квиза: confirm (правильный) + options (карта по неверным вариантам).
    docs.set(`${QUIZ_COLLECTION}/${QUIZ_HASH}`, {
      status: 'ready', schemaVersion: 1,
      confirm: 'Knife — это нож.',
      options: { Cup: 'Cup — чашка.', Bowl: 'Bowl — миска.', Chair: 'Chair — стул.' },
    });
    const res = await callReport(
      { kind: 'quiz', phraseEn: CORRECT, choices: CHOICES, userAnswer: 'Cup', lang: 'ru', reason: 'incorrect' },
      'auth-r0',
    );
    expect(res).toMatchObject({ ok: true, reportCount: 1, kind: 'quiz' });

    // Счётчик — под quizHash в quiz_explanations.
    const counter = docs.get(`${REPORTS_COLLECTION}/${QUIZ_HASH}`);
    expect(counter).toMatchObject({
      reportCount: 1,
      kind: 'quiz',
      cacheCollection: QUIZ_COLLECTION,
      userAnswer: 'Cup',
    });
    // Снимок текста кэша склеен из confirm + строк options.
    expect(String(counter?.latestExplanationText || '')).toContain('Knife — это нож.');
    expect(String(counter?.latestExplanationText || '')).toContain('Cup — чашка.');

    // Лента: запись с kind/cacheCollection/choices.
    const entries = entryDocs();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: 'quiz',
      cacheCollection: QUIZ_COLLECTION,
      phraseHash: QUIZ_HASH,
      userAnswer: 'Cup',
    });
    expect(entries[0].choices).toEqual(CHOICES);

    // Кэш-док НЕ удаляется автоматически.
    expect(docs.get(`${QUIZ_COLLECTION}/${QUIZ_HASH}`)).toMatchObject({ status: 'ready' });
  });

  test('порядок вариантов не меняет хэш (варианты тасуются в рантайме)', async () => {
    await callReport({ kind: 'quiz', phraseEn: CORRECT, choices: CHOICES, lang: 'ru' }, 'auth-r0');
    const shuffled = ['Chair', 'Knife', 'Bowl', 'Cup'];
    expect(quizHashFor(CORRECT, shuffled, 'ru')).toBe(QUIZ_HASH);
    await callReport({ kind: 'quiz', phraseEn: CORRECT, choices: shuffled, lang: 'ru' }, 'auth-r1');
    // Оба репорта попали в ОДИН счётчик (2 разных юзера).
    expect(docs.get(`${REPORTS_COLLECTION}/${QUIZ_HASH}`)).toMatchObject({ reportCount: 2 });
  });
});
