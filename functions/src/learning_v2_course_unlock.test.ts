import {
  createPublishedRequiredSessionSet,
  type PublishedRequiredSessionSetV2,
} from
  "../../modules/learning-v2/contracts/required_session_progress";
import { WALLET_SUBUNITS_PER_STAR } from
  "../../modules/learning-v2/contracts/wallet";
import { deriveLearningV2EconomicAccountScopeHash } from
  "../../modules/learning-v2/progress/economic_account_scope";
import { parseServerCourseUnlockReceiptRaw } from
  "../../modules/learning-v2/progress/server_course_unlock_receipt";
import { getLesson1SessionRuntime } from
  "../../modules/learning-v2/runtime/lesson1_session_runtime";
import {
  createLearningV2CourseUnlockHandler,
  createLearningV2CourseUnlockResolverHandler,
  parseProtectedLearningV2CourseUnlockReceipt,
  type LearningV2CourseUnlockStore,
  type ProtectedLearningV2CourseUnlockReceiptV1,
} from "./learning_v2_course_unlock";

const stableUid = "stable-course-unlock-user";
const accountGeneration = 5;
const accountScopeHash = deriveLearningV2EconomicAccountScopeHash(stableUid);

const publication = (): PublishedRequiredSessionSetV2 => {
  const runtime = getLesson1SessionRuntime();
  return createPublishedRequiredSessionSet({
    schemaVersion: "learning-v2-published-required-session-set.v2",
    courseId: "english-core",
    studyTarget: "en",
    courseReleaseId: "english-core-release-1",
    seasonRevisionId: "season-revision-1",
    episodeRevisionFingerprint: "b".repeat(64),
    episodeContentHash: "c".repeat(64),
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    sessionSet: runtime.sessionSet,
    episodeOrdinal: 1,
  }) as PublishedRequiredSessionSetV2;
};

const request = (ordinal: number) => ({
  intent: {
    schemaVersion: "learning-v2-server-course-unlock-intent.v1",
    accountScopeHash,
    accountGeneration,
    courseId: "english-core",
    studyTarget: "en",
    requiredSessionOrdinal: ordinal,
    walletRevisionBefore: 2,
    walletStateBeforeFingerprint: "d".repeat(64),
    courseRevisionBefore: ordinal - 1,
    courseStateBeforeFingerprint: "e".repeat(64),
  },
  sessionSetId: publication().sessionSetId,
  learnerSourceLocale: "ru",
});

const memoryStore = () => {
  const values = new Map<string, ProtectedLearningV2CourseUnlockReceiptV1>();
  const store: LearningV2CourseUnlockStore = {
    putIfAbsent: async ({ receipt }) => {
      const prior = values.get(receipt.unlockId);
      if (prior) return { status: "existing", receipt: prior };
      values.set(receipt.unlockId, receipt);
      return { status: "created", receipt };
    },
    read: async (_owner, unlockId) => values.get(unlockId),
  };
  return { store, values };
};

const dependencies = (store: LearningV2CourseUnlockStore, overrides = {}) => ({
  resolveAccountBinding: async () => ({ stableUid, accountGeneration }),
  readPublication: async () => publication(),
  readActiveRelease: async () => ({ activeReleaseId: "english-core-release-1" }),
  store,
  ...overrides,
});

describe("Learning V2 course unlock authorization callable", () => {
  it("pins active V2 publication and persists one exact paid authorization", async () => {
    const { store, values } = memoryStore();
    const handler = createLearningV2CourseUnlockHandler(dependencies(store));
    const first = await handler({ data: request(2), auth: { uid: "auth-user" } });
    const replay = await handler({ data: request(2), auth: { uid: "auth-user" } });
    expect(first).toMatchObject({ kind: "authorized", duplicate: false });
    expect(replay).toMatchObject({ kind: "authorized", duplicate: true });
    expect(replay.request).toEqual(first.request);
    expect(values.size).toBe(1);
    const protectedReceipt = parseProtectedLearningV2CourseUnlockReceipt(
      [...values.values()][0],
    );
    const receipt = parseServerCourseUnlockReceiptRaw(protectedReceipt.encoded).receipt;
    expect(receipt.authorizedRequest).toMatchObject({
      requiredSessionOrdinal: 2,
      chargeSubunits: 45 * WALLET_SUBUNITS_PER_STAR,
      basis: "stars",
      targetSessionRef: {
        courseReleaseId: "english-core-release-1",
        sessionSetId: publication().sessionSetId,
        sessionId: publication().sessionSet.sessions[1].sessionId,
      },
    });
  });

  it("resolves exact protected bytes only for the bound account", async () => {
    const { store } = memoryStore();
    const created = await createLearningV2CourseUnlockHandler(dependencies(store))({
      data: request(1), auth: { uid: "auth-user" },
    });
    const resolver = createLearningV2CourseUnlockResolverHandler(dependencies(store));
    await expect(resolver({
      auth: { uid: "auth-user" },
      data: { accountScopeHash, ...created.request },
    })).resolves.toMatchObject({
      schemaVersion: "learning-v2-server-course-unlock-resolution.v1",
      unlockId: created.request.unlockId,
      encoded: expect.any(String),
    });
    await expect(resolver({
      auth: { uid: "auth-user" },
      data: { accountScopeHash: "f".repeat(64), ...created.request },
    })).rejects.toThrow("account_generation_mismatch");
  });

  it("rejects stale accounts, inactive releases and ambiguous V1 publications", async () => {
    const { store } = memoryStore();
    await expect(createLearningV2CourseUnlockHandler(dependencies(store))({
      data: {
        ...request(1),
        intent: { ...request(1).intent, accountGeneration: accountGeneration - 1 },
      },
      auth: { uid: "auth-user" },
    })).rejects.toThrow("account_generation_mismatch");

    await expect(createLearningV2CourseUnlockHandler(dependencies(store, {
      readActiveRelease: async () => ({ activeReleaseId: "old-release" }),
    }))({ data: request(1), auth: { uid: "auth-user" } }))
      .rejects.toThrow("learning_v2_course_unlock_catalog_mismatch");

    const v2 = publication();
    const { episodeOrdinal: _episodeOrdinal, ...v1body } = v2;
    const { publicationFingerprint: _publicationFingerprint, ...withoutFingerprint } = v1body;
    const v1 = createPublishedRequiredSessionSet({
      ...withoutFingerprint,
      schemaVersion: "learning-v2-published-required-session-set.v1",
    });
    await expect(createLearningV2CourseUnlockHandler(dependencies(store, {
      readPublication: async () => v1,
    }))({ data: request(1), auth: { uid: "auth-user" } }))
      .rejects.toThrow("learning_v2_course_unlock_catalog_mismatch");
  });

  it("rejects an existing conflicting protected receipt", async () => {
    const { store, values } = memoryStore();
    const handler = createLearningV2CourseUnlockHandler(dependencies(store));
    const first = await handler({ data: request(2), auth: { uid: "auth-user" } });
    const original = values.get(first.request.unlockId) as ProtectedLearningV2CourseUnlockReceiptV1;
    values.set(first.request.unlockId, {
      ...original,
      unlockFingerprint: "f".repeat(64),
    });
    await expect(handler({ data: request(2), auth: { uid: "auth-user" } }))
      .rejects.toThrow("learning_v2_course_unlock_indeterminate");
  });
});
