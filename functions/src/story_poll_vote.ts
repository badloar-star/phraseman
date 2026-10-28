// Опрос в объявлении историй (шаблон «Опрос», макет stories-announcements-v1; координатор 28.10 — по образцу «Опросов Главной v2»).
// Один голос на аккаунт и ревизию объявления. Документ голоса хранит только answered и userId (стабильный uid — по нему удаление аккаунта
// находит голос общим запросом по коллекциям 'votes'); выбранный вариант сразу +1 к счётчикам опроса и нигде не сохраняется — так обещает
// политика конфиденциальности. Ответ сразу возвращает счётчики: клиент заливает проценты без отдельного чтения.
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { resolveStableUidForAuthInTransaction } from "./auth_identity";
import { HOT_CALLABLE_OPTIONS } from "./callable_options";
import {
  STORY_POLLS_COLLECTION,
  STORY_POLL_VOTES_SUBCOLLECTION,
  decideStoryPollVote,
  normalizeStoryPollVoteInput,
  storyPollDocId,
  type StoryPollVoteInput,
} from "../../modules/story_events/story_announcements_contract";

const LOG = "[STORY-POLL]";

export type StoryPollVoteResult = Readonly<{
  ok: true;
  status: "accepted" | "already_answered";
  counts: number[];
  voteCount: number;
}>;

type StoryPollTransactionArgs = Readonly<{
  db: admin.firestore.Firestore;
  transaction: admin.firestore.Transaction;
  authUid: string;
  input: StoryPollVoteInput;
  startedAt: number;
  resolveStableUid?: typeof resolveStableUidForAuthInTransaction;
}>;

/** Транзакция голоса (экспорт для теста): личность, опрос и голос — в одном снимке Firestore. */
export async function applyStoryPollVoteTransaction({
  db,
  transaction,
  authUid,
  input,
  startedAt,
  resolveStableUid = resolveStableUidForAuthInTransaction,
}: StoryPollTransactionArgs): Promise<StoryPollVoteResult> {
  // зачем: перепривязка или удаление аккаунта во время голоса не должны записать голос под устаревшим uid
  const stableUid = await resolveStableUid(db, transaction, authUid);
  const pollRef = db.collection(STORY_POLLS_COLLECTION).doc(storyPollDocId(input.id, input.revision)); // guard-ok: один документ по id, не запрос коллекции
  const voteRef = pollRef.collection(STORY_POLL_VOTES_SUBCOLLECTION).doc(stableUid); // guard-ok: один документ голоса по стабильному uid
  const [pollSnap, voteSnap] = await Promise.all([transaction.get(pollRef), transaction.get(voteRef)]);
  const nowMs = Date.now();
  const decision = decideStoryPollVote({
    poll: pollSnap.exists ? (pollSnap.data() ?? null) : null,
    vote: voteSnap.exists ? (voteSnap.data() ?? null) : null,
    input,
    nowMs,
  });
  logger.info(`${LOG} vote:decision`, {
    poll: storyPollDocId(input.id.slice(0, 8), input.revision),
    option: input.option,
    decision: decision.kind,
    reason: decision.kind === "reject" ? decision.reason : null,
    ms: nowMs - startedAt,
  });
  if (decision.kind === "reject") throw new HttpsError(decision.code, decision.reason, { reason: decision.reason });
  if (decision.kind === "already_answered") {
    return { ok: true, status: "already_answered", counts: decision.counts, voteCount: decision.voteCount };
  }
  // зачем: записи транзакции подтверждаются целиком в runTransaction (его ждёт вызов); голос — только answered и userId, без варианта
  transaction.set(voteRef, { userId: stableUid, answered: true, createdAtMs: nowMs }, { merge: true }); // guard-ok: внутри транзакции, merge
  transaction.update(pollRef, { // guard-ok: внутри транзакции; счётчик — сумма без личных данных
    [`counts.${input.option}`]: admin.firestore.FieldValue.increment(1),
    voteCount: admin.firestore.FieldValue.increment(1),
    lastVoteAtMs: nowMs,
  });
  return { ok: true, status: "accepted", counts: decision.counts, voteCount: decision.voteCount };
}

export const storyPollVote = onCall(HOT_CALLABLE_OPTIONS, async (request): Promise<StoryPollVoteResult> => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "auth_required");
  let input: StoryPollVoteInput;
  try {
    input = normalizeStoryPollVoteInput(request.data);
  } catch (error) {
    logger.info(`${LOG} vote:invalid`, { reason: String(error instanceof Error ? error.message : error).slice(0, 60) });
    throw new HttpsError("invalid-argument", "invalid_vote");
  }
  const db = admin.firestore();
  const startedAt = Date.now();
  return db.runTransaction((transaction) =>
    applyStoryPollVoteTransaction({ db, transaction, authUid: request.auth!.uid, input, startedAt }),
  );
});
