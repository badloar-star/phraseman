import Constants, { ExecutionEnvironment } from 'expo-constants';
import { File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

import {
  materializePhoneStateCredentials,
  type PhoneStateScope,
} from './account_secret';

const KEY_HEX_PATTERN = /^[a-f0-9]{64}$/;
const DATABASE_CONFIGURATION =
  'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;';
/**
 * Проба ЗАПИСИ — единственное честное доказательство пригодности базы.
 *
 * зачем (инцидент владельца 2026-09-14 07:57, лог metro-console): вчерашняя
 * проба чтением (`SELECT count(*) FROM sqlite_master`) ПРОШЛА и вернула 0
 * таблиц, база была признана исправной — а первая же запись в миграции
 * (`CREATE TABLE …` в эксклюзивной транзакции) упала с NOTADB. Запись идёт
 * через WAL и горячий журнал, а проба выполнялась ДО `PRAGMA journal_mode =
 * WAL`, поэтому порчу хвостов `-wal`/`-shm`/`-journal` от файла под другим
 * ключом она не видела в принципе. Отсюда правило: пригодность доказывает
 * только ЗАПИСЬ, выполненная ПОСЛЕ полной настройки соединения.
 *
 * Служебная таблица с одной строкой перезаписывается при каждом открытии:
 * `IF NOT EXISTS` без INSERT не был бы записью на повторных запусках.
 */
const OPEN_WRITE_PROBE =
  'CREATE TABLE IF NOT EXISTS phone_state_open_probe (id INTEGER PRIMARY KEY NOT NULL, opened_at_ms INTEGER NOT NULL); '
  + 'INSERT OR REPLACE INTO phone_state_open_probe (id, opened_at_ms) VALUES (1, CAST(strftime(\'%s\', \'now\') AS INTEGER) * 1000);';

/** Хвосты семейства файлов SQLite, которые deleteDatabaseAsync НЕ трогает. */
const DATABASE_SIDECAR_SUFFIXES = ['-wal', '-shm', '-journal'] as const;

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
export function isUnreadableDatabaseFailure(error: unknown): boolean {
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
     * Ранняя диагностика (инцидент 2026-09-13 19:32): прагмы выше дают ложный
     * успех на файле под чужим ключом, а чтение sqlite_master вскрывает хотя бы
     * нечитаемый ГЛАВНЫЙ файл. Но это НЕ доказательство пригодности: 2026-09-14
     * этот запрос вернул tables=0, а первая запись всё равно упала с NOTADB —
     * порча сидела в хвостах WAL. Доказательство — проба ЗАПИСИ после полной
     * настройки соединения ниже (OPEN_WRITE_PROBE).
     */
    const schemaProbe = await database.getFirstAsync<{ tables: number }>(
      'SELECT count(*) AS tables FROM sqlite_master',
    );
    const userVersion = await database.getFirstAsync('PRAGMA user_version');
    console.log(`[PHONE-STATE-DB] open:step 5/5 страница данных расшифрована, sqlite_master tables=${schemaProbe?.tables ?? 'null'}, user_version=${JSON.stringify(userVersion)}`);
    await database.execAsync(DATABASE_CONFIGURATION);
    // Проба записи — ПОСЛЕ WAL и остальной настройки: только так она проходит
    // тем же путём, что и первая настоящая запись миграции (см. OPEN_WRITE_PROBE).
    await database.execAsync(OPEN_WRITE_PROBE);
    console.log('[PHONE-STATE-DB] open:step 6/6 проба записи прошла через WAL — база пригодна');
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

/** file://-адрес файла в каталоге баз expo-sqlite (на iOS это голый путь без схемы). */
function databaseFileUri(fileName: string): string {
  const directory = String(SQLite.defaultDatabaseDirectory ?? '').replace(/\/+$/, '');
  const base = /^[a-z]+:\/\//i.test(directory) ? directory : `file://${directory}`;
  return `${base}/${fileName}`;
}

/**
 * Удалить ВСЁ семейство файлов базы: главный файл и хвосты -wal / -shm / -journal.
 *
 * зачем (инцидент 2026-09-14): `SQLite.deleteDatabaseAsync` в expo-sqlite 16
 * удаляет ТОЛЬКО главный файл (iOS/SQLiteModule.swift: FileManager.removeItem
 * одного пути). Хвосты, записанные под старым ключом, переживали пересоздание,
 * и новая пустая база наследовала ту же порчу — первая запись снова падала с
 * NOTADB, а «Попробовать снова» не помогало никогда.
 */
async function deletePhoneStateDatabaseFamily(databaseName: string): Promise<void> {
  try {
    await SQLite.deleteDatabaseAsync(databaseName);
    console.warn(`[PHONE-STATE-DB] family:main удалён "${databaseName}"`);
  } catch (deleteError: unknown) {
    // Файл мог отсутствовать или быть занят: причину сообщаем, хвосты чистим всё равно.
    console.warn('[PHONE-STATE-DB] family:main не удалён —', describeError(deleteError));
  }
  for (const suffix of DATABASE_SIDECAR_SUFFIXES) {
    const fileName = `${databaseName}${suffix}`;
    try {
      const file = new File(databaseFileUri(fileName));
      if (!file.exists) {
        console.log(`[PHONE-STATE-DB] family:${suffix} отсутствует — нечего удалять`);
        continue;
      }
      file.delete();
      console.warn(`[PHONE-STATE-DB] family:${suffix} удалён`);
    } catch (sidecarError: unknown) {
      // Немой catch запрещён: неудалённый хвост = та же порча на следующем запуске.
      console.warn(`[PHONE-STATE-DB] family:${suffix} не удалён —`, describeError(sidecarError));
    }
  }
}

async function recreateWithCredentials(
  credentials: Readonly<{ databaseName: string; keyHex: string }>,
): Promise<SQLite.SQLiteDatabase> {
  await deletePhoneStateDatabaseFamily(credentials.databaseName);
  const recreated = await openEncrypted(credentials.databaseName, credentials.keyHex);
  console.warn(`[PHONE-STATE-DB] база "${credentials.databaseName}" пересоздана успешно`);
  return recreated;
}

/**
 * Пересоздать базу после NOTADB, всплывшего ВНЕ открытия (страховка).
 *
 * зачем (владелец 2026-09-14: «сделай проверку по-другому, чтобы проблема
 * ушла»): если нечитаемость проявится на любом пути, который проба не
 * предусмотрела, вызывающий обязан иметь способ пересоздать базу и повторить
 * шаг, а не оставить человека перед вечным «Попробовать снова».
 */
export async function recreatePhoneStateDatabaseAfterUnreadable(
  scope: PhoneStateScope,
  options?: OpenPhoneStateDatabaseOptions,
): Promise<SQLite.SQLiteDatabase> {
  if (runsInExpoGo(options)) throw new Error('phone_state_native_unavailable');
  const credentials = await materializePhoneStateCredentials(scope);
  if (!KEY_HEX_PATTERN.test(credentials.keyHex)) throw new Error('phone_state_key_invalid');
  console.warn(`[PHONE-STATE-DB] recreate:requested — база "${credentials.databaseName}" не пишется, пересоздаём семейство файлов`);
  return recreateWithCredentials(credentials);
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
    return recreateWithCredentials(credentials);
  }
}
