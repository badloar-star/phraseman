import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletInitialRequiredSessionOperationId,
  deriveWalletSemanticSubjectFingerprint,
  detachBoundedWalletJson,
  type WalletAuthorizedOperationV1,
} from "../contracts/wallet";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../policies/decision_registry";
import {
  getLearningV2CourseSessionDeviceRunSummaryV1,
  parseLearningV2CourseSessionCompletedSummaryV1,
  type LearningV2CourseSessionCompletedSummaryV1,
  type LearningV2CourseSessionDeviceRunHandleV1,
} from "../runtime/course_session_device_run_v1";
import type { LearningV2CourseSessionReadyHandleV3 } from "../../../app/learning_v2_course_released_session_client_v3";
import { projectLearningV2InteractionRuneAwardV1 } from "./interaction_rune_award_v1";
import type { OwnerRepositoryWalletCreditAuthorityInput } from "./owner_repository";
import { parseWalletAppliedReceipt } from "./wallet_reducer";
import { factoryNativeLearningV2InitialRewardBindingV1 } from "../content/factory_native/factory_native_course_v1";
import {
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseLessonIdV1,
  learningV2CourseSessionIdV1,
} from "../content/course_topology_v1";

export const LEARNING_V2_EN_L1_S1_COURSE_ID_V1 = "learning-v2-en-v1" as const;
export const LEARNING_V2_EN_L1_S1_COURSE_SESSION_ID_V1 =
  "lesson-01:session:01" as const;
const LEGACY_LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1 = Object.freeze([
  "episode-01:session-01:intro-q-1",
  "episode-01:session-01:intro-q-2",
  "episode-01:session-01:intro-q-3",
  ...Array.from({ length: 17 }, (_, index) =>
    `card-episode-01-s01-${String(index + 4).padStart(2, "0")}`),
] as const);
const factoryInitialRewardBinding = factoryNativeLearningV2InitialRewardBindingV1();
export const LEARNING_V2_EN_L1_S1_SOURCE_FINGERPRINT_V1 = factoryInitialRewardBinding.sourceFingerprint;
export const LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1 = factoryInitialRewardBinding.interactionIds;

export interface LearningV2SessionRuneRewardInteractionAwardV1 {
  readonly interactionId: string;
  readonly learnerAttempts: number;
  readonly hintUsed: boolean;
  readonly runeCount: 1 | 2 | 3;
}

export interface LearningV2SessionRuneRewardCompositeV1 {
  readonly schemaVersion: "learning-v2-session-rune-reward-composite.v1";
  readonly accountScopeHash: string;
  readonly targetLanguage: "en";
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
  readonly courseId: typeof LEARNING_V2_EN_L1_S1_COURSE_ID_V1;
  readonly courseSessionId: string;
  readonly releaseId: string;
  readonly activeRootFingerprint: string;
  readonly activeHeadFingerprint: string;
  readonly sourceFingerprint: string;
  readonly packageFingerprint: string;
  readonly childSetFingerprint: string;
  readonly completion: LearningV2CourseSessionCompletedSummaryV1;
  readonly rewardVersion: 1;
  readonly rewardKey: string;
  readonly interactionAwards: readonly LearningV2SessionRuneRewardInteractionAwardV1[];
  readonly totalRunes: number;
  readonly compositeFingerprint: string;
}

export interface LearningV2SessionRuneRewardCompositeCreateInputV1 {
  readonly accountScopeHash: string;
  readonly run: LearningV2CourseSessionDeviceRunHandleV1;
  readonly completion: LearningV2CourseSessionCompletedSummaryV1;
  readonly publicationToken: LearningV2SessionRuneRewardPublicationTokenV1;
}

interface InternalPublicationEvidenceV1 {
  readonly targetLanguage: "en";
  readonly lessonId: string;
  readonly lessonOrdinal: number;
  readonly courseSessionId: string;
  readonly sessionOrdinal: number;
  readonly releaseId: string;
  readonly activeRootFingerprint: string;
  readonly activeHeadFingerprint: string;
  readonly packageFingerprint: string;
  readonly childSetFingerprint: string;
  readonly sourceFingerprint: string;
  readonly interactionIds: readonly string[];
}

export interface LearningV2SessionRuneRewardPublicationTokenV1 {
  readonly __opaqueLearningV2SessionRuneRewardPublicationTokenV1: unique symbol;
}

const CANDIDATE_KEYS = [
  "schemaVersion", "accountScopeHash", "targetLanguage", "lessonOrdinal",
  "sessionOrdinal", "courseId", "courseSessionId", "sourceFingerprint",
  "releaseId", "activeRootFingerprint", "activeHeadFingerprint",
  "packageFingerprint", "childSetFingerprint", "completion", "rewardVersion", "rewardKey",
  "interactionAwards", "totalRunes", "compositeFingerprint",
] as const;
const AWARD_KEYS = [
  "interactionId", "learnerAttempts", "hintUsed", "runeCount",
] as const;
const ACCOUNT_HASH = /^[a-f0-9]{16,128}$/u;
const HASH = /^[a-f0-9]{64}$/u;
const PUBLICATION_EVIDENCE_KEYS = Object.freeze([
  "targetLanguage", "lessonId", "lessonOrdinal", "courseSessionId", "sessionOrdinal",
  "releaseId", "activeRootFingerprint", "activeHeadFingerprint",
  "packageFingerprint", "childSetFingerprint", "sourceFingerprint",
] as const);
const RELEASE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const publicationEvidenceByToken =
  new WeakMap<object, InternalPublicationEvidenceV1>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  Object.keys(value).every((key) => keys.includes(key));
const same = (left: unknown, right: unknown): boolean =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const fail = (): never => {
  throw new Error("learning_v2_session_rune_reward_composite_invalid");
};

function publicationEvidence(
  input: unknown,
  interactionIds: readonly string[] = [],
): InternalPublicationEvidenceV1 {
  if (!isRecord(input) || !exactKeys(input, PUBLICATION_EVIDENCE_KEYS) ||
    input.targetLanguage !== "en" ||
    !Number.isSafeInteger(input.lessonOrdinal) || Number(input.lessonOrdinal) < 1 ||
    Number(input.lessonOrdinal) > LEARNING_V2_COURSE_LESSON_COUNT_V1 ||
    !Number.isSafeInteger(input.sessionOrdinal) || Number(input.sessionOrdinal) < 1 ||
    Number(input.sessionOrdinal) > LEARNING_V2_LESSON_SESSION_COUNT_V1 ||
    input.lessonId !== learningV2CourseLessonIdV1(Number(input.lessonOrdinal)) ||
    input.courseSessionId !== learningV2CourseSessionIdV1(
      Number(input.lessonOrdinal),
      Number(input.sessionOrdinal),
    ) ||
    typeof input.releaseId !== "string" || !RELEASE_ID.test(input.releaseId)) {
    return fail();
  }
  for (const key of [
    "activeRootFingerprint", "activeHeadFingerprint", "packageFingerprint",
    "childSetFingerprint", "sourceFingerprint",
  ] as const) {
    if (typeof input[key] !== "string" || !HASH.test(input[key]) ||
      input[key] === "0".repeat(64)) return fail();
  }
  // зачем каст (2026-08-30): цикл выше строго проверил каждый ключ как
  // 64-hex строку — narrow не переживает выход из цикла, тип доносим явно.
  const verified = input as Readonly<Record<
    "activeRootFingerprint" | "activeHeadFingerprint" | "packageFingerprint"
    | "childSetFingerprint" | "sourceFingerprint", string>> & { releaseId: string };
  return Object.freeze({
    targetLanguage: "en",
    lessonId: input.lessonId as string,
    lessonOrdinal: Number(input.lessonOrdinal),
    courseSessionId: input.courseSessionId as string,
    sessionOrdinal: Number(input.sessionOrdinal),
    releaseId: verified.releaseId,
    activeRootFingerprint: verified.activeRootFingerprint,
    activeHeadFingerprint: verified.activeHeadFingerprint,
    packageFingerprint: verified.packageFingerprint,
    childSetFingerprint: verified.childSetFingerprint,
    sourceFingerprint: verified.sourceFingerprint,
    interactionIds: Object.freeze([...interactionIds]),
  });
}

function evidenceForToken(
  input: unknown,
): InternalPublicationEvidenceV1 {
  if (typeof input !== "object" || input === null) return fail();
  return publicationEvidenceByToken.get(input) ?? fail();
}

function publicationCoordinates(
  evidence: InternalPublicationEvidenceV1,
): Omit<InternalPublicationEvidenceV1, "interactionIds"> {
  return Object.freeze({
    targetLanguage: evidence.targetLanguage,
    lessonId: evidence.lessonId,
    lessonOrdinal: evidence.lessonOrdinal,
    courseSessionId: evidence.courseSessionId,
    sessionOrdinal: evidence.sessionOrdinal,
    releaseId: evidence.releaseId,
    activeRootFingerprint: evidence.activeRootFingerprint,
    activeHeadFingerprint: evidence.activeHeadFingerprint,
    packageFingerprint: evidence.packageFingerprint,
    childSetFingerprint: evidence.childSetFingerprint,
    sourceFingerprint: evidence.sourceFingerprint,
  });
}

function assertPublicationEvidence(
  candidateInput: LearningV2SessionRuneRewardCompositeV1,
  evidence: InternalPublicationEvidenceV1,
): void {
  const candidate = parseLearningV2SessionRuneRewardCompositeV1(candidateInput);
  assertCanonicalCompletion(candidate.completion, evidence);
  if (candidate.targetLanguage !== evidence.targetLanguage ||
    candidate.lessonOrdinal !== evidence.lessonOrdinal ||
    candidate.sessionOrdinal !== evidence.sessionOrdinal ||
    candidate.courseSessionId !== evidence.courseSessionId ||
    candidate.releaseId !== evidence.releaseId ||
    candidate.activeRootFingerprint !== evidence.activeRootFingerprint ||
    candidate.activeHeadFingerprint !== evidence.activeHeadFingerprint ||
    candidate.packageFingerprint !== evidence.packageFingerprint ||
    candidate.childSetFingerprint !== evidence.childSetFingerprint ||
    candidate.sourceFingerprint !== evidence.sourceFingerprint) return fail();
}

export function resolveLearningV2SessionRuneRewardPublicationTokenV1(
  readyHandle: LearningV2CourseSessionReadyHandleV3,
): LearningV2SessionRuneRewardPublicationTokenV1 {
  // Literal require keeps the pure contract importable by lightweight gates;
  // the native V3 loader is loaded only when a real device-ready handle is
  // presented. Its module-private WeakMap is the provenance authority.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loader = require("../../../app/learning_v2_course_released_session_client_v3") as typeof import("../../../app/learning_v2_course_released_session_client_v3");
  const ready = loader.resolveLearningV2CourseSessionReadyMaterialV3(
    readyHandle,
  );
  const material = ready.result.material;
  if (material.releaseId !== "factory-native-v1" ||
    material.factorySourceFingerprint === null ||
    material.audioDelivery !== "device_speech" ||
    material.learnerChild.targetLanguage !== "en") return fail();
  const interactionIds = [
    ...material.introChild.pages.map((page) => page.question.interactionId),
    ...material.learnerChild.interactions.map((interaction) => interaction.interactionId),
  ];
  const evidence = publicationEvidence({
    targetLanguage: "en",
    lessonId: material.lessonId,
    lessonOrdinal: material.lessonOrdinal,
    courseSessionId: material.courseSessionId,
    sessionOrdinal: material.sessionOrdinal,
    releaseId: material.releaseId,
    activeRootFingerprint: material.activeRootFingerprint,
    activeHeadFingerprint: material.activeHeadFingerprint,
    packageFingerprint: material.packageFingerprint,
    childSetFingerprint: material.childSetFingerprint,
    sourceFingerprint: material.factorySourceFingerprint,
  }, interactionIds);
  const token = Object.freeze({}) as LearningV2SessionRuneRewardPublicationTokenV1;
  publicationEvidenceByToken.set(token, evidence);
  return token;
}

function assertCanonicalCompletion(
  input: unknown,
  expectedPublication?: InternalPublicationEvidenceV1,
): LearningV2CourseSessionCompletedSummaryV1 {
  let completion: LearningV2CourseSessionCompletedSummaryV1;
  try {
    completion = parseLearningV2CourseSessionCompletedSummaryV1(input);
  } catch {
    return fail();
  }
  const ids = completion.interactionCompletions.map((row) => row.interactionId);
  const structurallyKnownInitial = completion.lessonOrdinal === 1 &&
    completion.sessionOrdinal === 1 &&
    (same(ids, LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1) ||
      same(ids, LEGACY_LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1));
  if (completion.environment !== "production" ||
    completion.targetLanguage !== "en" || completion.studyTarget !== "en" ||
    completion.lessonId !== learningV2CourseLessonIdV1(completion.lessonOrdinal) ||
    completion.courseSessionId !== learningV2CourseSessionIdV1(
      completion.lessonOrdinal,
      completion.sessionOrdinal,
    ) ||
    completion.lessonOrdinal < 1 ||
    completion.lessonOrdinal > LEARNING_V2_COURSE_LESSON_COUNT_V1 ||
    completion.sessionOrdinal < 1 ||
    completion.sessionOrdinal > LEARNING_V2_LESSON_SESSION_COUNT_V1 ||
    !HASH.test(completion.packageFingerprint) ||
    completion.packageFingerprint === "0".repeat(64) ||
    (expectedPublication
      ? (!same(ids, expectedPublication.interactionIds) ||
        completion.lessonId !== expectedPublication.lessonId ||
        completion.lessonOrdinal !== expectedPublication.lessonOrdinal ||
        completion.courseSessionId !== expectedPublication.courseSessionId ||
        completion.sessionOrdinal !== expectedPublication.sessionOrdinal)
      : (ids.length <= 3 ||
        (completion.lessonOrdinal === 1 && completion.sessionOrdinal === 1 &&
          !structurallyKnownInitial))) ||
    completion.interactionCompletions.some((row) =>
      row.disposition !== "completed" || row.learnerAttempts < 1)) return fail();
  return completion;
}

function courseRequiredSessionOrdinal(
  lessonOrdinal: number,
  sessionOrdinal: number,
): number {
  return (lessonOrdinal - 1) * LEARNING_V2_LESSON_SESSION_COUNT_V1 +
    sessionOrdinal;
}

function rewardKey(
  accountScopeHash: string,
  lessonOrdinal: number,
  sessionOrdinal: number,
): string {
  return `learning-session-reward:v1:${hashCanonicalBody({
    schemaVersion: "learning-v2-initial-session-reward-key.v1",
    accountScopeHash,
    courseId: LEARNING_V2_EN_L1_S1_COURSE_ID_V1,
    studyTarget: "en",
    requiredSessionOrdinal: courseRequiredSessionOrdinal(
      lessonOrdinal,
      sessionOrdinal,
    ),
  })}`;
}

function materializeCandidate(
  accountScopeHash: unknown,
  completionInput: unknown,
  publicationInput: unknown,
): LearningV2SessionRuneRewardCompositeV1 {
  if (typeof accountScopeHash !== "string" ||
    !ACCOUNT_HASH.test(accountScopeHash)) return fail();
  const completion = assertCanonicalCompletion(completionInput);
  const publication = publicationEvidence(publicationInput);
  if (completion.targetLanguage !== publication.targetLanguage ||
    completion.lessonId !== publication.lessonId ||
    completion.lessonOrdinal !== publication.lessonOrdinal ||
    completion.courseSessionId !== publication.courseSessionId ||
    completion.sessionOrdinal !== publication.sessionOrdinal ||
    completion.releaseId !== publication.releaseId ||
    completion.activeRootFingerprint !== publication.activeRootFingerprint ||
    completion.activeHeadFingerprint !== publication.activeHeadFingerprint ||
    completion.packageFingerprint !== publication.packageFingerprint ||
    completion.childSetFingerprint !== publication.childSetFingerprint) return fail();
  const practiceIds = completion.interactionCompletions.slice(3).map((row) => row.interactionId);
  const interactionAwards = Object.freeze(
    completion.interactionCompletions.slice(3).map((row, index) => {
      if (row.interactionId !== practiceIds[index]) return fail();
      return Object.freeze({
        interactionId: row.interactionId,
        learnerAttempts: row.learnerAttempts,
        hintUsed: row.hintUsed,
        runeCount: projectLearningV2InteractionRuneAwardV1({
          learnerAttempts: row.learnerAttempts,
          hintUsed: row.hintUsed,
        }) as 1 | 2 | 3,
      });
    }),
  );
  const totalRunes = interactionAwards.reduce(
    (total, row) => total + row.runeCount,
    0,
  );
  if (!Number.isSafeInteger(totalRunes) || totalRunes < 1 ||
    totalRunes > practiceIds.length * 3) return fail();
  const body = Object.freeze({
    schemaVersion: "learning-v2-session-rune-reward-composite.v1" as const,
    accountScopeHash,
    targetLanguage: "en" as const,
    lessonOrdinal: completion.lessonOrdinal,
    sessionOrdinal: completion.sessionOrdinal,
    courseId: LEARNING_V2_EN_L1_S1_COURSE_ID_V1,
    courseSessionId: completion.courseSessionId,
    releaseId: publication.releaseId,
    activeRootFingerprint: publication.activeRootFingerprint,
    activeHeadFingerprint: publication.activeHeadFingerprint,
    sourceFingerprint: publication.sourceFingerprint,
    packageFingerprint: publication.packageFingerprint,
    childSetFingerprint: publication.childSetFingerprint,
    completion,
    rewardVersion: 1 as const,
    rewardKey: rewardKey(
      accountScopeHash,
      completion.lessonOrdinal,
      completion.sessionOrdinal,
    ),
    interactionAwards,
    totalRunes,
  });
  return Object.freeze({
    ...body,
    compositeFingerprint: hashCanonicalBody(body),
  });
}

export function createLearningV2SessionRuneRewardCompositeV1(
  input: LearningV2SessionRuneRewardCompositeCreateInputV1,
): LearningV2SessionRuneRewardCompositeV1 {
  const summary = getLearningV2CourseSessionDeviceRunSummaryV1(input.run);
  const publication = evidenceForToken(input.publicationToken);
  const completion = assertCanonicalCompletion(input.completion, publication);
  if (summary.environment !== "production" ||
    summary.targetLanguage !== publication.targetLanguage ||
    summary.studyTarget !== "en" ||
    summary.lessonId !== publication.lessonId ||
    summary.lessonOrdinal !== publication.lessonOrdinal ||
    summary.courseSessionId !== publication.courseSessionId ||
    summary.sessionOrdinal !== publication.sessionOrdinal ||
    summary.releaseId !== publication.releaseId ||
    summary.activeRootFingerprint !== publication.activeRootFingerprint ||
    summary.activeHeadFingerprint !== publication.activeHeadFingerprint ||
    summary.packageFingerprint !== completion.packageFingerprint ||
    summary.packageFingerprint !== publication.packageFingerprint ||
    summary.childSetFingerprint !== completion.childSetFingerprint ||
    summary.childSetFingerprint !== publication.childSetFingerprint ||
    summary.interactionSetFingerprint !== completion.interactionSetFingerprint ||
    summary.interactionCount !== completion.interactionCount) return fail();
  return materializeCandidate(
    input.accountScopeHash,
    completion,
    publicationCoordinates(publication),
  );
}

export function parseLearningV2SessionRuneRewardCompositeV1(
  input: unknown,
): LearningV2SessionRuneRewardCompositeV1 {
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(
      input,
      "learning_v2_session_rune_reward_composite_invalid",
    );
  } catch {
    return fail();
  }
  if (!isRecord(detached) || !exactKeys(detached, CANDIDATE_KEYS) ||
    detached.schemaVersion !== "learning-v2-session-rune-reward-composite.v1" ||
    detached.targetLanguage !== "en" ||
    !Number.isSafeInteger(detached.lessonOrdinal) ||
    Number(detached.lessonOrdinal) < 1 ||
    Number(detached.lessonOrdinal) > LEARNING_V2_COURSE_LESSON_COUNT_V1 ||
    !Number.isSafeInteger(detached.sessionOrdinal) ||
    Number(detached.sessionOrdinal) < 1 ||
    Number(detached.sessionOrdinal) > LEARNING_V2_LESSON_SESSION_COUNT_V1 ||
    detached.courseId !== LEARNING_V2_EN_L1_S1_COURSE_ID_V1 ||
    detached.courseSessionId !== learningV2CourseSessionIdV1(
      Number(detached.lessonOrdinal),
      Number(detached.sessionOrdinal),
    ) ||
    detached.rewardVersion !== 1 || !Array.isArray(detached.interactionAwards) ||
    detached.interactionAwards.some((row) =>
      !isRecord(row) || !exactKeys(row, AWARD_KEYS))) return fail();
  const expected = materializeCandidate(
    detached.accountScopeHash,
    detached.completion,
    {
      targetLanguage: detached.targetLanguage,
      lessonId: learningV2CourseLessonIdV1(Number(detached.lessonOrdinal)),
      lessonOrdinal: detached.lessonOrdinal,
      courseSessionId: detached.courseSessionId,
      sessionOrdinal: detached.sessionOrdinal,
      releaseId: detached.releaseId,
      activeRootFingerprint: detached.activeRootFingerprint,
      activeHeadFingerprint: detached.activeHeadFingerprint,
      packageFingerprint: detached.packageFingerprint,
      childSetFingerprint: detached.childSetFingerprint,
      sourceFingerprint: detached.sourceFingerprint,
    },
  );
  if (!same(expected, detached)) return fail();
  return expected;
}

export function deriveLearningV2SessionRuneRewardOperationIdV1(
  input: Pick<
    LearningV2SessionRuneRewardCompositeV1,
    "accountScopeHash" | "lessonOrdinal" | "sessionOrdinal"
  >,
): string {
  const requiredSessionOrdinal = courseRequiredSessionOrdinal(
    input.lessonOrdinal,
    input.sessionOrdinal,
  );
  return deriveWalletInitialRequiredSessionOperationId({
    accountScopeHash: input.accountScopeHash,
    origin: {
      kind: "course",
      courseId: LEARNING_V2_EN_L1_S1_COURSE_ID_V1,
      studyTarget: "en",
      requiredSessionOrdinal,
    },
  });
}

export function materializeLearningV2SessionRuneRewardCompositeCandidateV1(
  input: Readonly<{
    candidate: LearningV2SessionRuneRewardCompositeV1;
    accountScopeHash: string;
    accountGeneration: number;
    walletRevisionBefore: number;
  }>,
): WalletAuthorizedOperationV1 {
  const candidate = parseLearningV2SessionRuneRewardCompositeV1(input.candidate);
  if (candidate.accountScopeHash !== input.accountScopeHash) {
    throw new Error("learning_v2_session_rune_reward_composite_owner_mismatch");
  }
  const sourceReceiptRef = {
    receiptType: "learning_session_reward_composite" as const,
    receiptId: candidate.rewardKey,
    receiptFingerprint: candidate.compositeFingerprint,
  };
  const origin = {
    kind: "course" as const,
    courseId: candidate.courseId,
    studyTarget: "en",
    requiredSessionOrdinal: courseRequiredSessionOrdinal(
      candidate.lessonOrdinal,
      candidate.sessionOrdinal,
    ),
  };
  return createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "client_authoritative_composite",
    operationId: deriveLearningV2SessionRuneRewardOperationIdV1(candidate),
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash: input.accountScopeHash,
      operationReason: "initial_required_session",
      sourceReceiptRef,
      origin,
    }),
    accountScopeHash: input.accountScopeHash,
    accountGeneration: input.accountGeneration,
    currency: "access_star",
    walletRevisionBefore: input.walletRevisionBefore,
    kind: "earning_credit",
    amountSubunits: candidate.totalRunes * WALLET_SUBUNITS_PER_STAR,
    earningCategory: "lesson",
    operationReason: "initial_required_session",
    sourceReceiptRef,
    origin,
  });
}

export function createLearningV2SessionRuneRewardCompositeAuthorityV1(
  publicationToken?: LearningV2SessionRuneRewardPublicationTokenV1,
) {
  const verifiedPublication = publicationToken === undefined
    ? null
    : evidenceForToken(publicationToken);
  return async (
    input: OwnerRepositoryWalletCreditAuthorityInput,
  ): Promise<WalletAuthorizedOperationV1> => {
    if (verifiedPublication === null) return fail();
    const candidate = parseLearningV2SessionRuneRewardCompositeV1(input.candidate);
    assertPublicationEvidence(
      candidate,
      verifiedPublication,
    );
    if (candidate.accountScopeHash !== input.scope.accountScopeHash) {
      throw new Error("learning_v2_session_rune_reward_composite_owner_mismatch");
    }
    const next = materializeLearningV2SessionRuneRewardCompositeCandidateV1({
      candidate,
      accountScopeHash: input.scope.accountScopeHash,
      accountGeneration: input.scope.generation,
      walletRevisionBefore: input.walletState.revision,
    });
    if (input.canonicalAppliedReceipt === null) return next;
    let canonical;
    try {
      canonical = parseWalletAppliedReceipt(input.canonicalAppliedReceipt);
    } catch {
      return fail();
    }
    const operation = canonical.authorizedOperation;
    const sameHistoricalInitialSession = candidate.lessonOrdinal === 1 &&
      candidate.sessionOrdinal === 1 &&
      operation.accountScopeHash ===
        candidate.accountScopeHash &&
      operation.accountGeneration === input.scope.generation &&
      operation.currency === "access_star" &&
      operation.kind === "earning_credit" &&
      operation.earningCategory === "lesson" &&
      operation.operationReason === "initial_required_session" &&
      operation.origin.kind === "course" &&
      operation.origin.courseId === LEARNING_V2_EN_L1_S1_COURSE_ID_V1 &&
      operation.origin.studyTarget === "en" &&
      operation.origin.requiredSessionOrdinal === 1;
    // Upgrade bridge: a legacy v1 credit may already be the verified journal
    // head after a crash. It is the same immutable session fact even though
    // its historical receipt-derived operation id predates the v2 key.
    if (sameHistoricalInitialSession) return operation;
    if (operation.operationId !==
      deriveLearningV2SessionRuneRewardOperationIdV1(candidate)) return next;
    if (operation.semanticSubjectFingerprint !== next.semanticSubjectFingerprint ||
      operation.semanticFingerprint !== next.semanticFingerprint ||
      operation.operationFingerprint !== next.operationFingerprint ||
      operation.accountScopeHash !== candidate.accountScopeHash ||
      operation.currency !== "access_star" || operation.kind !== "earning_credit" ||
      operation.earningCategory !== "lesson" ||
      operation.operationReason !== "initial_required_session" ||
      operation.origin.kind !== "course" ||
      operation.origin.courseId !== LEARNING_V2_EN_L1_S1_COURSE_ID_V1 ||
      operation.origin.studyTarget !== "en" ||
      operation.origin.requiredSessionOrdinal !== courseRequiredSessionOrdinal(
        candidate.lessonOrdinal,
        candidate.sessionOrdinal,
      )) return fail();
    return operation;
  };
}
