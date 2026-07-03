import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

export type EmailContactSource = 'app' | 'site';

export interface UpsertEmailContactInput {
  email: unknown;
  source: EmailContactSource;
  countSignal?: boolean;
  provider?: unknown;
  providerUid?: unknown;
  stableId?: unknown;
  displayName?: unknown;
  devicePlatform?: unknown;
  lastSignInAt?: unknown;
  orderId?: unknown;
  plan?: unknown;
  amountCents?: unknown;
  currency?: unknown;
}

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function normalizeEmailContactEmail(value: unknown): string | null {
  const email = String(value ?? '').trim().toLowerCase().slice(0, 320);
  return EMAIL_RE.test(email) ? email : null;
}

export function isApplePrivateRelayEmail(value: unknown): boolean {
  const email = normalizeEmailContactEmail(value);
  return !!email && email.endsWith('@privaterelay.appleid.com');
}

export function emailContactDocId(email: string): string {
  return `email_${createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 48)}`;
}

function cleanShortText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function millisFromUnknown(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  if (value && typeof value === 'object') {
    const candidate = value as { toMillis?: () => number; toDate?: () => Date; seconds?: number };
    if (typeof candidate.toMillis === 'function') {
      try {
        const ms = candidate.toMillis();
        return Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : 0;
      } catch {
        return 0;
      }
    }
    if (typeof candidate.toDate === 'function') {
      try {
        const ms = candidate.toDate().getTime();
        return Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : 0;
      } catch {
        return 0;
      }
    }
    if (typeof candidate.seconds === 'number' && Number.isFinite(candidate.seconds) && candidate.seconds > 0) {
      return Math.floor(candidate.seconds * 1000);
    }
  }
  return 0;
}

function amountCentsFromUnknown(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.floor(amount) : 0;
}

export async function upsertEmailContact(
  db: FirebaseFirestore.Firestore,
  input: UpsertEmailContactInput,
): Promise<boolean> {
  const email = normalizeEmailContactEmail(input.email);
  if (!email) return false;
  if (input.source === 'app' && isApplePrivateRelayEmail(email)) return false;

  const ref = db.collection('email_contacts').doc(emailContactDocId(email));
  const snap = await ref.get().catch(() => null);
  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    email,
    lowerEmail: email,
    sources: FieldValue.arrayUnion(input.source),
    lastSource: input.source,
    updatedAt: FieldValue.serverTimestamp(),
    updatedAtIso: nowIso,
    ...(!snap?.exists ? { createdAt: FieldValue.serverTimestamp(), createdAtIso: nowIso } : {}),
  };

  if (input.source === 'app') {
    const provider = cleanShortText(input.provider, 32) || 'app';
    const providerUid = cleanShortText(input.providerUid, 160);
    const stableId = cleanShortText(input.stableId, 160);
    const displayName = cleanShortText(input.displayName, 160);
    const devicePlatform = cleanShortText(input.devicePlatform, 20);
    const lastSignInAt = millisFromUnknown(input.lastSignInAt);
    Object.assign(patch, {
      appLastProvider: provider,
      appLastProviderUid: providerUid || null,
      appLastStableId: stableId || null,
      appLastDisplayName: displayName || null,
      appLastDevicePlatform: devicePlatform || null,
      ...(providerUid ? { appProviderUids: FieldValue.arrayUnion(providerUid) } : {}),
      ...(stableId ? { appStableIds: FieldValue.arrayUnion(stableId) } : {}),
      ...(lastSignInAt ? {
        appLastSignInAt: lastSignInAt,
        appLastSignInAtIso: new Date(lastSignInAt).toISOString(),
      } : {}),
      ...(input.countSignal === false ? {} : { appSeenCount: FieldValue.increment(1) }),
    });
  } else {
    const orderId = cleanShortText(input.orderId, 120);
    Object.assign(patch, {
      siteLastProvider: cleanShortText(input.provider, 32) || 'site',
      siteLastOrderId: orderId || null,
      siteLastPlan: cleanShortText(input.plan, 32) || null,
      siteLastAmountCents: amountCentsFromUnknown(input.amountCents),
      siteLastCurrency: cleanShortText(input.currency, 8).toLowerCase() || null,
      ...(orderId ? { siteOrderIds: FieldValue.arrayUnion(orderId) } : {}),
      ...(input.countSignal === false ? {} : { siteSeenCount: FieldValue.increment(1) }),
    });
  }

  await ref.set(patch, { merge: true });
  return true;
}
