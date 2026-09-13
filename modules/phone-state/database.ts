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

/**
 * Признак «файл есть, но этим ключом он не расшифровывается».
 *
 * зачем: SQLCipher не умеет сказать «неверный ключ» — он не может прочитать
 * заголовок и сообщает SQLITE_NOTADB (code 26) / «file is not a database».
 * Владелец 2026-09-13 уткнулся ровно в это: кнопки тренировки карточек были
 * мертвы, потому что база phone-state не открывалась НИКОГДА.
 *
 * Как ключ расходится с файлом: ключ лежит в Keychain и на iOS ПЕРЕЖИВАЕТ
 * удаление приложения, а файл базы живёт в песочнице и исчезает вместе с ним.
 * Любая рассинхронизация (переустановка, восстановление из бэкапа, сброс
 * Keychain) делает старый файл нерасшифровываемым НАВСЕГДА — повтор попытки
 * не поможет ни на каком запуске.
 */
function isUnreadableDatabaseFailure(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message} ${String(error.cause ?? '')}` : String(error);
  return /file is not a database|code 26|SQLITE_NOTADB/i.test(text);
}

async function openEncrypted(
  databaseName: string,
  keyHex: string,
): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(databaseName);
  try {
    await database.execAsync(`PRAGMA key = "x'${keyHex}'"`);
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

  try {
    return await openEncrypted(credentials.databaseName, credentials.keyHex);
  } catch (error) {
    if (!isUnreadableDatabaseFailure(error)) throw error;
    /**
     * зачем: этот файл не будет прочитан НИКОГДА — расшифровать его текущим
     * ключом невозможно, а прежний ключ утрачен. Раньше здесь ошибка просто
     * летела наверх, и приложение застревало на каждом запуске: мост
     * phone-state не поднимался, квота тренировок читалась как 'unavailable',
     * кнопки молча гасли. Удаляем нечитаемый файл ОДИН раз и открываем чистую
     * базу под текущим ключом; содержимое возвращает importLegacy (локальное
     * хранилище) и последующая синхронизация с облаком.
     */
    console.warn(
      `[PHONE-STATE-DB] нечитаемая база "${credentials.databaseName}" — пересоздаём под текущим ключом:`,
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );
    try {
      await SQLite.deleteDatabaseAsync(credentials.databaseName);
    } catch (deleteError: unknown) {
      // Файл мог быть уже удалён или занят: сообщаем причину и пробуем открыть.
      console.warn('[PHONE-STATE-DB] удаление нечитаемой базы не удалось:',
        deleteError instanceof Error ? `${deleteError.name}: ${deleteError.message}` : String(deleteError));
    }
    const recreated = await openEncrypted(credentials.databaseName, credentials.keyHex);
    console.warn(`[PHONE-STATE-DB] база "${credentials.databaseName}" пересоздана успешно`);
    return recreated;
  }
}
