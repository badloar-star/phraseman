import type { BusinessTier } from './business_tier';
import type { BusinessTierFinancialCoverage, BusinessTierHistoryPoint } from './business_tier_history';

/**
 * Тонкая Firestore-обвязка над историей тира бизнеса.
 *
 * зачем: один документ на день в business_tier_history/{day} — новая
 * коллекция, не трогает существующие agg-таблицы. Разовый бэкфилл пишет
 * задним числом, ежедневный крон ДОПИСЫВАЕТ ровно одну новую точку —
 * никогда не пересчитывает всё заново (Firebase-экономия).
 */

export const BUSINESS_TIER_HISTORY_COLLECTION = 'business_tier_history';
export const BUSINESS_TIER_BACKFILL_STATE_DOC = 'business_tier_backfill_state/singleton';
export const MAX_HISTORY_POINTS_PER_READ = 3_650; // ~10 лет ежедневных точек — щедрый, но конечный потолок чтения

export interface HistoryPointDoc {
  readonly cumulativeUsers: number;
  readonly newUsers: number;
  readonly newPaying: number;
  readonly renewals: number;
  readonly refunds: number;
  readonly revenueProxy: number;
  /** Честные деньги дня — см. business_tier_history.ts. */
  readonly grossUsdMicros: number;
  readonly mrrEquivalentProceedsUsdMicros: number;
  readonly dayMoneyCoverage: BusinessTierFinancialCoverage;
  /** null у дней бэкфилла — ретроактивно активных не посчитать. */
  readonly activeUsers: number | null;
  readonly writtenAtMs: number;
}

/**
 * зачем перечислять поля явно, а не спредить точку: документ — это контракт
 * хранилища, и он должен ломаться на тайпчеке, когда в точку добавляют поле,
 * а сюда забыли. Ровно так и потерялись деньги при первом слиянии: точка их
 * уже считала, а toDoc молча выбрасывал.
 */
function toDoc(point: BusinessTierHistoryPoint, nowMs: number): HistoryPointDoc {
  return Object.freeze({
    cumulativeUsers: point.cumulativeUsers,
    newUsers: point.newUsers,
    newPaying: point.newPaying,
    renewals: point.renewals,
    refunds: point.refunds,
    revenueProxy: point.revenueProxy,
    grossUsdMicros: point.grossUsdMicros,
    mrrEquivalentProceedsUsdMicros: point.mrrEquivalentProceedsUsdMicros,
    dayMoneyCoverage: point.dayMoneyCoverage,
    activeUsers: point.activeUsers,
    writtenAtMs: nowMs,
  });
}

export interface WriteHistoryPointsInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly points: readonly BusinessTierHistoryPoint[];
  readonly nowMs: number;
}

/**
 * Пишет точки истории идемпотентно (merge по dayKey-документу) батчами
 * по 400 (запас от лимита Firestore в 500 операций на батч). Повторный
 * вызов с теми же днями перезаписывает те же документы — безопасно
 * продолжать бэкфилл после обрыва без дублей.
 */
export async function writeHistoryPoints(input: WriteHistoryPointsInput): Promise<{ written: number }> {
  const { db, points, nowMs } = input;
  if (points.length === 0) return { written: 0 };
  const collection = db.collection(BUSINESS_TIER_HISTORY_COLLECTION);
  const CHUNK = 400;
  let written = 0;
  for (let i = 0; i < points.length; i += CHUNK) {
    const chunk = points.slice(i, i + CHUNK);
    const batch = db.batch();
    for (const point of chunk) {
      batch.set(collection.doc(point.dayKey), toDoc(point, nowMs), { merge: true });
    }
    await batch.commit();
    written += chunk.length;
  }
  return { written };
}

export interface ReadRecentHistoryInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly limit: number;
}

export interface RecentHistoryPoint extends HistoryPointDoc {
  readonly dayKey: string;
}

/** Читает последние N точек истории по возрастанию дня — для графика и панели. */
export async function readRecentHistory(input: ReadRecentHistoryInput): Promise<readonly RecentHistoryPoint[]> {
  const limit = Math.max(1, Math.min(MAX_HISTORY_POINTS_PER_READ, Math.trunc(input.limit) || 1));
  const snapshot = await input.db
    .collection(BUSINESS_TIER_HISTORY_COLLECTION)
    .orderBy('__name__', 'desc')
    .limit(limit)
    .get();
  const docs = snapshot.docs
    .map((doc) => ({ dayKey: doc.id, ...(doc.data() as HistoryPointDoc) }))
    .reverse(); // снова по возрастанию дня для графика
  return Object.freeze(docs);
}

export interface BackfillCursorState {
  /** id последнего прочитанного документа users (для startAfter — точная постраничная пагинация по __name__). */
  readonly lastUserDocId: string | null;
  /** Самый свежий день, для которого уже посчитана и записана точка истории — для честного отчёта прогресса. */
  readonly lastCompletedDayKey: string | null;
  /** Бегущий тотал зарегистрированных пользователей, перенесённый со страницы на страницу. */
  readonly cumulativeUsers: number;
  readonly done: boolean;
  readonly updatedAtMs: number;
}

const EMPTY_CURSOR: BackfillCursorState = Object.freeze({
  lastUserDocId: null,
  lastCompletedDayKey: null,
  cumulativeUsers: 0,
  done: false,
  updatedAtMs: 0,
});

/**
 * Курсор продолжаемого бэкфилла. Хранится в отдельном документе-синглтоне,
 * не в самой истории — таймаут функции (~9 мин) может оборвать один вызов
 * посередине; следующий вызов того же callable продолжает с курсора.
 */
export async function readBackfillCursor(db: FirebaseFirestore.Firestore): Promise<BackfillCursorState> {
  const snap = await db.doc(BUSINESS_TIER_BACKFILL_STATE_DOC).get();
  if (!snap.exists) return EMPTY_CURSOR;
  const data = snap.data() as Partial<BackfillCursorState> | undefined;
  return Object.freeze({
    lastUserDocId: typeof data?.lastUserDocId === 'string' ? data.lastUserDocId : null,
    lastCompletedDayKey: typeof data?.lastCompletedDayKey === 'string' ? data.lastCompletedDayKey : null,
    cumulativeUsers: typeof data?.cumulativeUsers === 'number' && Number.isFinite(data.cumulativeUsers) ? data.cumulativeUsers : 0,
    done: data?.done === true,
    updatedAtMs: typeof data?.updatedAtMs === 'number' ? data.updatedAtMs : 0,
  });
}

export async function writeBackfillCursor(
  db: FirebaseFirestore.Firestore,
  state: {
    readonly lastUserDocId: string | null;
    readonly lastCompletedDayKey: string | null;
    readonly cumulativeUsers: number;
    readonly done: boolean;
    readonly nowMs: number;
  },
): Promise<void> {
  await db.doc(BUSINESS_TIER_BACKFILL_STATE_DOC).set(
    {
      lastUserDocId: state.lastUserDocId,
      lastCompletedDayKey: state.lastCompletedDayKey,
      cumulativeUsers: state.cumulativeUsers,
      done: state.done,
      updatedAtMs: state.nowMs,
    },
    { merge: true },
  );
}

// ── Достигнутый пик тира (храповик) ────────────────────────────────────────
// зачем отдельный singleton-документ: владелец 2026-08-02 решил, что
// показанный тир не понижается от одной плохой недели. Без персистентности
// пик забывался бы между вызовами панели, и храповик не работал бы вовсе —
// тир падал бы ровно так, как владелец просил не делать.

export const BUSINESS_TIER_PEAK_DOC = 'business_tier_peak/singleton';

const KNOWN_TIERS: readonly BusinessTier[] = [
  'pre_seed', 'seed', 'early_growth', 'growth', 'scale_up', 'mature',
];

function isKnownTier(value: unknown): value is BusinessTier {
  return typeof value === 'string' && (KNOWN_TIERS as readonly string[]).includes(value);
}

/** null, если пика ещё нет или в базе лежит незнакомое значение (битую запись не принимаем на веру). */
export async function readPeakTier(db: FirebaseFirestore.Firestore): Promise<BusinessTier | null> {
  const snap = await db.doc(BUSINESS_TIER_PEAK_DOC).get();
  if (!snap.exists) return null;
  const stored = (snap.data() as { peakTier?: unknown } | undefined)?.peakTier;
  return isKnownTier(stored) ? stored : null;
}

/**
 * Поднимает пик только вверх. Запись более низкого тира намеренно
 * игнорируется — иначе храповик превратился бы в обычное текущее значение.
 */
export async function writePeakTier(
  db: FirebaseFirestore.Firestore,
  tier: BusinessTier,
  nowMs: number,
): Promise<void> {
  if (!isKnownTier(tier)) return;
  const existing = await readPeakTier(db);
  if (existing && KNOWN_TIERS.indexOf(existing) >= KNOWN_TIERS.indexOf(tier)) return;
  await db.doc(BUSINESS_TIER_PEAK_DOC).set({ peakTier: tier, updatedAtMs: nowMs }, { merge: true });
}
