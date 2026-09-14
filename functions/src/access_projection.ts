import { isAdminGrantActive, isStorePremiumActive, isVipActive } from './premium_status';

export const ACCESS_PROJECTION_SCHEMA_VERSION = 'access-projection.v1' as const;

export type AccessProjection = Readonly<{
  schemaVersion: typeof ACCESS_PROJECTION_SCHEMA_VERSION;
  premiumActive: boolean;
  premiumPlan: string;
  premiumExpiresAtMs: number;
  vipActive: boolean;
  updatedAtMs: number;
}>;

type SetWriter = Readonly<{
  set(
    reference: FirebaseFirestore.DocumentReference,
    data: FirebaseFirestore.DocumentData,
    options: FirebaseFirestore.SetOptions,
  ): unknown;
}>;

function boundedString(value: unknown, maxLength = 80): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function progressMs(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function buildAccessProjection(
  progress: Readonly<Record<string, unknown>>,
  nowMs: number = Date.now(),
): AccessProjection {
  const safeNow = Number.isSafeInteger(nowMs) && nowMs >= 0 ? nowMs : Date.now();
  const premiumPlan = boundedString(progress.premium_plan).toLowerCase();
  const premiumExpiresAtMs = Math.max(
    progressMs(progress.premium_expiry),
    progressMs(progress.premium_rc_expiry_ms),
  );
  // The listener is allowed to show only a compact server-owned projection,
  // but it must never invent a different entitlement policy. In particular,
  // `premium_active` is a stale compatibility flag, not an authority over a
  // RevenueCat expiry/revoke. Otherwise the app says Plus while AI correctly
  // rejects the same account with dialog_plus_required.
  const premiumActive = isStorePremiumActive(progress, safeNow)
    || isAdminGrantActive(progress, safeNow);
  const vipActive = isVipActive(progress, safeNow);

  return Object.freeze({
    schemaVersion: ACCESS_PROJECTION_SCHEMA_VERSION,
    premiumActive,
    premiumPlan,
    premiumExpiresAtMs,
    vipActive,
    updatedAtMs: safeNow,
  });
}

export function mergeAccessProgress(
  current: Readonly<Record<string, unknown>>,
  patch: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const merged = { ...current };
  for (const [rawKey, value] of Object.entries(patch)) {
    const key = rawKey.startsWith('progress.') ? rawKey.slice('progress.'.length) : rawKey;
    merged[key] = value;
  }
  return merged;
}

export function writeAccessProjection(
  writer: SetWriter,
  userRef: FirebaseFirestore.DocumentReference,
  progress: Readonly<Record<string, unknown>>,
  nowMs: number = Date.now(),
): void {
  writer.set(
    userRef.collection('access_projection').doc('current'),
    buildAccessProjection(progress, nowMs),
    { merge: false },
  );
}

export function writeAccessProjectionFromPatch(
  writer: SetWriter,
  userRef: FirebaseFirestore.DocumentReference,
  currentProgress: Readonly<Record<string, unknown>>,
  patch: Readonly<Record<string, unknown>>,
  nowMs: number = Date.now(),
): void {
  writeAccessProjection(writer, userRef, mergeAccessProgress(currentProgress, patch), nowMs);
}
