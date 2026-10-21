// ═══════════════════════════════════════════════════════════════════════════
// coins_backfill_lv2_sessions_2026_10_21.ts — РАЗОВЫЙ админ-скрипт [COINS-BACKFILL].
//
// зачем (владелец 21.10, №1, вариант (б) «сервером, всем сразу»): награды за занятия Learning V2 до моста (b0d445474)
// лежали только в кошельке курса и не попадали в общий счётчик монет. Доначисляем их в users/{uid}.stars тем же ключом,
// что у моста (opId practice_rune:lesson_lv2_en_<урок>_<занятие>_1), — занятия, уже переданные мостом, пропускаются,
// повторный запуск начисляет 0.
//
// Запуск (учётные данные приложения по умолчанию, только вручную):
//   npx tsx scripts/coins_backfill_lv2_sessions_2026_10_21.ts            — сухой прогон (по умолчанию, ничего не пишет)
//   npx tsx scripts/coins_backfill_lv2_sessions_2026_10_21.ts --apply    — запись (только после одобрения Ревизора)
// Вывод — только агрегаты, без uid. Пакет: docs/work/tasks/coins-backfill-lv2-sessions-2026-10-21.md
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from '../functions/node_modules/firebase-admin';
import { commitStarOperations, prepareStarOperations, type StarOpRequest } from '../functions/src/stars_ledger';
import { arenaSeasonWindow } from '../functions/src/arena_v2_core';
import { getWeekKey } from '../functions/src/progress_events';

const PROJECT_ID = 'phraseman-ea0b3';
const PAGE = 300;
const ADMIN_AUTH_UID = 'admin:coins_backfill_lv2_20261021';
const APPLY = process.argv.includes('--apply');

type Candidate = Readonly<{ uid: string; sessionKey: string; opId: string; runes: number; earnedAtMs: number }>;

const log = (event: string, extra: Record<string, unknown> = {}) =>
  console.log('[COINS-BACKFILL]', JSON.stringify({ event, ...extra }));

/** Та же формула, что modules/learning-v2/progress/interaction_rune_award_v1.ts (без пропусков — они отсеяны раньше). */
function interactionRunes(row: Readonly<{ learnerAttempts: number; hintUsed: boolean }>): number {
  if (row.hintUsed) return 1;
  if (row.learnerAttempts <= 1) return 3;
  if (row.learnerAttempts === 2) return 2;
  return 1;
}

async function collectCandidates(db: admin.firestore.Firestore): Promise<{ candidates: Candidate[]; scanned: number; skips: Record<string, number> }> {
  const group = db.collectionGroup('v2_course_session_completed_inbox');
  const skips: Record<string, number> = { bad_shape: 0, not_production: 0, not_en: 0, bad_ordinals: 0, not_all_completed: 0 };
  // uid -> sessionKey -> самое раннее прохождение (повторы не награждаются — isSessionRepeat в приложении)
  const firstRuns = new Map<string, Map<string, { runes: number; earnedAtMs: number }>>();
  let scanned = 0;
  let last: admin.firestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let query = group.orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE);
    if (last) query = query.startAfter(last);
    const snap = await query.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      scanned += 1;
      const data = doc.data() as { stableUid?: unknown; completion?: Record<string, unknown> };
      const c = data.completion;
      const uid = data.stableUid;
      if (!c || typeof uid !== 'string' || !uid) { skips.bad_shape += 1; continue; }
      if (c.environment !== 'production') { skips.not_production += 1; continue; }
      if (c.targetLanguage !== 'en') { skips.not_en += 1; continue; }
      const lesson = Number(c.lessonOrdinal);
      const session = Number(c.sessionOrdinal);
      if (!Number.isSafeInteger(lesson) || !Number.isSafeInteger(session) || lesson < 1 || session < 1) { skips.bad_ordinals += 1; continue; }
      const rows = Array.isArray(c.interactionCompletions) ? c.interactionCompletions as Array<Record<string, unknown>> : [];
      if (rows.length === 0 || rows.some((r) => r.disposition !== 'completed' || !(Number(r.learnerAttempts) >= 1))) {
        skips.not_all_completed += 1; continue;
      }
      const runes = rows.reduce((sum, r) => sum + interactionRunes({ learnerAttempts: Number(r.learnerAttempts), hintUsed: r.hintUsed === true }), 0);
      const earnedAtMs = doc.createTime ? doc.createTime.toMillis() : 0;
      const sessionKey = `lv2_en_${lesson}_${session}`;
      const sessions = firstRuns.get(uid) ?? new Map<string, { runes: number; earnedAtMs: number }>();
      firstRuns.set(uid, sessions);
      const prior = sessions.get(sessionKey);
      if (!prior || earnedAtMs < prior.earnedAtMs) sessions.set(sessionKey, { runes, earnedAtMs });
    }
    last = snap.docs[snap.docs.length - 1] ?? null;
    if (snap.size < PAGE) break;
  }
  const candidates: Candidate[] = [];
  for (const [uid, sessions] of firstRuns) {
    for (const [sessionKey, value] of sessions) {
      candidates.push({ uid, sessionKey, opId: `practice_rune:lesson_${sessionKey}_1`, ...value });
    }
  }
  return { candidates, scanned, skips };
}

function ledgerOperation(candidate: Candidate): StarOpRequest {
  // Тот же вид операции, что practiceRuneLedgerOperation (functions/src/practice_rune_grant.ts), с меткой бэкфилла в meta.
  return Object.freeze({
    opId: candidate.opId,
    delta: candidate.runes,
    reason: 'practice_session' as const,
    sourceKind: 'practice_lesson',
    sourceId: `${candidate.sessionKey}.1`,
    ruleVersion: 1,
    earnedAtMs: candidate.earnedAtMs,
    meta: Object.freeze({ activity: 'lesson', completionOrdinal: 1, backfill: 'lv2_20261021' }),
  });
}

type UserOutcome = 'applied' | 'nothing_left' | 'skip_tombstone' | 'skip_banned' | 'skip_no_user' | 'failed';

async function creditUser(db: admin.firestore.Firestore, uid: string, rows: readonly Candidate[]): Promise<{ outcome: UserOutcome; coins: number; sessions: number }> {
  // guard-ok: чтения конкретных документов по id (users/{uid}, tombstone, бан, квитанции opId), не запросы коллекций
  const userRef = db.collection('users').doc(uid);
  const [tombstone, banned] = await Promise.all([
    db.collection('account_deletion_tombstones').doc(uid).get(),
    db.collection('banned_users').doc(uid).get(),
  ]);
  if (tombstone.exists) { log('skip', { reason: 'tombstone', sessions: rows.length }); return { outcome: 'skip_tombstone', coins: 0, sessions: 0 }; }
  if (banned.exists) { log('skip', { reason: 'banned', sessions: rows.length }); return { outcome: 'skip_banned', coins: 0, sessions: 0 }; }
  try {
    return await db.runTransaction(async (tx) => {
      const [userSnap, ...receipts] = await Promise.all([
        tx.get(userRef),
        ...rows.map((row) => tx.get(userRef.collection('star_operations').doc(row.opId))),
      ]);
      if (!userSnap.exists) { log('skip', { reason: 'no_user_doc', sessions: rows.length }); return { outcome: 'skip_no_user' as const, coins: 0, sessions: 0 }; }
      if ((userSnap.data() as { banned?: unknown } | undefined)?.banned) {
        log('skip', { reason: 'banned_flag', sessions: rows.length });
        return { outcome: 'skip_banned' as const, coins: 0, sessions: 0 };
      }
      const todo = rows.filter((_, index) => !receipts[index]!.exists);
      const already = rows.length - todo.length;
      if (already > 0) log('skip', { reason: 'already_credited', sessions: already });
      if (todo.length === 0) return { outcome: 'nothing_left' as const, coins: 0, sessions: 0 };
      const ops = todo.map(ledgerOperation);
      const coins = ops.reduce((sum, op) => sum + op.delta, 0);
      if (!APPLY) return { outcome: 'applied' as const, coins, sessions: ops.length };
      const nowMs = Date.now();
      const prepared = await prepareStarOperations(tx, db, uid, userSnap, ops, {
        nowMs,
        activeSeasonId: arenaSeasonWindow(nowMs).seasonId,
        weekKeyNow: getWeekKey(new Date(nowMs).toISOString().slice(0, 10)),
        weekKeyForMs: (ms) => getWeekKey(new Date(ms).toISOString().slice(0, 10)),
        authUid: ADMIN_AUTH_UID,
        deviceId: null,
      });
      const result = commitStarOperations(tx, prepared);
      const applied = result.outcomes.filter((outcome) => outcome.status === 'applied');
      if (applied.length !== ops.length || applied.reduce((sum, outcome) => sum + outcome.appliedDelta, 0) !== coins) {
        log('rejected', { outcomes: result.outcomes.map((o) => ({ status: o.status, errorCode: o.errorCode ?? null, delta: o.appliedDelta })) });
        throw new Error('coins_backfill_materialization_mismatch');
      }
      return { outcome: 'applied' as const, coins, sessions: ops.length };
    });
  } catch (error) {
    log('failed', { reason: String((error as Error)?.message ?? error).slice(0, 200), sessions: rows.length });
    return { outcome: 'failed', coins: 0, sessions: 0 };
  }
}

async function main(): Promise<void> {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const db = admin.firestore();
  const startedAt = Date.now();
  log('start', { mode: APPLY ? 'apply' : 'dry' });
  const { candidates, scanned, skips } = await collectCandidates(db);
  const byUser = new Map<string, Candidate[]>();
  // guard-ok: Map в памяти, не Firestore; запись — по 1 транзакции журнала на человека (так задано координатором), их 11
  for (const candidate of candidates) byUser.set(candidate.uid, [...(byUser.get(candidate.uid) ?? []), candidate]);
  const tally: Record<UserOutcome, number> = { applied: 0, nothing_left: 0, skip_tombstone: 0, skip_banned: 0, skip_no_user: 0, failed: 0 };
  let coins = 0;
  let sessions = 0;
  const perUser: number[] = [];
  for (const [uid, rows] of byUser) {
    const result = await creditUser(db, uid, rows);
    tally[result.outcome] += 1;
    coins += result.coins;
    sessions += result.sessions;
    if (result.coins > 0) perUser.push(result.coins);
  }
  perUser.sort((a, b) => a - b);
  log('summary', {
    mode: APPLY ? 'apply' : 'dry',
    scanned,
    skips,
    eligibleSessions: candidates.length,
    users: byUser.size,
    userOutcomes: tally,
    sessionsCredited: sessions,
    coinsCredited: coins,
    perUserMin: perUser[0] ?? 0,
    perUserMax: perUser[perUser.length - 1] ?? 0,
    ms: Date.now() - startedAt,
  });
  if (tally.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  log('fatal', { reason: String((error as Error)?.message ?? error).slice(0, 300) });
  process.exitCode = 1;
});
