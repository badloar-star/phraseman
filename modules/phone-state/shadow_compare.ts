import { canonicalJsonWithLimit } from './canonical';

export type ShadowComparison =
  | Readonly<{ kind: 'equal' }>
  | Readonly<{ kind: 'phone_ahead' | 'legacy_ahead'; delta: number }>
  | Readonly<{
    kind: 'phone_superset' | 'legacy_superset' | 'set_divergent';
    counts: Readonly<{ legacyOnly: number; phoneOnly: number }>;
  }>
  | Readonly<{ kind: 'field_mismatch'; counts: Readonly<{ mismatched: number }> }>
  | Readonly<{ kind: 'invalid'; counts: Readonly<{ invalid: number }> }>;

export type PhoneStateShadowDiagnostic = Readonly<{
  schemaVersion: 'phone-state-shadow-diagnostic.v1';
  domain: string;
  kind: ShadowComparison['kind'];
  counts?: Readonly<Record<string, number>>;
  delta?: number;
}>;

function canonicalToken(value: unknown): string | null {
  try {
    return canonicalJsonWithLimit(value, 64 * 1024);
  } catch {
    return null;
  }
}

function compareSets(legacy: readonly unknown[], phone: readonly unknown[]): ShadowComparison {
  const legacyTokens = new Set<string>();
  const phoneTokens = new Set<string>();
  for (const value of legacy) {
    const token = canonicalToken(value);
    if (token === null) return Object.freeze({ kind: 'invalid', counts: Object.freeze({ invalid: 1 }) });
    legacyTokens.add(token);
  }
  for (const value of phone) {
    const token = canonicalToken(value);
    if (token === null) return Object.freeze({ kind: 'invalid', counts: Object.freeze({ invalid: 1 }) });
    phoneTokens.add(token);
  }
  const legacyOnly = [...legacyTokens].filter((token) => !phoneTokens.has(token)).length;
  const phoneOnly = [...phoneTokens].filter((token) => !legacyTokens.has(token)).length;
  if (legacyOnly === 0 && phoneOnly === 0) return Object.freeze({ kind: 'equal' });
  const counts = Object.freeze({ legacyOnly, phoneOnly });
  if (legacyOnly === 0) return Object.freeze({ kind: 'phone_superset', counts });
  if (phoneOnly === 0) return Object.freeze({ kind: 'legacy_superset', counts });
  return Object.freeze({ kind: 'set_divergent', counts });
}

function plainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

export function compareDomain(
  domain: string,
  input: Readonly<{ legacy: unknown; phone: unknown }>,
): ShadowComparison {
  if (domain === 'xp') {
    const legacy = Number(input.legacy);
    const phone = Number(input.phone);
    if (!Number.isFinite(legacy) || !Number.isFinite(phone)) {
      return Object.freeze({ kind: 'invalid', counts: Object.freeze({ invalid: 1 }) });
    }
    if (legacy === phone) return Object.freeze({ kind: 'equal' });
    return phone > legacy
      ? Object.freeze({ kind: 'phone_ahead', delta: phone - legacy })
      : Object.freeze({ kind: 'legacy_ahead', delta: legacy - phone });
  }

  if (Array.isArray(input.legacy) && Array.isArray(input.phone)) {
    return compareSets(input.legacy, input.phone);
  }
  if (plainRecord(input.legacy) && plainRecord(input.phone)) {
    const keys = new Set([...Object.keys(input.legacy), ...Object.keys(input.phone)]);
    let mismatched = 0;
    for (const key of keys) {
      const legacy = canonicalToken(input.legacy[key]);
      const phone = canonicalToken(input.phone[key]);
      if (legacy === null || phone === null) {
        return Object.freeze({ kind: 'invalid', counts: Object.freeze({ invalid: 1 }) });
      }
      if (legacy !== phone) mismatched += 1;
    }
    return mismatched === 0
      ? Object.freeze({ kind: 'equal' })
      : Object.freeze({ kind: 'field_mismatch', counts: Object.freeze({ mismatched }) });
  }
  const legacy = canonicalToken(input.legacy);
  const phone = canonicalToken(input.phone);
  if (legacy === null || phone === null) {
    return Object.freeze({ kind: 'invalid', counts: Object.freeze({ invalid: 1 }) });
  }
  return legacy === phone
    ? Object.freeze({ kind: 'equal' })
    : Object.freeze({ kind: 'field_mismatch', counts: Object.freeze({ mismatched: 1 }) });
}

export function toShadowDiagnostic(
  domain: string,
  comparison: ShadowComparison,
): PhoneStateShadowDiagnostic {
  const base = {
    schemaVersion: 'phone-state-shadow-diagnostic.v1' as const,
    domain: domain.slice(0, 64),
    kind: comparison.kind,
  };
  if ('delta' in comparison) return Object.freeze({ ...base, delta: comparison.delta });
  if ('counts' in comparison) return Object.freeze({ ...base, counts: comparison.counts });
  return Object.freeze(base);
}
