import * as admin from 'firebase-admin';
import {
  buildHistoryPointsFromPage,
  parseRevenueEventRow,
  parseUserCreatedAt,
  BACKFILL_PAGE_SIZE,
  type RawRevenueRow,
  type RawUserRow,
} from './business_tier_backfill';
import { readBackfillCursor, writeBackfillCursor, writeHistoryPoints } from './business_tier_history_store';

/**
 * Оркестратор одного вызова бэкфилла: читает СЛЕДУЮЩУЮ страницу users
 * постранично через .select()-проекцию (тот же паттерн, что re_engage_push.ts:
 * .orderBy('__name__').startAfter(lastDoc).select(...)), сливает revenuecat-события
 * того же временного диапазона, строит точки истории и пишет их + курсор.
 * Останавливается сам, когда страницы users заканчиваются — тогда помечает
 * done=true, и повторные вызовы становятся no-op.
 *
 * Курсор (business_tier_backfill_state/singleton) хранит:
 *  - lastUserDocId — для точной пагинации startAfter(),
 *  - cumulativeUsers — бегущий тотал, переносимый со страницы на страницу
 *    (иначе каждая точка истории считала бы себя "с нуля").
 *
 * зачем HTTP-callable с курсором, а не scheduled function: владелец видит
 * прогресс сразу в админке ("страница готова, ещё N пользователей") и может
 * повторить вызов немедленно — не ждать суточный тик крона между страницами.
 * Одна страница users (limit 500, .select('created_at')) обрабатывается за
 * секунды, так что один HTTP-вызов покрывает много страниц подряд при
 * желании, а таймаут ~9 минут не страшен — курсор переживает обрыв.
 */

export interface BackfillRunnerDeps {
  readonly db: FirebaseFirestore.Firestore;
  readonly nowMs: number;
  readonly pageSize?: number;
}

export interface BackfillRunResult {
  readonly pagesProcessed: number;
  readonly usersScanned: number;
  readonly pointsWritten: number;
  readonly done: boolean;
  readonly lastCompletedDayKey: string | null;
  readonly cumulativeUsers: number;
}

interface UserPageRead {
  readonly rows: readonly RawUserRow[];
  readonly lastDocId: string | null;
  readonly pageDocCount: number;
}

/** Одна страница users, спроецированная на created_at, продолжаемая через startAfter(lastUserDocId). */
async function fetchUserPage(
  db: FirebaseFirestore.Firestore,
  lastUserDocId: string | null,
  pageSize: number,
): Promise<UserPageRead> {
  let query: FirebaseFirestore.Query = db
    .collection('users')
    .orderBy('__name__')
    .limit(pageSize)
    .select('created_at');

  if (lastUserDocId) {
    const cursorSnap = await db.collection('users').doc(lastUserDocId).get();
    if (cursorSnap.exists) query = query.startAfter(cursorSnap);
  }

  // guard-ok: один query.get() выше вернул всю страницу разом; .map() ниже раскладывает
  // уже полученные в памяти docs, не делает новых чтений Firestore на итерацию.
  const snap = await query.get();
  const rows = snap.docs.map((doc) => parseUserCreatedAt((doc.data() as Record<string, unknown>).created_at));
  const lastDocId = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1].id : null;
  return { rows, lastDocId, pageDocCount: snap.docs.length };
}

/**
 * revenuecat-события в диапазоне времени страницы пользователей — отдельный
 * запрос по createdAt (Timestamp), тоже с .select() и лимитом, чтобы одна
 * "толстая" страница users не тащила за собой безлимитный поток revenue.
 * Лимит выше странично users — событий на пользователя обычно больше одного
 * (покупка + продления + возможный возврат), с запасом на всплеск.
 */
async function fetchRevenueRowsForRange(
  db: FirebaseFirestore.Firestore,
  fromMs: number,
  toMsExclusive: number,
): Promise<RawRevenueRow[]> {
  const snap = await db
    .collection('revenuecat_premium_events')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(fromMs))
    .where('createdAt', '<', admin.firestore.Timestamp.fromMillis(toMsExclusive))
    .select('createdAt', 'eventType', 'periodType')
    .limit(BACKFILL_PAGE_SIZE * 4)
    .get();
  // guard-ok: тот же случай — один .get() выше, .map() ниже раскладывает уже
  // полученные docs в памяти, нет чтения Firestore внутри цикла.
  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return parseRevenueEventRow({ createdAt: data.createdAt, eventType: data.eventType, periodType: data.periodType });
  });
}

/**
 * Обрабатывает ОДНУ страницу и возвращает прогресс. Вызывающий (callable)
 * решает, сколько раз подряд вызвать это в рамках своего таймаута — каждый
 * вызов идемпотентно продолжает с сохранённого курсора.
 */
export async function runBackfillStep(deps: BackfillRunnerDeps): Promise<BackfillRunResult> {
  const pageSize = deps.pageSize ?? BACKFILL_PAGE_SIZE;
  const cursor = await readBackfillCursor(deps.db);
  if (cursor.done) {
    return {
      pagesProcessed: 0,
      usersScanned: 0,
      pointsWritten: 0,
      done: true,
      lastCompletedDayKey: cursor.lastCompletedDayKey,
      cumulativeUsers: cursor.cumulativeUsers,
    };
  }

  const page = await fetchUserPage(deps.db, cursor.lastUserDocId, pageSize);

  if (page.pageDocCount === 0) {
    // Страницы закончились — бэкфилл завершён, курсор помечается финальным.
    await writeBackfillCursor(deps.db, {
      lastUserDocId: cursor.lastUserDocId,
      lastCompletedDayKey: cursor.lastCompletedDayKey,
      cumulativeUsers: cursor.cumulativeUsers,
      done: true,
      nowMs: deps.nowMs,
    });
    return {
      pagesProcessed: 0,
      usersScanned: 0,
      pointsWritten: 0,
      done: true,
      lastCompletedDayKey: cursor.lastCompletedDayKey,
      cumulativeUsers: cursor.cumulativeUsers,
    };
  }

  const validMs = page.rows.map((r) => r.createdAtMs).filter((ms): ms is number => ms !== null);
  const minMs = validMs.length > 0 ? Math.min(...validMs) : deps.nowMs;
  const maxMs = validMs.length > 0 ? Math.max(...validMs) : deps.nowMs;
  const revenueRows = await fetchRevenueRowsForRange(deps.db, minMs, maxMs + 1);

  const built = buildHistoryPointsFromPage({
    userRows: page.rows,
    revenueRows,
    cumulativeUsersBeforePage: cursor.cumulativeUsers,
  });

  const writeResult = await writeHistoryPoints({ db: deps.db, points: built.points, nowMs: deps.nowMs });

  const done = page.pageDocCount < pageSize;
  const lastCompletedDayKey = built.points.length > 0
    ? built.points[built.points.length - 1].dayKey
    : cursor.lastCompletedDayKey;

  await writeBackfillCursor(deps.db, {
    lastUserDocId: page.lastDocId,
    lastCompletedDayKey,
    cumulativeUsers: built.cumulativeUsersAfterPage,
    done,
    nowMs: deps.nowMs,
  });

  return {
    pagesProcessed: 1,
    usersScanned: page.pageDocCount,
    pointsWritten: writeResult.written,
    done,
    lastCompletedDayKey,
    cumulativeUsers: built.cumulativeUsersAfterPage,
  };
}
