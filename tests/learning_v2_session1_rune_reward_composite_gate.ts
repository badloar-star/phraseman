import assert from "node:assert/strict";

import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import {
  LEARNING_V2_EN_L1_S1_COURSE_ID_V1,
  LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1,
  LEARNING_V2_EN_L1_S1_SOURCE_FINGERPRINT_V1,
  createLearningV2SessionRuneRewardCompositeAuthorityV1,
  createLearningV2SessionRuneRewardCompositeV1,
  createLearningV2SessionRuneRewardPreparedIntentV1,
  createLearningV2SessionRuneRewardProtectedIntentReceiptV1,
  materializeLearningV2SessionRuneRewardCompositeCandidateV1,
  parseLearningV2SessionRuneRewardCompositeV1,
  parseLearningV2SessionRuneRewardPreparedIntentV1,
  resolveLearningV2SessionRuneRewardPublicationTokenV1,
  restoreLearningV2SessionRuneRewardPublicationTokenV1,
  type LearningV2SessionRuneRewardPublicationTokenV1,
} from "../modules/learning-v2/progress/learning_session_rune_reward_composite_v1";
import {
  createOwnerRepository,
  type OwnerRepositoryActiveOwnerFence,
  type OwnerRepositoryCasStorage,
  type OwnerRepositoryScope,
  type OwnerRepositoryWalletCreditAuthorityInput,
} from "../modules/learning-v2/progress/owner_repository";
import {
  materializeRequiredSessionCreditSettlementCandidate,
  parseRequiredSessionCreditSettlementRaw,
} from "../modules/learning-v2/progress/required_session_credit_settlement";
import {
  createServerWalletRewardReceiptAuthority,
  materializeServerWalletRewardReceiptCandidate,
  materializeServerWalletRewardRequest,
} from "../modules/learning-v2/progress/server_wallet_reward_receipt";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";
import {
  createLearningV2CourseSessionDeviceRunV1,
  materializeLearningV2CourseSessionCompletedSummaryV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";
import type {
  LearningV2CourseReleasedSessionMaterialV3,
  LearningV2CourseSessionReadyHandleV3,
} from "../app/learning_v2_course_released_session_client_v3";

const scope: OwnerRepositoryScope = {
  accountScopeHash: "a".repeat(64),
  generation: 7,
};

class MemoryCasStorage implements OwnerRepositoryCasStorage {
  readonly values = new Map<string, string>();
  owner: OwnerRepositoryActiveOwnerFence | null = scope;

  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
  async getCurrentOwnerFence() { return this.owner; }
  async compareAndSet(
    key: string,
    expected: string | null,
    next: string,
    fence: OwnerRepositoryActiveOwnerFence,
  ): Promise<"committed" | "conflict" | "stale_generation"> {
    if (!this.owner || canonicalJsonV1(this.owner) !== canonicalJsonV1(fence)) {
      return "stale_generation";
    }
    if ((this.values.get(key) ?? null) !== expected) return "conflict";
    this.values.set(key, next);
    return "committed";
  }
}

let publicationToken: LearningV2SessionRuneRewardPublicationTokenV1;
let resolvedMaterial: LearningV2CourseReleasedSessionMaterialV3;

function canonicalRunAndCompletion(input: Readonly<{
  releaseId?: string;
  packageFingerprint?: string;
  activeRootFingerprint?: string;
  activeHeadFingerprint?: string;
  childSetFingerprint?: string;
  sessionRunId?: string;
  attempts?: number;
}>) {
  if (!resolvedMaterial) throw new Error("test_publication_not_resolved");
  const run = createLearningV2CourseSessionDeviceRunV1({
    environment: "production",
    targetLanguage: "en",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    seasonId: "learning-v2",
    releaseId: input.releaseId ?? resolvedMaterial.releaseId,
    activeRootFingerprint:
      input.activeRootFingerprint ?? resolvedMaterial.activeRootFingerprint,
    activeHeadFingerprint:
      input.activeHeadFingerprint ?? resolvedMaterial.activeHeadFingerprint,
    lessonId: "lesson-01",
    lessonOrdinal: 1,
    courseSessionId: "lesson-01:session:01",
    sessionOrdinal: 1,
    packageFingerprint:
      input.packageFingerprint ?? resolvedMaterial.packageFingerprint,
    childSetFingerprint:
      input.childSetFingerprint ?? resolvedMaterial.childSetFingerprint,
    introChild: resolvedMaterial.introChild,
    learnerChild: resolvedMaterial.learnerChild,
    evaluatorCapsuleChild: resolvedMaterial.evaluatorCapsuleChild,
    auxiliaryChild: resolvedMaterial.auxiliaryChild,
  });
  const completion = materializeLearningV2CourseSessionCompletedSummaryV1({
    run,
    sessionRunId: input.sessionRunId ?? "run-1",
    interactionCompletions: LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1.map(
      (interactionId) => ({
        interactionId,
        disposition: "completed" as const,
        learnerAttempts: input.attempts ?? 1,
        hintUsed: false,
      }),
    ),
  });
  return { run, completion };
}

function compositeCandidate(input: Readonly<{
  sessionRunId?: string;
  attempts?: number;
  earnedAtMs?: number;
}> = {}) {
  const actual = canonicalRunAndCompletion(input);
  return createLearningV2SessionRuneRewardCompositeV1({
    accountScopeHash: scope.accountScopeHash,
    run: actual.run,
    completion: actual.completion,
    publicationToken,
    earnedAtMs: input.earnedAtMs ?? Date.parse("2026-09-21T12:00:00.000Z"),
  });
}

const legacyReward = materializeServerWalletRewardReceiptCandidate({
  rewardId: "required-session-initial-legacy-session-1",
  operationId: "wallet-required-session-initial-legacy-session-1",
  accountScopeHash: scope.accountScopeHash,
  accountGeneration: scope.generation,
  amountSubunits: 36 * WALLET_SUBUNITS_PER_STAR,
  operationReason: "initial_required_session",
  origin: {
    kind: "course",
    courseId: LEARNING_V2_EN_L1_S1_COURSE_ID_V1,
    studyTarget: "en",
    requiredSessionOrdinal: 1,
  },
});
const legacyRequest = materializeServerWalletRewardRequest(legacyReward);

function authority() {
  const composite = createLearningV2SessionRuneRewardCompositeAuthorityV1(
    publicationToken,
  );
  const legacy = createServerWalletRewardReceiptAuthority({
    resolveRewardReceipt: () => legacyReward.encoded,
  });
  return (input: OwnerRepositoryWalletCreditAuthorityInput) =>
    typeof input.candidate === "object" && input.candidate !== null &&
      (input.candidate as { schemaVersion?: unknown }).schemaVersion ===
        "learning-v2-session-rune-reward-composite.v1"
      ? composite(input)
      : legacy(input);
}

async function assertNoDoubleCreditAcrossRestart(
  first: "composite" | "legacy",
) {
  const storage = new MemoryCasStorage();
  const repository = createOwnerRepository(storage, () => true, {
    materializeWalletCredit: authority(),
  });
  await repository.ensureV2(scope);
  const candidate = compositeCandidate();
  assert.equal(candidate.releaseId, resolvedMaterial.releaseId);
  assert.equal(candidate.activeRootFingerprint,
    resolvedMaterial.activeRootFingerprint);
  assert.equal(candidate.activeHeadFingerprint,
    resolvedMaterial.activeHeadFingerprint);
  assert.equal(candidate.childSetFingerprint,
    resolvedMaterial.childSetFingerprint);
  assert.equal(candidate.sourceFingerprint,
    LEARNING_V2_EN_L1_S1_SOURCE_FINGERPRINT_V1);
  const firstResult = await repository.commitWalletCreditV3(
    scope,
    first === "composite" ? candidate : legacyRequest,
  );
  assert.equal(firstResult.status, "applied");
  const firstBalance = firstResult.snapshot.walletState.balanceSubunits;

  const restarted = createOwnerRepository(storage, () => true, {
    materializeWalletCredit: authority(),
  });
  const secondResult = await restarted.commitWalletCreditV3(
    scope,
    first === "composite" ? legacyRequest : candidate,
  );
  assert.equal(secondResult.status, "replayed");
  assert.equal(secondResult.snapshot.walletState.balanceSubunits, firstBalance);
  assert.equal(
    secondResult.appliedReceipt.appliedReceiptFingerprint,
    firstResult.appliedReceipt.appliedReceiptFingerprint,
  );
}

type V3ClientForGate = typeof import(
  "../app/learning_v2_course_released_session_client_v3"
);

function installNativeLoaderStubs(): () => void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Module = require("node:module") as {
    _load: (request: string, parent: unknown, isMain: boolean) => unknown;
  };
  const original = Module._load;
  const storage = new Map<string, string>();
  const audioHandles = new WeakSet<object>();
  const audioSummaries = new WeakMap<object, Readonly<Record<string, unknown>>>();
  Module._load = (request, parent, isMain) => {
    if (request === "@react-native-async-storage/async-storage") {
      return {
        getItem: async (key: string) => storage.get(key) ?? null,
        setItem: async (key: string, value: string) => { storage.set(key, value); },
        removeItem: async (key: string) => { storage.delete(key); },
      };
    }
    if (request === "@react-native-firebase/app") return { getApp: () => ({}) };
    if (request === "@react-native-firebase/functions") {
      return { getFunctions: () => ({}), httpsCallable: () => async () => ({}) };
    }
    if (request === "./app_check_init") {
      return { initFirebaseAppCheckIfAvailable: async () => undefined };
    }
    if (request === "./cloud_sync") {
      return { ensureAnonUser: async () => "gate-user" };
    }
    if (request === "./interactive_network_quiet") {
      return {
        withBackgroundNetworkLease: async (
          _source: string,
          work: (lease: Readonly<{ signal: AbortSignal; assertCurrent: () => void }>) => Promise<unknown>,
        ) => work(Object.freeze({
          signal: new AbortController().signal,
          assertCurrent: () => undefined,
        })),
      };
    }
    if (request === "./config") {
      return { DEV_LEARNING_V2_AUDIOLESS_SESSIONS: false };
    }
    if (request === "./stable_id") return { peekStableId: () => "gate-user" };
    if (request === "./learning_v2_course_session_audio_preload_v1") {
      return {
        preloadLearningV2CourseSessionAudioV1: async (input: Readonly<{
          learner: { courseSessionId: string; learnerFingerprint: string };
          audioChild: { audioFingerprint: string };
          sessionRunId: string;
        }>) => {
          const handle = Object.freeze({});
          audioHandles.add(handle);
          audioSummaries.set(handle, Object.freeze({
            courseSessionId: input.learner.courseSessionId,
            sessionRunId: input.sessionRunId,
            learnerFingerprint: input.learner.learnerFingerprint,
            audioFingerprint: input.audioChild.audioFingerprint,
            localFileCount: 0,
            selectedFileCount: 0,
            preloadFingerprint: "f".repeat(64),
          }));
          return handle;
        },
        isLearningV2CourseSessionAudioPreloadHandleV1: (value: unknown) =>
          typeof value === "object" && value !== null && audioHandles.has(value),
        getLearningV2CourseSessionAudioPreloadSummaryV1: (value: object) =>
          audioSummaries.get(value),
      };
    }
    if (request ===
      "../modules/learning-v2/runtime/course_session_audio_child_v1") {
      const actual = original(request, parent, isMain) as Record<string, unknown>;
      return {
        ...actual,
        // The V3 loader fixture isolates publication provenance from native
        // audio bytes. It keeps the real learner/package children and supplies
        // only the already-mocked preload seam's opaque audio child.
        materializeLearningV2CourseSessionAudioChildV1: (input: Readonly<{
          learner: { courseSessionId: string; learnerFingerprint: string };
        }>) => {
          const body = Object.freeze({
            schemaVersion: "learning-v2-course-session-audio-child.v1" as const,
            courseSessionId: input.learner.courseSessionId,
            learnerFingerprint: input.learner.learnerFingerprint,
            interactions: Object.freeze([]),
            interactionCount: 0,
            voiceIds: Object.freeze(["ash", "onyx", "nova", "coral"]),
            variantsPerAudioCoordinate: 4 as const,
            selectionPolicy: "local_shuffled_round_robin" as const,
            taskVoiceScope:
              "one_voice_per_interaction_for_phrase_and_words" as const,
            serverRequestPerPlayback: false as const,
            remoteTtsFallbackDuringSession: false as const,
            answerPayload: "absent_by_exact_schema" as const,
            correctnessAuthority: "none" as const,
            audioByteAuthority:
              "none_active_release_readback_required" as const,
            runtimeAuthority: "none_active_release_join_required" as const,
            releaseAuthority: false as const,
          });
          return Object.freeze({
            ...body,
            audioFingerprint: hashCanonicalBody(body),
          });
        },
      };
    }
    // зачем (аудит начислений 2026-08-26): гейт запускается через tsx, где нет
    // jest-моков для ассетов, и настоящий require натыкался на mp3-байты —
    // «Invalid or unexpected token». Медиа здесь не нужны: гейт проверяет
    // композит начисления рун, а не звук. Отдаём опаковый идентификатор, как
    // это делает tests/__mocks__/fileMock.js в Jest.
    if (/\.(mp3|wav|m4a|ogg|aac|png|jpe?g|gif|svg|webp|avif|ttf|otf)$/i.test(request)) {
      return { default: request, uri: request } as unknown as ReturnType<typeof original>;
    }
    return original(request, parent, isMain);
  };
  return () => { Module._load = original; };
}

async function resolveGenuinePublicationForGate(
  learnerSourceLocale?: string,
  lessonOrdinal = 1,
  sessionOrdinal = 1,
): Promise<Readonly<{
  client: V3ClientForGate;
  readyHandle: LearningV2CourseSessionReadyHandleV3;
}>> {
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const client = require(
    "../app/learning_v2_course_released_session_client_v3"
  ) as V3ClientForGate;
  const readyHandle = await client.prepareCurrentLearningV2CourseSessionV3({
    locator: {
      environment: "production",
      targetLanguage: "en",
      studyTarget: "en",
      learnerSourceLocale: learnerSourceLocale ?? "ru",
      seasonId: "learning-v2",
      lessonOrdinal,
      sessionOrdinal,
    },
    sessionRunId: `rune-reward-genuine-ready-${lessonOrdinal}-${sessionOrdinal}-${learnerSourceLocale ?? "ru"}`,
  });
  assert.equal(client.isLearningV2CourseSessionReadyHandleV3(readyHandle), true);
  return { client, readyHandle };
}

async function main() {
  const restoreNativeLoader = installNativeLoaderStubs();
  const requiredLocales = [
    "ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl",
  ] as const;
  let client!: V3ClientForGate;
  let readyHandle!: LearningV2CourseSessionReadyHandleV3;
  for (const locale of requiredLocales) {
    const genuine = await resolveGenuinePublicationForGate(locale);
    const localeMaterial =
      genuine.client.resolveLearningV2CourseSessionReadyMaterialV3(
        genuine.readyHandle,
      ).result.material;
    resolvedMaterial = localeMaterial;
    assert.equal(
      localeMaterial.audioDelivery,
      "published_mp3",
      "the current factory publication must exercise the published-audio reward path",
    );
    assert.doesNotThrow(() => {
      publicationToken =
        resolveLearningV2SessionRuneRewardPublicationTokenV1(
          genuine.readyHandle,
        );
    }, "published factory audio must not disable the local rune reward composite");
    const localeCandidate = compositeCandidate({
      sessionRunId: `rune-reward-completion-${locale}`,
    });
    assert.equal(localeCandidate.packageFingerprint,
      localeMaterial.packageFingerprint);
    assert.equal(localeCandidate.sourceFingerprint,
      LEARNING_V2_EN_L1_S1_SOURCE_FINGERPRINT_V1);
    if (locale === "ru") {
      client = genuine.client;
      readyHandle = genuine.readyHandle;
    }
  }
  resolvedMaterial = client.resolveLearningV2CourseSessionReadyMaterialV3(
    readyHandle,
  ).result.material;
  publicationToken =
    resolveLearningV2SessionRuneRewardPublicationTokenV1(readyHandle);
  const candidate = compositeCandidate();
  assert.equal(candidate.releaseId, resolvedMaterial.releaseId);
  assert.equal(candidate.activeRootFingerprint,
    resolvedMaterial.activeRootFingerprint);
  assert.equal(candidate.activeHeadFingerprint,
    resolvedMaterial.activeHeadFingerprint);
  assert.equal(candidate.packageFingerprint,
    resolvedMaterial.packageFingerprint);
  assert.equal(candidate.childSetFingerprint,
    resolvedMaterial.childSetFingerprint);
  assert.equal(candidate.sourceFingerprint,
    LEARNING_V2_EN_L1_S1_SOURCE_FINGERPRINT_V1);
  assert.equal(candidate.interactionAwards.length,
    LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1.length);
  assert.equal(candidate.totalRunes,
    LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1.length * 3);
  const preparedIntent = createLearningV2SessionRuneRewardPreparedIntentV1(
    candidate,
    publicationToken,
  );
  assert.deepEqual(
    parseLearningV2SessionRuneRewardPreparedIntentV1(
      JSON.parse(JSON.stringify(preparedIntent)),
    ),
    preparedIntent,
    "the verified reward intent must survive a process boundary byte-for-byte",
  );
  const recoveryAdmission =
    client.admitCurrentLearningV2CourseSessionPublicationV3({
      environment: "production",
      targetLanguage: "en",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      seasonId: "learning-v2",
      lessonOrdinal: 1,
      sessionOrdinal: 1,
    });
  const protectedIntentReceipt =
    createLearningV2SessionRuneRewardProtectedIntentReceiptV1(
      preparedIntent,
      publicationToken,
    );
  assert.throws(
    () => createLearningV2SessionRuneRewardProtectedIntentReceiptV1(
      preparedIntent,
      {} as LearningV2SessionRuneRewardPublicationTokenV1,
    ),
    /learning_v2_session_rune_reward_composite_invalid/,
    "raw intent bytes cannot synthesize a protected receipt",
  );
  const restoredPublicationToken =
    restoreLearningV2SessionRuneRewardPublicationTokenV1(
      preparedIntent,
      recoveryAdmission,
      protectedIntentReceipt,
    );
  assert.doesNotThrow(() => createLearningV2SessionRuneRewardCompositeAuthorityV1(
    restoredPublicationToken,
  ));
  assert.throws(
    () => parseLearningV2SessionRuneRewardPreparedIntentV1({
      ...preparedIntent,
      candidate: { ...candidate, totalRunes: candidate.totalRunes + 1 },
    }),
    /learning_v2_session_rune_reward_composite_invalid/,
    "tampered prepared intent bytes must fail closed",
  );
  const forgedSourceFingerprint = "d".repeat(64);
  const {
    compositeFingerprint: _originalCompositeFingerprint,
    ...forgedCandidateBase
  } = preparedIntent.candidate;
  const forgedCandidateBody = Object.freeze({
    ...forgedCandidateBase,
    sourceFingerprint: forgedSourceFingerprint,
  });
  const forgedCandidate = Object.freeze({
    ...forgedCandidateBody,
    compositeFingerprint: hashCanonicalBody(forgedCandidateBody),
  });
  const forgedPublicationEvidence = Object.freeze({
    ...preparedIntent.publicationEvidence,
    sourceFingerprint: forgedSourceFingerprint,
  });
  const forgedIntentBody = Object.freeze({
    schemaVersion: preparedIntent.schemaVersion,
    candidate: forgedCandidate,
    publicationEvidence: forgedPublicationEvidence,
  });
  const forgedIntent = Object.freeze({
    ...forgedIntentBody,
    intentFingerprint: hashCanonicalBody(forgedIntentBody),
  });
  const parsedRehashedForgery =
    parseLearningV2SessionRuneRewardPreparedIntentV1(forgedIntent);
  assert.throws(
    () => restoreLearningV2SessionRuneRewardPublicationTokenV1(
      parsedRehashedForgery,
      recoveryAdmission,
      protectedIntentReceipt,
    ),
    /learning_v2_session_rune_reward_composite_invalid/,
    "a forged intent with every unkeyed SHA recomputed must not restore provenance",
  );
  const fullyCanonicalAlternativeIntent =
    createLearningV2SessionRuneRewardPreparedIntentV1(
      compositeCandidate({
        sessionRunId: "run-forged-recomputed",
        attempts: 2,
      }),
      publicationToken,
    );
  assert.throws(
    () => restoreLearningV2SessionRuneRewardPublicationTokenV1(
      fullyCanonicalAlternativeIntent,
      recoveryAdmission,
      protectedIntentReceipt,
    ),
    /learning_v2_session_rune_reward_composite_invalid/,
    "a fully canonical rehashed intent cannot reuse another protected receipt",
  );
  assert.throws(
    () => resolveLearningV2SessionRuneRewardPublicationTokenV1(
      { learnerSourceLocale: "ru" } as never,
    ),
    /learning_v2_course_released_session_app_client_v3_invalid/,
    "a synthetic ready handle must not mint a publication token",
  );
  const syntheticStructuralEvidence = Object.freeze({
    releaseId: candidate.releaseId,
    activeRootFingerprint: candidate.activeRootFingerprint,
    activeHeadFingerprint: candidate.activeHeadFingerprint,
    packageFingerprint: candidate.packageFingerprint,
    childSetFingerprint: candidate.childSetFingerprint,
    sourceFingerprint: candidate.sourceFingerprint,
  });
  const canonical = canonicalRunAndCompletion({});
  assert.throws(
    () => createLearningV2SessionRuneRewardCompositeV1({
      accountScopeHash: scope.accountScopeHash,
      run: canonical.run,
      completion: canonical.completion,
      publicationToken: syntheticStructuralEvidence as never,
      earnedAtMs: Date.parse("2026-09-21T12:00:00.000Z"),
    }),
    /learning_v2_session_rune_reward_composite_invalid/,
    "matching structural hashes are not provenance",
  );
  for (const stale of [
    { releaseId: "stale-release" },
    { activeRootFingerprint: "8".repeat(64) },
    { activeHeadFingerprint: "9".repeat(64) },
    { packageFingerprint: "a".repeat(64) },
    { childSetFingerprint: "b".repeat(64) },
  ]) {
    const staleRun = canonicalRunAndCompletion(stale);
    assert.throws(
      () => createLearningV2SessionRuneRewardCompositeV1({
        accountScopeHash: scope.accountScopeHash,
        run: staleRun.run,
        completion: staleRun.completion,
        publicationToken,
        earnedAtMs: Date.parse("2026-09-21T12:00:00.000Z"),
      }),
      /learning_v2_session_rune_reward_composite_invalid/,
      `stale publication coordinate must fail: ${Object.keys(stale)[0]}`,
    );
  }
  const operation = materializeLearningV2SessionRuneRewardCompositeCandidateV1({
    candidate,
    accountScopeHash: scope.accountScopeHash,
    accountGeneration: scope.generation,
    walletRevisionBefore: 0,
  });
  assert.equal(operation.amountSubunits,
    LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1.length * 3 *
      WALLET_SUBUNITS_PER_STAR);
  const sundayCandidate = compositeCandidate({
    sessionRunId: "run-super-sunday",
    earnedAtMs: Date.parse("2026-09-20T12:00:00.000Z"),
  });
  const sundayOperation = materializeLearningV2SessionRuneRewardCompositeCandidateV1({
    candidate: sundayCandidate,
    accountScopeHash: scope.accountScopeHash,
    accountGeneration: scope.generation,
    walletRevisionBefore: 0,
  });
  assert.equal(
    sundayOperation.amountSubunits,
    operation.amountSubunits * 2,
    "Learning V2 completion must credit base runes ×2 exactly once on Sunday",
  );
  assert.equal(
    materializeLearningV2SessionRuneRewardCompositeCandidateV1({
      candidate: parseLearningV2SessionRuneRewardCompositeV1(
        JSON.parse(JSON.stringify(sundayCandidate)),
      ),
      accountScopeHash: scope.accountScopeHash,
      accountGeneration: scope.generation,
      walletRevisionBefore: 0,
    }).amountSubunits,
    sundayOperation.amountSubunits,
    "a persisted Sunday candidate must keep the exact doubled amount on retry",
  );
  const legacyCandidateBody = {
    schemaVersion:
      "learning-v2-required-session-task-slots-settled-candidate.v1" as const,
    candidateAuthority: "untrusted_local" as const,
    accountScopeHash: scope.accountScopeHash,
    accountGeneration: scope.generation,
    courseId: LEARNING_V2_EN_L1_S1_COURSE_ID_V1,
    studyTarget: "en",
    courseReleaseId: "release-1",
    sessionSetId: "session-set-1",
    sessionSetHash: sha256Utf8("session-set-1"),
    catalogFingerprint: sha256Utf8("catalog-1"),
    requiredSessionOrdinal: 1,
    sessionId: "legacy-session-1",
    sessionRunId: "legacy-run-1",
    runKindClaim: "initial" as const,
    taskCandidateFingerprints: Array.from({ length: 12 }, (_, index) =>
      sha256Utf8(`legacy-task-${index + 1}`)),
    projectedBasePerformanceStars: 36,
    projectedLearnerErrorCount: 0,
    projectedHintCount: 0,
    skipCount: 0,
    initialCreditSubjectFingerprint: hashCanonicalBody({
      schemaVersion: "learning-v2-initial-session-credit-subject.v1",
      accountScopeHash: scope.accountScopeHash,
      courseId: LEARNING_V2_EN_L1_S1_COURSE_ID_V1,
      studyTarget: "en",
      requiredSessionOrdinal: 1,
    }),
  };
  const requiredSettlement = materializeRequiredSessionCreditSettlementCandidate({
    settlementId: "legacy-required-session-settlement-1",
    operationId: "obsolete-transport-operation-id",
    walletRevisionBefore: 0,
    settledCandidate: {
      ...legacyCandidateBody,
      candidateFingerprint: hashCanonicalBody(legacyCandidateBody),
    },
  });
  assert.deepEqual(
    parseRequiredSessionCreditSettlementRaw(requiredSettlement.encoded),
    requiredSettlement,
  );
  assert.equal(
    requiredSettlement.settlement.authorizedOperation?.operationId,
    operation.operationId,
  );
  assert.equal(
    requiredSettlement.settlement.operationId,
    requiredSettlement.settlement.authorizedOperation?.operationId,
    "top-level settlement operationId must be the canonical authorized id",
  );
  assert.equal(
    requiredSettlement.settlement.authorizedOperation?.semanticFingerprint,
    operation.semanticFingerprint,
  );
  assert.equal(
    requiredSettlement.settlement.authorizedOperation?.operationFingerprint,
    operation.operationFingerprint,
  );

  assert.throws(
    () => parseLearningV2SessionRuneRewardCompositeV1({
      ...candidate,
      packageFingerprint: "9".repeat(64),
    }),
    /learning_v2_session_rune_reward_composite_invalid/,
  );
  const shortenedRows = candidate.completion.interactionCompletions.slice(0, -1);
  const {
    completionFingerprint: _ignoredCompletionFingerprint,
    ...shortenedCompletionBase
  } = candidate.completion;
  const shortenedCompletionBody = Object.freeze({
    ...shortenedCompletionBase,
    interactionCompletions: shortenedRows,
    interactionCount: shortenedRows.length,
    interactionSetFingerprint: hashCanonicalBody(
      shortenedRows.map((row) => row.interactionId),
    ),
  });
  const shortenedCompletion = Object.freeze({
    ...shortenedCompletionBody,
    completionFingerprint: hashCanonicalBody(shortenedCompletionBody),
  });
  const shortenedAwards = candidate.interactionAwards.slice(0, -1);
  const {
    compositeFingerprint: _ignoredCompositeFingerprint,
    ...shortenedCandidateBase
  } = candidate;
  const shortenedCandidateBody = Object.freeze({
    ...shortenedCandidateBase,
    completion: shortenedCompletion,
    interactionAwards: shortenedAwards,
    totalRunes: shortenedAwards.reduce((total, row) => total + row.runeCount, 0),
  });
  const shortenedCandidate = Object.freeze({
    ...shortenedCandidateBody,
    compositeFingerprint: hashCanonicalBody(shortenedCandidateBody),
  });
  assert.throws(
    () => parseLearningV2SessionRuneRewardCompositeV1(shortenedCandidate),
    /learning_v2_session_rune_reward_composite_invalid/,
    "a rehashed candidate cannot omit an interaction from current publication evidence",
  );

  const unboundStorage = new MemoryCasStorage();
  const unboundRepository = createOwnerRepository(unboundStorage, () => true, {
    materializeWalletCredit:
      createLearningV2SessionRuneRewardCompositeAuthorityV1(),
  });
  await unboundRepository.ensureV2(scope);
  await assert.rejects(
    unboundRepository.commitWalletCreditV3(scope, candidate),
    /owner_repository_wallet_credit_authorization_failed/,
    "a composite authority without verified publication evidence must fail closed",
  );
  const { compositeFingerprint: _ignoredFingerprint, ...candidateBody } =
    candidate;
  const staleSourceBody = {
    ...candidateBody,
    sourceFingerprint: "c".repeat(64),
  };
  const staleSourceCandidate = Object.freeze({
    ...staleSourceBody,
    compositeFingerprint: hashCanonicalBody(staleSourceBody),
  });
  assert.doesNotThrow(
    () => parseLearningV2SessionRuneRewardCompositeV1(staleSourceCandidate),
    "the immutable payload parser is structural; publication authority owns provenance",
  );
  const staleSourceStorage = new MemoryCasStorage();
  const staleSourceRepository = createOwnerRepository(
    staleSourceStorage,
    () => true,
    {
      materializeWalletCredit:
        createLearningV2SessionRuneRewardCompositeAuthorityV1(publicationToken),
    },
  );
  await staleSourceRepository.ensureV2(scope);
  await assert.rejects(
    staleSourceRepository.commitWalletCreditV3(scope, staleSourceCandidate),
    /owner_repository_wallet_credit_authorization_failed/,
    "canonical authority must reject a mismatched source fingerprint",
  );
  assert.throws(
    () => parseLearningV2SessionRuneRewardCompositeV1({
      ...candidate,
      completion: {
        ...candidate.completion,
        completionFingerprint: "8".repeat(64),
      },
    }),
    /learning_v2_session_rune_reward_composite_invalid/,
  );
  assert.throws(
    () => parseLearningV2SessionRuneRewardCompositeV1({
      ...candidate,
      completion: {
        ...candidate.completion,
        interactionCompletions: candidate.completion.interactionCompletions.map(
          (row, index) => index === 3
            ? { ...row, interactionId: "synthetic-practice-04" }
            : row,
        ),
      },
    }),
    /learning_v2_session_rune_reward_composite_invalid/,
  );

  await assertNoDoubleCreditAcrossRestart("composite");
  await assertNoDoubleCreditAcrossRestart("legacy");

  const historicalStorage = new MemoryCasStorage();
  const historicalSource = {
    receiptType: "required_session_credit_settlement" as const,
    receiptId: "historical-required-session-settlement-1",
    receiptFingerprint: "7".repeat(64),
  };
  const historicalOrigin = {
    kind: "course" as const,
    courseId: LEARNING_V2_EN_L1_S1_COURSE_ID_V1,
    studyTarget: "en",
    requiredSessionOrdinal: 1,
  };
  const historicalOperation = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: "historical-required-session-operation-1",
    // No origin argument deliberately recreates the historical v1 subject.
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash: scope.accountScopeHash,
      operationReason: "initial_required_session",
      sourceReceiptRef: historicalSource,
    }),
    accountScopeHash: scope.accountScopeHash,
    accountGeneration: scope.generation,
    currency: "access_star",
    walletRevisionBefore: 0,
    kind: "earning_credit",
    amountSubunits: 36 * WALLET_SUBUNITS_PER_STAR,
    earningCategory: "lesson",
    operationReason: "initial_required_session",
    sourceReceiptRef: historicalSource,
    origin: historicalOrigin,
  });
  const historicalRepository = createOwnerRepository(
    historicalStorage,
    () => true,
    { materializeWalletCredit: () => historicalOperation },
  );
  await historicalRepository.ensureV2(scope);
  const historicalFirst = await historicalRepository.commitWalletCreditV3(
    scope,
    { schemaVersion: "historical-legacy-credit.v1" },
  );
  assert.equal(historicalFirst.status, "applied");
  const historicalRestart = createOwnerRepository(
    historicalStorage,
    () => true,
    {
      materializeWalletCredit:
        createLearningV2SessionRuneRewardCompositeAuthorityV1(
          publicationToken,
        ),
    },
  );
  const historicalReplay = await historicalRestart.commitWalletCreditV3(
    scope,
    candidate,
  );
  assert.equal(historicalReplay.status, "replayed");
  assert.equal(historicalReplay.snapshot.walletState.balanceSubunits, 360_000);

  const oldSameIdStorage = new MemoryCasStorage();
  const oldSameIdSource = {
    receiptType: "learning_session_reward_composite" as const,
    receiptId: "learning-session-reward:v1:old-source-receipt",
    receiptFingerprint:
      "749add3e5c1ee7b55b2a3d01f2a02e107c7c44da0592696b22b96e6c1e4fa547",
  };
  const oldSameIdOperation = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "client_authoritative_composite",
    operationId: operation.operationId,
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash: scope.accountScopeHash,
      operationReason: "initial_required_session",
      sourceReceiptRef: oldSameIdSource,
      origin: historicalOrigin,
    }),
    accountScopeHash: scope.accountScopeHash,
    accountGeneration: scope.generation,
    currency: "access_star",
    walletRevisionBefore: 0,
    kind: "earning_credit",
    amountSubunits: 51 * WALLET_SUBUNITS_PER_STAR,
    earningCategory: "lesson",
    operationReason: "initial_required_session",
    sourceReceiptRef: oldSameIdSource,
    origin: historicalOrigin,
  });
  const oldSameIdRepository = createOwnerRepository(
    oldSameIdStorage,
    () => true,
    { materializeWalletCredit: () => oldSameIdOperation },
  );
  await oldSameIdRepository.ensureV2(scope);
  const oldSameIdApplied = await oldSameIdRepository.commitWalletCreditV3(
    scope,
    { schemaVersion: "historical-old-source-composite.v1" },
  );
  const oldSameIdRestart = createOwnerRepository(
    oldSameIdStorage,
    () => true,
    {
      materializeWalletCredit:
        createLearningV2SessionRuneRewardCompositeAuthorityV1(publicationToken),
    },
  );
  const oldSameIdReplay = await oldSameIdRestart.commitWalletCreditV3(
    scope,
    candidate,
  );
  assert.equal(oldSameIdReplay.status, "replayed");
  assert.equal(oldSameIdReplay.snapshot.walletState.balanceSubunits, 510_000);
  assert.equal(
    canonicalJsonV1(oldSameIdReplay.appliedReceipt),
    canonicalJsonV1(oldSameIdApplied.appliedReceipt),
    "the old same-operation-id receipt must replay byte-for-byte",
  );

  const storage = new MemoryCasStorage();
  const repository = createOwnerRepository(storage, () => true, {
    materializeWalletCredit: authority(),
  });
  await repository.ensureV2(scope);
  await repository.commitWalletCreditV3(scope, candidate);
  const restarted = createOwnerRepository(storage, () => true, {
    materializeWalletCredit: authority(),
  });
  const replay = await restarted.commitWalletCreditV3(
    scope,
    compositeCandidate({ sessionRunId: "run-2", attempts: 3 }),
  );
  assert.equal(replay.status, "replayed");
  assert.equal(replay.snapshot.walletState.balanceSubunits,
    LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1.length * 3 *
      WALLET_SUBUNITS_PER_STAR);

  // Every admitted production Factory Native session owns its own immutable
  // client composite. This non-initial coordinate guards against regressing
  // back to the historical en/L1/S1-only reward branch.
  const later = await resolveGenuinePublicationForGate("ru", 2, 1);
  const laterMaterial = later.client.resolveLearningV2CourseSessionReadyMaterialV3(
    later.readyHandle,
  ).result.material;
  const laterToken = resolveLearningV2SessionRuneRewardPublicationTokenV1(
    later.readyHandle,
  );
  const laterIds = [
    ...laterMaterial.introChild.pages.map((page) => page.question.interactionId),
    ...laterMaterial.learnerChild.interactions.map((entry) => entry.interactionId),
  ];
  const laterRun = createLearningV2CourseSessionDeviceRunV1({
    environment: "production",
    targetLanguage: "en",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    seasonId: "learning-v2",
    releaseId: laterMaterial.releaseId,
    activeRootFingerprint: laterMaterial.activeRootFingerprint,
    activeHeadFingerprint: laterMaterial.activeHeadFingerprint,
    lessonId: laterMaterial.lessonId,
    lessonOrdinal: laterMaterial.lessonOrdinal,
    courseSessionId: laterMaterial.courseSessionId,
    sessionOrdinal: laterMaterial.sessionOrdinal,
    packageFingerprint: laterMaterial.packageFingerprint,
    childSetFingerprint: laterMaterial.childSetFingerprint,
    introChild: laterMaterial.introChild,
    learnerChild: laterMaterial.learnerChild,
    evaluatorCapsuleChild: laterMaterial.evaluatorCapsuleChild,
    auxiliaryChild: laterMaterial.auxiliaryChild,
  });
  const laterCompletion = materializeLearningV2CourseSessionCompletedSummaryV1({
    run: laterRun,
    sessionRunId: "later-production-run-1",
    interactionCompletions: laterIds.map((interactionId) => ({
      interactionId,
      disposition: "completed" as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const laterCandidate = createLearningV2SessionRuneRewardCompositeV1({
    accountScopeHash: scope.accountScopeHash,
    run: laterRun,
    completion: laterCompletion,
    publicationToken: laterToken,
    earnedAtMs: Date.parse("2026-09-21T12:00:00.000Z"),
  });
  assert.equal(laterCandidate.lessonOrdinal, 2);
  assert.equal(laterCandidate.sessionOrdinal, 1);
  assert.equal(laterCandidate.courseSessionId, laterMaterial.courseSessionId);
  const laterOperation = materializeLearningV2SessionRuneRewardCompositeCandidateV1({
    candidate: laterCandidate,
    accountScopeHash: scope.accountScopeHash,
    accountGeneration: scope.generation,
    walletRevisionBefore: 0,
  });
  assert.equal(laterOperation.origin.kind, "course");
  assert.equal(laterOperation.origin.kind === "course" && laterOperation.origin.requiredSessionOrdinal, 57);
  assert.notEqual(laterOperation.operationId, operation.operationId);
  const laterStorage = new MemoryCasStorage();
  const laterRepository = createOwnerRepository(laterStorage, () => true, {
    materializeWalletCredit:
      createLearningV2SessionRuneRewardCompositeAuthorityV1(laterToken),
  });
  await laterRepository.ensureV2(scope);
  const laterApplied = await laterRepository.commitWalletCreditV3(scope, laterCandidate);
  const laterReplayed = await createOwnerRepository(laterStorage, () => true, {
    materializeWalletCredit:
      createLearningV2SessionRuneRewardCompositeAuthorityV1(laterToken),
  }).commitWalletCreditV3(scope, laterCandidate);
  assert.equal(laterApplied.status, "applied");
  assert.equal(laterReplayed.status, "replayed");
  assert.equal(
    laterReplayed.snapshot.walletState.balanceSubunits,
    laterApplied.snapshot.walletState.balanceSubunits,
  );

  restoreNativeLoader();
  console.log("Learning V2 session 1 rune reward composite gate: PASS");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
