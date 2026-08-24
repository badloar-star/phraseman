export const PHONE_STATE_SCHEMA_VERSION = 1;

export interface PhoneStateSchemaTransaction {
  getFirstAsync<T>(sql: string): Promise<T | null>;
  execAsync(sql: string): Promise<void>;
}

export interface PhoneStateSchemaDatabase extends PhoneStateSchemaTransaction {
  withExclusiveTransactionAsync(
    task: (transaction: PhoneStateSchemaTransaction) => Promise<void>,
  ): Promise<void>;
}

export const PHONE_STATE_SCHEMA_V1 = `
CREATE TABLE operations (
  operation_id TEXT PRIMARY KEY NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  device_sequence INTEGER NOT NULL CHECK(device_sequence > 0),
  domain TEXT NOT NULL,
  kind TEXT NOT NULL,
  entity_id TEXT,
  canonical_operation TEXT NOT NULL,
  fingerprint TEXT NOT NULL CHECK(length(fingerprint) = 64),
  created_at_ms INTEGER NOT NULL CHECK(created_at_ms >= 0),
  UNIQUE(device_id, device_sequence)
);
CREATE INDEX operations_domain_sequence ON operations(domain, device_sequence);

CREATE TABLE external_events (
  external_event_id TEXT PRIMARY KEY NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  server_sequence INTEGER NOT NULL UNIQUE CHECK(server_sequence > 0),
  domain TEXT NOT NULL,
  kind TEXT NOT NULL,
  entity_id TEXT,
  canonical_event TEXT NOT NULL,
  fingerprint TEXT NOT NULL CHECK(length(fingerprint) = 64),
  created_at_ms INTEGER NOT NULL CHECK(created_at_ms >= 0)
);
CREATE INDEX external_events_domain_sequence
  ON external_events(domain, server_sequence);

CREATE TABLE projections (
  domain TEXT PRIMARY KEY NOT NULL,
  reducer_version INTEGER NOT NULL CHECK(reducer_version > 0),
  canonical_state TEXT NOT NULL,
  through_operation_count INTEGER NOT NULL CHECK(through_operation_count >= 0)
);

CREATE TABLE outbox_segments (
  segment_id TEXT PRIMARY KEY NOT NULL,
  device_id TEXT NOT NULL,
  first_sequence INTEGER CHECK(first_sequence IS NULL OR first_sequence > 0),
  last_sequence INTEGER CHECK(last_sequence IS NULL OR last_sequence > 0),
  operation_count INTEGER NOT NULL CHECK(operation_count >= 0),
  canonical_operation_ids TEXT NOT NULL,
  canonical_segment TEXT,
  fingerprint TEXT CHECK(fingerprint IS NULL OR length(fingerprint) = 64),
  byte_length INTEGER NOT NULL CHECK(byte_length >= 0),
  state TEXT NOT NULL CHECK(state IN ('open', 'sealed', 'acknowledged', 'quarantined')),
  created_at_ms INTEGER NOT NULL CHECK(created_at_ms >= 0),
  sealed_at_ms INTEGER CHECK(sealed_at_ms IS NULL OR sealed_at_ms >= 0),
  acknowledged_at_ms INTEGER CHECK(acknowledged_at_ms IS NULL OR acknowledged_at_ms >= 0),
  CHECK(
    (operation_count = 0 AND first_sequence IS NULL AND last_sequence IS NULL)
    OR
    (operation_count > 0 AND first_sequence > 0 AND last_sequence >= first_sequence)
  )
);
CREATE UNIQUE INDEX outbox_segments_single_open_device
  ON outbox_segments(device_id) WHERE state = 'open';
CREATE UNIQUE INDEX outbox_segments_device_range
  ON outbox_segments(device_id, first_sequence, last_sequence)
  WHERE first_sequence IS NOT NULL;

CREATE TABLE remote_cursors (
  cursor_id TEXT PRIMARY KEY NOT NULL,
  cursor_kind TEXT NOT NULL CHECK(cursor_kind IN ('device_operations', 'external_events')),
  source_id TEXT NOT NULL,
  last_sequence INTEGER NOT NULL CHECK(last_sequence >= 0),
  updated_at_ms INTEGER NOT NULL CHECK(updated_at_ms >= 0),
  UNIQUE(cursor_kind, source_id)
);

CREATE TABLE checkpoints (
  checkpoint_id TEXT PRIMARY KEY NOT NULL,
  through_operation_count INTEGER NOT NULL CHECK(through_operation_count >= 0),
  vector_canonical TEXT NOT NULL,
  projections_canonical TEXT NOT NULL,
  fingerprint TEXT NOT NULL CHECK(length(fingerprint) = 64),
  byte_length INTEGER NOT NULL CHECK(byte_length >= 0),
  created_at_ms INTEGER NOT NULL CHECK(created_at_ms >= 0),
  upload_state TEXT NOT NULL CHECK(upload_state IN ('local', 'uploaded'))
);

CREATE TABLE sync_retry (
  retry_key TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL CHECK(attempts >= 0),
  next_retry_at_ms INTEGER NOT NULL CHECK(next_retry_at_ms >= 0),
  lease_owner TEXT,
  lease_expires_at_ms INTEGER CHECK(lease_expires_at_ms IS NULL OR lease_expires_at_ms >= 0),
  last_error_class TEXT,
  updated_at_ms INTEGER NOT NULL CHECK(updated_at_ms >= 0),
  CHECK(
    (lease_owner IS NULL AND lease_expires_at_ms IS NULL)
    OR
    (lease_owner IS NOT NULL AND lease_expires_at_ms IS NOT NULL)
  )
);

CREATE TABLE quarantine (
  quarantine_id TEXT PRIMARY KEY NOT NULL,
  source_kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  canonical_payload TEXT NOT NULL,
  fingerprint TEXT NOT NULL CHECK(length(fingerprint) = 64),
  byte_length INTEGER NOT NULL CHECK(byte_length >= 0),
  created_at_ms INTEGER NOT NULL CHECK(created_at_ms >= 0),
  UNIQUE(source_kind, source_id)
);

CREATE TABLE migrations (
  migration_version INTEGER PRIMARY KEY CHECK(migration_version > 0),
  migration_name TEXT NOT NULL UNIQUE,
  applied_at_ms INTEGER NOT NULL CHECK(applied_at_ms >= 0)
);

CREATE TABLE account_keys (
  key_id TEXT PRIMARY KEY NOT NULL,
  stable_uid_hash TEXT NOT NULL CHECK(length(stable_uid_hash) = 64),
  account_generation INTEGER NOT NULL CHECK(account_generation >= 0),
  secure_store_reference TEXT NOT NULL UNIQUE,
  database_name TEXT NOT NULL UNIQUE,
  created_at_ms INTEGER NOT NULL CHECK(created_at_ms >= 0),
  UNIQUE(stable_uid_hash, account_generation)
);

CREATE TABLE device_state (
  singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
  device_id TEXT NOT NULL,
  next_sequence INTEGER NOT NULL CHECK(next_sequence > 0),
  hybrid_counter INTEGER NOT NULL CHECK(hybrid_counter >= 0)
);

INSERT INTO migrations (
  migration_version,
  migration_name,
  applied_at_ms
) VALUES (
  1,
  'phone_state_schema_v1',
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
);
PRAGMA user_version = 1;
`;

function validateUserVersion(row: unknown): number {
  if (row === null || typeof row !== 'object') {
    throw new Error('phone_state_schema_version_invalid');
  }

  const value = (row as { user_version?: unknown }).user_version;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error('phone_state_schema_version_invalid');
  }

  return value as number;
}

async function readUserVersion(database: PhoneStateSchemaTransaction): Promise<number> {
  const row = await database.getFirstAsync<unknown>('PRAGMA user_version;');
  return validateUserVersion(row);
}

function rejectUnsupportedVersion(version: number): void {
  if (version > PHONE_STATE_SCHEMA_VERSION) {
    throw new Error('phone_state_schema_too_new');
  }
}

export async function migratePhoneStateSchema(
  database: PhoneStateSchemaDatabase,
): Promise<void> {
  const observedVersion = await readUserVersion(database);
  rejectUnsupportedVersion(observedVersion);
  if (observedVersion === PHONE_STATE_SCHEMA_VERSION) {
    return;
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const lockedVersion = await readUserVersion(transaction);
    rejectUnsupportedVersion(lockedVersion);
    if (lockedVersion === PHONE_STATE_SCHEMA_VERSION) {
      return;
    }

    if (lockedVersion !== 0) {
      throw new Error('phone_state_schema_version_invalid');
    }

    await transaction.execAsync(PHONE_STATE_SCHEMA_V1);
  });
}
