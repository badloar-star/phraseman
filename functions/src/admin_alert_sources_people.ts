import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { enqueueAdminAlert, type EnqueueAdminAlertInput } from './admin_alert_outbox';

const REGION = 'us-central1';

type Row = Readonly<Record<string, unknown>>;

function row(value: unknown): Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Row
    : {};
}

function timeMs(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === 'function') {
      const parsed = Number(toMillis.call(value));
      if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
    }
  }
  return Math.floor(fallback);
}

function stringField(data: Row, ...keys: readonly string[]): string {
  for (const key of keys) {
    const value = String(data[key] ?? '').trim();
    if (value) return value;
  }
  return '';
}

function last4(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').slice(-4);
}

export function newUserAlertFromWrite(input: {
  readonly userId: string;
  readonly beforeExists: boolean;
  readonly afterExists: boolean;
  readonly occurredAtMs: number;
  readonly data: Row;
}): EnqueueAdminAlertInput | null {
  if (input.beforeExists || !input.afterExists || !input.userId) return null;
  const platform = stringField(input.data, 'platform', 'deviceOS');
  const language = stringField(input.data, 'language', 'uiLanguage', 'locale');
  const nickname = stringField(input.data, 'username', 'nickname', 'publicName');
  const hasReferral = Boolean(stringField(input.data, 'referral_code', 'referralCode', 'referrerStableId'));
  const provider = stringField(input.data, 'authProvider', 'provider');
  return {
    eventType: 'newUser',
    source: 'user.created',
    sourceId: input.userId,
    occurredAtMs: input.occurredAtMs,
    payload: {
      ...(platform ? { platform } : {}),
      ...(language ? { language } : {}),
      source: hasReferral ? 'referral' : (provider || 'organic'),
      ...(nickname ? { nickname } : {}),
      uidLast4: last4(input.userId),
      route: '#users',
    },
  };
}

export function referralAlertsFromWrite(input: {
  readonly attributionId: string;
  readonly before: Row | null;
  readonly after: Row | null;
  readonly nowMs: number;
}): readonly EnqueueAdminAlertInput[] {
  if (!input.after || !input.attributionId) return Object.freeze([]);
  const events: EnqueueAdminAlertInput[] = [];
  const beforeStatus = String(input.before?.status ?? '');
  const afterStatus = String(input.after.status ?? '');
  const uidLast4 = last4(input.attributionId);
  const basePayload = { uidLast4, route: '#referrals' } as const;

  if (!input.before) {
    events.push({
      eventType: 'referralAttributed', source: 'referral.attributed',
      sourceId: `${input.attributionId}:attributed`,
      occurredAtMs: timeMs(input.after.createdAtMs ?? input.after.createdAt, input.nowMs),
      payload: { ...basePayload, status: 'code_applied' },
    });
  }
  const beforeFirstLaunch = timeMs(input.before?.firstLaunchConfirmedAtMs, 0);
  const afterFirstLaunch = timeMs(input.after.firstLaunchConfirmedAtMs, 0);
  if (afterFirstLaunch > 0 && beforeFirstLaunch <= 0) {
    events.push({
      eventType: 'referralFirstLaunch', source: 'referral.first_launch',
      sourceId: `${input.attributionId}:first-launch`, occurredAtMs: afterFirstLaunch,
      payload: { ...basePayload, status: 'first_launch_confirmed' },
    });
  }
  if (beforeStatus !== 'qualified' && afterStatus === 'qualified') {
    events.push({
      eventType: 'referralQualified', source: 'referral.qualified',
      sourceId: `${input.attributionId}:qualified`,
      occurredAtMs: timeMs(input.after.qualifiedAtMs ?? input.after.qualifiedAt, input.nowMs),
      payload: { ...basePayload, status: 'qualified' },
    });
  }
  if (beforeStatus !== 'rewarded' && afterStatus === 'rewarded') {
    events.push({
      eventType: 'referralRewarded', source: 'referral.rewarded',
      sourceId: `${input.attributionId}:rewarded`,
      occurredAtMs: timeMs(input.after.rewardedAtMs ?? input.after.rewardedAt, input.nowMs),
      payload: { ...basePayload, status: 'rewarded' },
    });
  }
  return Object.freeze(events);
}

function banned(rowValue: Row | null): boolean {
  return rowValue !== null && rowValue.banned !== false;
}

export function banAlertFromWrite(input: {
  readonly userId: string;
  readonly before: Row | null;
  readonly after: Row | null;
  readonly occurredAtMs: number;
}): EnqueueAdminAlertInput | null {
  const beforeBanned = banned(input.before);
  const afterBanned = banned(input.after);
  if (!input.userId || beforeBanned === afterBanned) return null;
  return {
    eventType: 'banChanged', source: 'user.ban',
    sourceId: `${input.userId}:${afterBanned ? 'banned' : 'unbanned'}:${Math.floor(input.occurredAtMs)}`,
    occurredAtMs: input.occurredAtMs,
    payload: { status: afterBanned ? 'banned' : 'unbanned', uidLast4: last4(input.userId), route: '#ban-list' },
  };
}

async function enqueueAll(events: readonly EnqueueAdminAlertInput[]): Promise<void> {
  const db = admin.firestore();
  for (const event of events) await enqueueAdminAlert(db, event);
}

type FirestoreWriteEvent = Parameters<Parameters<typeof onDocumentWritten>[1]>[0];

export async function handleAdminNewUserWrite(event: FirestoreWriteEvent): Promise<void> {
  const after = event.data?.after;
  const occurredAtMs = timeMs(after?.createTime, Date.now());
  const alert = newUserAlertFromWrite({
    userId: String(event.params.userId ?? ''),
    beforeExists: event.data?.before?.exists === true,
    afterExists: after?.exists === true,
    occurredAtMs,
    data: row(after?.data()),
  });
  if (alert) await enqueueAll([alert]);
}

export const adminAlertOnReferralAttributionWrite = onDocumentWritten(
  { document: 'referral_attributions/{attributionId}', region: REGION, retry: true },
  async (event) => {
    await enqueueAll(referralAlertsFromWrite({
      attributionId: String(event.params.attributionId ?? ''),
      before: event.data?.before?.exists ? row(event.data.before.data()) : null,
      after: event.data?.after?.exists ? row(event.data.after.data()) : null,
      nowMs: Date.now(),
    }));
  },
);

export const adminAlertOnBanWrite = onDocumentWritten(
  { document: 'banned_users/{userId}', region: REGION, retry: true },
  async (event) => {
    // CloudEvent time is stable across platform retries; Date.now() would create
    // a second outbox key for the same ban transition.
    const occurredAtMs = timeMs(event.time, Date.now());
    const alert = banAlertFromWrite({
      userId: String(event.params.userId ?? ''),
      before: event.data?.before?.exists ? row(event.data.before.data()) : null,
      after: event.data?.after?.exists ? row(event.data.after.data()) : null,
      occurredAtMs,
    });
    if (alert) await enqueueAll([alert]);
  },
);
