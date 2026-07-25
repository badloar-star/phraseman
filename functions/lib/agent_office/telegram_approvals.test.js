"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
const NOW_MS = 2000000000000;
const NONCE = 'A'.repeat(32);
const TOKEN_HASH = (0, node_crypto_1.createHash)('sha256').update(NONCE, 'utf8').digest('hex');
const UPDATE_ID = '50000001';
const UPDATE_ID_HASH = (0, node_crypto_1.createHash)('sha256').update(UPDATE_ID, 'utf8').digest('hex');
const SAFE_SOURCE_REF = `cohort:sha256:${'d'.repeat(64)}`;
function canonicalJson(value) {
    if (value === null || typeof value === 'boolean' || typeof value === 'string')
        return JSON.stringify(value);
    if (typeof value === 'number' && Number.isFinite(value))
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(canonicalJson).join(',')}]`;
    if (typeof value === 'object') {
        const row = value;
        return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(row[key])}`).join(',')}}`;
    }
    throw new Error('non-canonical test value');
}
function recommendationContentHash(value) {
    const { contentHash: _declaredHash, ...content } = value;
    return (0, node_crypto_1.createHash)('sha256').update(canonicalJson(content), 'utf8').digest('hex');
}
class MemoryRepository {
    constructor() {
        this.documents = new Map();
        this.writes = [];
        this.transactionCount = 0;
        this.getCount = 0;
        this.beforeTransaction = null;
    }
    seed(path, data) {
        this.documents.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
    }
    async get(path) {
        this.getCount += 1;
        return this.documents.get(path) ?? null;
    }
    async query(_input) {
        throw new Error('query is not used by Telegram approval tests');
    }
    async runTransaction(body) {
        this.transactionCount += 1;
        this.beforeTransaction?.();
        this.beforeTransaction = null;
        const staged = new Map(this.documents);
        const pendingWrites = [];
        const transaction = {
            get: async (path) => staged.get(path) ?? null,
            create: (path, data) => {
                if (staged.has(path))
                    throw new https_1.HttpsError('already-exists', 'document already exists');
                staged.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
                pendingWrites.push({ operation: 'create', path });
            },
            update: (path, data) => {
                const current = staged.get(path);
                if (!current)
                    throw new https_1.HttpsError('not-found', 'document missing');
                staged.set(path, { ...current, data: { ...current.data, ...structuredClone(data) } });
                pendingWrites.push({ operation: 'update', path });
            },
            set: (path, data) => {
                staged.set(path, { id: path.split('/').at(-1) || '', data: structuredClone(data) });
                pendingWrites.push({ operation: 'set', path });
            },
        };
        const result = await body(transaction);
        this.documents.clear();
        staged.forEach((value, key) => this.documents.set(key, value));
        this.writes.push(...pendingWrites);
        return result;
    }
}
function seedReadyDecision(repo) {
    const recommendation = {
        schemaVersion: 1,
        recommendationId: 'rec-1',
        caseId: 'case-1',
        revision: 2,
        evidence: [{ summary: 'Bounded evidence.', sourceRef: SAFE_SOURCE_REF, observedAtMs: NOW_MS - 1000 }],
        risk: { level: 'low', summary: 'Preparation only.' },
        cost: { currency: 'EUR', estimatedMinor: 0, summary: 'No spend.' },
        rollback: { possible: true, plan: 'Discard prepared branch.' },
        actionType: 'code_change_prepare',
        scope: 'prepare_only',
        validUntilMs: NOW_MS + 100000,
        createdAtMs: NOW_MS - 1000,
    };
    const contentHash = recommendationContentHash(recommendation);
    repo.seed('agent_cases/case-1', {
        schemaVersion: 1,
        caseId: 'case-1',
        revision: 3,
        status: 'awaiting_decision',
        summary: 'Redacted case summary.',
        sourceHealth: [{ source: 'analytics', state: 'ready', observedAtMs: NOW_MS - 1000 }],
        confidence: { score: 0.8, basis: 'complete window', insufficientEvidence: false },
        sourceRefs: [{ source: 'analytics', ref: SAFE_SOURCE_REF }],
        currentRecommendation: { recommendationId: 'rec-1', revision: 2, contentHash },
        createdAtMs: NOW_MS - 10000,
        updatedAtMs: NOW_MS - 1000,
        retentionUntilMs: NOW_MS + 10000000,
    });
    repo.seed('agent_recommendations/case-1__r2', { ...recommendation, contentHash });
    repo.seed('agent_office_control/global', {
        schemaVersion: 1,
        controlId: 'global',
        killSwitchEnabled: false,
        revision: 7,
        lastChangedAtMs: NOW_MS - 20000,
        lastChangedByUid: 'owner-uid',
        lastIdempotencyKeyHash: 'a'.repeat(64),
        lastPayloadHash: 'b'.repeat(64),
    });
    return contentHash;
}
function tokenDocument(contentHash, overrides = {}) {
    return {
        schemaVersion: 1,
        tokenIdHash: TOKEN_HASH,
        status: 'active',
        ownerUid: 'owner-uid',
        telegramChatId: '70000001',
        telegramUserId: '70000001',
        permittedVerb: 'authorize',
        caseId: 'case-1',
        expectedCaseRevision: 3,
        recommendationId: 'rec-1',
        recommendationRevision: 2,
        recommendationContentHash: contentHash,
        controlRevision: 7,
        issuedAtMs: NOW_MS - 10000,
        validUntilMs: NOW_MS + 10000,
        consumedAtMs: null,
        consumedApprovalId: null,
        consumedUpdateIdHash: null,
        ...overrides,
    };
}
function verifiedUpdate(overrides = {}) {
    return {
        verification: 'verified',
        updateId: UPDATE_ID,
        callbackQueryId: 'callback-query-12345678',
        chatId: '70000001',
        userId: '70000001',
        commandText: `/authorize ${NONCE}`,
        ...overrides,
    };
}
function serverState(token, overrides = {}) {
    return {
        ownerAuth: { uid: 'owner-uid', token: { admin: true, adminRole: 'owner' } },
        configuredOwnerUid: 'owner-uid',
        configuredTelegramChatId: '70000001',
        configuredTelegramUserId: '70000001',
        token,
        ...overrides,
    };
}
function seedToken(repo, token) {
    repo.seed(`agent_telegram_tokens/${String(token.tokenIdHash)}`, token);
}
async function loadCore(repo) {
    const { AgentOfficeLedger } = await Promise.resolve().then(() => __importStar(require('./ledger')));
    const { TelegramApprovalCore } = await Promise.resolve().then(() => __importStar(require('./telegram_approvals')));
    return new TelegramApprovalCore(new AgentOfficeLedger(repo, () => NOW_MS), () => NOW_MS);
}
describe('internal Telegram approval core', () => {
    test('authorizes only the exact bound recommendation and atomically consumes the nonce', async () => {
        const repo = new MemoryRepository();
        const contentHash = seedReadyDecision(repo);
        const token = tokenDocument(contentHash);
        seedToken(repo, token);
        const core = await loadCore(repo);
        const result = await core.handle(verifiedUpdate(), serverState(token));
        expect(result).toMatchObject({ ok: true, idempotent: false, decision: 'approve', scope: 'prepare_only', enqueuedTaskId: null, caseRevision: 4 });
        expect(repo.documents.get('agent_cases/case-1')?.data).toMatchObject({ status: 'approved', revision: 4 });
        expect(repo.documents.get(`agent_telegram_tokens/${TOKEN_HASH}`)?.data).toMatchObject({
            status: 'consumed',
            consumedUpdateIdHash: UPDATE_ID_HASH,
            consumedApprovalId: result.approvalId,
        });
        expect(repo.writes).toHaveLength(4);
        expect([...repo.documents.keys()].some((path) => path.startsWith('agent_tasks/'))).toBe(false);
        expect(repo.writes.some((write) => /remote_config|messages/i.test(write.path))).toBe(false);
    });
    test('maps reject to the exact decline decision without broader authority', async () => {
        const repo = new MemoryRepository();
        const contentHash = seedReadyDecision(repo);
        const token = tokenDocument(contentHash, { permittedVerb: 'reject' });
        seedToken(repo, token);
        const core = await loadCore(repo);
        const result = await core.handle(verifiedUpdate({ commandText: `/reject ${NONCE}` }), serverState(token));
        expect(result).toMatchObject({ decision: 'decline', scope: 'prepare_only', enqueuedTaskId: null });
        expect(repo.documents.get('agent_cases/case-1')?.data).toMatchObject({ status: 'cancelled', revision: 4 });
    });
    test.each([
        ['missing owner auth', { ownerAuth: undefined }],
        ['forged owner claims', { ownerAuth: { uid: 'owner-uid', token: { admin: true, adminRole: 'admin' } } }],
        ['configured owner differs from authenticated owner', { configuredOwnerUid: 'other-owner' }],
    ])('rejects %s before any ledger read or transaction', async (_name, stateOverrides) => {
        const repo = new MemoryRepository();
        const contentHash = seedReadyDecision(repo);
        const token = tokenDocument(contentHash);
        const core = await loadCore(repo);
        await expect(core.handle(verifiedUpdate(), serverState(token, stateOverrides))).rejects.toMatchObject({
            code: expect.stringMatching(/invalid-argument|permission-denied/),
        });
        expect(repo.getCount).toBe(0);
        expect(repo.transactionCount).toBe(0);
        expect(repo.writes).toHaveLength(0);
    });
    test.each([
        ['chat', { chatId: '70000002' }],
        ['user', { userId: '70000002' }],
    ])('rejects mismatched Telegram %s identity before any transaction', async (_name, updateOverrides) => {
        const repo = new MemoryRepository();
        const contentHash = seedReadyDecision(repo);
        const token = tokenDocument(contentHash);
        const core = await loadCore(repo);
        await expect(core.handle(verifiedUpdate(updateOverrides), serverState(token))).rejects.toMatchObject({ code: 'permission-denied' });
        expect(repo.getCount).toBe(0);
        expect(repo.transactionCount).toBe(0);
        expect(repo.writes).toHaveLength(0);
    });
    test.each([
        ['unverified identity', { verification: 'unchecked' }],
        ['unknown verb', { commandText: `/approve ${NONCE}` }],
        ['missing nonce', { commandText: '/authorize' }],
        ['extra command fields', { commandText: `/authorize ${NONCE} now` }],
        ['short guessable nonce', { commandText: '/authorize short-token' }],
    ])('fails closed for invalid parse: %s', async (_name, updateOverrides) => {
        const repo = new MemoryRepository();
        const contentHash = seedReadyDecision(repo);
        const token = tokenDocument(contentHash);
        const core = await loadCore(repo);
        await expect(core.handle(verifiedUpdate(updateOverrides), serverState(token))).rejects.toMatchObject({
            code: expect.stringMatching(/invalid-argument|permission-denied/),
        });
        expect(repo.getCount).toBe(0);
        expect(repo.transactionCount).toBe(0);
        expect(repo.writes).toHaveLength(0);
    });
    test.each([
        ['token hash does not match nonce', { tokenIdHash: 'f'.repeat(64) }],
        ['verb not permitted by token', { permittedVerb: 'reject' }],
        ['token belongs to another owner', { ownerUid: 'other-owner' }],
        ['token belongs to another chat', { telegramChatId: '70000002' }],
        ['inactive server token', { status: 'revoked' }],
    ])('rejects forged or unusable owner-token state: %s', async (_name, tokenOverrides) => {
        const repo = new MemoryRepository();
        const contentHash = seedReadyDecision(repo);
        const token = tokenDocument(contentHash, tokenOverrides);
        const core = await loadCore(repo);
        await expect(core.handle(verifiedUpdate(), serverState(token))).rejects.toMatchObject({
            code: expect.stringMatching(/invalid-argument|permission-denied|failed-precondition/),
        });
        expect(repo.getCount).toBe(0);
        expect(repo.transactionCount).toBe(0);
        expect(repo.writes).toHaveLength(0);
    });
    test('rejects expired token state before reading control or opening a transaction', async () => {
        const repo = new MemoryRepository();
        const contentHash = seedReadyDecision(repo);
        const token = tokenDocument(contentHash, { validUntilMs: NOW_MS });
        const core = await loadCore(repo);
        await expect(core.handle(verifiedUpdate(), serverState(token))).rejects.toMatchObject({ code: 'failed-precondition' });
        expect(repo.getCount).toBe(0);
        expect(repo.transactionCount).toBe(0);
        expect(repo.writes).toHaveLength(0);
    });
    test.each([
        ['enabled', { killSwitchEnabled: true, revision: 7 }],
        ['stale token control revision', { killSwitchEnabled: false, revision: 8 }],
        ['missing', null],
        ['malformed', { killSwitchEnabled: false, revision: 'bad' }],
    ])('fails closed when kill switch state is %s without opening a transaction', async (_name, control) => {
        const repo = new MemoryRepository();
        const contentHash = seedReadyDecision(repo);
        const token = tokenDocument(contentHash);
        if (control === null)
            repo.documents.delete('agent_office_control/global');
        else {
            const current = repo.documents.get('agent_office_control/global');
            if (!current)
                throw new Error('control fixture missing');
            repo.seed('agent_office_control/global', { ...current.data, ...control });
        }
        const core = await loadCore(repo);
        await expect(core.handle(verifiedUpdate(), serverState(token))).rejects.toMatchObject({ code: 'failed-precondition' });
        expect(repo.transactionCount).toBe(0);
        expect(repo.writes).toHaveLength(0);
    });
    test('rechecks kill switch and token binding atomically and rejects a stop race without writes', async () => {
        const repo = new MemoryRepository();
        const contentHash = seedReadyDecision(repo);
        const token = tokenDocument(contentHash);
        seedToken(repo, token);
        repo.beforeTransaction = () => {
            const control = repo.documents.get('agent_office_control/global');
            if (!control)
                throw new Error('control fixture missing');
            repo.seed('agent_office_control/global', { ...control.data, killSwitchEnabled: true, revision: 8 });
        };
        const core = await loadCore(repo);
        await expect(core.handle(verifiedUpdate(), serverState(token))).rejects.toMatchObject({ code: 'failed-precondition' });
        expect(repo.transactionCount).toBe(1);
        expect(repo.writes).toHaveLength(0);
    });
    test.each([
        ['stale case revision', { expectedCaseRevision: 2 }],
        ['revised recommendation', { recommendationRevision: 3 }],
        ['changed recommendation hash', { recommendationContentHash: 'f'.repeat(64) }],
    ])('rejects %s through the ledger transaction without side effects', async (_name, tokenOverrides) => {
        const repo = new MemoryRepository();
        const contentHash = seedReadyDecision(repo);
        const token = tokenDocument(contentHash, tokenOverrides);
        seedToken(repo, token);
        const core = await loadCore(repo);
        await expect(core.handle(verifiedUpdate(), serverState(token))).rejects.toMatchObject({ code: 'failed-precondition' });
        expect(repo.transactionCount).toBe(1);
        expect(repo.writes).toHaveLength(0);
    });
    test('returns an idempotent exact Telegram retry and rejects nonce reuse from another update', async () => {
        const repo = new MemoryRepository();
        const contentHash = seedReadyDecision(repo);
        const token = tokenDocument(contentHash);
        seedToken(repo, token);
        const core = await loadCore(repo);
        const first = await core.handle(verifiedUpdate(), serverState(token));
        const writeCount = repo.writes.length;
        const consumedToken = repo.documents.get(`agent_telegram_tokens/${TOKEN_HASH}`)?.data;
        if (!consumedToken)
            throw new Error('consumed token missing');
        await expect(core.handle(verifiedUpdate(), serverState(consumedToken))).resolves.toEqual({ ...first, idempotent: true });
        expect(repo.writes).toHaveLength(writeCount);
        await expect(core.handle(verifiedUpdate({ updateId: '50000002' }), serverState(consumedToken))).rejects.toMatchObject({ code: 'failed-precondition' });
        expect(repo.writes).toHaveLength(writeCount);
    });
});
//# sourceMappingURL=telegram_approvals.test.js.map