// required_session_completion_fact_reader.ts — засчитанное занятие Learning V2 по mutationId, для «Урока вместе» (Ядро).
// зачем (координатор 22.10, решение владельца по «Друзьям»): сервер Ядра засчитывает совместный урок только по реально
// засчитанному занятию друга. Внутренности засчитывания (поколение аккаунта, id документа, разбор записи) — зона
// Learning V2, поэтому отдаём один помощник ровно под LessonCompletionReader из friends_lesson_together.ts.
// Только чтение внутри переданной транзакции; 4 чтения по документам, запросов по коллекциям нет.
import type * as admin from "firebase-admin";

import { deriveProgressAccountScopeHash } from "./progress_event";
import {
  parseStructuralRequiredSessionCompletionInboxRecord,
  requiredSessionCompletionInboxDocumentIdV1,
} from "./required_session_completion_callable";

const LOG = "[LV2-COMPLETION-FACT]";

export type RequiredSessionCompletionFactV1 = Readonly<{
  lessonOrdinal: number;
  sessionOrdinal: number;
  studyTarget: string;
  awardedAtMs: number;
}>;

const LESSON_RE = /(?:^|[^a-z])(?:lesson|episode|ep)[-_:]?0*(\d{1,3})(?!\d)/iu;

/** Номер урока из episodeId, иначе из canonicalSessionId: «ep-lesson-01», «es:episode-03:…», «lesson-1-use-2». */
export function requiredSessionLessonOrdinalV1(episodeId: string, canonicalSessionId: string): number | null {
  for (const source of [episodeId, canonicalSessionId]) {
    const match = LESSON_RE.exec(source);
    const value = match ? Number(match[1]) : NaN;
    if (Number.isSafeInteger(value) && value >= 1) return value;
  }
  return null;
}

const tag = (uid: string): string => `${uid.slice(0, 4)}…`;

export async function readRequiredSessionCompletionFactV1(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  args: Readonly<{ authUid: string; stableUid: string; mutationId: string }>,
): Promise<RequiredSessionCompletionFactV1 | null> {
  const ctx = { by: tag(args.stableUid), mutationId: args.mutationId.slice(0, 24) };
  const [auth, user, tombstone] = await Promise.all([
    tx.get(db.collection("auth_links").doc(args.authUid)),
    tx.get(db.collection("users").doc(args.stableUid)),
    tx.get(db.collection("account_deletion_tombstones").doc(args.stableUid)),
  ]);
  if (!auth.exists || auth.data()?.stable_id !== args.stableUid) {
    console.warn(`${LOG} null reason=auth_link_mismatch ${JSON.stringify({ ...ctx, authExists: auth.exists })}`);
    return null;
  }
  if (tombstone.exists || !user.exists) {
    console.warn(`${LOG} null reason=account_gone ${JSON.stringify({ ...ctx, tombstone: tombstone.exists, user: user.exists })}`);
    return null;
  }
  // то же поколение, что проверяет само засчитывание (createFirestoreRequiredSessionCompletionInboxStore)
  const accountGeneration = Number(user.data()?.accountGeneration ?? user.data()?.generation);
  if (!Number.isSafeInteger(accountGeneration) || accountGeneration < 1) {
    console.warn(`${LOG} null reason=account_generation_unavailable ${JSON.stringify({ ...ctx, accountGeneration })}`);
    return null;
  }
  const scopeHash = deriveProgressAccountScopeHash(args.stableUid, accountGeneration);
  const recordRef = db.collection("users").doc(args.stableUid)
    .collection("v2_required_session_completion_inbox")
    .doc(requiredSessionCompletionInboxDocumentIdV1(scopeHash, args.mutationId));
  const snapshot = await tx.get(recordRef);
  if (!snapshot.exists) {
    console.log(`${LOG} null reason=no_record ${JSON.stringify({ ...ctx, accountGeneration })}`);
    return null;
  }
  let record;
  try {
    record = parseStructuralRequiredSessionCompletionInboxRecord(snapshot.data());
  } catch (error) {
    console.warn(`${LOG} null reason=record_unparsable ${JSON.stringify({ ...ctx, error: error instanceof Error ? error.message : String(error) })}`);
    return null;
  }
  if (record.accountStableUid !== args.stableUid || record.mutationId !== args.mutationId ||
    record.progressAccountScopeHash !== scopeHash) {
    console.warn(`${LOG} null reason=foreign_record ${JSON.stringify(ctx)}`);
    return null;
  }
  const candidate = record.reconciledCandidate;
  const lessonOrdinal = requiredSessionLessonOrdinalV1(candidate.episodeId, candidate.canonicalSessionId);
  const sessionOrdinal = candidate.requiredSessionOrdinal;
  if (lessonOrdinal === null || !Number.isSafeInteger(sessionOrdinal) || sessionOrdinal < 1) {
    console.warn(`${LOG} null reason=ordinal_unresolved ${JSON.stringify({ ...ctx, episodeId: candidate.episodeId, canonicalSessionId: candidate.canonicalSessionId, sessionOrdinal })}`);
    return null;
  }
  // в записи времени засчёта нет — момент создания документа и есть момент засчёта
  const awardedAtMs = snapshot.createTime?.toMillis() ?? NaN;
  if (!Number.isFinite(awardedAtMs)) {
    console.warn(`${LOG} null reason=create_time_missing ${JSON.stringify(ctx)}`);
    return null;
  }
  const fact = Object.freeze({ lessonOrdinal, sessionOrdinal, studyTarget: candidate.studyTarget, awardedAtMs });
  console.log(`${LOG} fact ${JSON.stringify({ ...ctx, ...fact })}`);
  return fact;
}
