// ═══ dailyPollVote — голос в «Опросе дня» ════════════════════════════════════
// зачем (владелец 2026-09-30): один голос на человека за день. Документ голоса
// daily_polls/{dateKey}/votes/{stableUid} — id = uid, поэтому второй голос
// физически не создаётся. Счётчики увеличиваются в той же транзакции, клиент их
// напрямую не пишет (firestore.rules). В ответе — свежие счётчики, чтобы клиент
// показал проценты без дополнительного чтения.
//
// Стоимость: 1 транзакция = 2 чтения (опрос + голос) + 2 записи, только по тапу.
// Повторный тап того же человека — 2 чтения, 0 записей.
// App Check НЕ включать: HOT_CALLABLE_OPTIONS держит enforceAppCheck=false
// (пломба APP_CHECK_SEALED_BY_OWNER_2026_08_17 в callable_options.ts).
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

import { resolveStableUidForAuth } from './auth_identity';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import {
  DAILY_POLL_COLLECTION,
  DAILY_POLL_VOTES_SUBCOLLECTION,
  decideDailyPollVote,
  normalizeDailyPollVoteInput,
  type DailyPollCounts,
} from './daily_poll_core';

const LOG = '[DAILY-POLL]';

export type DailyPollVoteResult = Readonly<{
  ok: true;
  status: 'accepted' | 'already_voted';
  optionId: string;
  counts: DailyPollCounts;
  voteCount: number;
}>;

export const dailyPollVote = onCall(HOT_CALLABLE_OPTIONS, async (request): Promise<DailyPollVoteResult> => {
  if (!request.auth?.uid) {
    logger.info(`${LOG} vote: отказ — нет авторизации`);
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const authUid = request.auth.uid;
  const input = normalizeDailyPollVoteInput(request.data);
  const db = admin.firestore();
  const stableUid = await resolveStableUidForAuth(db, authUid, input.stableId ?? undefined);
  logger.info(`${LOG} vote: вход`, { stableUid, dateKey: input.dateKey, optionId: input.optionId });

  const pollRef = db.collection(DAILY_POLL_COLLECTION).doc(input.dateKey);
  const voteRef = pollRef.collection(DAILY_POLL_VOTES_SUBCOLLECTION).doc(stableUid);
  const startedAt = Date.now();

  return db.runTransaction(async (transaction) => {
    const [pollSnap, voteSnap] = await Promise.all([transaction.get(pollRef), transaction.get(voteRef)]);
    const nowMs = Date.now();
    const existingVoteOptionId = voteSnap.exists ? String(voteSnap.data()?.optionId ?? '') || null : null;
    const decision = decideDailyPollVote({
      poll: pollSnap.exists ? (pollSnap.data() ?? null) : null,
      existingVoteOptionId,
      input,
      nowMs,
    });
    logger.info(`${LOG} vote: решение`, {
      stableUid,
      dateKey: input.dateKey,
      pollExists: pollSnap.exists,
      pollStatus: pollSnap.exists ? pollSnap.data()?.status ?? null : null,
      existingVoteOptionId,
      decision: decision.kind,
      reason: decision.kind === 'reject' ? decision.reason : null,
      ms: nowMs - startedAt,
    });
    if (decision.kind === 'reject') {
      throw new HttpsError(decision.code, decision.reason, { reason: decision.reason });
    }
    if (decision.kind === 'already_voted') {
      return {
        ok: true as const,
        status: 'already_voted' as const,
        optionId: decision.optionId,
        counts: decision.counts,
        voteCount: decision.voteCount,
      };
    }
    // Минимум данных: только выбранный вариант и время. Имя/язык/устройство не пишем.
    // зачем userId (30.09): удаление аккаунта находит голоса через collectionGroup('votes')
    // по этому полю (account_delete.ts COLLECTION_GROUP_QUERY_SPECS) — иначе голос переживал бы аккаунт.
    transaction.create(voteRef, { optionId: decision.optionId, createdAtMs: nowMs, userId: stableUid });
    transaction.update(pollRef, {
      [`counts.${decision.optionId}`]: admin.firestore.FieldValue.increment(1),
      voteCount: admin.firestore.FieldValue.increment(1),
      lastVoteAtMs: nowMs,
    });
    return {
      ok: true as const,
      status: 'accepted' as const,
      optionId: decision.optionId,
      counts: decision.counts,
      voteCount: decision.voteCount,
    };
  });
});
