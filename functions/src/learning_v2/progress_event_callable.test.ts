import { HttpsError } from 'firebase-functions/v2/https';
import {
  createProgressEventHandler,
  createProgressEventAuthorization,
  readProgressAccountBinding,
  normalizeProgressAuthUid,
  normalizeProgressStableUid,
  requireProgressAuth,
  resolveV2ProgressAppCheckEnforcement,
  V2_PROGRESS_CALLABLE_OPTIONS,
  createProgressEventProductionHandler,
} from './progress_event_callable';
import { buildCanonicalAttemptRef } from '../../../modules/learning-v2/contracts/attempt';
import { prepareProgressTransactionPlan } from './progress_event_transaction_plan';
import { deriveProgressAccountScopeHash } from './progress_event';

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
} as const;

const attemptRef = buildCanonicalAttemptRef(attemptBody);
const requestBody = {
  accountScopeHash: 'a'.repeat(32),
  seasonId: 'season-1',
  studyTarget: 'en',
  learnerSourceLocale: 'ru',
  seasonRevisionId: 'season-1-r1',
  episodeRevisionRef: {
    draftId: 'draft-1', episodeId: 'episode-1', revision: 1,
    revisionFingerprint: 'b'.repeat(64), contentHash: 'c'.repeat(64), ordinal: 1,
    chapterId: 'chapter-1', approvalStatus: 'approved' as const,
  },
  idempotencyKey: 'event-0001',
  attemptBody,
  attemptRef,
  evidenceBundle: { schemaVersion: 'v2-progress-evidence-bundle.v1' as const, attemptRef, evidenceBodies: [], nonAssessmentBodies: [] },
  projection: { starSlotId: 'slot-1', previousBestStars: 0, candidateStars: 2, activityId: 'activity-1', progressCompatibilityKey: 'compat-1' },
};

describe('V2 progress callable auth adapter', () => {
  it('fails closed for missing and malformed Firebase auth UIDs', () => {
    expect(() => normalizeProgressAuthUid(undefined)).toThrow(HttpsError);
    expect(() => normalizeProgressAuthUid('  ')).toThrow(HttpsError);
    expect(() => normalizeProgressAuthUid('x'.repeat(129))).toThrow(HttpsError);
    expect(() => requireProgressAuth({ data: requestBody })).toThrow('authentication_required');
  });

  it('normalizes auth and stable IDs without accepting empty values', () => {
    expect(normalizeProgressAuthUid(' auth-user ')).toBe('auth-user');
    expect(normalizeProgressStableUid(' stable-user ')).toBe('stable-user');
    expect(() => normalizeProgressStableUid(null)).toThrow('stable_id_required');
    expect(() => normalizeProgressStableUid('nested/owner')).toThrow('stable_id_required');
  });

  it('authorizes before executing and passes only server-derived stable identity', async () => {
    const calls: unknown[] = [];
    const handler = createProgressEventHandler(
      async (authUid) => {
        calls.push(['authorize', authUid]);
        return { stableUid: 'stable-canonical', accountGeneration: 1 };
      },
      async (authorized) => {
        calls.push(authorized);
        return { ok: true };
      },
    );

    await expect(handler({
      data: { ...requestBody, accountScopeHash: deriveProgressAccountScopeHash('stable-canonical', 1) },
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
    const handler = createProgressEventHandler(authorize, execute);

    await expect(handler({ data: requestBody })).rejects.toThrow('authentication_required');
    expect(authorize).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('maps a malformed callable body to invalid-argument before authorization', async () => {
    const authorize = jest.fn(async () => ({ stableUid: 'stable', accountGeneration: 1 }));
    const execute = jest.fn(async () => ({ ok: true }));
    const handler = createProgressEventHandler(authorize, execute);

    await expect(handler({ data: {}, auth: { uid: 'auth-user' } })).rejects.toMatchObject({
      code: 'invalid-argument',
      message: 'v2_progress_event_request_invalid',
    });
    expect(authorize).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects an authorization result that omits the expected generation binding', async () => {
    const execute = jest.fn(async () => ({ ok: true }));
    const handler = createProgressEventHandler(
      async () => 'legacy-stable-only' as any,
      execute,
    );

    await expect(handler({ data: requestBody, auth: { uid: 'auth-user' } }))
      .rejects.toThrow('account_generation_unavailable');
    expect(execute).not.toHaveBeenCalled();
  });

  it('uses a fail-closed App Check callable configuration', () => {
    expect(V2_PROGRESS_CALLABLE_OPTIONS.enforceAppCheck).toBe(true);
    expect(V2_PROGRESS_CALLABLE_OPTIONS.region).toBe('us-central1');
  });

  it('keeps App Check enforced when the legacy production toggle is false', () => {
    expect(resolveV2ProgressAppCheckEnforcement({
      ENFORCE_APP_CHECK_V2_PROGRESS: 'false',
    })).toBe(true);
  });

  it('keeps App Check enforced when an emulator opt-out is requested outside the emulator', () => {
    expect(resolveV2ProgressAppCheckEnforcement({
      GCLOUD_PROJECT: 'demo-phraseman-progress',
      V2_PROGRESS_ALLOW_INSECURE_APP_CHECK_EMULATOR: 'true',
    })).toBe(true);
  });

  it('keeps App Check enforced for an emulator process targeting a non-demo project', () => {
    expect(resolveV2ProgressAppCheckEnforcement({
      FUNCTIONS_EMULATOR: 'true',
      GCLOUD_PROJECT: 'phraseman-production',
      V2_PROGRESS_ALLOW_INSECURE_APP_CHECK_EMULATOR: 'true',
    })).toBe(true);
  });

  it('allows an explicit App Check opt-out only in a demo-project Functions emulator', () => {
    expect(resolveV2ProgressAppCheckEnforcement({
      FUNCTIONS_EMULATOR: 'true',
      GCLOUD_PROJECT: 'demo-phraseman-progress',
      V2_PROGRESS_ALLOW_INSECURE_APP_CHECK_EMULATOR: 'true',
    })).toBe(false);
  });

  it('requires a strict auth_links anchor before reading the server generation', async () => {
    const documents: Record<string, { exists: boolean; data?: Record<string, unknown> }> = {
      'auth_links/auth-user': { exists: true, data: { stable_id: 'stable-user' } },
      'users/stable-user': { exists: true, data: { accountGeneration: 7 } },
      'account_deletion_tombstones/stable-user': { exists: false },
    };
    const db = {
      collection: (name: string) => ({
        doc: (id: string) => ({
          get: async () => {
            const document = documents[`${name}/${id}`] ?? { exists: false };
            return { exists: document.exists, data: () => document.data };
          },
        }),
      }),
    } as any;
    await expect(readProgressAccountBinding(db, 'auth-user')).resolves.toEqual({
      stableUid: 'stable-user', accountGeneration: 7,
    });
  });

  it('does not fall back or repair identity when the auth anchor is missing', async () => {
    const db = {
      collection: () => ({
        doc: () => ({ get: async () => ({ exists: false, data: () => undefined }) }),
      }),
    } as any;

    await expect(createProgressEventAuthorization(db)('anonymous-auth-user'))
      .rejects.toThrow('progress_identity_anchor_missing');
  });

  it('rejects a deletion tombstone while reading the expected binding', async () => {
    const documents: Record<string, { exists: boolean; data?: Record<string, unknown> }> = {
      'auth_links/auth-user': { exists: true, data: { stable_id: 'stable-user' } },
      'users/stable-user': { exists: true, data: { accountGeneration: 7 } },
      'account_deletion_tombstones/stable-user': { exists: true, data: { status: 'pending' } },
    };
    const tombstonedDb = {
      collection: (name: string) => ({
        doc: (id: string) => ({
          get: async () => {
            const document = documents[`${name}/${id}`] ?? { exists: false };
            return { exists: document.exists, data: () => document.data };
          },
        }),
      }),
    } as any;
    await expect(readProgressAccountBinding(tombstonedDb, 'auth-user')).rejects.toThrow('account_delete_pending');
  });

  it('rejects a progress request whose scope hash is from another account generation', async () => {
    const handler = createProgressEventHandler(
      async () => ({ stableUid: 'stable-canonical', accountGeneration: 2 }),
      async () => ({ ok: true }),
    );
    await expect(handler({ data: requestBody, auth: { uid: 'auth-user' } })).rejects.toThrow('account_generation_mismatch');
  });

  it('production executor supplies the immutable template reader but still rejects when its store returns no trusted score', async () => {
    const createStore = jest.fn(() => ({
      runTransaction: async (work: any) => work({
        readOperation: async () => undefined,
        validatePinnedScope: async () => undefined,
        resolveServerProjection: undefined,
        readAttempt: async () => undefined,
        prepareTransactionPlan: async (_request: any, materialized: any, projection: any, trusted: any) => {
          prepareProgressTransactionPlan({ existingEvidenceIndex: {}, existingBestStars: 0, materialized, projection, trustedScoreResolution: trusted });
        },
        writeProgressProjection: async () => undefined,
        writeAttempt: async () => undefined,
        writeEvidenceMaterialization: async () => undefined,
        createOperation: async () => undefined,
      }),
    } as any));
    const handler = createProgressEventProductionHandler({
      db: {} as any,
      createStore,
    });
    await expect(handler({
      authUid: 'auth-user', stableUid: 'stable-canonical', accountGeneration: 1,
      input: { ...requestBody, accountScopeHash: deriveProgressAccountScopeHash('stable-canonical', 1) },
    })).rejects.toThrow('v2_progress_projection_untrusted');
    expect(createStore).toHaveBeenCalledWith(expect.objectContaining({
      authUid: 'auth-user',
      stableUid: 'stable-canonical',
      accountGeneration: 1,
      accountScopeHash: deriveProgressAccountScopeHash('stable-canonical', 1),
      scoringTemplates: expect.objectContaining({ read: expect.any(Function) }),
      scoringPolicies: undefined,
    }));
  });

  it('does not install the client-result pilot table as a production scorer', async () => {
    const createStore = jest.fn(() => ({
      runTransaction: async () => {
        throw new Error('stop_after_dependency_capture');
      },
    } as any));
    const handler = createProgressEventProductionHandler({
      db: {} as any,
      createStore,
    });
    await expect(handler({
      authUid: 'auth-user', stableUid: 'stable-canonical', accountGeneration: 1,
      input: {
        ...requestBody,
        accountScopeHash: deriveProgressAccountScopeHash('stable-canonical', 1),
      },
    })).rejects.toThrow('stop_after_dependency_capture');
    expect(createStore).toHaveBeenCalledWith(expect.objectContaining({
      scoringPolicies: undefined,
      resolveServerScore: undefined,
    }));
  });

  it('production executor accepts a zero-star negative result without a scorer', async () => {
    const createStore = () => ({
      runTransaction: async (work: any) => work({
        readOperation: async () => undefined,
        validatePinnedScope: async () => undefined,
        resolveServerProjection: undefined,
        readAttempt: async () => undefined,
        prepareTransactionPlan: async (_request: any, materialized: any, projection: any, trusted: any) => {
          prepareProgressTransactionPlan({ existingEvidenceIndex: {}, existingBestStars: 0, materialized, projection, trustedScoreResolution: trusted });
        },
        writeProgressProjection: async () => undefined,
        writeAttempt: async () => undefined,
        writeEvidenceMaterialization: async () => undefined,
        createOperation: async () => undefined,
      }),
    } as any);
    const handler = createProgressEventProductionHandler({ db: {} as any, createStore });
    await expect(handler({
      authUid: 'auth-user', stableUid: 'stable-canonical', accountGeneration: 1,
      input: { ...requestBody, accountScopeHash: deriveProgressAccountScopeHash('stable-canonical', 1), projection: { ...requestBody.projection, candidateStars: 0 } },
    })).resolves.toEqual(expect.objectContaining({ accepted: true, duplicate: false }));
  });
});
