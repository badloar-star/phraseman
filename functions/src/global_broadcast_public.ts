import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  inspectGlobalBroadcastPublicAuthority,
  PUBLIC_GLOBAL_BROADCAST_FIELDS,
  requireGlobalBroadcastPublicAuthority,
} from './global_broadcast_public_schema';

const REGION = 'us-central1';
export const GLOBAL_BROADCAST_PUBLIC_LIST_CAP = 20;
type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeGlobalBroadcastPublicListLimit(value: unknown): number {
  const requested = Math.floor(Number(value));
  return Number.isFinite(requested) && requested > 0
    ? Math.min(GLOBAL_BROADCAST_PUBLIC_LIST_CAP, requested)
    : GLOBAL_BROADCAST_PUBLIC_LIST_CAP;
}

export function projectGlobalBroadcastPublicRow(idValue: unknown, value: unknown): Readonly<Row> {
  const id = String(idValue ?? '').trim();
  if (!id || id.includes('/') || Buffer.byteLength(id, 'utf8') > 1_500 || !isRow(value)) {
    throw new HttpsError('failed-precondition', 'broadcast_public_projection_invalid');
  }
  const row = requireGlobalBroadcastPublicAuthority(value);
  const projected: Row = { id };
  for (const field of PUBLIC_GLOBAL_BROADCAST_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(row, field)) projected[field] = row[field];
  }
  return Object.freeze(projected);
}

export function buildGlobalBroadcastPublicListResult(
  inputRows: readonly Readonly<{ id: string; data: unknown }>[],
  limitValue: unknown,
  fetchedAtMs: number,
): Readonly<Row> {
  const limit = normalizeGlobalBroadcastPublicListLimit(limitValue);
  const truncated = inputRows.length > limit;
  const page = inputRows.slice(0, limit);
  const items: Row[] = [];
  let droppedCount = 0;
  for (const candidate of page) {
    const inspection = inspectGlobalBroadcastPublicAuthority(candidate.data);
    if (!inspection.valid || !isRow(candidate.data) || candidate.data.active !== true) {
      droppedCount += 1;
      continue;
    }
    items.push(projectGlobalBroadcastPublicRow(candidate.id, candidate.data));
  }
  items.sort((left, right) => {
    const timestampDelta = (Number(right.createdAtMs) || 0) - (Number(left.createdAtMs) || 0);
    return timestampDelta || String(right.id).localeCompare(String(left.id));
  });
  const complete = !truncated && droppedCount === 0;
  return Object.freeze({
    ok: true,
    items,
    truncated,
    fetchedAtMs,
    sourceHealth: Object.freeze({
      state: droppedCount > 0 ? 'error' : truncated ? 'partial' : 'ready',
      complete,
      truncated,
      droppedCount,
    }),
  });
}

export const globalBroadcastListActive = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Auth required');
    const inputLimit = normalizeGlobalBroadcastPublicListLimit(request.data?.limit);
    const snapshot = await admin.firestore().collection('global_broadcast_modals')
      .where('active', '==', true)
      .limit(inputLimit + 1)
      .get();
    return buildGlobalBroadcastPublicListResult(
      snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })),
      inputLimit,
      Date.now(),
    );
  },
);
