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

function truthy(value: unknown): boolean {
  return value === true || boundedString(value).toLowerCase() === 'true';
}

function falsy(value: unknown): boolean {
  const normalized = boundedString(value).toLowerCase();
  return value === false || normalized === 'false' || normalized === '0' || normalized === 'no';
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
  const storePlan = ['monthly', 'yearly', 'annual', 'lifetime'].includes(premiumPlan);
  const premiumRevoked = falsy(progress.admin_premium_override) && !storePlan;
  const premiumSentinel = premiumPlan === 'lifetime'
    || truthy(progress.admin_premium_override)
    || truthy(progress.premium_active);
  const premiumActive = Boolean(
    premiumPlan
    && !premiumRevoked
    && (premiumSentinel || premiumExpiresAtMs === 0 || premiumExpiresAtMs > safeNow),
  );
  const vipExpiresAtMs = progressMs(progress.vip_until ?? progress.vip_expiry);
  const vipStartsAtMs = progressMs(progress.vip_from);
  const vipPlan = boundedString(progress.vip_plan).toLowerCase();
  const vipRevoked = falsy(progress.vip_active) || falsy(progress.vip_admin_override);
  const vipGranted = truthy(progress.vip_active) || truthy(progress.vip_admin_override) || Boolean(vipPlan);
  const vipActive = !vipRevoked
    && vipGranted
    && (vipStartsAtMs === 0 || vipStartsAtMs <= safeNow)
    && (vipExpiresAtMs === 0 || vipExpiresAtMs > safeNow);

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
