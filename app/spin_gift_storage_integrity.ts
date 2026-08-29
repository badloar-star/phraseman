export type StrictStoredValue<T> =
  | Readonly<{ status: 'absent'; value: T }>
  | Readonly<{ status: 'valid'; value: T }>
  | Readonly<{ status: 'malformed' }>;

export function parseStrictStringList(
  raw: string | null,
  isAllowed: (value: string) => boolean,
): StrictStoredValue<string[]> {
  if (raw === null) return { status: 'absent', value: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)
      || !parsed.every((value): value is string => typeof value === 'string' && isAllowed(value))) {
      return { status: 'malformed' };
    }
    return { status: 'valid', value: stableUniqueStrings(parsed) };
  } catch {
    return { status: 'malformed' };
  }
}

export function parseStrictOwnedIdMap<T>(
  raw: string | null,
  isAllowedValue: (value: unknown) => value is T,
): StrictStoredValue<Record<string, T>> {
  if (raw === null) return { status: 'absent', value: {} };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { status: 'malformed' };
    }
    const entries = Object.entries(parsed);
    if (!entries.every(([key, value]) => (
      key.trim().length > 0
      && key.length <= 160
      && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(key)
      && isAllowedValue(value)
    ))) {
      return { status: 'malformed' };
    }
    return { status: 'valid', value: Object.fromEntries(entries) as Record<string, T> };
  } catch {
    return { status: 'malformed' };
  }
}

export type ParsedBonusEnergyStorageValue =
  | Readonly<{ status: 'absent' }>
  | Readonly<{ status: 'valid' | 'expired'; value: { amount: number; capacity: number; expiresAt: number } }>
  | Readonly<{ status: 'malformed' }>;

export function parseBonusEnergyStorageValue(
  raw: string | null,
  nowMs: number,
): ParsedBonusEnergyStorageValue {
  if (raw === null) return { status: 'absent' };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { status: 'malformed' };
    const amount = (parsed as { amount?: unknown }).amount;
    const rawCapacity = (parsed as { capacity?: unknown }).capacity;
    const expiresAt = (parsed as { expiresAt?: unknown }).expiresAt;
    const capacity = rawCapacity === undefined ? amount : rawCapacity;
    if (!Number.isSafeInteger(amount) || (amount as number) < 0
      || !Number.isSafeInteger(capacity) || (capacity as number) <= 0
      || (capacity as number) < (amount as number)
      || !Number.isSafeInteger(expiresAt) || (expiresAt as number) <= 0) {
      return { status: 'malformed' };
    }
    const value = { amount: amount as number, capacity: capacity as number, expiresAt: expiresAt as number };
    return nowMs >= value.expiresAt
      ? { status: 'expired', value }
      : { status: 'valid', value };
  } catch {
    return { status: 'malformed' };
  }
}

export function stableUniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
