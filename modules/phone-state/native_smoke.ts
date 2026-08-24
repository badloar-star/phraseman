import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { openPhoneStateDatabase } from './database';

const SMOKE_SCOPE = {
  stableUid: 'phone-state-native-smoke-v1',
  accountGeneration: 1,
} as const;
const SMOKE_TABLE = 'phone_state_native_smoke_v1';
const MARKER_MISSING_ERROR = 'phone_state_native_smoke_marker_missing';
const RESTART_REQUIRED_ERROR = 'phone_state_native_smoke_restart_required';
const OPEN_FAILED_ERROR = 'phone_state_native_smoke_open_failed';
const SCHEMA_FAILED_ERROR = 'phone_state_native_smoke_schema_failed';
const MARKER_WRITE_FAILED_ERROR = 'phone_state_native_smoke_marker_write_failed';
const MARKER_READ_FAILED_ERROR = 'phone_state_native_smoke_marker_read_failed';
const CLOSE_FAILED_ERROR = 'phone_state_native_smoke_close_failed';
const CANONICAL_PHONE_STATE_ERRORS = new Set<string>([
  'phone_state_native_unavailable',
  'phone_state_scope_invalid',
  'phone_state_key_invalid',
  'phone_state_sqlcipher_unavailable',
  'phone_state_cipher_integrity_failed',
]);
let preparedInThisProcess = false;

export type PhoneStateNativeSmokePrepared = Readonly<{
  status: 'prepared';
  marker: string;
  createdAtMs: number;
}>;

export type PhoneStateNativeSmokeVerified = Readonly<{
  status: 'verified';
  marker: string;
  createdAtMs: number;
}>;

type SmokeRow = Readonly<{
  marker: unknown;
  created_at_ms: unknown;
}>;

type SmokeSchemaRow = Readonly<{
  name: unknown;
}>;

/** Test-only seam; production and UI code must never call this export. */
export function resetPhoneStateNativeSmokeProcessGuardForTests(): void {
  preparedInThisProcess = false;
}

function stageError(error: unknown, stageCode: string): Error {
  if (error instanceof Error && CANONICAL_PHONE_STATE_ERRORS.has(error.message)) {
    return error;
  }
  return new Error(stageCode);
}

async function runStage<T>(stageCode: string, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw stageError(error, stageCode);
  }
}

async function withSmokeDatabase<T>(
  operation: (database: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const database = await runStage(
    OPEN_FAILED_ERROR,
    () => openPhoneStateDatabase(SMOKE_SCOPE),
  );
  let operationFailed = false;

  try {
    return await operation(database);
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try {
      await database.closeAsync();
    } catch (closeError) {
      if (!operationFailed) {
        throw stageError(closeError, CLOSE_FAILED_ERROR);
      }
    }
  }
}

export async function preparePhoneStateNativeSmoke(): Promise<PhoneStateNativeSmokePrepared> {
  const result = await withSmokeDatabase<PhoneStateNativeSmokePrepared>(async (database) => {
    await runStage(
      SCHEMA_FAILED_ERROR,
      () => database.execAsync(`
        CREATE TABLE IF NOT EXISTS ${SMOKE_TABLE} (
          id INTEGER PRIMARY KEY CHECK(id = 1),
          marker TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL
        )
      `),
    );

    return runStage(MARKER_WRITE_FAILED_ERROR, async () => {
      const marker = Crypto.randomUUID();
      const createdAtMs = Date.now();
      await database.runAsync(
        `INSERT OR REPLACE INTO ${SMOKE_TABLE} (id, marker, created_at_ms) VALUES (?, ?, ?)`,
        1,
        marker,
        createdAtMs,
      );

      return { status: 'prepared', marker, createdAtMs };
    });
  });
  preparedInThisProcess = true;
  return result;
}

export async function verifyPhoneStateNativeSmoke(): Promise<PhoneStateNativeSmokeVerified> {
  if (preparedInThisProcess) {
    throw new Error(RESTART_REQUIRED_ERROR);
  }

  return withSmokeDatabase(async (database) => {
    const schemaRow = await runStage(
      SCHEMA_FAILED_ERROR,
      () => database.getFirstAsync<SmokeSchemaRow>(
        'SELECT name FROM sqlite_master WHERE type = ? AND name = ?',
        'table',
        SMOKE_TABLE,
      ),
    );
    if (schemaRow?.name !== SMOKE_TABLE) {
      throw new Error(MARKER_MISSING_ERROR);
    }

    const row = await runStage(
      MARKER_READ_FAILED_ERROR,
      () => database.getFirstAsync<SmokeRow>(
        `SELECT marker, created_at_ms FROM ${SMOKE_TABLE} WHERE id = ?`,
        1,
      ),
    );
    const createdAtMs = row?.created_at_ms;
    if (
      typeof row?.marker !== 'string'
      || row.marker.trim().length === 0
      || typeof createdAtMs !== 'number'
      || !Number.isSafeInteger(createdAtMs)
      || createdAtMs < 0
      || !Number.isFinite(new Date(createdAtMs).getTime())
    ) {
      throw new Error(MARKER_MISSING_ERROR);
    }

    return {
      status: 'verified',
      marker: row.marker,
      createdAtMs,
    };
  });
}
