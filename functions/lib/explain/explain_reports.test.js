"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docs = new Map();
// Версия каждого документа — растёт при любой записи. Транзакция фиксирует версии прочитанных
// документов и откатывается + повторяется, если на момент коммита версия изменилась.
const versions = new Map();
let autoId = 0;
function bump(path) {
    versions.set(path, (versions.get(path) ?? 0) + 1);
}
function writeDoc(path, data, merge) {
    docs.set(path, merge ? { ...(docs.get(path) ?? {}), ...data } : { ...data });
    bump(path);
}
function refFor(path) {
    const id = path.split('/').pop() || path;
    return {
        id,
        path,
        get: async () => snapFor(path),
        set: async (data, opts) => writeDoc(path, data, opts?.merge),
    };
}
function snapFor(path) {
    const data = docs.get(path);
    return {
        id: path.split('/').pop() || path,
        exists: data !== undefined,
        data: () => data,
    };
}
function collectionDocs(name) {
    const prefix = `${name}/`;
    return Array.from(docs.entries())
        .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
        .map(([docPath, data]) => ({ id: docPath.slice(prefix.length), path: docPath, data }));
}
// Глобальный «commit lock»: настоящий Firestore даёт serializable-изоляцию транзакций.
// Моделируем это очередью — каждая попытка транзакции (read+check+commit) выполняется,
// не перемежаясь с другой. Версионный retry остаётся вторичной защитой.
let txChain = Promise.resolve();
function serialize(task) {
    const next = txChain.then(task, task);
    // Звено цепочки не должно «застревать» на ошибке — гасим, реальную ошибку вернёт next.
    txChain = next.then(() => undefined, () => undefined);
    return next;
}
function fakeDb() {
    return {
        collection: (name) => ({
            doc: (id) => refFor(`${name}/${id || `auto-${++autoId}`}`),
            where: (field, op, value) => {
                if (op !== '==')
                    throw new Error(`unsupported op ${op}`);
                return {
                    limit: (count) => ({
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
        runTransaction: async (fn) => {
            for (let attempt = 0; attempt < 16; attempt += 1) {
                // Каждую попытку выполняем под глобальным lock'ом → две транзакции не перемежаются
                // (serializable). read+conflict-check+commit — один непрерывный критический участок.
                const outcome = await serialize(async () => {
                    const readVersions = new Map();
                    const writes = [];
                    const run = await fn({
                        get: async (ref) => {
                            readVersions.set(ref.path, versions.get(ref.path) ?? 0);
                            return ref.get();
                        },
                        set: (ref, data, opts) => {
                            writes.push(() => writeDoc(ref.path, data, opts?.merge));
                        },
                        create: (ref, data) => {
                            writes.push(() => {
                                if (docs.has(ref.path))
                                    throw new Error('already exists');
                                writeDoc(ref.path, data);
                            });
                        },
                    });
                    // Конфликт-чек: если версия любого прочитанного документа изменилась — повтор.
                    for (const [path, ver] of readVersions) {
                        if ((versions.get(path) ?? 0) !== ver)
                            return { committed: false };
                    }
                    writes.forEach((write) => write());
                    return { committed: true, value: run };
                });
                if (outcome.committed)
                    return outcome.value;
            }
            throw new Error('transaction_retries_exhausted');
        },
    };
}
class FakeHttpsError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
jest.mock('firebase-functions/v2/https', () => ({
    HttpsError: FakeHttpsError,
    onCall: (optsOrHandler, maybeHandler) => typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));
jest.mock('firebase-admin', () => {
    const firestore = jest.fn(() => fakeDb());
    firestore.FieldValue = {
        serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    };
    return { firestore };
});
// Хэш считаем тем же каноническим способом, что и CF — чтобы проверять doc id'ы кэша/счётчика.
const { phraseHashFor } = require('./explain_cache');
const { submitExplainReport, REPORT_REJECT_THRESHOLD, REPORT_RATE_MAX, REPORTS_COLLECTION, REPORT_ENTRIES_COLLECTION, REPORT_COMMENT_MAX_LEN, normalizeReportReason, sanitizeReportComment, } = require('./explain_reports');
const EXPLAIN_COLLECTION = 'phrase_explanations';
function entryDocs() {
    return collectionDocs(REPORT_ENTRIES_COLLECTION).map((d) => d.data);
}
const PHRASE = 'Break a leg';
const HASH = phraseHashFor(PHRASE, 'ru');
async function callReport(data, authUid = 'auth-reporter') {
    return submitExplainReport({ auth: { uid: authUid }, data });
}
function counterDoc() {
    return docs.get(`${REPORTS_COLLECTION}/${HASH}`);
}
function cacheDoc() {
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
    for (let i = 0; i < 8; i += 1)
        docs.set(`users/auth-r${i}`, { firebaseAuthUid: `auth-r${i}` });
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
describe('submitExplainReport — threshold auto-reject (NET-NEW logic)', () => {
    test('flips cache status to rejected exactly on the Nth report, in the same tx', async () => {
        // Сидируем готовый кэш, чтобы было что отклонять.
        docs.set(`${EXPLAIN_COLLECTION}/${HASH}`, {
            status: 'ready',
            schemaVersion: 2,
            text: 'a fine explanation',
        });
        for (let i = 0; i < REPORT_REJECT_THRESHOLD - 1; i += 1) {
            const res = await callReport({ phraseEn: PHRASE }, `auth-r${i}`);
            expect(res).toMatchObject({ flipped: false, rejected: false });
            expect(cacheDoc()).toMatchObject({ status: 'ready' }); // ещё не отклонено
        }
        // N-й (=REPORT_REJECT_THRESHOLD) репорт переключает статус В ТОЙ ЖЕ tx, что инкремент.
        const final = await callReport({ phraseEn: PHRASE }, `auth-r${REPORT_REJECT_THRESHOLD - 1}`);
        expect(final).toMatchObject({ reportCount: REPORT_REJECT_THRESHOLD, flipped: true, rejected: true });
        expect(cacheDoc()).toMatchObject({ status: 'rejected', reason: 'report_threshold' });
    });
    test('does NOT regenerate — rejected entry stays rejected on further reports', async () => {
        for (let i = 0; i < REPORT_REJECT_THRESHOLD; i += 1) {
            await callReport({ phraseEn: PHRASE }, `auth-r${i}`);
        }
        expect(cacheDoc()).toMatchObject({ status: 'rejected' });
        // Ещё один репорт: счётчик растёт, статус остаётся rejected (никакого сброса в pending),
        // повторного флипа НЕТ (flipped=false).
        const extra = await callReport({ phraseEn: PHRASE }, `auth-r${REPORT_REJECT_THRESHOLD}`);
        expect(extra).toMatchObject({ reportCount: REPORT_REJECT_THRESHOLD + 1, flipped: false, rejected: true });
        expect(cacheDoc()).toMatchObject({ status: 'rejected' });
    });
});
describe('submitExplainReport — concurrency does not race past threshold', () => {
    test('two concurrent reports crossing the threshold → exactly one flip, no lost update', async () => {
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
        // Порог пересечён РОВНО один раз → ровно одна транзакция выполнила флип (flipped=true).
        const flips = results.filter((r) => r.flipped === true).length;
        expect(flips).toBe(1);
        // Кэш отклонён (и остаётся rejected, без двойного перезаписывания reason).
        expect(cacheDoc()).toMatchObject({ status: 'rejected', reason: 'report_threshold' });
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
//# sourceMappingURL=explain_reports.test.js.map