import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission } from './admin/permissions';
import { hasAdminRole } from './admin/roles';
import { ENFORCE_APP_CHECK_ADMIN } from './callable_options';
import {
  FEEDBACK_ENTRIES_COLLECTION,
  FEEDBACK_KINDS,
  sanitizeFeedbackRating,
} from './feedback_entries';
import {
  VOICE_FEEDBACK_COLLECTION,
  sanitizeVoiceFeedbackRating,
} from './max_voice_feedback';
import {
  aggregateAdminFeedback,
  parseAdminFeedbackFilters,
  parseAdminFeedbackPeriod,
} from './feedback_admin_logic';

const FEEDBACK_STATS_KINDS = ['max_call', ...FEEDBACK_KINDS] as const;
type FeedbackStatsKind = (typeof FEEDBACK_STATS_KINDS)[number];

export const FEEDBACK_STATS_BATCH = 500;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function parseFeedbackStatsKind(value: unknown): FeedbackStatsKind {
  if (typeof value !== 'string'
    || !(FEEDBACK_STATS_KINDS as readonly string[]).includes(value)) {
    throw new HttpsError('invalid-argument', 'feedback_kind_invalid');
  }
  return value as FeedbackStatsKind;
}

export function parseFeedbackStatsPeriod(value: unknown): number {
  try {
    return parseAdminFeedbackPeriod(value);
  } catch {
    throw new HttpsError('invalid-argument', 'feedback_period_invalid');
  }
}

export async function loadAllFeedbackAggregateRows(
  db: FirebaseFirestore.Firestore,
  kind: FeedbackStatsKind,
  sinceMs: number,
): Promise<Array<{ rating: number; message: string }>> {
  const collectionName = kind === 'max_call'
    ? VOICE_FEEDBACK_COLLECTION
    : FEEDBACK_ENTRIES_COLLECTION;
  let baseQuery: FirebaseFirestore.Query = db.collection(collectionName);
  if (kind !== 'max_call') baseQuery = baseQuery.where('kind', '==', kind);
  if (sinceMs > 0) baseQuery = baseQuery.where('createdAtMs', '>=', sinceMs);
  baseQuery = baseQuery
    .orderBy('createdAtMs', 'desc')
    .select('rating', 'message', 'createdAtMs');

  const rows: Array<{ rating: number; message: string }> = [];
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  for (;;) {
    let pageQuery = baseQuery.limit(FEEDBACK_STATS_BATCH);
    if (cursor) pageQuery = pageQuery.startAfter(cursor);
    const snap = await pageQuery.get();
    snap.docs.forEach((doc) => {
      const data = doc.data() || {};
      const rating = kind === 'max_call'
        ? sanitizeVoiceFeedbackRating(data.rating)
        : sanitizeFeedbackRating(data.rating);
      rows.push({ rating, message: String(data.message ?? '') });
    });
    if (snap.docs.length < FEEDBACK_STATS_BATCH) break;
    cursor = snap.docs[snap.docs.length - 1] || null;
  }

  return rows;
}

export const adminGetFeedbackStats = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: ENFORCE_APP_CHECK_ADMIN,
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    const role = request.auth?.token?.adminRole;
    if (request.auth?.token?.admin !== true
      || !hasAdminRole(role)
      || !hasPermission(role, 'reports.read')) {
      throw new HttpsError('permission-denied', 'Admin only');
    }

    const data = asRecord(request.data);
    const kind = parseFeedbackStatsKind(data.kind);
    const periodDays = parseFeedbackStatsPeriod(data.periodDays);
    let commentMode;
    try {
      ({ commentMode } = parseAdminFeedbackFilters({ commentMode: data.commentMode }));
    } catch {
      throw new HttpsError('invalid-argument', 'feedback_filter_invalid');
    }

    const sinceMs = periodDays > 0 ? Date.now() - periodDays * 86_400_000 : 0;
    const rows = await loadAllFeedbackAggregateRows(admin.firestore(), kind, sinceMs);
    return {
      ok: true,
      kind,
      periodDays,
      commentMode,
      ...aggregateAdminFeedback(rows, commentMode),
    };
  },
);
