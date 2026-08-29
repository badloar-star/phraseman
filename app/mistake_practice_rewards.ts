import {
  canonicalJsonV1,
  sha256Utf8,
} from '../modules/learning-v2/policies/decision_registry';
import type { MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import {
  projectMistakes,
  type MistakeProjectionStatus,
} from '../modules/mistake-practice/projection';
import type { MistakeExerciseSupport } from '../modules/mistake-practice/exercise_mode_registry';
import { registerXP as registerXPDefault } from './xp_manager';
import {
  appendMistakeEvent,
  loadMistakeEventJournal,
  type MistakePracticeStorage,
} from './mistake_practice_store';
import { commitMistakeCorrectionWalletComposite } from './learning_v2_owner_repository_runtime';
import { deriveLearningV2EconomicAccountScopeHash } from '../modules/learning-v2/progress/economic_account_scope';
import {
  parseMistakeCorrectionWalletComposite,
  type MistakeCorrectionWalletCompositeV1,
} from '../modules/learning-v2/progress/mistake_correction_wallet_composite';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
} from './account_generation';
import { DebugLogger } from './debug-logger';

export const MISTAKE_PRACTICE_ANSWER_XP = 5;
export const MISTAKE_PRACTICE_COMPLETION_XP = 10;

export interface MistakePracticeAnswerRewardInput {
  readonly accountScope: string;
  readonly studyTarget: MistakeStudyTarget;
  readonly mistakeId: string;
  readonly cycleId: string;
  readonly attemptId: string;
  readonly correct: boolean;
  readonly independent: boolean;
  readonly support: MistakeExerciseSupport;
  readonly beforeStatus: MistakeProjectionStatus;
  readonly afterStatus: MistakeProjectionStatus;
}

interface CorrectionStarClaimInput {
  readonly accountScope: string;
  readonly mistakeId: string;
  readonly cycleId: string;
  readonly studyTarget: MistakeStudyTarget;
  readonly rewardVersion: 1;
  readonly rewardKey: string;
  readonly attemptId?: string;
  readonly correctionEventId?: string;
  readonly correctionEventFingerprint?: string;
}

interface RewardDependencies {
  readonly registerXP?: typeof registerXPDefault;
  readonly claimCorrectionStar?: (
    input: CorrectionStarClaimInput,
  ) => Promise<Readonly<{ granted: boolean; replayReceipt?: MistakeCorrectionWalletCompositeV1 }>>;
  readonly appendRewardEvent?: (
    input: MistakePracticeAnswerRewardInput & {
      readonly rewardKey: string;
      readonly replayReceipt?: MistakeCorrectionWalletCompositeV1;
    },
  ) => Promise<void>;
}

const stableId = (prefix: string, body: unknown): string =>
  `${prefix}:v1:${sha256Utf8(canonicalJsonV1(body))}`;

export function buildMistakeCorrectionRewardKey(
  input: Pick<MistakePracticeAnswerRewardInput, 'mistakeId' | 'cycleId' | 'studyTarget'>,
): string {
  return stableId('mistake-correction', {
    mistakeId: input.mistakeId,
    cycleId: input.cycleId,
    studyTarget: input.studyTarget,
    rewardVersion: 1,
  });
}

export function shouldRewardMistakeCorrection(
  input: MistakePracticeAnswerRewardInput,
): boolean {
  return input.correct
    && input.independent
    && input.beforeStatus === 'active'
    && input.afterStatus === 'corrected';
}

async function claimCorrectionStarDefault(
  input: CorrectionStarClaimInput,
): Promise<Readonly<{ granted: boolean; replayReceipt: MistakeCorrectionWalletCompositeV1 }>> {
  const accountToken = captureAccountGeneration();
  const assertOwnerCurrent = () => {
    if (accountToken.stableId !== input.accountScope ||
      !isCurrentAccountGeneration(accountToken, input.accountScope)) {
      throw new Error('mistake_correction_account_generation_stale');
    }
  };
  assertOwnerCurrent();
  const journal = await loadMistakeEventJournal({
    accountScope: input.accountScope,
    studyTarget: input.studyTarget,
  });
  assertOwnerCurrent();
  const derivedEventId = input.attemptId
    ? stableId('mistake-practice', { attemptId: input.attemptId, type: 'practice_answered' })
    : input.correctionEventId;
  const evidence = journal.events.find((event) => event.eventId === derivedEventId);
  const projected = projectMistakes(journal.events).items.get(input.mistakeId);
  if (!evidence || evidence.type !== 'practice_answered' ||
    evidence.mistakeId !== input.mistakeId || evidence.cycleId !== input.cycleId ||
    evidence.studyTarget !== input.studyTarget || evidence.payload.correct !== true ||
    evidence.payload.independent !== true || projected?.status !== 'corrected' ||
    projected.cycleId !== input.cycleId) {
    throw new Error('mistake_correction_evidence_unavailable');
  }
  const correctionEventFingerprint = sha256Utf8(canonicalJsonV1(evidence));
  if (input.correctionEventFingerprint && input.correctionEventFingerprint !== correctionEventFingerprint) {
    throw new Error('mistake_correction_evidence_conflict');
  }
  const replayReceipt = Object.freeze({
    schemaVersion: 'mistake-correction-wallet-composite.v1',
    accountScopeHash: deriveLearningV2EconomicAccountScopeHash(input.accountScope),
    rewardKey: input.rewardKey,
    mistakeId: input.mistakeId,
    cycleId: input.cycleId,
    studyTarget: input.studyTarget,
    correctionEventId: evidence.eventId,
    correctionEventFingerprint,
    rewardVersion: 1,
  } as const);
  await commitMistakeCorrectionWalletComposite(replayReceipt, { accountToken });
  assertOwnerCurrent();
  return Object.freeze({ granted: true, replayReceipt });
}

async function appendRewardEventDefault(
  input: MistakePracticeAnswerRewardInput & {
    readonly rewardKey: string;
    readonly replayReceipt?: MistakeCorrectionWalletCompositeV1;
  },
): Promise<void> {
  if (!input.replayReceipt) throw new Error('mistake_correction_replay_receipt_missing');
  const replayReceipt = parseMistakeCorrectionWalletComposite(input.replayReceipt);
  await appendMistakeEvent({
    accountScope: input.accountScope,
    studyTarget: input.studyTarget,
    event: {
      eventId: stableId('mistake-reward-event', {
        rewardKey: input.rewardKey,
        type: 'correction_rewarded',
      }),
      mistakeId: input.mistakeId,
      cycleId: input.cycleId,
      type: 'correction_rewarded',
      occurredAtMs: Date.now(),
      studyTarget: input.studyTarget,
      payload: { rewardKey: input.rewardKey, stars: 1, rewardVersion: 1, replayReceipt },
    },
  });
}

async function appendCorrectionRewardMarker(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  mistakeId: string;
  cycleId: string;
  rewardKey: string;
  replayReceipt: MistakeCorrectionWalletCompositeV1;
  storage?: MistakePracticeStorage;
}>): Promise<void> {
  await appendMistakeEvent({
    accountScope: input.accountScope,
    studyTarget: input.studyTarget,
    storage: input.storage,
    event: {
      eventId: stableId('mistake-reward-event', {
        rewardKey: input.rewardKey,
        type: 'correction_rewarded',
      }),
      mistakeId: input.mistakeId,
      cycleId: input.cycleId,
      type: 'correction_rewarded',
      occurredAtMs: Date.now(),
      studyTarget: input.studyTarget,
      payload: {
        rewardKey: input.rewardKey,
        stars: 1,
        rewardVersion: 1,
        replayReceipt: parseMistakeCorrectionWalletComposite(input.replayReceipt),
      },
    },
  });
}

export async function flushPendingMistakeCorrectionRewards(
  input: Readonly<{
    accountScope: string;
    studyTarget: MistakeStudyTarget;
    limit?: number;
  }>,
  dependencies: Readonly<{
    storage?: MistakePracticeStorage;
    claimCorrectionStar?: RewardDependencies['claimCorrectionStar'];
  }> = {},
): Promise<Readonly<{ attempted: number; delivered: number; pending: number }>> {
  const journal = await loadMistakeEventJournal({
    accountScope: input.accountScope,
    studyTarget: input.studyTarget,
    storage: dependencies.storage,
  });
  const claimCorrectionStar = dependencies.claimCorrectionStar ?? claimCorrectionStarDefault;
  const rewarded = new Set<string>();
  const blockedRewardCycles = new Set<string>();
  for (const marker of journal.events.filter((event) => event.type === 'correction_rewarded')) {
    const cycleKey = `${marker.mistakeId}:${marker.cycleId}`;
    let replayReceipt: MistakeCorrectionWalletCompositeV1;
    try {
      replayReceipt = parseMistakeCorrectionWalletComposite(marker.payload.replayReceipt);
    } catch {
      if (marker.payload.replayReceipt !== undefined) {
        blockedRewardCycles.add(cycleKey);
        continue;
      }
      const correctionEvent = [...journal.events].reverse().find((event) =>
        event.mistakeId === marker.mistakeId && event.cycleId === marker.cycleId &&
        event.type === 'practice_answered' && event.payload.correct === true &&
        event.payload.independent === true,
      );
      const rewardKey = buildMistakeCorrectionRewardKey(marker);
      if (!correctionEvent || marker.payload.rewardKey !== rewardKey) continue;
      replayReceipt = Object.freeze({
        schemaVersion: 'mistake-correction-wallet-composite.v1',
        accountScopeHash: deriveLearningV2EconomicAccountScopeHash(input.accountScope),
        rewardKey,
        mistakeId: marker.mistakeId,
        cycleId: marker.cycleId,
        studyTarget: marker.studyTarget,
        correctionEventId: correctionEvent.eventId,
        correctionEventFingerprint: sha256Utf8(canonicalJsonV1(correctionEvent)),
        rewardVersion: 1,
      });
    }
    const correctionEvent = journal.events.find((event) =>
      event.eventId === replayReceipt.correctionEventId &&
      event.type === 'practice_answered' &&
      event.mistakeId === marker.mistakeId && event.cycleId === marker.cycleId &&
      event.studyTarget === marker.studyTarget && event.payload.correct === true &&
      event.payload.independent === true,
    );
    const exactEvidenceFingerprint = correctionEvent
      ? sha256Utf8(canonicalJsonV1(correctionEvent))
      : null;
    // accountScopeHash in a restored marker names the source owner that created
    // the immutable semantic receipt. Account merge owner-rematerializes the
    // enclosing event, so only its exact correction/reward bytes are portable;
    // the new wallet composite is always materialized under input.accountScope.
    if (!correctionEvent || replayReceipt.correctionEventFingerprint !== exactEvidenceFingerprint ||
      replayReceipt.mistakeId !== marker.mistakeId || replayReceipt.cycleId !== marker.cycleId ||
      replayReceipt.studyTarget !== marker.studyTarget || replayReceipt.studyTarget !== input.studyTarget ||
      replayReceipt.rewardKey !== marker.payload.rewardKey ||
      replayReceipt.rewardKey !== buildMistakeCorrectionRewardKey(marker)) {
      blockedRewardCycles.add(cycleKey);
      continue;
    }
    try {
      const replay = await claimCorrectionStar({
        accountScope: input.accountScope,
        mistakeId: replayReceipt.mistakeId,
        cycleId: replayReceipt.cycleId,
        studyTarget: replayReceipt.studyTarget,
        rewardVersion: 1,
        rewardKey: replayReceipt.rewardKey,
        correctionEventId: replayReceipt.correctionEventId,
        correctionEventFingerprint: replayReceipt.correctionEventFingerprint,
      });
      if (replay.granted) rewarded.add(cycleKey);
    } catch (e) {
      // Keep it pending; a later owner-bound reconciliation retries exact bytes.
      DebugLogger.error('mistake_practice_rewards:replay', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  const corrected = [...projectMistakes(journal.events).items.values()].filter((item) =>
    item.status === 'corrected' &&
    !rewarded.has(`${item.mistakeId}:${item.cycleId}`) &&
    !blockedRewardCycles.has(`${item.mistakeId}:${item.cycleId}`),
  );
  const limit = Math.max(1, Math.min(25, Math.floor(input.limit ?? 10)));
  let delivered = 0;
  for (const item of corrected.slice(0, limit)) {
    const rewardKey = buildMistakeCorrectionRewardKey(item);
    const correctionEvent = [...journal.events].reverse().find((event) =>
      event.mistakeId === item.mistakeId && event.cycleId === item.cycleId &&
      event.type === 'practice_answered' && event.payload.correct === true &&
      event.payload.independent === true,
    );
    if (!correctionEvent) continue;
    try {
      const claim = await claimCorrectionStar({
        accountScope: input.accountScope,
        mistakeId: item.mistakeId,
        cycleId: item.cycleId,
        studyTarget: input.studyTarget,
        rewardVersion: 1,
        rewardKey,
        correctionEventId: correctionEvent.eventId,
        correctionEventFingerprint: sha256Utf8(canonicalJsonV1(correctionEvent)),
      });
      if (!claim.granted) continue;
      const replayReceipt = Object.freeze({
        schemaVersion: 'mistake-correction-wallet-composite.v1' as const,
        accountScopeHash: deriveLearningV2EconomicAccountScopeHash(input.accountScope),
        rewardKey,
        mistakeId: item.mistakeId,
        cycleId: item.cycleId,
        studyTarget: input.studyTarget,
        correctionEventId: correctionEvent.eventId,
        correctionEventFingerprint: sha256Utf8(canonicalJsonV1(correctionEvent)),
        rewardVersion: 1 as const,
      });
      await appendCorrectionRewardMarker({
        ...input, ...item, rewardKey, replayReceipt, storage: dependencies.storage,
      });
      delivered += 1;
    } catch (e) {
      // Оставляем цикл без маркера: следующий запуск безопасно повторит тот же idempotency key.
      DebugLogger.error('mistake_practice_rewards:replayReceipt', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  return Object.freeze({
    attempted: Math.min(corrected.length, limit),
    delivered,
    pending: Math.max(0, corrected.length - delivered),
  });
}

export async function settleMistakePracticeAnswerRewards(
  input: MistakePracticeAnswerRewardInput,
  dependencies: RewardDependencies = {},
): Promise<Readonly<{ xp: number; starGranted: boolean }>> {
  const productionSuccess = input.correct
    && input.independent
    && input.support === 'production';
  let xp = 0;
  if (productionSuccess) {
    const result = await (dependencies.registerXP ?? registerXPDefault)(
      MISTAKE_PRACTICE_ANSWER_XP,
      'mistake_practice_answer',
      '',
      'ru',
      undefined,
      {
        eventId: stableId('mistake-practice-xp', {
          mistakeId: input.mistakeId,
          cycleId: input.cycleId,
          attemptId: input.attemptId,
        }),
        payload: {
          mistakeId: input.mistakeId,
          cycleId: input.cycleId,
          studyTarget: input.studyTarget,
        },
      },
    );
    xp = result.finalDelta;
  }

  if (!shouldRewardMistakeCorrection(input)) {
    return Object.freeze({ xp, starGranted: false });
  }
  const rewardKey = buildMistakeCorrectionRewardKey(input);
  const claim = await (dependencies.claimCorrectionStar ?? claimCorrectionStarDefault)({
    accountScope: input.accountScope,
    mistakeId: input.mistakeId,
    cycleId: input.cycleId,
    studyTarget: input.studyTarget,
    rewardVersion: 1,
    rewardKey,
    attemptId: input.attemptId,
  });
  if (claim.granted) {
    await (dependencies.appendRewardEvent ?? appendRewardEventDefault)({
      ...input,
      rewardKey,
      replayReceipt: claim.replayReceipt,
    });
  }
  return Object.freeze({ xp, starGranted: claim.granted });
}

export async function settleMistakePracticeCompletionReward(
  input: Readonly<{
    sessionId: string;
    initialCount: number;
    studyTarget: MistakeStudyTarget;
  }>,
  dependencies: Pick<RewardDependencies, 'registerXP'> = {},
): Promise<number> {
  if (!input.sessionId.trim() || !Number.isSafeInteger(input.initialCount) || input.initialCount < 5) {
    return 0;
  }
  const result = await (dependencies.registerXP ?? registerXPDefault)(
    MISTAKE_PRACTICE_COMPLETION_XP,
    'mistake_practice_answer',
    '',
    'ru',
    undefined,
    {
      eventId: stableId('mistake-practice-complete-xp', {
        sessionId: input.sessionId,
        studyTarget: input.studyTarget,
        rewardVersion: 1,
      }),
      payload: {
        sessionId: input.sessionId,
        initialCount: input.initialCount,
        studyTarget: input.studyTarget,
        kind: 'completion',
      },
    },
  );
  return result.finalDelta;
}
