// Сторож помощника для «Урока вместе» (Ядро): засчитанное занятие читается тем же id, что пишет засчитывание;
// чужие/отсутствующие записи → null; номер урока разбирается одинаково для en и es.
import { createPublishedRequiredSessionSet } from "../../../modules/learning-v2/contracts/required_session_progress";
import {
  materializeRequiredSessionCompletionEnvelope,
  requiredSessionCompletionMutationId,
} from "../../../modules/learning-v2/progress/required_session_completion_envelope";
import { progressOutboxPayloadFingerprint } from "../../../modules/learning-v2/progress/progress_outbox";
import { getLesson1SessionRuntime } from "../../../modules/learning-v2/runtime/lesson1_session_runtime";
import { deriveProgressAccountScopeHash } from "./progress_event";
import {
  createRequiredSessionCompletionHandler,
  requiredSessionCompletionInboxDocumentIdV1,
  type RequiredSessionCompletionInboxRecordV1,
} from "./required_session_completion_callable";
import { readRequiredSessionCompletionFactV1, requiredSessionLessonOrdinalV1 } from "./required_session_completion_fact_reader";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const stableUid = "stable-user-1";
const authUid = "auth-user-1";
const accountGeneration = 3;
const scopeHash = deriveProgressAccountScopeHash(stableUid, accountGeneration);
const CREATED_MS = 1_792_000_000_000;

async function realRecord(): Promise<RequiredSessionCompletionInboxRecordV1> {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const payload = materializeRequiredSessionCompletionEnvelope({
    scope: { stableId: stableUid, accountScopeHash: scopeHash, seasonId: "learning-v2", studyTarget: "en", learnerSourceLocale: "ru", generation: accountGeneration },
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: "lesson-1-understand-1",
    sessionRunId: "session-run-1",
    session,
    taskResults: session.cards.map((card) => ({ taskId: card.cardId, disposition: "completed" as const, learnerAttempts: 1, hintUsed: false })),
  });
  const publication = createPublishedRequiredSessionSet({
    schemaVersion: "learning-v2-published-required-session-set.v1",
    courseId: "english-core", studyTarget: "en", courseReleaseId: "english-core-release-1", seasonRevisionId: "season-revision-1",
    episodeRevisionFingerprint: "b".repeat(64), episodeContentHash: "c".repeat(64),
    sessionSetId: runtime.sessionSetId, sessionSetHash: runtime.sessionSetHash, sessionSet: runtime.sessionSet,
  });
  let captured: RequiredSessionCompletionInboxRecordV1 | null = null;
  const handler = createRequiredSessionCompletionHandler({
    readPublication: async () => publication,
    inboxStore: { putIfAbsent: async ({ record }) => { captured = record; return { status: "created", recordFingerprint: record.recordFingerprint, walletRewardRequest: null }; } },
  }, async () => ({ stableUid, accountGeneration }));
  await handler({ data: { mutationId: requiredSessionCompletionMutationId(payload), payloadFingerprint: progressOutboxPayloadFingerprint(payload), payload }, auth: { uid: authUid } });
  if (!captured) throw new Error("record not captured");
  return captured;
}

type Docs = Record<string, Record<string, unknown> | undefined>;
function fakeFirestore(docs: Docs) {
  const reads: string[] = [];
  const ref = (path: string) => ({
    path,
    collection: (name: string) => ({ doc: (id: string) => ref(`${path}/${name}/${id}`) }),
  });
  const db = { collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }) };
  const tx = {
    get: async (r: { path: string }) => {
      reads.push(r.path);
      const data = docs[r.path];
      return { exists: data !== undefined, data: () => data, createTime: data ? { toMillis: () => CREATED_MS } : undefined };
    },
  };
  return { db: db as never, tx: tx as never, reads };
}

const baseDocs = (record: RequiredSessionCompletionInboxRecordV1): Docs => ({
  [`auth_links/${authUid}`]: { stable_id: stableUid },
  [`users/${stableUid}`]: { accountGeneration },
  [`users/${stableUid}/v2_required_session_completion_inbox/${requiredSessionCompletionInboxDocumentIdV1(scopeHash, record.mutationId)}`]: record as never,
});

describe("readRequiredSessionCompletionFactV1 — «Урок вместе»", () => {
  it("exported id formula equals the inbox key the completion store writes", () => {
    expect(requiredSessionCompletionInboxDocumentIdV1(scopeHash, "m-1")).toBe(`rsciv1_${hashCanonicalBody({
      schemaVersion: "learning-v2-required-session-completion-inbox-key.v1", progressAccountScopeHash: scopeHash, mutationId: "m-1",
    })}`);
  });

  it("returns the credited lesson, session, study target and createTime; only reads", async () => {
    const record = await realRecord();
    const { db, tx, reads } = fakeFirestore(baseDocs(record));
    const fact = await readRequiredSessionCompletionFactV1(tx, db, { authUid, stableUid, mutationId: record.mutationId });
    expect(fact).toEqual({ lessonOrdinal: 1, sessionOrdinal: record.reconciledCandidate.requiredSessionOrdinal, studyTarget: "en", awardedAtMs: CREATED_MS });
    expect(reads).toHaveLength(4);
  });

  it("null when there is no record with this mutationId", async () => {
    const record = await realRecord();
    const { db, tx } = fakeFirestore(baseDocs(record));
    await expect(readRequiredSessionCompletionFactV1(tx, db, { authUid, stableUid, mutationId: "other-mutation" })).resolves.toBeNull();
  });

  it("null for a foreign account: auth link points elsewhere, or the generation changed", async () => {
    const record = await realRecord();
    const foreign = fakeFirestore({ ...baseDocs(record), [`auth_links/${authUid}`]: { stable_id: "someone-else" } });
    await expect(readRequiredSessionCompletionFactV1(foreign.tx, foreign.db, { authUid, stableUid, mutationId: record.mutationId })).resolves.toBeNull();
    const regenerated = fakeFirestore({ ...baseDocs(record), [`users/${stableUid}`]: { accountGeneration: accountGeneration + 1 } });
    await expect(readRequiredSessionCompletionFactV1(regenerated.tx, regenerated.db, { authUid, stableUid, mutationId: record.mutationId })).resolves.toBeNull();
  });

  it("lesson ordinal parses the same for en and es ids", () => {
    const cases: Array<[string, string, number]> = [
      ["ep-lesson-01", "lesson-1-understand-1", 1],
      ["en:lesson-03", "en:lesson-03:session-07", 3],
      ["es:lesson-03", "es:lesson-03:session-07", 3],
      ["es:episode-12", "es:episode-12:session-01", 12],
      ["episode-x", "lesson-5-use-2", 5],
    ];
    for (const [episodeId, sessionId, lesson] of cases) expect(requiredSessionLessonOrdinalV1(episodeId, sessionId)).toBe(lesson);
    expect(requiredSessionLessonOrdinalV1("season-1", "session-1")).toBeNull();
  });
});
