import type { Firestore } from "firebase-admin/firestore";
import { materializeServerWalletRewardReceiptCandidate } from "../../../modules/learning-v2/progress/server_wallet_reward_receipt";
import { createFirestoreLearningV2ActivityReleasedSubmissionInboxStoreV2 } from "./activity_released_session_submission_callable_v2";
import { projectRequiredSessionPerformanceAward } from "./required_session_performance_award";

jest.mock("./required_session_performance_award", () => ({
  parseRequiredSessionPerformanceAwardState: jest.fn((value) => value),
  parseRequiredSessionCourseAwardState: jest.fn((value) => value),
  projectRequiredSessionPerformanceAward: jest.fn(),
}));

type RowMap = Map<string, unknown>;

class FakeDocumentReference {
  constructor(readonly path: string) {}
  collection(name: string) {
    return new FakeCollectionReference(`${this.path}/${name}`);
  }
}

class FakeCollectionReference {
  constructor(readonly path: string) {}
  doc(id: string) {
    return new FakeDocumentReference(`${this.path}/${id}`);
  }
}

function fakeFirestore(rows: RowMap, writeCounts: number[]): Firestore {
  return {
    collection: (name: string) => new FakeCollectionReference(name),
    runTransaction: async <T>(
      work: (transaction: unknown) => Promise<T>,
    ): Promise<T> => {
      const writes: {
        kind: "create" | "set";
        path: string;
        value: unknown;
      }[] = [];
      const transaction = {
        get: async (ref: FakeDocumentReference) => ({
          exists: rows.has(ref.path),
          data: () => rows.get(ref.path),
        }),
        create: (ref: FakeDocumentReference, value: unknown) =>
          writes.push({ kind: "create", path: ref.path, value }),
        set: (ref: FakeDocumentReference, value: unknown) =>
          writes.push({ kind: "set", path: ref.path, value }),
      };
      const result = await work(transaction);
      for (const write of writes) {
        if (write.kind === "create" && rows.has(write.path))
          throw new Error("fake_firestore_create_collision");
        rows.set(write.path, write.value);
      }
      writeCounts.push(writes.length);
      return result;
    },
  } as unknown as Firestore;
}

const h = (character: string) => character.repeat(64);

describe("released Activity settlement Firestore transaction", () => {
  it("atomically stores shared award state + protected reward and exactly replays", async () => {
    const stableUid = "settlement-user";
    const authUid = "settlement-auth";
    const accountGeneration = 7;
    const economicAccountScopeHash = h("e");
    const reward = materializeServerWalletRewardReceiptCandidate({
      rewardId: "required-session-initial-settlement-test",
      operationId: "wallet-required-session-initial-settlement-test",
      accountScopeHash: economicAccountScopeHash,
      accountGeneration,
      amountSubunits: 30_000,
      operationReason: "initial_required_session",
      origin: {
        kind: "course",
        courseId: "learning-v2-en",
        studyTarget: "en",
        requiredSessionOrdinal: 1,
      },
    });
    jest.mocked(projectRequiredSessionPerformanceAward).mockReturnValue({
      schemaVersion: "learning-v2-required-session-performance-award-projection.v2",
      awardAuthority: "server_policy_over_catalog_bound_app_summary",
      candidateFingerprint: h("c"),
      completionKind: "initial",
      repeatQualityBand: null,
      referenceNextPriceStars: null,
      previousState: null,
      nextState: Object.freeze({ stateFingerprint: h("1") }) as never,
      previousCourseState: null,
      nextCourseState: Object.freeze({ stateFingerprint: h("2") }) as never,
      awardedSubunits: 30_000,
      reward,
    });
    const row = Object.freeze({
      schemaVersion: "learning-v2-activity-released-submission-inbox.v2",
      stableUid,
      accountGeneration,
      accountScopeHash: h("a"),
      localSubmissionFingerprint: h("b"),
      serverSubmissionFingerprint: h("c"),
      releaseId: "release-1",
      activeManifestHash: h("d"),
      episodeId: "episode-1",
      stageId: "stage-1",
      packageFingerprint: h("e"),
      sessionId: "session-1",
      sessionOrdinal: 1,
      sessionRunId: "run-1",
      submission: Object.freeze({ submissionFingerprint: h("c") }),
      evaluation: Object.freeze({ evaluationFingerprint: h("f") }),
      settlementProjection: Object.freeze({
        projectionFingerprint: h("a"),
        candidate: Object.freeze({
          candidateFingerprint: h("c"),
          initialCreditSubjectFingerprint: h("b"),
          economicAccountScopeHash,
          courseId: "learning-v2-en",
          studyTarget: "en",
        }),
      }),
      evaluationAuthority: "server_active_release_answer_sequence_only",
      settlementState: "server_economy_settled",
      walletAuthority: "protected_server_reward_receipt_or_none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      completionAuthority: "server_settled_required_session_progress",
      releaseAuthority: false,
      recordFingerprint: h("c"),
    });
    const rows: RowMap = new Map([
      [`auth_links/${authUid}`, { stable_id: stableUid }],
      [`users/${stableUid}`, { accountGeneration }],
    ]);
    const writeCounts: number[] = [];
    const store = createFirestoreLearningV2ActivityReleasedSubmissionInboxStoreV2(
      fakeFirestore(rows, writeCounts),
    );
    const input = {
      authUid,
      stableUid,
      accountGeneration,
      record: row as never,
    };

    await expect(store.putIfAbsent(input)).resolves.toMatchObject({
      status: "created",
      completionKind: "initial",
      awardedSubunits: 30_000,
      walletRewardRequest: {
        schemaVersion: "learning-v2-server-wallet-reward-request.v1",
      },
    });
    expect(writeCounts).toEqual([5]);
    expect(
      [...rows.keys()].filter((path) =>
        path.includes("/v2_activity_released_settlement_decisions/"),
      ),
    ).toHaveLength(1);
    expect(
      [...rows.keys()].filter((path) =>
        path.includes("/v2_required_session_performance_awards/"),
      ),
    ).toHaveLength(1);
    expect(
      [...rows.keys()].filter((path) =>
        path.includes("/v2_required_session_course_awards/"),
      ),
    ).toHaveLength(1);
    expect(
      [...rows.keys()].filter((path) =>
        path.includes("/v2_wallet_reward_receipts/"),
      ),
    ).toHaveLength(1);

    await expect(store.putIfAbsent(input)).resolves.toMatchObject({
      status: "existing",
      completionKind: "initial",
      awardedSubunits: 30_000,
    });
    expect(writeCounts).toEqual([5, 0]);
    expect(projectRequiredSessionPerformanceAward).toHaveBeenCalledTimes(1);
  });
});
