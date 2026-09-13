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

/**
 * Полная форма ошибки для лога. зачем: два раза подряд починка выглядела
 * рабочей, а ветка восстановления не печатала НИЧЕГО. Без точной формы
 * ошибки (message с цепочкой «Caused by», code, cause, свои поля) нельзя
 * отличить «регулярное выражение не узнало» от «сюда вообще не дошло».
 */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return JSON.stringify({ nonError: String(error) });
  const own = Object.fromEntries(
    Object.getOwnPropertyNames(error)
      .filter((key) => key !== 'stack')
      .map((key) => [key, String((error as unknown as Record<string, unknown>)[key])]),
  );
  return JSON.stringify({
    name: error.name,
    message: error.message,
    code: (error as { code?: unknown }).code ?? null,
    cause: error.cause instanceof Error ? `${error.cause.name}: ${error.cause.message}` : String(error.cause ?? null),
    own,
  });
}

async function openEncrypted(
  databaseName: string,
  keyHex: string,
): Promise<SQLite.SQLiteDatabase> {
  // зачем: пошаговая трассировка [PHONE-STATE-DB] — после одного перезапуска
  // она обязана назвать шаг, на котором база отказывает. Отсутствие даже
  // строки open:in — само по себе диагноз: устройство исполняет старый бандл.
  console.log(`[PHONE-STATE-DB] open:in "${databaseName}"`);
  const database = await SQLite.openDatabaseAsync(databaseName);
  console.log('[PHONE-STATE-DB] open:step 1/5 файл открыт');
  try {
    await database.execAsync(`PRAGMA key = "x'${keyHex}'"`);
    console.log('[PHONE-STATE-DB] open:step 2/5 ключ применён');
    const cipherVersion = await database.getFirstAsync<{ cipher_version: string }>(
      'PRAGMA cipher_version',
    );
    console.log(`[PHONE-STATE-DB] open:step 3/5 cipher_version=${JSON.stringify(cipherVersion)}`);
    if (
      typeof cipherVersion?.cipher_version !== 'string'
      || cipherVersion.cipher_version.trim().length === 0
    ) {
      throw new Error('phone_state_sqlcipher_unavailable');
    }
    const integrityErrors = await database.getAllAsync<{ cipher_integrity_check: string }>(
      'PRAGMA cipher_integrity_check',
    );
    console.log(`[PHONE-STATE-DB] open:step 4/5 integrity rows=${integrityErrors.length}`);
    if (integrityErrors.length > 0) {
      throw new Error('phone_state_cipher_integrity_failed');
    }
    /**
     * зачем (инцидент владельца 2026-09-13 19:32, лог metro-console):
     * ОБЕ прагмы выше дают ЛОЖНЫЙ УСПЕХ на файле, который текущим ключом не
     * расшифровывается, поэтому база признавалась исправной, а NOTADB вылетал
     * позже — в importLegacy, уже ВНЕ этой функции, мимо восстановления ниже.
     * В логе владельца это видно дословно: «open:step 4/5 integrity rows=0»,
     * «open:ok», а следом «bootstrap:FAILED … Error code 26: file is not a
     * database», и ни одной строки recover:verdict. Экран тренировок вставал
     * на каждом запуске, «Попробовать снова» не помогало никогда.
     *
     * Почему прагмы врут:
     *  • cipher_integrity_check на нерасшифровываемом файле не выполняется и
     *    возвращает ПУСТОЙ результат — неотличимо от «ошибок не найдено»;
     *  • PRAGMA user_version читает заголовок и отдаёт 0 вместо исключения —
     *    страница данных при этом так и не расшифровывается.
     *
     * Поэтому пригодность доказывается ЧТЕНИЕМ РЕАЛЬНОЙ СТРАНИЦЫ ДАННЫХ:
     * sqlite_master — настоящая таблица, её страницу невозможно прочитать без
     * верного ключа. На битом файле этот запрос бросает NOTADB ЗДЕСЬ, внутри
     * try, и восстановление ниже наконец получает управление.
     */
    const schemaProbe = await database.getFirstAsync<{ tables: number }>(
      'SELECT count(*) AS tables FROM sqlite_master',
    );
    const userVersion = await database.getFirstAsync('PRAGMA user_version');
    console.log(`[PHONE-STATE-DB] open:step 5/5 страница данных расшифрована, sqlite_master tables=${schemaProbe?.tables ?? 'null'}, user_version=${JSON.stringify(userVersion)}`);
    await database.execAsync(DATABASE_CONFIGURATION);
    console.log('[PHONE-STATE-DB] open:ok');
    return database;
  } catch (error) {
    console.warn('[PHONE-STATE-DB] open:catch', describeError(error));
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
    const unreadable = isUnreadableDatabaseFailure(error);
    console.warn(`[PHONE-STATE-DB] recover:verdict unreadable=${unreadable}`, describeError(error));
    if (!unreadable) {
      // Ранний выход обязан объясняться: ошибку не признали нечитаемой базой.
      console.warn('[PHONE-STATE-DB] recover:skip — подпись не NOTADB, пробрасываем наверх');
      throw error;
    }
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
