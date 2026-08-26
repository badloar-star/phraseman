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
import { authoredLearningV2SessionShard } from "../content/source/authored_sessions_v1";
import { buildSessionChildBodiesFromShard } from "../content/source/session_package_from_shard_v1";
import type { LearningV2CourseSessionReadyHandleV3 } from "../../../app/learning_v2_course_released_session_client_v3";
import { projectLearningV2InteractionRuneAwardV1 } from "./interaction_rune_award_v1";
import type { OwnerRepositoryWalletCreditAuthorityInput } from "./owner_repository";
import { parseWalletAppliedReceipt } from "./wallet_reducer";

export const LEARNING_V2_EN_L1_S1_COURSE_ID_V1 = "learning-v2-en-v1" as const;
export const LEARNING_V2_EN_L1_S1_COURSE_SESSION_ID_V1 =
  "lesson-01:session:01" as const;
export const LEARNING_V2_EN_L1_S1_SOURCE_FINGERPRINT_V1 =
  "749add3e5c1ee7b55b2a3d01f2a02e107c7c44da0592696b22b96e6c1e4fa547" as const;
export const LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1 = Object.freeze([
  "episode-01:session-01:intro-q-1",
  "episode-01:session-01:intro-q-2",
  "episode-01:session-01:intro-q-3",
  ...Array.from({ length: 17 }, (_, index) =>
    `card-episode-01-s01-${String(index + 4).padStart(2, "0")}`),
] as const);

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
  readonly lessonOrdinal: 1;
  readonly sessionOrdinal: 1;
  readonly courseId: typeof LEARNING_V2_EN_L1_S1_COURSE_ID_V1;
  readonly courseSessionId: typeof LEARNING_V2_EN_L1_S1_COURSE_SESSION_ID_V1;
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
  readonly releaseId: string;
  readonly activeRootFingerprint: string;
  readonly activeHeadFingerprint: string;
  readonly packageFingerprint: string;
  readonly childSetFingerprint: string;
  readonly sourceFingerprint: string;
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
const PRACTICE_IDS = LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1.slice(3);
const MAX_RUNES = PRACTICE_IDS.length * 3;
const PUBLICATION_EVIDENCE_KEYS = Object.freeze([
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
): InternalPublicationEvidenceV1 {
  if (!isRecord(input) || !exactKeys(input, PUBLICATION_EVIDENCE_KEYS) ||
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
  return Object.freeze({
    releaseId: input.releaseId,
    activeRootFingerprint: input.activeRootFingerprint,
    activeHeadFingerprint: input.activeHeadFingerprint,
    packageFingerprint: input.packageFingerprint,
    childSetFingerprint: input.childSetFingerprint,
    sourceFingerprint: input.sourceFingerprint,
  });
}

function evidenceForToken(
  input: unknown,
): InternalPublicationEvidenceV1 {
  if (typeof input !== "object" || input === null) return fail();
  return publicationEvidenceByToken.get(input) ?? fail();
}

function assertPublicationEvidence(
  candidateInput: LearningV2SessionRuneRewardCompositeV1,
  evidence: InternalPublicationEvidenceV1,
): void {
  const candidate = parseLearningV2SessionRuneRewardCompositeV1(candidateInput);
  if (candidate.releaseId !== evidence.releaseId ||
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
  if (material.courseSessionId !== LEARNING_V2_EN_L1_S1_COURSE_SESSION_ID_V1 ||
    material.lessonId !== "lesson-01" || material.lessonOrdinal !== 1 ||
    material.sessionOrdinal !== 1) return fail();
  const shard = authoredLearningV2SessionShard(1);
  if (!shard ||
    shard.generationInputFingerprint !==
      LEARNING_V2_EN_L1_S1_SOURCE_FINGERPRINT_V1) return fail();
  const canonical = buildSessionChildBodiesFromShard(
    shard,
    ready.learnerSourceLocale,
    LEARNING_V2_EN_L1_S1_COURSE_SESSION_ID_V1,
  );
  if (material.introChild.introFingerprint !== canonical.intro.introFingerprint ||
    material.learnerChild.learnerFingerprint !== canonical.learner.learnerFingerprint ||
    material.evaluatorCapsuleChild.capsuleSetFingerprint !==
      canonical.evaluatorCapsule.capsuleSetFingerprint ||
    material.auxiliaryChild.auxiliaryFingerprint !==
      canonical.auxiliary.auxiliaryFingerprint) return fail();
  const evidence = publicationEvidence({
    releaseId: material.releaseId,
    activeRootFingerprint: material.activeRootFingerprint,
    activeHeadFingerprint: material.activeHeadFingerprint,
    packageFingerprint: material.packageFingerprint,
    childSetFingerprint: material.childSetFingerprint,
    sourceFingerprint: LEARNING_V2_EN_L1_S1_SOURCE_FINGERPRINT_V1,
  });
  const token = Object.freeze({}) as LearningV2SessionRuneRewardPublicationTokenV1;
  publicationEvidenceByToken.set(token, evidence);
  return token;
}

function assertCanonicalCompletion(
  input: unknown,
): LearningV2CourseSessionCompletedSummaryV1 {
  let completion: LearningV2CourseSessionCompletedSummaryV1;
  try {
    completion = parseLearningV2CourseSessionCompletedSummaryV1(input);
  } catch {
    return fail();
  }
  const ids = completion.interactionCompletions.map((row) => row.interactionId);
  if (completion.targetLanguage !== "en" || completion.studyTarget !== "en" ||
    completion.lessonId !== "lesson-01" || completion.lessonOrdinal !== 1 ||
    completion.courseSessionId !== LEARNING_V2_EN_L1_S1_COURSE_SESSION_ID_V1 ||
    completion.sessionOrdinal !== 1 || !HASH.test(completion.packageFingerprint) ||
    completion.packageFingerprint === "0".repeat(64) ||
    !same(ids, LEARNING_V2_EN_L1_S1_INTERACTION_IDS_V1) ||
    completion.interactionCompletions.some((row) =>
      row.disposition !== "completed" || row.learnerAttempts < 1)) return fail();
  return completion;
}

function rewardKey(accountScopeHash: string): string {
  return `learning-session-reward:v1:${hashCanonicalBody({
    schemaVersion: "learning-v2-initial-session-reward-key.v1",
    accountScopeHash,
    courseId: LEARNING_V2_EN_L1_S1_COURSE_ID_V1,
    studyTarget: "en",
    requiredSessionOrdinal: 1,
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
  if (completion.releaseId !== publication.releaseId ||
    completion.activeRootFingerprint !== publication.activeRootFingerprint ||
    completion.activeHeadFingerprint !== publication.activeHeadFingerprint ||
    completion.packageFingerprint !== publication.packageFingerprint ||
    completion.childSetFingerprint !== publication.childSetFingerprint) return fail();
  const interactionAwards = Object.freeze(
    completion.interactionCompletions.slice(3).map((row, index) => {
      if (row.interactionId !== PRACTICE_IDS[index]) return fail();
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
    totalRunes > MAX_RUNES) return fail();
  const body = Object.freeze({
    schemaVersion: "learning-v2-session-rune-reward-composite.v1" as const,
    accountScopeHash,
    targetLanguage: "en" as const,
    lessonOrdinal: 1 as const,
    sessionOrdinal: 1 as const,
    courseId: LEARNING_V2_EN_L1_S1_COURSE_ID_V1,
    courseSessionId: LEARNING_V2_EN_L1_S1_COURSE_SESSION_ID_V1,
    releaseId: publication.releaseId,
    activeRootFingerprint: publication.activeRootFingerprint,
    activeHeadFingerprint: publication.activeHeadFingerprint,
    sourceFingerprint: publication.sourceFingerprint,
    packageFingerprint: publication.packageFingerprint,
    childSetFingerprint: publication.childSetFingerprint,
    completion,
    rewardVersion: 1 as const,
    rewardKey: rewardKey(accountScopeHash),
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
  const completion = assertCanonicalCompletion(input.completion);
  const publication = evidenceForToken(input.publicationToken);
  if (summary.targetLanguage !== "en" || summary.studyTarget !== "en" ||
    summary.lessonId !== "lesson-01" || summary.lessonOrdinal !== 1 ||
    summary.courseSessionId !== LEARNING_V2_EN_L1_S1_COURSE_SESSION_ID_V1 ||
    summary.sessionOrdinal !== 1 ||
    summary.releaseId !== publication.releaseId ||
    summary.activeRootFingerprint !== publication.activeRootFingerprint ||
    summary.activeHeadFingerprint !== publication.activeHeadFingerprint ||
    summary.packageFingerprint !== completion.packageFingerprint ||
    summary.packageFingerprint !== publication.packageFingerprint ||
    summary.childSetFingerprint !== completion.childSetFingerprint ||
    summary.childSetFingerprint !== publication.childSetFingerprint ||
    summary.interactionSetFingerprint !== completion.interactionSetFingerprint ||
    summary.interactionCount !== completion.interactionCount) return fail();
  return materializeCandidate(input.accountScopeHash, completion, publication);
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
    detached.targetLanguage !== "en" || detached.lessonOrdinal !== 1 ||
    detached.sessionOrdinal !== 1 ||
    detached.courseId !== LEARNING_V2_EN_L1_S1_COURSE_ID_V1 ||
    detached.courseSessionId !== LEARNING_V2_EN_L1_S1_COURSE_SESSION_ID_V1 ||
    detached.rewardVersion !== 1 || !Array.isArray(detached.interactionAwards) ||
    detached.interactionAwards.some((row) =>
      !isRecord(row) || !exactKeys(row, AWARD_KEYS))) return fail();
  const expected = materializeCandidate(
    detached.accountScopeHash,
    detached.completion,
    {
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
  input: Pick<LearningV2SessionRuneRewardCompositeV1, "accountScopeHash">,
): string {
  return deriveWalletInitialRequiredSessionOperationId({
    accountScopeHash: input.accountScopeHash,
    origin: {
      kind: "course",
      courseId: LEARNING_V2_EN_L1_S1_COURSE_ID_V1,
      studyTarget: "en",
      requiredSessionOrdinal: 1,
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
    requiredSessionOrdinal: 1,
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
    const sameInitialSession = operation.accountScopeHash ===
        candidate.accountScopeHash &&
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
    if (sameInitialSession && operation.operationId !==
      deriveLearningV2SessionRuneRewardOperationIdV1(candidate)) {
      return operation;
    }
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
      operation.origin.requiredSessionOrdinal !== 1) return fail();
    return operation;
  };
}
