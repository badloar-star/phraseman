import type { Firestore } from 'firebase-admin/firestore';
import { createPublishedRequiredSessionSet } from '../../../modules/learning-v2/contracts/required_session_progress';
import {
  materializeRequiredSessionCompletionEnvelope,
  requiredSessionCompletionMutationId,
} from '../../../modules/learning-v2/progress/required_session_completion_envelope';
import { deriveProgressAccountScopeHash } from '../../../modules/learning-v2/progress/progress_account_scope';
import { progressOutboxPayloadFingerprint } from '../../../modules/learning-v2/progress/progress_outbox';
import { parseServerWalletRewardReceiptRaw } from '../../../modules/learning-v2/progress/server_wallet_reward_receipt';
import { getLesson1SessionRuntime } from '../../../modules/learning-v2/runtime/lesson1_session_runtime';
import { parseProtectedLearningV2WalletRewardReceipt } from '../coin_exchange_wallet_reward';
import {
  createFirestoreRequiredSessionCompletionInboxStore,
  createRequiredSessionCompletionHandler,
} from './required_session_completion_callable';
import {
  parseRequiredSessionCourseAwardState,
  parseRequiredSessionPerformanceAwardState,
} from './required_session_performance_award';

type RowMap = Map<string, unknown>;

class FakeDocumentReference {
  constructor(readonly path: string) {}
  collection(name: string): FakeCollectionReference {
    return new FakeCollectionReference(`${this.path}/${name}`);
  }
}

class FakeCollectionReference {
  constructor(readonly path: string) {}
  doc(id: string): FakeDocumentReference {
    return new FakeDocumentReference(`${this.path}/${id}`);
  }
}

const fakeFirestore = (rows: RowMap): Firestore => ({
  collection: (name: string) => new FakeCollectionReference(name),
  runTransaction: async <T>(work: (transaction: unknown) => Promise<T>): Promise<T> => {
    const writes: Array<Readonly<{ kind: 'create' | 'set'; path: string; value: unknown }>> = [];
    const transaction = {
      get: async (ref: FakeDocumentReference) => ({
        exists: rows.has(ref.path),
        data: () => rows.get(ref.path),
      }),
      create: (ref: FakeDocumentReference, value: unknown) => {
        writes.push({ kind: 'create', path: ref.path, value });
      },
      set: (ref: FakeDocumentReference, value: unknown) => {
        writes.push({ kind: 'set', path: ref.path, value });
      },
    };
    const result = await work(transaction);
    for (const write of writes) {
      if (write.kind === 'create' && rows.has(write.path)) {
        throw new Error('fake_firestore_create_collision');
      }
      rows.set(write.path, write.value);
    }
    return result;
  },
} as unknown as Firestore);

describe('required-session Firestore initial/repeat star transaction', () => {
  it('atomically grants initial stars, exact repeat percentage and replays the request', async () => {
    const stableUid = 'wallet-performance-user';
    const authUid = 'auth-performance-user';
    const accountGeneration = 7;
    const accountScopeHash = deriveProgressAccountScopeHash(stableUid, accountGeneration);
    const runtime = getLesson1SessionRuntime();
    const session = runtime.compiled.sessions[0];
    const publication = createPublishedRequiredSessionSet({
      schemaVersion: 'learning-v2-published-required-session-set.v2',
      courseId: 'english-core',
      studyTarget: 'en',
      courseReleaseId: 'english-core-release-1',
      seasonRevisionId: 'season-revision-1',
      episodeRevisionFingerprint: 'b'.repeat(64),
      episodeContentHash: 'c'.repeat(64),
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      sessionSet: runtime.sessionSet,
      episodeOrdinal: 1,
    });
    const requestFor = (runId: string, perfect: boolean) => {
      const payload = materializeRequiredSessionCompletionEnvelope({
        scope: {
          stableId: stableUid,
          accountScopeHash,
          seasonId: 'learning-v2',
          studyTarget: 'en',
          learnerSourceLocale: 'ru',
          generation: accountGeneration,
        },
        episodeId: runtime.payload.episodeId,
        sessionSetId: runtime.sessionSetId,
        sessionSetHash: runtime.sessionSetHash,
        localSessionId: 'lesson-1-understand-1',
        sessionRunId: runId,
        session,
        taskResults: session.cards.map((card, index) => ({
          taskId: card.cardId,
          disposition: 'completed' as const,
          learnerAttempts: !perfect && index === 1 ? 2 : 1,
          hintUsed: !perfect && index === 2,
        })),
      });
      return Object.freeze({
        mutationId: requiredSessionCompletionMutationId(payload),
        payloadFingerprint: progressOutboxPayloadFingerprint(payload),
        payload,
      });
    };
    const rows: RowMap = new Map([
      [`auth_links/${authUid}`, { stable_id: stableUid }],
      [`users/${stableUid}`, { accountGeneration }],
    ]);
    const handler = createRequiredSessionCompletionHandler({
      readPublication: async () => publication,
      inboxStore: createFirestoreRequiredSessionCompletionInboxStore(fakeFirestore(rows)),
    }, async () => ({ stableUid, accountGeneration }));

    const firstRequest = requestFor('performance-run-1', false);
    const first = await handler({ auth: { uid: authUid }, data: firstRequest });
    expect(first).toMatchObject({
      kind: 'accepted',
      duplicate: false,
      walletRewardRequest: {
        schemaVersion: 'learning-v2-server-wallet-reward-request.v1',
      },
    });
    const rowsAfterFirst = rows.size;
    const duplicate = await handler({ auth: { uid: authUid }, data: firstRequest });
    expect(duplicate).toMatchObject({
      duplicate: true,
      walletRewardRequest: first.walletRewardRequest,
    });
    expect(rows.size).toBe(rowsAfterFirst);

    const second = await handler({
      auth: { uid: authUid },
      data: requestFor('performance-run-2', true),
    });
    expect(second).toMatchObject({ kind: 'accepted', duplicate: false });

    const protectedRewards = [...rows.entries()]
      .filter(([path]) => path.includes('/v2_wallet_reward_receipts/'))
      .map(([, value]) => parseProtectedLearningV2WalletRewardReceipt(value));
    expect(protectedRewards).toHaveLength(2);
    expect(protectedRewards.map((reward) =>
      parseServerWalletRewardReceiptRaw(reward.encoded).receipt.amountSubunits)
      .sort((a, b) => a - b))
      .toEqual([90_000, 330_000]);

    const awardStates = [...rows.entries()]
      .filter(([path]) => path.includes('/v2_required_session_performance_awards/'))
      .map(([, value]) => parseRequiredSessionPerformanceAwardState(value));
    expect(awardStates).toHaveLength(1);
    expect(awardStates[0]).toMatchObject({
      initialCreditedSubunits: 330_000,
      repeatCompletions: 1,
      repeatCreditedSubunits: 90_000,
      bestTaskStars: Array(12).fill(3),
    });
    const courseStates = [...rows.entries()]
      .filter(([path]) => path.includes('/v2_required_session_course_awards/'))
      .map(([, value]) => parseRequiredSessionCourseAwardState(value));
    expect(courseStates).toHaveLength(1);
    expect(courseStates[0]).toMatchObject({ initialSettledSessionCount: 1, revision: 1 });

    const futurePublication = createPublishedRequiredSessionSet({
      ...Object.fromEntries(Object.entries(publication)
        .filter(([key]) => key !== 'publicationFingerprint' && key !== 'episodeOrdinal')),
      episodeOrdinal: 2,
    });
    const futureHandler = createRequiredSessionCompletionHandler({
      readPublication: async () => futurePublication,
      inboxStore: createFirestoreRequiredSessionCompletionInboxStore(fakeFirestore(rows)),
    }, async () => ({ stableUid, accountGeneration }));
    const rowsBeforeRejectedFuture = rows.size;
    await expect(futureHandler({
      auth: { uid: authUid },
      data: requestFor('performance-run-future', true),
    })).rejects.toThrow('required_session_initial_sequence_conflict');
    expect(rows.size).toBe(rowsBeforeRejectedFuture);
  });
});
