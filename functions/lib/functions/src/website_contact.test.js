"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mockDocs = new Map();
const mockInboxDocs = [];
let autoId = 0;
function refFor(path) {
    const id = path.split('/').pop() || path;
    return {
        id,
        path,
        get: async () => {
            const data = mockDocs.get(path);
            return { exists: data !== undefined, data: () => data };
        },
        set: async (data, opts) => {
            mockDocs.set(path, opts?.merge ? { ...(mockDocs.get(path) ?? {}), ...data } : { ...data });
        },
        update: async (data) => {
            mockDocs.set(path, { ...(mockDocs.get(path) ?? {}), ...data });
        },
    };
}
function fakeDb() {
    return {
        collection: (name) => ({
            doc: (id) => refFor(`${name}/${id}`),
            add: async (data) => {
                const ref = refFor(`${name}/auto-${++autoId}`);
                mockDocs.set(ref.path, { ...data });
                if (name === 'website_contact_inbox')
                    mockInboxDocs.push(data);
                return ref;
            },
        }),
        runTransaction: async (fn) => {
            const writes = [];
            const result = await fn({
                get: (ref) => ref.get(),
                set: (ref, data, opts) => {
                    writes.push(() => {
                        mockDocs.set(ref.path, opts?.merge ? { ...(mockDocs.get(ref.path) ?? {}), ...data } : { ...data });
                    });
                },
            });
            writes.forEach((write) => write());
            return result;
        },
    };
}
jest.mock('firebase-functions/v2/https', () => ({
    onRequest: (_opts, handler) => handler,
}));
jest.mock('firebase-functions/logger', () => ({
    warn: jest.fn(),
}));
jest.mock('firebase-functions/params', () => ({
    defineString: () => ({ value: () => '' }),
}));
jest.mock('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(() => fakeDb()),
    FieldValue: {
        serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    },
}));
const validBody = {
    email: 'alice@example.com',
    name: 'Alice',
    message: 'Hello, I need help with my account.',
    topic: 'support',
    pageUrl: 'https://knowlyapps.com/support',
};
function makeReqRes(body = validBody, headers = {}) {
    const req = {
        method: 'POST',
        body,
        headers: {
            origin: 'https://knowlyapps.com',
            'user-agent': 'jest',
            'x-forwarded-for': '203.0.113.10',
            ...headers,
        },
    };
    const res = {
        set: jest.fn(),
        status: jest.fn(function status() {
            return this;
        }),
        json: jest.fn(),
        send: jest.fn(),
    };
    return { req, res };
}
async function postContact(headers) {
    const mod = require('./website_contact');
    const { req, res } = makeReqRes(validBody, headers);
    await mod.submitWebsiteContact(req, res);
    return res;
}
beforeEach(() => {
    jest.resetModules();
    mockDocs.clear();
    mockInboxDocs.length = 0;
    autoId = 0;
});
describe('submitWebsiteContact rate limit', () => {
    test('rejects repeated submissions from the same IP before writing inbox docs', async () => {
        await postContact();
        await postContact();
        await postContact();
        const blocked = await postContact();
        expect(blocked.status).toHaveBeenCalledWith(429);
        expect(blocked.json).toHaveBeenCalledWith(expect.objectContaining({
            ok: false,
            error: 'rate_limited',
        }));
        expect(mockInboxDocs).toHaveLength(3);
    });
});
//# sourceMappingURL=website_contact.test.js.map