import rawInventory from '../../config/phone-state-legacy-inventory.v1.json';

export type LegacyScopePolicy = 'portable' | 'device_only' | 'external';
export type LegacyReducerPolicy =
  | 'sum_unique'
  | 'max'
  | 'union'
  | 'date_union'
  | 'field_register'
  | 'or_set'
  | 'composite_economy'
  | 'none';
export type LegacySensitivityPolicy = 'low' | 'personal' | 'sensitive';

export type LegacyInventoryPolicy = Readonly<{
  domain: string;
  scope: LegacyScopePolicy;
  reducer: LegacyReducerPolicy;
  importSource: readonly string[];
  legacyMirror: boolean;
  sensitivity: LegacySensitivityPolicy;
}>;

export type LegacyInventoryRow = LegacyInventoryPolicy & Readonly<{ key: string }>;
export type LegacyInventoryPrefixRule = LegacyInventoryPolicy & Readonly<{ prefix: string }>;
export type PhoneStateLegacyInventory = Readonly<{
  schemaVersion: 'phone-state-legacy-inventory.v1';
  rows: readonly LegacyInventoryRow[];
  prefixRules: readonly LegacyInventoryPrefixRule[];
}>;

const SCOPES = new Set(['portable', 'device_only', 'external']);
const REDUCERS = new Set([
  'sum_unique',
  'max',
  'union',
  'date_union',
  'field_register',
  'or_set',
  'composite_economy',
  'none',
]);
const SENSITIVITIES = new Set(['low', 'personal', 'sensitive']);

function invalidInventory(): never {
  throw new Error('phone_state_legacy_inventory_invalid');
}

function validatePolicy(value: unknown, owner: 'key' | 'prefix'): LegacyInventoryPolicy & Record<typeof owner, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalidInventory();
  const row = value as Record<string, unknown>;
  if (
    typeof row[owner] !== 'string'
    || row[owner].length < 3
    || typeof row.domain !== 'string'
    || row.domain.length < 1
    || !SCOPES.has(String(row.scope))
    || !REDUCERS.has(String(row.reducer))
    || !Array.isArray(row.importSource)
    || !row.importSource.every((source) => typeof source === 'string')
    || typeof row.legacyMirror !== 'boolean'
    || !SENSITIVITIES.has(String(row.sensitivity))
  ) {
    invalidInventory();
  }
  return Object.freeze({
    [owner]: row[owner],
    domain: row.domain,
    scope: row.scope,
    reducer: row.reducer,
    importSource: Object.freeze([...row.importSource]),
    legacyMirror: row.legacyMirror,
    sensitivity: row.sensitivity,
  }) as LegacyInventoryPolicy & Record<typeof owner, string>;
}

function loadInventory(value: unknown): PhoneStateLegacyInventory {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalidInventory();
  const candidate = value as Record<string, unknown>;
  if (
    candidate.schemaVersion !== 'phone-state-legacy-inventory.v1'
    || !Array.isArray(candidate.rows)
    || !Array.isArray(candidate.prefixRules)
  ) {
    invalidInventory();
  }
  const rows = candidate.rows.map((row) => validatePolicy(row, 'key') as LegacyInventoryRow);
  const prefixRules = candidate.prefixRules.map(
    (row) => validatePolicy(row, 'prefix') as LegacyInventoryPrefixRule,
  );
  const owners = [
    ...rows.map((row) => `key:${row.key}`),
    ...prefixRules.map((row) => `prefix:${row.prefix}`),
  ];
  if (new Set(owners).size !== owners.length) invalidInventory();
  return Object.freeze({
    schemaVersion: 'phone-state-legacy-inventory.v1',
    rows: Object.freeze(rows),
    prefixRules: Object.freeze(prefixRules),
  });
}

export const legacyInventory = loadInventory(rawInventory);

export const portableLegacyRows = Object.freeze(
  legacyInventory.rows.filter((row) => row.scope === 'portable'),
);

export const portableLegacyJournalPrefixRules = Object.freeze(
  legacyInventory.prefixRules.filter((row) => row.scope === 'portable'),
);

export function legacyPolicyForKey(key: string): LegacyInventoryPolicy | null {
  const exact = legacyInventory.rows.find((row) => row.key === key);
  if (exact) return exact;
  const matches = legacyInventory.prefixRules.filter((row) => key.startsWith(row.prefix));
  return matches.length === 1 ? matches[0] : null;
}
