import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SQLite from 'expo-sqlite';

import {
  materializePhoneStateCredentials,
  type PhoneStateScope,
} from './account_secret';

const KEY_HEX_PATTERN = /^[a-f0-9]{64}$/;
const DATABASE_CONFIGURATION =
  'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;';

export type OpenPhoneStateDatabaseOptions = Readonly<{
  isExpoGo?: true;
}>;

function runsInExpoGo(options?: OpenPhoneStateDatabaseOptions): boolean {
  return options?.isExpoGo === true
    || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export async function openPhoneStateDatabase(
  scope: PhoneStateScope,
  options?: OpenPhoneStateDatabaseOptions,
): Promise<SQLite.SQLiteDatabase> {
  if (runsInExpoGo(options)) {
    throw new Error('phone_state_native_unavailable');
  }

  const credentials = await materializePhoneStateCredentials(scope);
  if (!KEY_HEX_PATTERN.test(credentials.keyHex)) {
    throw new Error('phone_state_key_invalid');
  }

  const database = await SQLite.openDatabaseAsync(credentials.databaseName);
  try {
    await database.execAsync(`PRAGMA key = "x'${credentials.keyHex}'"`);
    const cipherVersion = await database.getFirstAsync<{ cipher_version: string }>(
      'PRAGMA cipher_version',
    );
    if (
      typeof cipherVersion?.cipher_version !== 'string'
      || cipherVersion.cipher_version.trim().length === 0
    ) {
      throw new Error('phone_state_sqlcipher_unavailable');
    }
    const integrityErrors = await database.getAllAsync<{ cipher_integrity_check: string }>(
      'PRAGMA cipher_integrity_check',
    );
    if (integrityErrors.length > 0) {
      throw new Error('phone_state_cipher_integrity_failed');
    }
    await database.execAsync(DATABASE_CONFIGURATION);
    return database;
  } catch (error) {
    try {
      await database.closeAsync();
    } catch (e) {
      // Preserve the original SQLCipher failure; closing is best effort only.
      console.warn('[silent-catch] database:integrityErrors', e instanceof Error ? e.message : String(e));
    }
    throw error;
  }
}
