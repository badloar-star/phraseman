"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const progress_event_callable_1 = require("./progress_event_callable");
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const progress_event_transaction_plan_1 = require("./progress_event_transaction_plan");
const progress_event_1 = require("./progress_event");
const attemptBody = {
    schemaVersion: 'v2-attempt-body.v1',
    opId: 'attempt-1',
    attemptSurface: { kind: 'episode_graph_node' },
    outcome: { resultCode: 'CORRECT' },
    evidence: { hintsUsed: 0 },
    provenance: { phase: 'encounter_build' },
    inputBinding: { source: 'keyboard' },
    learningTupleDispositions: [{
            nodeId: 'n1', objectiveId: 'o1', skillId: 's1', construct: 'semantic',
            phase: 'encounter_build', targetKind: 'objective', targetId: 't1',
            terminalDisposition: 'no_record', reasonCode: 'skipped_by_learner',
        }],
};
const attemptRef = (0, attempt_1.buildCanonicalAttemptRef)(attemptBody);
const requestBody = {
    accountScopeHash: 'a'.repeat(32),
    seasonId: 'season-1',
    studyTarget: 'en',
    learnerSourceLocale: 'ru',
    seasonRevisionId: 'season-1-r1',
    episodeRevisionRef: {
        draftId: 'draft-1', episodeId: 'episode-1', revision: 1,
        revisionFingerprint: 'b'.repeat(64), contentHash: 'c'.repeat(64), ordinal: 1,
        chapterId: 'chapter-1', approvalStatus: 'approved',
    },
    idempotencyKey: 'event-0001',
    attemptBody,
    attemptRef,
    evidenceBundle: { schemaVersion: 'v2-progress-evidence-bundle.v1', attemptRef, evidenceBodies: [], nonAssessmentBodies: [] },
    projection: { starSlotId: 'slot-1', previousBestStars: 0, candidateStars: 2, activityId: 'activity-1', progressCompatibilityKey: 'compat-1' },
};
describe('V2 progress callable auth adapter', () => {
    it('fails closed for missing and malformed Firebase auth UIDs', () => {
        expect(() => (0, progress_event_callable_1.normalizeProgressAuthUid)(undefined)).toThrow(https_1.HttpsError);
        expect(() => (0, progress_event_callable_1.normalizeProgressAuthUid)('  ')).toThrow(https_1.HttpsError);
        expect(() => (0, progress_event_callable_1.normalizeProgressAuthUid)('x'.repeat(129))).toThrow(https_1.HttpsError);
        expect(() => (0, progress_event_callable_1.requireProgressAuth)({ data: requestBody })).toThrow('authentication_required');
    });
    it('normalizes auth and stable IDs without accepting empty values', () => {
        expect((0, progress_event_callable_1.normalizeProgressAuthUid)(' auth-user ')).toBe('auth-user');
        expect((0, progress_event_callable_1.normalizeProgressStableUid)(' stable-user ')).toBe('stable-user');
        expect(() => (0, progress_event_callable_1.normalizeProgressStableUid)(null)).toThrow('stable_id_required');
    });
    it('authorizes before executing and passes only server-derived stable identity', async () => {
        const calls = [];
        const handler = (0, progress_event_callable_1.createProgressEventHandler)(async (authUid) => {
            calls.push(['authorize', authUid]);
            return { stableUid: 'stable-canonical', accountGeneration: 1 };
        }, async (authorized) => {
            calls.push(authorized);
            return { ok: true };
        });
        await expect(handler({
            data: { ...requestBody, accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)('stable-canonical', 1) },
            auth: { uid: ' auth-user ' },
        })).resolves.toEqual({ ok: true });
        expect(calls).toEqual([
            ['authorize', 'auth-user'],
            expect.objectContaining({ authUid: 'auth-user', stableUid: 'stable-canonical' }),
        ]);
    });
    it('does not invoke authorization or executor when the request is unauthenticated', async () => {
        const authorize = jest.fn(async () => ({ stableUid: 'stable', accountGeneration: 1 }));
        const execute = jest.fn(async () => ({ ok: true }));
        const handler = (0, progress_event_callable_1.createProgressEventHandler)(authorize, execute);
        await expect(handler({ data: requestBody })).rejects.toThrow('authentication_required');
        expect(authorize).not.toHaveBeenCalled();
        expect(execute).not.toHaveBeenCalled();
    });
    it('rejects an authorization result that omits the expected generation binding', async () => {
        const execute = jest.fn(async () => ({ ok: true }));
        const handler = (0, progress_event_callable_1.createProgressEventHandler)(async () => 'legacy-stable-only', execute);
        await expect(handler({ data: requestBody, auth: { uid: 'auth-user' } }))
            .rejects.toThrow('account_generation_unavailable');
        expect(execute).not.toHaveBeenCalled();
    });
    it('uses a fail-closed App Check callable configuration', () => {
        expect(progress_event_callable_1.V2_PROGRESS_CALLABLE_OPTIONS.enforceAppCheck).toBe(true);
        expect(progress_event_callable_1.V2_PROGRESS_CALLABLE_OPTIONS.region).toBe('us-central1');
    });
    it('requires a strict auth_links anchor before reading the server generation', async () => {
        const documents = {
            'auth_links/auth-user': { exists: true, data: { stable_id: 'stable-user' } },
            'users/stable-user': { exists: true, data: { accountGeneration: 7 } },
            'account_deletion_tombstones/stable-user': { exists: false },
        };
        const db = {
            collection: (name) => ({
                doc: (id) => ({
                    get: async () => {
                        const document = documents[`${name}/${id}`] ?? { exists: false };
                        return { exists: document.exists, data: () => document.data };
                    },
                }),
            }),
        };
        await expect((0, progress_event_callable_1.readProgressAccountBinding)(db, 'auth-user')).resolves.toEqual({
            stableUid: 'stable-user', accountGeneration: 7,
        });
    });
    it('does not fall back or repair identity when the auth anchor is missing', async () => {
        const db = {
            collection: () => ({
                doc: () => ({ get: async () => ({ exists: false, data: () => undefined }) }),
            }),
        };
        await expect((0, progress_event_callable_1.createProgressEventAuthorization)(db)('anonymous-auth-user'))
            .rejects.toThrow('progress_identity_anchor_missing');
    });
    it('rejects a deletion tombstone while reading the expected binding', async () => {
        const documents = {
            'auth_links/auth-user': { exists: true, data: { stable_id: 'stable-user' } },
            'users/stable-user': { exists: true, data: { accountGeneration: 7 } },
            'account_deletion_tombstones/stable-user': { exists: true, data: { status: 'pending' } },
        };
        const tombstonedDb = {
            collection: (name) => ({
                doc: (id) => ({
                    get: async () => {
                        const document = documents[`${name}/${id}`] ?? { exists: false };
                        return { exists: document.exists, data: () => document.data };
                    },
                }),
            }),
        };
        await expect((0, progress_event_callable_1.readProgressAccountBinding)(tombstonedDb, 'auth-user')).rejects.toThrow('account_delete_pending');
    });
    it('rejects a progress request whose scope hash is from another account generation', async () => {
        const handler = (0, progress_event_callable_1.createProgressEventHandler)(async () => ({ stableUid: 'stable-canonical', accountGeneration: 2 }), async () => ({ ok: true }));
        await expect(handler({ data: requestBody, auth: { uid: 'auth-user' } })).rejects.toThrow('account_generation_mismatch');
    });
    it('production executor rejects a forged positive candidate when no trusted scorer is configured', async () => {
        const createStore = jest.fn(() => ({
            runTransaction: async (work) => work({
                readOperation: async () => undefined,
                validatePinnedScope: async () => undefined,
                resolveServerProjection: undefined,
                readAttempt: async () => undefined,
                prepareTransactionPlan: async (_request, materialized, projection, trusted) => {
                    (0, progress_event_transaction_plan_1.prepareProgressTransactionPlan)({ existingEvidenceIndex: {}, existingBestStars: 0, materialized, projection, trustedScoreResolution: trusted });
                },
                writeProgressProjection: async () => undefined,
                writeAttempt: async () => undefined,
                writeEvidenceMaterialization: async () => undefined,
                createOperation: async () => undefined,
            }),
        }));
        const handler = (0, progress_event_callable_1.createProgressEventProductionHandler)({
            db: {},
            createStore,
        });
        await expect(handler({
            authUid: 'auth-user', stableUid: 'stable-canonical', accountGeneration: 1,
            input: { ...requestBody, accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)('stable-canonical', 1) },
        })).rejects.toThrow('v2_progress_projection_untrusted');
        expect(createStore).toHaveBeenCalledWith(expect.objectContaining({
            authUid: 'auth-user',
            stableUid: 'stable-canonical',
            accountGeneration: 1,
            accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)('stable-canonical', 1),
        }));
    });
    it('production executor accepts a zero-star negative result without a scorer', async () => {
        const createStore = () => ({
            runTransaction: async (work) => work({
                readOperation: async () => undefined,
                validatePinnedScope: async () => undefined,
                resolveServerProjection: undefined,
                readAttempt: async () => undefined,
                prepareTransactionPlan: async (_request, materialized, projection, trusted) => {
                    (0, progress_event_transaction_plan_1.prepareProgressTransactionPlan)({ existingEvidenceIndex: {}, existingBestStars: 0, materialized, projection, trustedScoreResolution: trusted });
                },
                writeProgressProjection: async () => undefined,
                writeAttempt: async () => undefined,
                writeEvidenceMaterialization: async () => undefined,
                createOperation: async () => undefined,
            }),
        });
        const handler = (0, progress_event_callable_1.createProgressEventProductionHandler)({ db: {}, createStore });
        await expect(handler({
            authUid: 'auth-user', stableUid: 'stable-canonical', accountGeneration: 1,
            input: { ...requestBody, accountScopeHash: (0, progress_event_1.deriveProgressAccountScopeHash)('stable-canonical', 1), projection: { ...requestBody.projection, candidateStars: 0 } },
        })).resolves.toEqual(expect.objectContaining({ accepted: true, duplicate: false }));
    });
});
//# sourceMappingURL=progress_event_callable.test.js.map