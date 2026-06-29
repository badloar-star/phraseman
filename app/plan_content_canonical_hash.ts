// ════════════════════════════════════════════════════════════════════════════
// plan_content_canonical_hash.ts — the ONE canonical serialization used to hash a
// plan-content day. The pack exporter (Node) and the runtime integrity verifier
// (React Native) MUST use the exact same byte string, or a server day that is
// actually correct would fail runtime sha256 verification (or vice versa).
//
// Pure module: no crypto here. It only produces the canonical string; the actual
// sha256 is computed by the caller (Node `crypto.createHash` in the exporter,
// `expo-crypto.digestStringAsync` at runtime).
// ════════════════════════════════════════════════════════════════════════════

/**
 * Recursively sort object keys so serialization is order-independent.
 *
 * MUST stay byte-identical to the pack exporter's normalization
 * (scripts/plan_content_shadow_pack_export.ts), which: drops `undefined`-valued
 * keys and sorts keys with String.localeCompare. Any divergence here would make
 * a correct server day fail runtime sha256 verification.
 */
export function normalizeJsonForHash(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJsonForHash);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizeJsonForHash(entryValue)]),
    );
  }
  return value;
}

/** Canonical JSON string for hashing a plan-content day's `content`. */
export function canonicalPlanContentString(content: unknown): string {
  return JSON.stringify(normalizeJsonForHash(content));
}

/* expo-router route shim: keeps this utility module from warning when discovered as a route. */
export default function __PlanContentCanonicalHashRouteShim() {
  return null;
}
