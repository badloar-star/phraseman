// ⛔ App Check запломбирован владельцем 2026-08-17: ожидания ниже приведены к
// enforceAppCheck: false. Это НЕ ослабление теста — правило отменено целиком,
// см. CLAUDE.md «APP CHECK ЗАПЛОМБИРОВАН НАВСЕГДА» и app_check_sealed.test.ts.
// Остальные проверки (секреты, регион, экспорт) сохранены как были.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublishedRequiredSessionSet } from "../../../modules/learning-v2/contracts/required_session_progress";
import {
  materializeRequiredSessionCompletionEnvelope,
  rebindRequiredSessionCompletionEnvelope,
  requiredSessionCompletionMutationId,
} from "../../../modules/learning-v2/progress/required_session_completion_envelope";
import {
  deriveLocalOfflineProgressAccountScopeHash,
  LOCAL_OFFLINE_PROGRESS_GENERATION,
} from "../../../modules/learning-v2/progress/progress_account_scope";
import { progressOutboxPayloadFingerprint } from "../../../modules/learning-v2/progress/progress_outbox";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { getLesson1SessionRuntime } from "../../../modules/learning-v2/runtime/lesson1_session_runtime";
import { deriveProgressAccountScopeHash } from "./progress_event";
import { createLearningV2AccountBindingHandler } from "../learning_v2_wallet_reward_callable";
import {
  createRequiredSessionCompletionHandler,
  parseStructuralRequiredSessionCompletionInboxRecord,
  parseRequiredSessionCompletionSubmitRequest,
  verifyRequiredSessionCompletionInboxRecordAgainstPublication,
  type RequiredSessionCompletionInboxRecordV1,
} from "./required_session_completion_callable";

const stableUid = "stable-user-1";
const accountGeneration = 3;
const accountScopeHash = deriveProgressAccountScopeHash(stableUid, accountGeneration);

const fixture = () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const payload = materializeRequiredSessionCompletionEnvelope({
    scope: {
      stableId: stableUid,
      accountScopeHash,
      seasonId: "learning-v2",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      generation: accountGeneration,
    },
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: "lesson-1-understand-1",
    sessionRunId: "session-run-1",
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: "completed" as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const publication = createPublishedRequiredSessionSet({
    schemaVersion: "learning-v2-published-required-session-set.v1",
    courseId: "english-core",
    studyTarget: "en",
    courseReleaseId: "english-core-release-1",
    seasonRevisionId: "season-revision-1",
    episodeRevisionFingerprint: "b".repeat(64),
    episodeContentHash: "c".repeat(64),
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    sessionSet: runtime.sessionSet,
  });
  const request = {
    mutationId: requiredSessionCompletionMutationId(payload),
    payloadFingerprint: progressOutboxPayloadFingerprint(payload),
    payload,
  };
  return { payload, publication, request, runtime, session };
};

describe("required-session completion background inbox", () => {
  it("is exported with App Check while the active session stays client-local", () => {
    const functionsSrcRoot = join(__dirname, "..");
    const callableSource = readFileSync(join(__dirname, "required_session_completion_callable.ts"), "utf8");
    const indexSource = readFileSync(join(functionsSrcRoot, "index.ts"), "utf8");
    const packageSource = readFileSync(join(functionsSrcRoot, "..", "package.json"), "utf8");
    expect(callableSource).toContain("enforceAppCheck: false");
    expect(indexSource).toContain("exports.submitLearningV2RequiredSessionCompletion");
    expect(packageSource).toContain("functions:submitLearningV2RequiredSessionCompletion");
  });

  it("stores one exact catalog-reconciled but economically unauthorized candidate", async () => {
    const { publication, request } = fixture();
    const records = new Map<string, RequiredSessionCompletionInboxRecordV1>();
    const handler = createRequiredSessionCompletionHandler({
      readPublication: async () => publication,
      inboxStore: {
        putIfAbsent: async ({ record }) => {
          const prior = records.get(record.mutationId);
          if (prior) return { status: "existing", recordFingerprint: prior.recordFingerprint, walletRewardRequest: null };
          records.set(record.mutationId, record);
          return { status: "created", recordFingerprint: record.recordFingerprint, walletRewardRequest: null };
        },
      },
    }, async () => ({ stableUid, accountGeneration }));

    await expect(handler({ data: request, auth: { uid: "auth-user" } })).resolves.toMatchObject({
      kind: "accepted",
      duplicate: false,
      receipt: {
        schemaVersion: "v2-progress-outbox-server-receipt.v1",
        receiptId: expect.stringMatching(/^rscv1_[a-f0-9]{64}$/),
        receiptFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      },
    });
    await expect(handler({ data: request, auth: { uid: "auth-user" } })).resolves
      .toMatchObject({ duplicate: true });
    const stored = [...records.values()][0];
    expect(parseStructuralRequiredSessionCompletionInboxRecord(stored)).toEqual(stored);
    expect(verifyRequiredSessionCompletionInboxRecordAgainstPublication(stored, publication))
      .toEqual(stored);
    expect(stored).toMatchObject({
      schemaVersion: "learning-v2-required-session-completion-inbox.v1",
      reconciledCandidate: {
        candidateAuthority: "untrusted_client_completion",
        catalogReconciliation: "server_publication_match",
        economicAuthority: "none",
        provisionalBasePerformanceStars: 36,
      },
    });
    expect(JSON.stringify(stored)).not.toMatch(/answerProof|submittedAnswer|audio|transcript|recording/);
  });

  it("accepts the exact local-offline packet rebound by the real server binding contract", async () => {
    const { publication, runtime, session } = fixture();
    const localPayload = materializeRequiredSessionCompletionEnvelope({
      scope: {
        stableId: stableUid,
        accountScopeHash: deriveLocalOfflineProgressAccountScopeHash(stableUid),
        seasonId: "learning-v2",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        generation: LOCAL_OFFLINE_PROGRESS_GENERATION,
      },
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "local-offline-rebound-run",
      session,
      taskResults: session.cards.map((card) => ({
        taskId: card.cardId,
        disposition: "completed" as const,
        learnerAttempts: 1,
        hintUsed: false,
      })),
    });
    const binding = await createLearningV2AccountBindingHandler({
      resolveAccountBinding: async () => ({ stableUid, accountGeneration }),
    })({ auth: { uid: "auth-user" } });
    const payload = rebindRequiredSessionCompletionEnvelope(localPayload, {
      accountScopeHash: binding.progressAccountScopeHash,
      accountGeneration: binding.accountGeneration,
    });
    const records = new Map<string, RequiredSessionCompletionInboxRecordV1>();
    const handler = createRequiredSessionCompletionHandler({
      readPublication: async () => publication,
      inboxStore: {
        putIfAbsent: async ({ record }) => {
          const prior = records.get(record.mutationId);
          if (prior) return { status: "existing", recordFingerprint: prior.recordFingerprint, walletRewardRequest: null };
          records.set(record.mutationId, record);
          return { status: "created", recordFingerprint: record.recordFingerprint, walletRewardRequest: null };
        },
      },
    }, async () => ({ stableUid, accountGeneration }));
    await expect(handler({
      auth: { uid: "auth-user" },
      data: {
        mutationId: requiredSessionCompletionMutationId(payload),
        payloadFingerprint: progressOutboxPayloadFingerprint(payload),
        payload,
      },
    })).resolves.toMatchObject({ kind: "accepted", duplicate: false });
    expect(records.size).toBe(1);
  });

  it("rejects payload, generation, season, catalog and store-fingerprint substitutions", async () => {
    const { publication, request, runtime, session } = fixture();
    const exactStore = {
      putIfAbsent: async ({ record }: { record: RequiredSessionCompletionInboxRecordV1 }) => ({
        status: "created" as const,
        recordFingerprint: record.recordFingerprint,
        walletRewardRequest: null,
      }),
    };
    expect(() => parseRequiredSessionCompletionSubmitRequest({
      ...request,
      payloadFingerprint: "f".repeat(64),
    })).toThrow("required_session_completion_submit_mismatch");
    await expect(createRequiredSessionCompletionHandler({
      readPublication: async () => publication,
      inboxStore: exactStore,
    }, async () => ({ stableUid, accountGeneration: accountGeneration + 1 }))({
      data: request,
      auth: { uid: "auth-user" },
    })).rejects.toThrow("account_generation_mismatch");
    await expect(createRequiredSessionCompletionHandler({
      readPublication: async () => ({ ...publication, sessionSetHash: "d".repeat(64) }),
      inboxStore: exactStore,
    }, async () => ({ stableUid, accountGeneration }))({
      data: request,
      auth: { uid: "auth-user" },
    })).rejects.toThrow();
    const wrongSeasonPayload = materializeRequiredSessionCompletionEnvelope({
      scope: {
        stableId: stableUid,
        accountScopeHash,
        seasonId: "other-season",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        generation: accountGeneration,
      },
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "wrong-season-run",
      session,
      taskResults: session.cards.map((card) => ({
        taskId: card.cardId,
        disposition: "completed" as const,
        learnerAttempts: 1,
        hintUsed: false,
      })),
    });
    await expect(createRequiredSessionCompletionHandler({
      readPublication: async () => publication,
      inboxStore: exactStore,
    }, async () => ({ stableUid, accountGeneration }))({
      data: {
        mutationId: requiredSessionCompletionMutationId(wrongSeasonPayload),
        payloadFingerprint: progressOutboxPayloadFingerprint(wrongSeasonPayload),
        payload: wrongSeasonPayload,
      },
      auth: { uid: "auth-user" },
    })).rejects.toMatchObject({
      details: {
        schemaVersion: "learning-v2-required-session-completion-protocol-rejection.v1",
        mutationId: requiredSessionCompletionMutationId(wrongSeasonPayload),
        payloadFingerprint: progressOutboxPayloadFingerprint(wrongSeasonPayload),
        reason: "publication_mismatch",
        receipt: {
          schemaVersion: "v2-progress-outbox-server-receipt.v1",
          receiptId: expect.stringMatching(/^rscrjv1_[a-f0-9]{64}$/),
          receiptFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      },
    });
    await expect(createRequiredSessionCompletionHandler({
      readPublication: async () => publication,
      inboxStore: {
        putIfAbsent: async () => ({
          status: "existing" as const,
          recordFingerprint: "f".repeat(64),
          walletRewardRequest: null,
        }),
      },
    }, async () => ({ stableUid, accountGeneration }))({
      data: request,
      auth: { uid: "auth-user" },
    })).rejects.toThrow("required_session_completion_stored_conflict");
  });

  it("rejects self-consistent stored scope/candidate split-brain", async () => {
    const { publication, request, session } = fixture();
    let record: RequiredSessionCompletionInboxRecordV1 | undefined;
    const handler = createRequiredSessionCompletionHandler({
      readPublication: async () => publication,
      inboxStore: {
        putIfAbsent: async (input) => {
          record = input.record;
          return { status: "created", recordFingerprint: input.record.recordFingerprint, walletRewardRequest: null };
        },
      },
    }, async () => ({ stableUid, accountGeneration }));
    await handler({ data: request, auth: { uid: "auth-user" } });
    expect(record).toBeDefined();
    expect(() => parseStructuralRequiredSessionCompletionInboxRecord({
      ...record!,
      economicAccountScopeHash: "f".repeat(64),
    })).toThrow("required_session_completion_inbox_indeterminate");
    expect(() => parseStructuralRequiredSessionCompletionInboxRecord({
      ...record!,
      completionFingerprint: "f".repeat(64),
    })).toThrow("required_session_completion_inbox_indeterminate");

    const alternateEnvelope = materializeRequiredSessionCompletionEnvelope({
      scope: {
        stableId: stableUid,
        accountScopeHash,
        seasonId: "learning-v2",
        studyTarget: "en",
        learnerSourceLocale: "ru",
        generation: accountGeneration,
      },
      episodeId: request.payload.episodeId,
      sessionSetId: request.payload.sessionSetId,
      sessionSetHash: request.payload.sessionSetHash,
      localSessionId: request.payload.localSessionId,
      sessionRunId: request.payload.sessionRunId,
      session,
      taskResults: session.cards.map((card, index) => ({
        taskId: card.cardId,
        disposition: "completed" as const,
        learnerAttempts: 1,
        hintUsed: index === 0,
      })),
    });
    const { recordFingerprint: _ignored, ...forgedBody } = {
      ...record!,
      mutationId: requiredSessionCompletionMutationId(alternateEnvelope),
      payloadFingerprint: progressOutboxPayloadFingerprint(alternateEnvelope),
      completionFingerprint: alternateEnvelope.completionFingerprint,
      completionEnvelope: alternateEnvelope,
    };
    expect(() => parseStructuralRequiredSessionCompletionInboxRecord({
      ...forgedBody,
      recordFingerprint: hashCanonicalBody(forgedBody),
    })).toThrow("required_session_completion_inbox_indeterminate");
  });

  it("requires the exact server publication before admitting stored course coordinates", async () => {
    const { publication, request } = fixture();
    let record: RequiredSessionCompletionInboxRecordV1 | undefined;
    const handler = createRequiredSessionCompletionHandler({
      readPublication: async () => publication,
      inboxStore: {
        putIfAbsent: async (input) => {
          record = input.record;
          return { status: "created", recordFingerprint: input.record.recordFingerprint, walletRewardRequest: null };
        },
      },
    }, async () => ({ stableUid, accountGeneration }));
    await handler({ data: request, auth: { uid: "auth-user" } });
    if (!record) throw new Error("record_fixture_missing");

    const forgedCandidateBody = {
      ...record.reconciledCandidate,
      courseId: "forged-course",
      courseReleaseId: "forged-release",
      publicationFingerprint: "f".repeat(64),
      initialCreditSubjectFingerprint: hashCanonicalBody({
        schemaVersion: "learning-v2-initial-session-credit-subject.v1",
        accountScopeHash: record.economicAccountScopeHash,
        courseId: "forged-course",
        studyTarget: record.reconciledCandidate.studyTarget,
        requiredSessionOrdinal: record.reconciledCandidate.requiredSessionOrdinal,
      }),
    };
    const { candidateFingerprint: _oldCandidateFingerprint, ...candidateBody } =
      forgedCandidateBody;
    const forgedCandidate = {
      ...candidateBody,
      candidateFingerprint: hashCanonicalBody(candidateBody),
    };
    const { recordFingerprint: _oldRecordFingerprint, ...storedBody } = {
      ...record,
      publicationFingerprint: "f".repeat(64),
      reconciledCandidate: forgedCandidate,
    };
    const forgedRecord = {
      ...storedBody,
      recordFingerprint: hashCanonicalBody(storedBody),
    };

    expect(parseStructuralRequiredSessionCompletionInboxRecord(forgedRecord))
      .toEqual(forgedRecord);
    expect(() => verifyRequiredSessionCompletionInboxRecordAgainstPublication(
      forgedRecord,
      publication,
    )).toThrow("required_session_completion_inbox_indeterminate");
  });

  it("never executes hostile request accessors", () => {
    const { request } = fixture();
    let getterRuns = 0;
    const hostile = { ...request } as Record<string, unknown>;
    Object.defineProperty(hostile, "payload", {
      enumerable: true,
      get: () => { getterRuns += 1; return request.payload; },
    });
    expect(() => parseRequiredSessionCompletionSubmitRequest(hostile))
      .toThrow("required_session_completion_submit_invalid");
    expect(getterRuns).toBe(0);
  });
});
