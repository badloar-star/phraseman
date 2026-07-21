"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docs = new Map();
let autoId = 0;
function deepMerge(target, source) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
        const existing = target[key];
        if (value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            existing &&
            typeof existing === 'object' &&
            !Array.isArray(existing)) {
            result[key] = deepMerge(existing, value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function refFor(path) {
    const id = path.split('/').pop() || path;
    return {
        id,
        path,
        get: async () => snapFor(path),
        set: async (data, opts) => {
            docs.set(path, opts?.merge ? deepMerge(docs.get(path) ?? {}, data) : { ...data });
        },
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
function collectionDocs(path) {
    const prefix = `${path}/`;
    return Array.from(docs.entries())
        .filter(([docPath]) => docPath.startsWith(prefix) && !docPath.slice(prefix.length).includes('/'))
        .map(([docPath, data]) => ({
        id: docPath.slice(prefix.length),
        path: docPath,
        data,
    }));
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
            const writes = [];
            const result = await fn({
                get: (ref) => ref.get(),
                set: (ref, data, opts) => {
                    writes.push(() => {
                        docs.set(ref.path, opts?.merge ? deepMerge(docs.get(ref.path) ?? {}, data) : { ...data });
                    });
                },
                create: (ref, data) => {
                    writes.push(() => {
                        if (docs.has(ref.path))
                            throw new Error('already exists');
                        docs.set(ref.path, { ...data });
                    });
                },
            });
            writes.forEach((write) => write());
            return result;
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
function reportDocs(collection) {
    return collectionDocs(collection).map((doc) => doc.data);
}
async function callSubmitClientReport(data, authUid = 'auth-reporter') {
    const { submitClientReport } = require('./client_reports');
    return submitClientReport({ auth: { uid: authUid }, data });
}
beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers().setSystemTime(new Date('2026-05-24T12:00:00.000Z'));
    docs.clear();
    autoId = 0;
    docs.set('users/stable-reporter', { firebaseAuthUid: 'auth-reporter' });
});
afterEach(() => {
    jest.useRealTimers();
});
describe('submitClientReport', () => {
    test('writes user reports with the authenticated stable uid instead of spoofed payload ids', async () => {
        const result = await callSubmitClientReport({
            kind: 'user_report',
            payload: {
                reporterUid: 'victim',
                uid: 'victim',
                reportedUid: 'reported-1',
                reportedName: 'Bad Name',
                reason: 'offensive_nickname',
                screen: 'leaderboard',
                reporterName: 'Alice',
                platform: 'ios',
                appVersion: '1.2.3',
            },
        });
        expect(result).toMatchObject({ ok: true, collection: 'user_reports' });
        expect(reportDocs('user_reports')).toHaveLength(1);
        expect(reportDocs('user_reports')[0]).toMatchObject({
            reporterUid: 'stable-reporter',
            reporterAuthUid: 'auth-reporter',
            reportedUid: 'reported-1',
            reason: 'offensive_nickname',
            status: 'new',
        });
    });
    test('rate-limits repeated reports before creating another moderation document', async () => {
        const payload = {
            reportedUid: 'reported-1',
            reportedName: 'Bad Name',
            reason: 'offensive_nickname',
            screen: 'leaderboard',
        };
        for (let i = 0; i < 5; i += 1) {
            await callSubmitClientReport({ kind: 'user_report', payload: { ...payload, reportedUid: `reported-${i}` } });
        }
        await expect(callSubmitClientReport({ kind: 'user_report', payload })).rejects.toMatchObject({
            code: 'resource-exhausted',
            message: 'rate_limited',
        });
        expect(reportDocs('user_reports')).toHaveLength(5);
    });
});
//# sourceMappingURL=client_reports.test.js.map