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
        collection: (name) => collectionFor(`${path}/${name}`),
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
        .map(([docPath, data]) => ({ id: docPath.slice(prefix.length), path: docPath, data }));
}
function queryFor(name, state) {
    const run = (count) => {
        let rows = collectionDocs(name)
            .filter((doc) => state.eq.every(({ field, value }) => doc.data[field] === value));
        if (state.orderField) {
            const dir = state.orderDir === 'asc' ? 1 : -1;
            rows = [...rows].sort((a, b) => {
                const av = Number(a.data[state.orderField] ?? 0);
                const bv = Number(b.data[state.orderField] ?? 0);
                return av === bv ? 0 : (av < bv ? -dir : dir);
            });
        }
        if (state.startAfterId) {
            const at = rows.findIndex((doc) => doc.id === state.startAfterId);
            // startAfter по несуществующему в выборке документу = пустая страница (как в Firestore).
            rows = at >= 0 ? rows.slice(at + 1) : [];
        }
        const matches = rows
            .slice(0, count)
            .map((doc) => ({ id: doc.id, exists: true, data: () => doc.data }));
        return { empty: matches.length === 0, docs: matches };
    };
    return {
        limit: (count) => ({ get: async () => run(count) }),
        orderBy: (field, dir = 'asc') => (queryFor(name, { ...state, orderField: field, orderDir: dir })),
        startAfter: (cursorDoc) => (queryFor(name, { ...state, startAfterId: cursorDoc.id })),
    };
}
const EMPTY_QUERY_STATE = { eq: [], orderField: '', orderDir: 'asc', startAfterId: '' };
function collectionFor(name) {
    const base = queryFor(name, EMPTY_QUERY_STATE);
    return {
        doc: (id) => refFor(`${name}/${id || `auto-${++autoId}`}`),
        where: (field, op, value) => {
            if (op !== '==')
                throw new Error(`unsupported op ${op}`);
            return queryFor(name, { ...EMPTY_QUERY_STATE, eq: [{ field, value }] });
        },
        orderBy: base.orderBy,
        startAfter: base.startAfter,
        limit: base.limit,
    };
}
function fakeDb() {
    return {
        collection: (name) => collectionFor(name),
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
                update: (ref, data) => {
                    writes.push(() => {
                        docs.set(ref.path, deepMerge(docs.get(ref.path) ?? {}, data));
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
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-20T12:00:00.000Z');
function ideaDocs() {
    return collectionDocs('user_ideas').map((d) => ({ id: d.id, data: d.data }));
}
function inboxDocs(uid) {
    return collectionDocs(`users/${uid}/idea_inbox`).map((d) => d.data);
}
async function callSubmit(data, authUid = 'auth-user') {
    const { submitUserIdea } = require('./user_ideas');
    return submitUserIdea({ auth: { uid: authUid }, data });
}
async function callDecide(data, admin = true) {
    const { adminDecideUserIdea } = require('./user_ideas');
    return adminDecideUserIdea({ auth: { uid: 'admin-1', token: admin ? { admin: true, email: 'a@b.c' } : {} }, data });
}
beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers().setSystemTime(NOW);
    docs.clear();
    autoId = 0;
    docs.set('users/stable-user', { firebaseAuthUid: 'auth-user' });
});
afterEach(() => {
    jest.useRealTimers();
});
describe('submitUserIdea', () => {
    test('writes a pending idea bound to the authenticated stable uid', async () => {
        const result = await callSubmit({
            payload: {
                uid: 'spoofed',
                title: 'Тёмная тема',
                description: 'Добавить полностью тёмную тему оформления приложения',
                benefit: 'Удобнее учиться вечером',
                category: 'feature',
                lang: 'ru',
            },
        });
        expect(result).toMatchObject({ ok: true });
        const ideas = ideaDocs();
        expect(ideas).toHaveLength(1);
        expect(ideas[0].data).toMatchObject({
            uid: 'stable-user',
            authUid: 'auth-user',
            title: 'Тёмная тема',
            category: 'feature',
            status: 'pending',
        });
    });
    test('rejects too-short title/description', async () => {
        await expect(callSubmit({ payload: { title: 'ok', description: 'short', category: 'feature' } })).rejects.toMatchObject({ code: 'invalid-argument' });
        expect(ideaDocs()).toHaveLength(0);
    });
    test('rate-limits a second idea on the same day', async () => {
        const payload = {
            title: 'Идея один',
            description: 'Достаточно длинное описание идеи номер один',
            category: 'improvement',
        };
        await callSubmit({ payload });
        await expect(callSubmit({ payload: { ...payload, title: 'Идея два' } })).rejects.toMatchObject({ code: 'resource-exhausted', message: 'rate_limited' });
        expect(ideaDocs()).toHaveLength(1);
    });
});
describe('adminDecideUserIdea', () => {
    async function seedIdea() {
        await callSubmit({
            payload: { title: 'Идея', description: 'Описание идеи достаточно длинное', category: 'feature' },
        });
        return ideaDocs()[0].id;
    }
    test('approve grants exactly one year of premium and writes a congrats inbox modal', async () => {
        const ideaId = await seedIdea();
        const res = await callDecide({ ideaId, decision: 'approve' });
        expect(res).toMatchObject({ ok: true });
        const user = docs.get('users/stable-user');
        const progress = user.progress;
        expect(progress).toMatchObject({ vip_active: 'true', vip_plan: 'idea_reward', vip_admin_override: 'true' });
        expect(Number(progress.vip_until)).toBe(NOW.getTime() + YEAR_MS);
        const idea = ideaDocs()[0].data;
        expect(idea).toMatchObject({ status: 'approved', premiumGranted: true });
        const inbox = inboxDocs('stable-user');
        expect(inbox).toHaveLength(1);
        expect(inbox[0]).toMatchObject({ type: 'idea_decision', decision: 'approve', seen: false });
        expect(String(inbox[0].titleRu)).toContain('принята');
        expect(String(inbox[0].titleEs)).toContain('idea');
        expect(String(inbox[0].messageEs)).toContain('Premium');
    });
    test('reject writes an explanation modal with admin custom text and grants no premium', async () => {
        const ideaId = await seedIdea();
        await callDecide({
            ideaId,
            decision: 'reject',
            messageRu: 'Слишком похоже на существующее',
            messageUk: 'Надто схоже',
            messageEs: 'Se parece demasiado a algo existente',
        });
        const user = docs.get('users/stable-user');
        expect(user.progress).toBeUndefined();
        expect(ideaDocs()[0].data).toMatchObject({ status: 'rejected', premiumGranted: false });
        const inbox = inboxDocs('stable-user');
        expect(inbox[0]).toMatchObject({
            type: 'idea_decision',
            decision: 'reject',
            messageRu: 'Слишком похоже на существующее',
            messageEs: 'Se parece demasiado a algo existente',
        });
    });
    test('refuses a non-admin caller', async () => {
        const ideaId = await seedIdea();
        await expect(callDecide({ ideaId, decision: 'approve' }, false)).rejects.toMatchObject({ code: 'permission-denied' });
        expect(ideaDocs()[0].data).toMatchObject({ status: 'pending' });
    });
    test('refuses to decide an already-decided idea twice', async () => {
        const ideaId = await seedIdea();
        await callDecide({ ideaId, decision: 'approve' });
        await expect(callDecide({ ideaId, decision: 'reject' })).rejects.toMatchObject({ code: 'failed-precondition' });
    });
});
// зачем: adminListUserIdeas — новый admin-callable (вернули воркфлоу «Идеи» в админку),
// он читает чужие идеи вместе с uid авторов и ходит в Firestore с пагинацией.
// Тестов на него не было вовсе: проверяем гейт доступа (по РОЛИ, а не только admin:true),
// сортировку/курсор и потолок выборки — потолок держит стоимость чтений Firestore.
describe('adminListUserIdeas', () => {
    async function callList(data, token = { admin: true, adminRole: 'owner' }) {
        const { adminListUserIdeas } = require('./user_ideas');
        return adminListUserIdeas({ auth: token ? { uid: 'admin-1', token } : undefined, data });
    }
    /** Сеем идеи напрямую в фейковый Firestore — submit ограничен 1/сутки. */
    function seedIdeas(rows) {
        for (const row of rows) {
            docs.set(`user_ideas/${row.id}`, {
                uid: `stable-${row.id}`,
                title: `Идея ${row.id}`,
                description: 'Описание идеи достаточной длины для прохождения валидации.',
                benefit: 'Польза',
                category: row.category ?? 'feature',
                status: row.status ?? 'pending',
                createdAtMs: row.createdAtMs,
            });
        }
    }
    test('refuses callers without the ideas.read permission', async () => {
        seedIdeas([{ id: 'a', createdAtMs: 1000 }]);
        // Не админ вообще.
        await expect(callList({}, null)).rejects.toMatchObject({ code: 'permission-denied' });
        await expect(callList({}, {})).rejects.toMatchObject({ code: 'permission-denied' });
        // admin:true, но роль НЕ даёт ideas.read — раньше такой вызов прошёл бы по одному флагу.
        await expect(callList({}, { admin: true, adminRole: 'analyst' }))
            .rejects.toMatchObject({ code: 'permission-denied' });
        await expect(callList({}, { admin: true, adminRole: 'support' }))
            .rejects.toMatchObject({ code: 'permission-denied' });
        // Роль с правом, но без флага admin — тоже отказ.
        await expect(callList({}, { adminRole: 'owner' })).rejects.toMatchObject({ code: 'permission-denied' });
    });
    test('allows owner, admin and moderator to read the queue', async () => {
        seedIdeas([{ id: 'a', createdAtMs: 1000 }]);
        for (const adminRole of ['owner', 'admin', 'moderator']) {
            const res = await callList({}, { admin: true, adminRole });
            expect(res.ok).toBe(true);
            expect(res.items).toHaveLength(1);
        }
    });
    test('returns pending ideas newest-first by default', async () => {
        seedIdeas([
            { id: 'old', createdAtMs: 1000 },
            { id: 'newest', createdAtMs: 3000 },
            { id: 'mid', createdAtMs: 2000 },
            { id: 'approved-one', createdAtMs: 9000, status: 'approved' },
        ]);
        const res = await callList({});
        // Дефолтный статус — pending: решённая идея не попадает в очередь.
        expect(res.items.map((i) => i.id)).toEqual(['newest', 'mid', 'old']);
        expect(res.items[0]).toMatchObject({ status: 'pending', title: 'Идея newest' });
    });
    test('filters by status and supports the all filter', async () => {
        seedIdeas([
            { id: 'p', createdAtMs: 1000 },
            { id: 'a', createdAtMs: 2000, status: 'approved' },
            { id: 'r', createdAtMs: 3000, status: 'rejected' },
        ]);
        expect((await callList({ status: 'approved' })).items.map((i) => i.id)).toEqual(['a']);
        expect((await callList({ status: 'rejected' })).items.map((i) => i.id)).toEqual(['r']);
        expect((await callList({ status: 'all' })).items.map((i) => i.id)).toEqual(['r', 'a', 'p']);
    });
    test('filters by category without leaking other categories', async () => {
        seedIdeas([
            { id: 'feat', createdAtMs: 2000, category: 'feature' },
            { id: 'bug', createdAtMs: 1000, category: 'bug' },
        ]);
        const res = await callList({ category: 'bug' });
        expect(res.items.map((i) => i.id)).toEqual(['bug']);
    });
    test('paginates with a cursor and reports the end of the queue', async () => {
        seedIdeas([
            { id: 'i3', createdAtMs: 3000 },
            { id: 'i2', createdAtMs: 2000 },
            { id: 'i1', createdAtMs: 1000 },
        ]);
        const first = await callList({ limit: 2 });
        expect(first.items.map((i) => i.id)).toEqual(['i3', 'i2']);
        expect(first.nextCursor).toBe('i2');
        const second = await callList({ limit: 2, cursor: first.nextCursor });
        expect(second.items.map((i) => i.id)).toEqual(['i1']);
        // Последняя страница — курсор пуст, иначе клиент крутил бы бесконечный пейджинг.
        expect(second.nextCursor).toBe('');
    });
    test('rejects a malformed cursor and a cursor that does not exist', async () => {
        seedIdeas([{ id: 'i1', createdAtMs: 1000 }]);
        // Инъекция пути/мусора в курсор не должна доходить до Firestore.
        await expect(callList({ cursor: '../../users/stable-user' }))
            .rejects.toMatchObject({ code: 'invalid-argument' });
        await expect(callList({ cursor: 'nope-not-here' }))
            .rejects.toMatchObject({ code: 'failed-precondition' });
    });
    test('caps the page size so a huge limit cannot drain Firestore reads', async () => {
        // 60 идей при потолке 50: запрос limit=10000 обязан вернуть максимум 50.
        seedIdeas(Array.from({ length: 60 }, (_, i) => ({ id: `bulk-${i}`, createdAtMs: 1000 + i })));
        const res = await callList({ limit: 10000 });
        expect(res.items).toHaveLength(50);
        // Мусорный limit не роняет функцию и не снимает потолок.
        const fallback = await callList({ limit: 'много' });
        expect(fallback.items).toHaveLength(20);
    });
});
//# sourceMappingURL=user_ideas.test.js.map