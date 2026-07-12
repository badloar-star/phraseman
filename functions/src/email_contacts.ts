import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';

export type EmailContactSource = 'app' | 'site';
export type EmailBulkEligibility = 'eligible' | 'ineligible' | 'unknown';

export interface EmailContactProjection {
  email: string;
  sources: EmailContactSource[];
  displayName?: string;
  contextLabel?: string;
  lastSeenAtMs: number;
  bulkEligibility: EmailBulkEligibility;
  eligibilitySource: string;
  eligibilityUpdatedAtMs: number;
}

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
  contextLabel?: unknown;
  signalAtMs?: unknown;
  bulkEligibility?: EmailBulkEligibility;
  eligibilitySource?: unknown;
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

export function resolveEmailBulkEligibility(input: Pick<UpsertEmailContactInput, 'source' | 'provider' | 'bulkEligibility' | 'eligibilitySource'>): {
  bulkEligibility: EmailBulkEligibility;
  eligibilitySource: string;
} {
  const explicit = input.bulkEligibility;
  const explicitSource = cleanShortText(input.eligibilitySource, 80);
  if (explicit && ['eligible', 'ineligible', 'unknown'].includes(explicit)) {
    return { bulkEligibility: explicit, eligibilitySource: explicitSource || 'explicit_server_policy' };
  }
  const provider = cleanShortText(input.provider, 32).toLowerCase();
  if (provider === 'site_form') {
    return { bulkEligibility: 'ineligible', eligibilitySource: 'support_contact_only' };
  }
  if (provider === 'quiz_lead') {
    return { bulkEligibility: 'eligible', eligibilitySource: 'quiz_lead_product_email' };
  }
  if (input.source === 'app') {
    return { bulkEligibility: 'unknown', eligibilitySource: 'app_identity_unverified' };
  }
  return { bulkEligibility: 'unknown', eligibilitySource: 'site_order_unverified' };
}

function eligibilityRank(value: EmailBulkEligibility): number {
  if (value === 'eligible') return 3;
  if (value === 'ineligible') return 2;
  return 1;
}

export function mergeEmailContactProjection(
  existingValue: Record<string, unknown> | undefined,
  input: UpsertEmailContactInput,
  nowMs = Date.now(),
): EmailContactProjection {
  const existing = existingValue ?? {};
  const email = normalizeEmailContactEmail(input.email) || normalizeEmailContactEmail(existing.email) || '';
  const existingSources = Array.isArray(existing.sources)
    ? existing.sources.filter((source): source is EmailContactSource => source === 'app' || source === 'site')
    : [];
  const sources = [...new Set([...existingSources, input.source])].sort() as EmailContactSource[];
  const signalAtMs = millisFromUnknown(input.signalAtMs)
    || millisFromUnknown(input.lastSignInAt)
    || nowMs;
  const previousSeenAtMs = millisFromUnknown(existing.lastSeenAtMs);
  const useIncomingContext = signalAtMs >= previousSeenAtMs;
  const incomingEligibility = resolveEmailBulkEligibility(input);
  const previousEligibility = ['eligible', 'ineligible', 'unknown'].includes(String(existing.bulkEligibility))
    ? String(existing.bulkEligibility) as EmailBulkEligibility
    : 'unknown';
  const previousEligibilityAtMs = millisFromUnknown(existing.eligibilityUpdatedAtMs);
  const useIncomingEligibility = eligibilityRank(incomingEligibility.bulkEligibility) > eligibilityRank(previousEligibility)
    || (eligibilityRank(incomingEligibility.bulkEligibility) === eligibilityRank(previousEligibility)
      && signalAtMs >= previousEligibilityAtMs);
  const displayName = cleanShortText(useIncomingContext ? input.displayName : existing.displayName, 160);
  const incomingContext = cleanShortText(input.contextLabel, 200);
  const contextLabel = cleanShortText(useIncomingContext ? (incomingContext || existing.contextLabel) : existing.contextLabel, 200);
  return {
    email,
    sources,
    ...(displayName ? { displayName } : {}),
    ...(contextLabel ? { contextLabel } : {}),
    lastSeenAtMs: Math.max(previousSeenAtMs, signalAtMs),
    bulkEligibility: useIncomingEligibility ? incomingEligibility.bulkEligibility : previousEligibility,
    eligibilitySource: useIncomingEligibility
      ? incomingEligibility.eligibilitySource
      : cleanShortText(existing.eligibilitySource, 80) || 'legacy_unknown',
    eligibilityUpdatedAtMs: useIncomingEligibility ? signalAtMs : previousEligibilityAtMs,
  };
}

export function projectEmailContactForAdmin(
  id: string,
  value: Record<string, unknown>,
  suppressedEmails: ReadonlySet<string>,
): Omit<EmailContactProjection, 'eligibilityUpdatedAtMs'> & { id: string; suppressed: boolean } {
  const email = normalizeEmailContactEmail(value.email ?? value.lowerEmail) || '';
  const sources = Array.isArray(value.sources)
    ? value.sources.filter((source): source is EmailContactSource => source === 'app' || source === 'site').sort()
    : [];
  const bulkEligibility = ['eligible', 'ineligible', 'unknown'].includes(String(value.bulkEligibility))
    ? String(value.bulkEligibility) as EmailBulkEligibility
    : 'unknown';
  const displayName = cleanShortText(value.displayName ?? value.appLastDisplayName, 160);
  const contextLabel = cleanShortText(value.contextLabel, 200);
  return {
    id: cleanShortText(id, 160),
    email,
    sources,
    ...(displayName ? { displayName } : {}),
    ...(contextLabel ? { contextLabel } : {}),
    lastSeenAtMs: millisFromUnknown(value.lastSeenAtMs ?? value.updatedAt ?? value.updatedAtIso),
    bulkEligibility,
    eligibilitySource: cleanShortText(value.eligibilitySource, 80) || 'legacy_unknown',
    suppressed: suppressedEmails.has(email),
  };
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
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const existing = snap.exists ? (snap.data() ?? {}) : {};
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const signalAtMs = millisFromUnknown(input.signalAtMs) || millisFromUnknown(input.lastSignInAt) || nowMs;
    const previousSeenAtMs = millisFromUnknown(existing.lastSeenAtMs);
    const projection = mergeEmailContactProjection(existing, { ...input, email }, nowMs);
    const patch: Record<string, unknown> = {
      ...projection,
      lowerEmail: email,
      lastSource: signalAtMs >= previousSeenAtMs ? input.source : existing.lastSource,
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtIso: nowIso,
      ...(!snap.exists ? { createdAt: FieldValue.serverTimestamp(), createdAtIso: nowIso } : {}),
    };

    if (input.source === 'app') {
      const provider = cleanShortText(input.provider, 32) || 'app';
      const providerUid = cleanShortText(input.providerUid, 160);
      const stableId = cleanShortText(input.stableId, 160);
      const displayName = cleanShortText(input.displayName, 160);
      const devicePlatform = cleanShortText(input.devicePlatform, 20);
      const lastSignInAt = millisFromUnknown(input.lastSignInAt);
      const previousAppSignalAtMs = millisFromUnknown(existing.appLastSignalAtMs) || millisFromUnknown(existing.appLastSignInAt);
      const useIncomingApp = signalAtMs >= previousAppSignalAtMs;
      Object.assign(patch, {
        ...(providerUid ? { appProviderUids: FieldValue.arrayUnion(providerUid) } : {}),
        ...(stableId ? { appStableIds: FieldValue.arrayUnion(stableId) } : {}),
        ...(input.countSignal === false ? {} : { appSeenCount: FieldValue.increment(1) }),
        ...(useIncomingApp ? {
          appLastSignalAtMs: signalAtMs,
          appLastProvider: provider,
          appLastProviderUid: providerUid || null,
          appLastStableId: stableId || null,
          appLastDisplayName: displayName || null,
          appLastDevicePlatform: devicePlatform || null,
          ...(lastSignInAt ? {
            appLastSignInAt: lastSignInAt,
            appLastSignInAtIso: new Date(lastSignInAt).toISOString(),
          } : {}),
        } : {}),
      });
    } else {
      const orderId = cleanShortText(input.orderId, 120);
      const previousSiteSignalAtMs = millisFromUnknown(existing.siteLastSignalAtMs);
      const useIncomingSite = signalAtMs >= previousSiteSignalAtMs;
      Object.assign(patch, {
        ...(orderId ? { siteOrderIds: FieldValue.arrayUnion(orderId) } : {}),
        ...(input.countSignal === false ? {} : { siteSeenCount: FieldValue.increment(1) }),
        ...(useIncomingSite ? {
          siteLastSignalAtMs: signalAtMs,
          siteLastProvider: cleanShortText(input.provider, 32) || 'site',
          siteLastOrderId: orderId || null,
          siteLastPlan: cleanShortText(input.plan, 32) || null,
          siteLastAmountCents: amountCentsFromUnknown(input.amountCents),
          siteLastCurrency: cleanShortText(input.currency, 8).toLowerCase() || null,
        } : {}),
      });
    }

    tx.set(ref, patch, { merge: true });
  });
  return true;
}
