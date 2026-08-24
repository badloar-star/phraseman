import { legacyInventory, type LegacyInventoryRow } from './legacy_inventory';

export type LegacyMirrorStorage = Readonly<{
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}>;

export type LegacyPersonalProgressScalarKey = 'user_total_xp' | 'streak_count';

const activeMirrorStorages = new WeakSet<object>();

export function isLegacyMirrorWriteActive(storage: LegacyMirrorStorage): boolean {
  return activeMirrorStorages.has(storage);
}

function projectionField(row: LegacyInventoryRow): string {
  if (row.key === 'user_total_xp') return 'total';
  if (row.key === 'unlocked_lessons') return 'unlocked';
  return row.key;
}

function projectedValue(projection: Readonly<Record<string, unknown>>, row: LegacyInventoryRow): unknown {
  const field = projectionField(row);
  if (Object.prototype.hasOwnProperty.call(projection, field)) return projection[field];
  const fields = projection.fields;
  if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
    return (fields as Readonly<Record<string, unknown>>)[field];
  }
  return undefined;
}

function parseStored(raw: string | null): unknown {
  if (raw === null) return null;
  try { return JSON.parse(raw) as unknown; } catch { return raw; }
}

function numberOrNull(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function unionValues(left: unknown, right: unknown): readonly unknown[] {
  const result = new Map<string, unknown>();
  for (const raw of [left, right]) {
    const values = Array.isArray(raw) ? raw : raw === null || raw === undefined ? [] : [raw];
    for (const value of values) {
      try { result.set(JSON.stringify(value), value); } catch { /* malformed legacy value is ignored */ }
    }
  }
  return Object.freeze([...result.entries()]
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([, value]) => value));
}

function serialize(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return JSON.stringify(value);
}

function mirrorValue(row: LegacyInventoryRow, currentRaw: string | null, phone: unknown): unknown {
  const current = parseStored(currentRaw);
  switch (row.reducer) {
    case 'max':
    case 'sum_unique': {
      const currentNumber = numberOrNull(current);
      const phoneNumber = numberOrNull(phone);
      if (phoneNumber === null) return current;
      return currentNumber === null ? phoneNumber : Math.max(currentNumber, phoneNumber);
    }
    case 'union':
    case 'date_union':
    case 'or_set':
      return unionValues(current, phone);
    case 'field_register':
    case 'composite_economy':
      return phone;
    case 'none':
      return current;
  }
}

export async function mirrorProjection(
  storage: LegacyMirrorStorage,
  domain: string,
  projection: Readonly<Record<string, unknown>>,
): Promise<Readonly<{ writes: number }>> {
  const rows = legacyInventory.rows.filter((row) => row.domain === domain && row.legacyMirror);
  let writes = 0;
  activeMirrorStorages.add(storage);
  try {
    for (const row of rows) {
      const phone = projectedValue(projection, row);
      if (phone === undefined) continue;
      const currentRaw = await storage.getItem(row.key);
      const next = mirrorValue(row, currentRaw, phone);
      const nextRaw = serialize(next);
      if (nextRaw === currentRaw) continue;
      await storage.setItem(row.key, nextRaw);
      writes += 1;
    }
  } finally {
    activeMirrorStorages.delete(storage);
  }
  return Object.freeze({ writes });
}

export async function persistLegacyPersonalProgressScalar(
  storage: LegacyMirrorStorage,
  key: LegacyPersonalProgressScalarKey,
  value: number,
): Promise<void> {
  if (
    (key !== 'user_total_xp' && key !== 'streak_count')
    || !Number.isSafeInteger(value)
    || value < 0
  ) {
    throw new Error('phone_state_legacy_progress_scalar_invalid');
  }
  activeMirrorStorages.add(storage);
  try {
    await storage.setItem(key, String(value));
  } finally {
    activeMirrorStorages.delete(storage);
  }
}
