"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docs = new Map();
const versions = new Map();
const writeLog = [];
let autoId = 0;
let transactionReadHook = null;
let nextTransactionFailure = null;
function cloneDoc(data) {
    return JSON.parse(JSON.stringify(data));
}
function writeDoc(path, data, merge) {
    writeLog.push({ path, data: cloneDoc(data), merge });
    const next = merge ? deepMerge(docs.get(path) ?? {}, data) : cloneDoc(data);
    docs.set(path, next);
    versions.set(path, (versions.get(path) ?? 0) + 1);
}
function mutateExternally(path, data) {
    if (data === undefined)
        docs.delete(path);
    else
        docs.set(path, cloneDoc(data));
    versions.set(path, (versions.get(path) ?? 0) + 1);
}
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
            writeDoc(path, data, opts?.merge === true);
        },
    };
}
function snapFor(path) {
    const data = docs.get(path);
    const snapshotData = data === undefined ? undefined : cloneDoc(data);
    return {
        id: path.split('/').pop() || path,
        exists: snapshotData !== undefined,
        data: () => snapshotData,
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
function storeSnapshot() {
    return Array.from(docs.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([path, data]) => [path, cloneDoc(data)]);
}
function identitySnapshot() {
    return storeSnapshot().filter(([path]) => (path.startsWith('users/')
        || path.startsWith('auth_links/')
        || path.startsWith('leaderboard/')));
}
function expectExactKeys(data, keys) {
    expect(data).toBeDefined();
    expect(Object.keys(data ?? {}).sort()).toEqual([...keys].sort());
}
function expectNoSensitiveValues(value) {
    const serialized = JSON.stringify(value);
    expect(serialized).not.toContain(RECOVERY_EMAIL);
    expect(serialized).not.toContain(RECOVERY_DISPLAY_NAME);
    expect(serialized).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
}
function fakeDb() {
    return {
        collection: (name) => ({
            doc: (id) => refFor(`${name}/${id || `auto-${++autoId}`}`),
        }),
        runTransaction: async (fn) => {
            if (nextTransactionFailure) {
                const failure = nextTransactionFailure;
                nextTransactionFailure = null;
                throw failure;
            }
            for (let attempt = 0; attempt < 100; attempt += 1) {
                const reads = new Map();
                const writes = [];
                const result = await fn({
                    get: async (ref) => {
                        reads.set(ref.path, versions.get(ref.path) ?? 0);
                        const snapshot = await ref.get();
                        await transactionReadHook?.(ref.path);
                        return snapshot;
                    },
                    set: (ref, data, opts) => {
                        writes.push({ mode: 'set', ref, data: cloneDoc(data), merge: opts?.merge === true });
                    },
                    create: (ref, data) => {
                        writes.push({ mode: 'create', ref, data: cloneDoc(data), merge: false });
                    },
                    delete: (ref) => {
                        writes.push({ mode: 'delete', ref, data: {}, merge: false });
                    },
                });
                const conflicted = Array.from(reads.entries())
                    .some(([path, version]) => (versions.get(path) ?? 0) !== version);
                if (conflicted)
                    continue;
                for (const write of writes) {
                    if (write.mode === 'create' && docs.has(write.ref.path)) {
                        throw new Error('already exists');
                    }
                }
                for (const write of writes) {
                    if (write.mode === 'delete') {
                        writeLog.push({ path: write.ref.path, data: {}, merge: false });
                        docs.delete(write.ref.path);
                        versions.set(write.ref.path, (versions.get(write.ref.path) ?? 0) + 1);
                    }
                    else {
                        writeDoc(write.ref.path, write.data, write.merge);
                    }
                }
                return result;
            }
            throw new Error('transaction retry limit exceeded');
        },
    };
}
class FakeHttpsError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
const registeredCallables = [];
jest.mock('firebase-functions/v2/https', () => ({
    HttpsError: FakeHttpsError,
    onCall: (optsOrHandler, maybeHandler) => {
        const options = typeof optsOrHandler === 'function'
            ? {}
            : (optsOrHandler ?? {});
        const handler = (typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler);
        registeredCallables.push({ options, handler });
        return handler;
    },
}));
jest.mock('./callable_options', () => ({
    HOT_CALLABLE_OPTIONS: {
        region: 'us-central1',
        enforceAppCheck: false,
        timeoutSeconds: 15,
        memory: '256MiB',
        maxInstances: 80,
    },
}));
jest.mock('firebase-admin', () => {
    const firestore = jest.fn(() => fakeDb());
    firestore.FieldValue = {
        serverTimestamp: () => ({ __op: 'serverTimestamp' }),
    };
    return { firestore };
});
jest.mock('./admin_email', () => ({
    sendTransactionalEmail: jest.fn(async () => ({ ok: true, id: 'em_test' })),
}));
jest.mock('./admin_alerts', () => ({
    sendTelegramAlert: jest.fn(async () => true),
    ADMIN_ALERT_BOT_TOKEN: { value: () => 'test-bot-token' },
}));
const STABLE = 'stable-abc-123';
const NOW = new Date('2026-07-22T12:00:00.000Z').getTime();
const RECOVERY_EMAIL = 'recovery.owner@example.invalid';
const RECOVERY_DISPLAY_NAME = 'Recovery Fixture';
const ACTIVE_RECOVERY_CODE_KEYS = [
    'attempts',
    'codeHash',
    'createdAt',
    'expiresAt',
    'provider',
    'requestedByUid',
    'salt',
    'status',
];
const CONSUMED_RECOVERY_CODE_KEYS = [
    ...ACTIVE_RECOVERY_CODE_KEYS,
    'consumedAt',
    'consumedByUid',
    'updatedAt',
];
const FAILED_RECOVERY_CODE_KEYS = [
    ...ACTIVE_RECOVERY_CODE_KEYS,
    'sendError',
    'updatedAt',
];
const RECOVERY_RATE_LIMIT_KEYS = [
    'count',
    'stableId',
    'updatedAtMs',
    'windowStartMs',
];
const RECOVERY_EVENT_KEYS = [
    'at',
    'newProviderUid',
    'previousProviderUids',
    'requestedByUid',
    'rollbackUntil',
    'stableId',
    'status',
];
function seedLinkedUser(provider = 'google') {
    docs.set(`users/${STABLE}`, {
        firebaseAuthUid: 'old-provider-uid',
        linkedAuth: {
            provider,
            providerUid: 'old-provider-uid',
            email: RECOVERY_EMAIL,
            displayName: RECOVERY_DISPLAY_NAME,
            devicePlatform: 'ios',
            linkedAt: 111,
        },
    });
    docs.set('auth_links/old-provider-uid', {
        stable_id: STABLE,
        providerUid: 'old-provider-uid',
        provider,
        linkedAt: 111,
    });
}
const REJECTED_PROVIDER_SESSIONS = [
    ['anonymous', 'google', { signInProvider: 'anonymous', emailVerified: true }],
    ['password', 'google', { signInProvider: 'password', emailVerified: true }],
    ['custom-token', 'google', { signInProvider: 'custom', emailVerified: true }],
    ['unverified Google', 'google', { signInProvider: 'google.com', emailVerified: false }],
    ['unverified Apple', 'apple', { signInProvider: 'apple.com', emailVerified: false }],
    ['missing email_verified', 'google', { signInProvider: 'google.com', omitEmailVerified: true }],
    ['missing sign_in_provider', 'google', { emailVerified: true, omitSignInProvider: true }],
    ['string email_verified true', 'google', { signInProvider: 'google.com', emailVerified: 'true' }],
    ['facebook', 'google', { signInProvider: 'facebook.com', emailVerified: true }],
];
const INVALID_TARGET_ANCHORS = [
    ['ownerless', () => docs.set('auth_links/old-provider-uid', {
            stable_id: STABLE,
            provider: 'google',
        })],
    ['conflicting', () => docs.set('auth_links/old-provider-uid', {
            stable_id: 'different-stable-id',
            providerUid: 'old-provider-uid',
            provider: 'google',
        })],
];
function validSessionFor(provider) {
    return { signInProvider: `${provider}.com`, emailVerified: true };
}
function authRequest(authUid, data, session = {}) {
    const token = {};
    if (!session.omitEmailVerified)
        token.email_verified = session.emailVerified ?? true;
    if (!session.omitSignInProvider) {
        token.firebase = { sign_in_provider: session.signInProvider ?? 'google.com' };
    }
    return {
        app: { appId: 'test-app-id' },
        auth: {
            uid: authUid,
            token,
        },
        data,
    };
}
async function callRequest(data, authUid = 'fresh-provider-uid', session = {}) {
    const { authRequestRecoveryCode } = require('./auth_recovery');
    return authRequestRecoveryCode(authRequest(authUid, data, session));
}
async function callConfirm(data, authUid, session = {}) {
    const { authConfirmRecoveryCode } = require('./auth_recovery');
    return authConfirmRecoveryCode(authRequest(authUid, data, session));
}
function emailedCode() {
    const { sendTransactionalEmail } = require('./admin_email');
    const calls = sendTransactionalEmail.mock.calls;
    const text = String(calls[calls.length - 1]?.[0]?.text ?? '');
    const match = text.match(/\n(\d{6})\n/);
    if (!match)
        throw new Error('код не найден в тексте письма');
    return match[1];
}
function wrongCode() {
    return emailedCode() === '000000' ? '000001' : '000000';
}
beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers().setSystemTime(NOW);
    docs.clear();
    versions.clear();
    writeLog.length = 0;
    registeredCallables.length = 0;
    autoId = 0;
    transactionReadHook = null;
    nextTransactionFailure = null;
});
afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});
describe('hashRecoveryCode', () => {
    it('детерминированный sha256(salt + code), соль меняет хэш', () => {
        const { hashRecoveryCode } = require('./auth_recovery');
        expect(hashRecoveryCode('salt1', '123456')).toBe(hashRecoveryCode('salt1', '123456'));
        expect(hashRecoveryCode('salt1', '123456')).not.toBe(hashRecoveryCode('salt2', '123456'));
        expect(hashRecoveryCode('salt1', '123456')).not.toBe(hashRecoveryCode('salt1', '654321'));
        expect(hashRecoveryCode('salt1', '123456')).toMatch(/^[a-f0-9]{64}$/);
    });
});
describe('recovery callable security boundary', () => {
    it('keeps legacy callable registration compatible while runtime App Check is mandatory', () => {
        const { authRequestRecoveryCode, authConfirmRecoveryCode } = require('./auth_recovery');
        const expectedOptions = {
            region: 'us-central1',
            enforceAppCheck: false,
            timeoutSeconds: 15,
            memory: '256MiB',
            maxInstances: 80,
        };
        const requestRegistrations = registeredCallables.filter(({ handler }) => handler === authRequestRecoveryCode);
        const confirmRegistrations = registeredCallables.filter(({ handler }) => handler === authConfirmRecoveryCode);
        expect(requestRegistrations).toEqual([{ options: expectedOptions, handler: authRequestRecoveryCode }]);
        expect(confirmRegistrations).toEqual([{ options: expectedOptions, handler: authConfirmRecoveryCode }]);
    });
    it.each([
        ['authRequestRecoveryCode', { stableId: STABLE }],
        ['authConfirmRecoveryCode', { stableId: STABLE, code: '123456' }],
    ])('%s fails closed without direct request.app and performs no side effects', async (exportName, data) => {
        seedLinkedUser();
        const recovery = require('./auth_recovery');
        const before = storeSnapshot();
        const request = authRequest('verified-google-uid', data);
        delete request.app;
        await expect(recovery[exportName](request)).rejects.toMatchObject({
            code: 'failed-precondition',
            message: 'app_check_required',
        });
        const { sendTransactionalEmail } = require('./admin_email');
        expect(sendTransactionalEmail).not.toHaveBeenCalled();
        expect(writeLog).toEqual([]);
        expect(storeSnapshot()).toEqual(before);
    });
});
describe('authRequestRecoveryCode', () => {
    it('требует auth', async () => {
        const { authRequestRecoveryCode } = require('./auth_recovery');
        await expect(authRequestRecoveryCode({ app: { appId: 'test-app-id' }, auth: null, data: { stableId: STABLE } }))
            .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
    });
    it.each(REJECTED_PROVIDER_SESSIONS)('rejects a %s token-claim session before sending a recovery code', async (_label, targetProvider, session) => {
        seedLinkedUser(targetProvider);
        const before = storeSnapshot();
        await expect(callRequest({ stableId: STABLE, provider: targetProvider }, 'requesting-uid', session))
            .rejects.toMatchObject({ code: 'permission-denied' });
        const { sendTransactionalEmail } = require('./admin_email');
        expect(sendTransactionalEmail).not.toHaveBeenCalled();
        expect(writeLog).toEqual([]);
        expect(storeSnapshot()).toEqual(before);
    });
    it.each(INVALID_TARGET_ANCHORS)('rejects a %s target auth_links anchor without sending or writing', async (_label, mutateAnchor) => {
        seedLinkedUser();
        mutateAnchor();
        const before = storeSnapshot();
        await expect(callRequest({ stableId: STABLE }))
            .rejects.toMatchObject({ code: 'permission-denied' });
        const { sendTransactionalEmail } = require('./admin_email');
        expect(sendTransactionalEmail).not.toHaveBeenCalled();
        expect(writeLog).toEqual([]);
        expect(identitySnapshot()).toEqual(before.filter(([path]) => (path.startsWith('users/') || path.startsWith('auth_links/') || path.startsWith('leaderboard/'))));
        expect(storeSnapshot()).toEqual(before);
    });
    it('allows code issuance when a legacy user-owned provider anchor was already purged', async () => {
        seedLinkedUser();
        docs.delete('auth_links/old-provider-uid');
        await expect(callRequest({ stableId: STABLE })).resolves.toMatchObject({
            ok: true,
            provider: 'google',
        });
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({ status: 'active' });
    });
    it('rejects a tombstoned recovery target without sending or writing', async () => {
        seedLinkedUser();
        docs.set(`account_deletion_tombstones/${STABLE}`, { deletedAt: NOW });
        const before = storeSnapshot();
        await expect(callRequest({ stableId: STABLE }))
            .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
        const { sendTransactionalEmail } = require('./admin_email');
        expect(sendTransactionalEmail).not.toHaveBeenCalled();
        expect(writeLog).toEqual([]);
        expect(storeSnapshot()).toEqual(before);
    });
    it.each([
        ['old provider marker', 'account_deletion_auth_markers/old-provider-uid'],
        ['current provider marker', 'account_deletion_auth_markers/fresh-provider-uid'],
        ['target tombstone', `account_deletion_tombstones/${STABLE}`],
    ])('rejects when a %s appears after preflight but before code creation', async (_label, path) => {
        seedLinkedUser();
        let injected = false;
        transactionReadHook = (readPath) => {
            if (!injected && readPath === `auth_recovery_rate_limits/${STABLE}`) {
                injected = true;
                mutateExternally(path, { status: 'pending', at: NOW });
            }
        };
        await expect(callRequest({ stableId: STABLE }))
            .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
        const { sendTransactionalEmail } = require('./admin_email');
        expect(sendTransactionalEmail).not.toHaveBeenCalled();
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toBeUndefined();
        expect(docs.get(`auth_recovery_rate_limits/${STABLE}`)).toBeUndefined();
        expect(writeLog).toEqual([]);
    });
    it('шлёт код на email привязки, возвращает маску и не светит полный email', async () => {
        seedLinkedUser();
        const result = await callRequest({ stableId: STABLE });
        expect(result).toEqual({
            ok: true,
            maskedEmail: 'rec***@example.invalid',
            expiresInSec: 600,
            provider: 'google',
        });
        expect(JSON.stringify(result)).not.toContain('recovery.owner');
        const { sendTransactionalEmail } = require('./admin_email');
        expect(sendTransactionalEmail).toHaveBeenCalledTimes(1);
        const sent = sendTransactionalEmail.mock.calls[0][0];
        expect(sent.to).toBe(RECOVERY_EMAIL);
        expect(sent.subject).toBe('Phraseman — код восстановления аккаунта');
        expect(sent.text).toContain('10 минут');
        expect(sent.text).toContain('проигнорируйте');
        expect(sent.text).toContain('safely ignore');
        const codeDoc = docs.get(`auth_recovery_codes/${STABLE}`);
        expectExactKeys(codeDoc, ACTIVE_RECOVERY_CODE_KEYS);
        expectNoSensitiveValues(codeDoc);
        expect(codeDoc).toMatchObject({
            status: 'active',
            attempts: 0,
            requestedByUid: 'fresh-provider-uid',
            provider: 'google',
            createdAt: NOW,
            expiresAt: NOW + 10 * 60 * 1000,
        });
        // Сам код в Firestore не хранится — только sha256(salt + code).
        const { hashRecoveryCode } = require('./auth_recovery');
        expect(codeDoc?.code).toBeUndefined();
        expect(codeDoc?.codeHash).toBe(hashRecoveryCode(String(codeDoc?.salt), emailedCode()));
        const rateLimitDoc = docs.get(`auth_recovery_rate_limits/${STABLE}`);
        expectExactKeys(rateLimitDoc, RECOVERY_RATE_LIMIT_KEYS);
        expectNoSensitiveValues(rateLimitDoc);
        expect(rateLimitDoc).toMatchObject({
            windowStartMs: NOW,
            count: 1,
        });
    });
    it('uses verified Apple token claims for both handlers and ignores data.provider', async () => {
        seedLinkedUser('apple');
        const appleSession = validSessionFor('apple');
        const requestResult = await callRequest({ stableId: STABLE, provider: 'google' }, 'requesting-apple-uid', appleSession);
        expect(requestResult).toMatchObject({ ok: true, provider: 'apple' });
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({ provider: 'apple' });
        const confirmResult = await callConfirm({ stableId: STABLE, code: emailedCode(), provider: 'google' }, 'replacement-apple-uid', appleSession);
        expect(confirmResult).toEqual({ ok: true, stableId: STABLE });
        expect(docs.get('auth_links/replacement-apple-uid')).toMatchObject({
            stable_id: STABLE,
            providerUid: 'replacement-apple-uid',
            provider: 'apple',
        });
    });
    it('recovery_no_email: нет документа, нет linkedAuth или нет email', async () => {
        await expect(callRequest({ stableId: 'missing-stable' }))
            .rejects.toMatchObject({ code: 'failed-precondition', message: 'recovery_no_email' });
        docs.set(`users/${STABLE}`, { firebaseAuthUid: 'anon-1' });
        await expect(callRequest({ stableId: STABLE }))
            .rejects.toMatchObject({ code: 'failed-precondition', message: 'recovery_no_email' });
        docs.set(`users/${STABLE}`, {
            linkedAuth: { provider: 'google', providerUid: 'uid-1', email: null },
        });
        await expect(callRequest({ stableId: STABLE }))
            .rejects.toMatchObject({ code: 'failed-precondition', message: 'recovery_no_email' });
    });
    it('rate-limit: не больше 3 отправок в час на stable_id', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        await callRequest({ stableId: STABLE });
        await callRequest({ stableId: STABLE });
        await expect(callRequest({ stableId: STABLE }))
            .rejects.toMatchObject({ code: 'resource-exhausted', message: 'recovery_rate_limited' });
        expect(docs.get(`auth_recovery_rate_limits/${STABLE}`)).toMatchObject({ count: 3 });
        // Через час окно сбрасывается — отправка снова возможна.
        jest.setSystemTime(NOW + 61 * 60 * 1000);
        await callRequest({ stableId: STABLE });
        expect(docs.get(`auth_recovery_rate_limits/${STABLE}`)).toMatchObject({ count: 1 });
    });
    it('resend_key_missing / сбой отправки: код гасится, ошибка наружу', async () => {
        seedLinkedUser();
        const { sendTransactionalEmail } = require('./admin_email');
        sendTransactionalEmail.mockResolvedValueOnce({ ok: false, error: 'resend_key_missing' });
        await expect(callRequest({ stableId: STABLE }))
            .rejects.toMatchObject({ code: 'failed-precondition', message: 'resend_key_missing' });
        const missingKeyCodeDoc = docs.get(`auth_recovery_codes/${STABLE}`);
        expectExactKeys(missingKeyCodeDoc, FAILED_RECOVERY_CODE_KEYS);
        expectNoSensitiveValues(missingKeyCodeDoc);
        expect(missingKeyCodeDoc).toMatchObject({ status: 'send_failed' });
        docs.delete(`auth_recovery_codes/${STABLE}`);
        docs.delete(`auth_recovery_rate_limits/${STABLE}`);
        sendTransactionalEmail.mockResolvedValueOnce({
            ok: false,
            error: `resend 500 for ${RECOVERY_EMAIL} ${RECOVERY_DISPLAY_NAME}`,
        });
        await expect(callRequest({ stableId: STABLE }))
            .rejects.toMatchObject({ code: 'internal', message: 'recovery_email_failed' });
        const failedCodeDoc = docs.get(`auth_recovery_codes/${STABLE}`);
        expectExactKeys(failedCodeDoc, FAILED_RECOVERY_CODE_KEYS);
        expectNoSensitiveValues(failedCodeDoc);
        expect(failedCodeDoc).toMatchObject({ status: 'send_failed' });
    });
});
describe('authConfirmRecoveryCode', () => {
    it('валидирует формат входных данных', async () => {
        seedLinkedUser();
        await expect(callConfirm({ stableId: '', code: '123456' }, 'new-uid'))
            .rejects.toMatchObject({ code: 'invalid-argument', message: 'stable_id_required' });
        await expect(callConfirm({ stableId: STABLE, code: '' }, 'new-uid'))
            .rejects.toMatchObject({ code: 'invalid-argument', message: 'code_required' });
        await expect(callConfirm({ stableId: STABLE, code: '12a456' }, 'new-uid'))
            .rejects.toMatchObject({ code: 'invalid-argument', message: 'code_format_invalid' });
        await expect(callConfirm({ stableId: STABLE, code: '123456' }, ''))
            .rejects.toMatchObject({ code: 'unauthenticated', message: 'auth_required' });
    });
    it.each(REJECTED_PROVIDER_SESSIONS)('rejects a %s token-claim session before consuming a valid code', async (_label, targetProvider, session) => {
        seedLinkedUser(targetProvider);
        await callRequest({ stableId: STABLE }, 'requesting-provider-uid', validSessionFor(targetProvider));
        const code = emailedCode();
        const before = storeSnapshot();
        const beforeIdentity = identitySnapshot();
        writeLog.length = 0;
        const { sendTransactionalEmail } = require('./admin_email');
        sendTransactionalEmail.mockClear();
        await expect(callConfirm({ stableId: STABLE, code }, 'replacement-uid', session))
            .rejects.toMatchObject({ code: 'permission-denied' });
        expect(sendTransactionalEmail).not.toHaveBeenCalled();
        expect(writeLog).toEqual([]);
        expect(identitySnapshot()).toEqual(beforeIdentity);
        expect(storeSnapshot()).toEqual(before);
    });
    it.each(INVALID_TARGET_ANCHORS)('revalidates and rejects a %s target auth_links anchor before identity writes', async (_label, mutateAnchor) => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        mutateAnchor();
        const before = storeSnapshot();
        const beforeIdentity = identitySnapshot();
        writeLog.length = 0;
        const { sendTransactionalEmail } = require('./admin_email');
        sendTransactionalEmail.mockClear();
        await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
            .rejects.toMatchObject({ code: 'permission-denied' });
        expect(sendTransactionalEmail).not.toHaveBeenCalled();
        expect(writeLog).toEqual([]);
        expect(identitySnapshot()).toEqual(beforeIdentity);
        expect(storeSnapshot()).toEqual(before);
    });
    it('repairs a legacy user-owned missing anchor without issuing a delete for it', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        docs.delete('auth_links/old-provider-uid');
        writeLog.length = 0;
        await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
            .resolves.toEqual({ ok: true, stableId: STABLE });
        expect(docs.get('auth_links/old-provider-uid')).toBeUndefined();
        expect(writeLog.filter(({ path, data }) => (path === 'auth_links/old-provider-uid' && Object.keys(data).length === 0))).toHaveLength(0);
        expect(collectionDocs('auth_recovery_events')).toHaveLength(1);
        expect(collectionDocs('auth_recovery_events')[0]?.data).toMatchObject({
            previousProviderUids: ['old-provider-uid'],
        });
    });
    it('rejects target user ownership drift after the recovery code is read', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        const codeBefore = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
        writeLog.length = 0;
        let injected = false;
        transactionReadHook = (path) => {
            if (!injected && path === `auth_recovery_codes/${STABLE}`) {
                injected = true;
                mutateExternally(`users/${STABLE}`, {
                    firebaseAuthUid: 'foreign-provider-uid',
                    linkedAuth: {
                        provider: 'google',
                        providerUid: 'foreign-provider-uid',
                        email: RECOVERY_EMAIL,
                    },
                });
            }
        };
        await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
            .rejects.toMatchObject({ code: 'permission-denied' });
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(codeBefore);
        expect(docs.get('auth_links/replacement-google-uid')).toBeUndefined();
        expect(collectionDocs('auth_recovery_events')).toHaveLength(0);
        expect(writeLog).toEqual([]);
    });
    it.each(['absent-to-provider-owned', 'anon-a-to-anon-b'])('rejects incoming auth_links drift during confirm: %s', async (mode) => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        if (mode === 'anon-a-to-anon-b') {
            docs.set('auth_links/replacement-google-uid', { stable_id: 'anon-a', linkedAt: 5 });
            docs.set('users/anon-a', { firebaseAuthUid: 'replacement-google-uid' });
        }
        writeLog.length = 0;
        let injected = false;
        transactionReadHook = (path) => {
            if (!injected && path === `auth_recovery_codes/${STABLE}`) {
                injected = true;
                const stableId = mode === 'absent-to-provider-owned' ? 'foreign-provider-stable' : 'anon-b';
                mutateExternally('auth_links/replacement-google-uid', { stable_id: stableId, linkedAt: 9 });
                mutateExternally(`users/${stableId}`, mode === 'absent-to-provider-owned'
                    ? {
                        firebaseAuthUid: 'replacement-google-uid',
                        linkedAuth: { provider: 'google', providerUid: 'replacement-google-uid' },
                    }
                    : { firebaseAuthUid: 'replacement-google-uid' });
            }
        };
        await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
            .rejects.toMatchObject({ code: 'permission-denied' });
        expect(docs.get('auth_links/replacement-google-uid')).toMatchObject({
            stable_id: mode === 'absent-to-provider-owned' ? 'foreign-provider-stable' : 'anon-b',
        });
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({ status: 'active' });
        expect(collectionDocs('auth_recovery_events')).toHaveLength(0);
        expect(writeLog).toEqual([]);
    });
    it('rejects a tombstoned target before consuming the code or changing identity', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        docs.set(`account_deletion_tombstones/${STABLE}`, { deletedAt: NOW });
        const before = storeSnapshot();
        const beforeIdentity = identitySnapshot();
        writeLog.length = 0;
        await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
            .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
        expect(writeLog).toEqual([]);
        expect(identitySnapshot()).toEqual(beforeIdentity);
        expect(storeSnapshot()).toEqual(before);
    });
    it.each([
        ['old provider marker', 'account_deletion_auth_markers/old-provider-uid'],
        ['current provider marker', 'account_deletion_auth_markers/replacement-google-uid'],
        ['target tombstone', `account_deletion_tombstones/${STABLE}`],
    ])('rejects when a %s appears after code read and commits no recovery writes', async (_label, path) => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        const codeBefore = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
        writeLog.length = 0;
        let injected = false;
        transactionReadHook = (readPath) => {
            if (!injected && readPath === `auth_recovery_codes/${STABLE}`) {
                injected = true;
                mutateExternally(path, { status: 'pending', at: NOW });
            }
        };
        await expect(callConfirm({ stableId: STABLE, code }, 'replacement-google-uid'))
            .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(codeBefore);
        expect(docs.get('auth_links/replacement-google-uid')).toBeUndefined();
        expect(collectionDocs('auth_recovery_events')).toHaveLength(0);
        expect(writeLog).toEqual([]);
    });
    it.each([
        ['Google session cannot replace an Apple identity', 'apple', 'apple.com', 'google.com'],
        ['Apple session cannot replace a Google identity', 'google', 'google.com', 'apple.com'],
    ])('%s', async (_label, targetProvider, requestProvider, confirmProvider) => {
        seedLinkedUser(targetProvider);
        await callRequest({ stableId: STABLE }, 'requesting-provider-uid', { signInProvider: requestProvider });
        const code = emailedCode();
        const codeBeforeMismatch = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
        const identityBeforeMismatch = identitySnapshot();
        writeLog.length = 0;
        await expect(callConfirm({ stableId: STABLE, code }, 'replacement-provider-uid', { signInProvider: confirmProvider })).rejects.toMatchObject({
            code: 'permission-denied',
            message: 'recovery_provider_mismatch',
        });
        expect(docs.get('auth_links/replacement-provider-uid')).toBeUndefined();
        expect(writeLog).toEqual([]);
        expect(identitySnapshot()).toEqual(identityBeforeMismatch);
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(codeBeforeMismatch);
    });
    it('успешная перепривязка: auth_links + users + событие + код consumed + алерт без PII', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        const result = await callConfirm({ stableId: STABLE, code }, 'new-google-uid');
        expect(result).toEqual({ ok: true, stableId: STABLE });
        // auth_links/{newUid} — форма ensureAuthLinkDoc.
        expect(docs.get('auth_links/new-google-uid')).toMatchObject({
            stable_id: STABLE,
            providerUid: 'new-google-uid',
            provider: 'google',
            email: RECOVERY_EMAIL,
            displayName: RECOVERY_DISPLAY_NAME,
            linkedAt: NOW,
            lastSignInAt: NOW,
            updatedAt: NOW,
        });
        expect(docs.get('auth_links/old-provider-uid')).toBeUndefined();
        // users/{stableId} — форма ensureProviderLinkedAuth (devicePlatform сохранён).
        const user = docs.get(`users/${STABLE}`);
        expect(user?.firebaseAuthUid).toBe('new-google-uid');
        expect(user?.linkedAuth).toMatchObject({
            provider: 'google',
            providerUid: 'new-google-uid',
            email: RECOVERY_EMAIL,
            displayName: RECOVERY_DISPLAY_NAME,
            linkedAt: NOW,
            lastSignInAt: NOW,
            devicePlatform: 'ios',
        });
        // Событие восстановления с previousProviderUids и окном отката 14 дней.
        const events = collectionDocs('auth_recovery_events');
        expect(events).toHaveLength(1);
        expectExactKeys(events[0].data, RECOVERY_EVENT_KEYS);
        expectNoSensitiveValues(events[0].data);
        expect(events[0].data).toMatchObject({
            stableId: STABLE,
            newProviderUid: 'new-google-uid',
            previousProviderUids: ['old-provider-uid'],
            requestedByUid: 'fresh-provider-uid',
            at: NOW,
            rollbackUntil: NOW + 14 * 24 * 60 * 60 * 1000,
        });
        // Код consumed, не удалён.
        const consumedCodeDoc = docs.get(`auth_recovery_codes/${STABLE}`);
        expectExactKeys(consumedCodeDoc, CONSUMED_RECOVERY_CODE_KEYS);
        expectNoSensitiveValues(consumedCodeDoc);
        expect(consumedCodeDoc).toMatchObject({
            status: 'consumed',
            consumedByUid: 'new-google-uid',
            consumedAt: NOW,
        });
        // Telegram-алерт: есть маски, нет email.
        const { sendTelegramAlert } = require('./admin_alerts');
        expect(sendTelegramAlert).toHaveBeenCalledTimes(1);
        const alertText = String(sendTelegramAlert.mock.calls[0][1]);
        expect(alertText).toContain('🔐');
        expect(alertText).toContain('gle-uid'); // хвост нового provider uid
        expect(alertText).toContain('Предыдущие uid: 1');
        expectNoSensitiveValues(alertText);
        expect(alertText).not.toContain(STABLE);
        expect(alertText).not.toContain('new-google-uid');
        expect(alertText).not.toContain('old-provider-uid');
        const alertCodeValues = Array.from(alertText.matchAll(/<code>(.*?)<\/code>/g), (match) => match[1]);
        expect(alertCodeValues).toHaveLength(2);
        expect(alertCodeValues[0]).toMatch(/^stab.+-123$/);
        expect(alertCodeValues[1]).toMatch(/^.+gle-uid$/);
        // Повторное использование кода запрещено.
        await expect(callConfirm({ stableId: STABLE, code }, 'new-google-uid'))
            .rejects.toMatchObject({ code: 'failed-precondition', message: 'recovery_code_missing' });
    });
    it('logs only an allowlisted event when the post-recovery alert fails', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const { sendTelegramAlert } = require('./admin_alerts');
        sendTelegramAlert.mockRejectedValueOnce(new Error(`delivery failed for ${RECOVERY_EMAIL} ${RECOVERY_DISPLAY_NAME} ${STABLE}`));
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        await expect(callConfirm({ stableId: STABLE, code: emailedCode() }, 'new-google-uid')).resolves.toEqual({ ok: true, stableId: STABLE });
        expect(warn).toHaveBeenCalledTimes(1);
        const logPayload = JSON.parse(String(warn.mock.calls[0]?.[0] ?? '{}'));
        expect(logPayload).toEqual({ event: 'auth_recovery_alert_failed' });
        expectNoSensitiveValues(logPayload);
        expect(JSON.stringify(logPayload)).not.toContain(STABLE);
        expect(JSON.stringify(logPayload)).not.toContain('new-google-uid');
        expect(JSON.stringify(logPayload)).not.toContain('old-provider-uid');
    });
    it('sanitizes unknown Firestore failures without logging or returning PII', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        nextTransactionFailure = new Error(`firestore failed for ${RECOVERY_EMAIL} ${RECOVERY_DISPLAY_NAME} ${STABLE}`);
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        await expect(callConfirm({ stableId: STABLE, code }, 'new-google-uid'))
            .rejects.toMatchObject({ code: 'internal', message: 'recovery_unavailable' });
        expect(warn).toHaveBeenCalledTimes(1);
        const logPayload = JSON.parse(String(warn.mock.calls[0]?.[0] ?? '{}'));
        expect(logPayload).toEqual({ event: 'auth_recovery_failed' });
        expectNoSensitiveValues(logPayload);
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({ status: 'active' });
        expect(docs.get('auth_links/new-google-uid')).toBeUndefined();
    });
    it('commits one event and one success after an internal transaction retry', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        let injected = false;
        transactionReadHook = (path) => {
            if (!injected && path === `users/${STABLE}`) {
                injected = true;
                mutateExternally(`users/${STABLE}`, {
                    ...(docs.get(`users/${STABLE}`) ?? {}),
                    concurrentTouch: NOW + 1,
                });
            }
        };
        await expect(callConfirm({ stableId: STABLE, code }, 'retry-google-uid'))
            .resolves.toEqual({ ok: true, stableId: STABLE });
        expect(collectionDocs('auth_recovery_events')).toHaveLength(1);
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({
            status: 'consumed',
            consumedByUid: 'retry-google-uid',
        });
        const { sendTelegramAlert } = require('./admin_alerts');
        expect(sendTelegramAlert).toHaveBeenCalledTimes(1);
    });
    it('перепривязка вытесняет свежий анонимный stable_id нового uid (фиксируется в событии)', async () => {
        seedLinkedUser();
        docs.set('auth_links/new-google-uid', { stable_id: 'anon-stable-999', linkedAt: 5 });
        docs.set('users/anon-stable-999', { firebaseAuthUid: 'new-google-uid' });
        await callRequest({ stableId: STABLE });
        await callConfirm({ stableId: STABLE, code: emailedCode() }, 'new-google-uid');
        expect(docs.get('auth_links/new-google-uid')).toMatchObject({
            stable_id: STABLE,
            linkedAt: 5, // существующий linkedAt сохраняется (форма ensureAuthLinkDoc)
        });
        const events = collectionDocs('auth_recovery_events');
        expectExactKeys(events[0]?.data, [...RECOVERY_EVENT_KEYS, 'previousStableIdDisplacement']);
        expectNoSensitiveValues(events[0]?.data);
        expect(events[0].data.previousStableIdDisplacement).toBe('anon-stable-999');
    });
    it('истёкший код → deadline-exceeded recovery_code_expired', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        jest.setSystemTime(NOW + 11 * 60 * 1000);
        const codeBefore = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
        const identityBefore = identitySnapshot();
        writeLog.length = 0;
        await expect(callConfirm({ stableId: STABLE, code }, 'new-google-uid'))
            .rejects.toMatchObject({ code: 'deadline-exceeded', message: 'recovery_code_expired' });
        expect(writeLog).toEqual([]);
        expect(identitySnapshot()).toEqual(identityBefore);
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(codeBefore);
    });
    it('неверный код инкрементит attempts; после 5 — recovery_code_locked даже для верного', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        const bad = wrongCode();
        const identityBefore = identitySnapshot();
        writeLog.length = 0;
        for (let i = 1; i <= 5; i += 1) {
            await expect(callConfirm({ stableId: STABLE, code: bad }, 'new-google-uid'))
                .rejects.toMatchObject({ code: 'permission-denied', message: 'recovery_code_invalid' });
            expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({ attempts: i });
        }
        await expect(callConfirm({ stableId: STABLE, code }, 'new-google-uid'))
            .rejects.toMatchObject({ code: 'resource-exhausted', message: 'recovery_code_locked' });
        // Привязка НЕ произошла.
        expect(docs.get('auth_links/new-google-uid')).toBeUndefined();
        expect(collectionDocs('auth_recovery_events')).toHaveLength(0);
        expect(identitySnapshot()).toEqual(identityBefore);
        expect(new Set(writeLog.map(({ path }) => path))).toEqual(new Set([`auth_recovery_codes/${STABLE}`]));
    });
    // The fake transaction scheduler exercises retry logic only; it is not an
    // emulator or production-contention proof.
    it('[unit-only synthetic concurrency] caps 50 wrong codes at five attempts with zero identity writes', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const correct = emailedCode();
        const bad = wrongCode();
        const identityBefore = identitySnapshot();
        writeLog.length = 0;
        const results = await Promise.allSettled(Array.from({ length: 50 }, () => callConfirm({ stableId: STABLE, code: bad }, 'concurrent-google-uid')));
        const messages = results.map((result) => (result.status === 'rejected' ? String(result.reason?.message ?? '') : 'fulfilled'));
        expect(messages.filter((message) => message === 'recovery_code_invalid')).toHaveLength(5);
        expect(messages.filter((message) => message === 'recovery_code_locked')).toHaveLength(45);
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({
            status: 'active',
            attempts: 5,
        });
        expect(docs.get('auth_links/concurrent-google-uid')).toBeUndefined();
        expect(docs.get(`users/${STABLE}`)).toMatchObject({ firebaseAuthUid: 'old-provider-uid' });
        expect(collectionDocs('auth_recovery_events')).toHaveLength(0);
        expect(identitySnapshot()).toEqual(identityBefore);
        expect(new Set(writeLog.map(({ path }) => path))).toEqual(new Set([`auth_recovery_codes/${STABLE}`]));
        await expect(callConfirm({ stableId: STABLE, code: correct }, 'concurrent-google-uid')).rejects.toMatchObject({
            code: 'resource-exhausted',
            message: 'recovery_code_locked',
        });
    });
    it('[unit-only synthetic concurrency] allows at most one success when a correct code is replayed', async () => {
        seedLinkedUser();
        await callRequest({ stableId: STABLE });
        const code = emailedCode();
        const results = await Promise.allSettled(Array.from({ length: 50 }, () => callConfirm({ stableId: STABLE, code }, 'replay-google-uid')));
        const fulfilled = results.filter((result) => result.status === 'fulfilled');
        const rejected = results.filter((result) => result.status === 'rejected');
        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(49);
        expect(rejected.every((result) => (String(result.reason?.message ?? '') === 'recovery_code_missing'))).toBe(true);
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toMatchObject({
            status: 'consumed',
            consumedByUid: 'replay-google-uid',
        });
        expect(docs.get('auth_links/replay-google-uid')).toMatchObject({ stable_id: STABLE });
        const replayEvents = collectionDocs('auth_recovery_events');
        expect(replayEvents).toHaveLength(1);
        expectExactKeys(replayEvents[0]?.data, RECOVERY_EVENT_KEYS);
        expectNoSensitiveValues(replayEvents[0]?.data);
        const { sendTelegramAlert } = require('./admin_alerts');
        expect(sendTelegramAlert).toHaveBeenCalledTimes(1);
    });
    it('uid с незавершённым удалением аккаунта не перепривязывается', async () => {
        seedLinkedUser();
        docs.set('account_deletion_auth_markers/new-google-uid', { at: NOW });
        await callRequest({ stableId: STABLE });
        const codeBefore = cloneDoc(docs.get(`auth_recovery_codes/${STABLE}`) ?? {});
        const identityBefore = identitySnapshot();
        writeLog.length = 0;
        await expect(callConfirm({ stableId: STABLE, code: emailedCode() }, 'new-google-uid'))
            .rejects.toMatchObject({ code: 'failed-precondition', message: 'account_delete_pending' });
        expect(docs.get('auth_links/new-google-uid')).toBeUndefined();
        expect(writeLog).toEqual([]);
        expect(identitySnapshot()).toEqual(identityBefore);
        expect(docs.get(`auth_recovery_codes/${STABLE}`)).toEqual(codeBefore);
    });
    it('нет активного кода → recovery_code_missing', async () => {
        seedLinkedUser();
        const before = storeSnapshot();
        await expect(callConfirm({ stableId: STABLE, code: '123456' }, 'new-google-uid'))
            .rejects.toMatchObject({ code: 'failed-precondition', message: 'recovery_code_missing' });
        expect(writeLog).toEqual([]);
        expect(storeSnapshot()).toEqual(before);
    });
});
//# sourceMappingURL=auth_recovery.test.js.map