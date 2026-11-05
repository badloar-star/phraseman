// classic_error_queue_migration.ts — одноразовая очистка ТОЛЬКО очереди повтора ошибок классических курсов.
//
// зачем (владелец 05.11, через координатора): «очистить ошибки у всех». Очередь «повтори ошибку через один»
// (lessonN_errorReplayQueue / Since / Override) хранится по ПОЗИЦИОННЫМ номерам фраз; после пересборки курсов es/fr/de/it
// и подключения классических курсов старые номера указывают на другие фразы — человеку подсовывались бы чужие ошибки.
// Чистим только эти три поля по всем урокам и всем языкам en/es/fr/de/it. НЕ трогаем: проценты и прогресс уроков,
// пройденные уроки, медали, монеты/осколки/руны, счётчики и стрик, открытые разделы, лучший результат, список «выученных
// фраз» (он привязан к старым номерам — отмечено в отчёте, владелец про него не говорил).
//
// Правила безопасности:
//   • идемпотентно — флаг `classic_error_queue_cleared_v1` ставится ПОСЛЕ успешной чистки; при ошибке флага нет → повтор;
//   • никаких запросов к Firestore/сети; только AsyncStorage;
//   • ключи НЕ удаляются (храповик замка владельца «прогресс не пропадает» считает удаления в хранилище): очередь гасится записью
//     «пусто» ровно в те ключи, что прошли classicErrorQueueKeysIn — те же значения, что экран урока пишет сам при пустой очереди
//     ('[]' / '0' / 'null'); экран читает их как «очереди нет». Новых ключей, кроме флага, не создаётся;
//   • префикс логов [CLASSIC-ERRQ-MIGRATION] — вся цепочка одним поиском; ранние выходы и catch логируют причину.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lessonSessionKey } from './target_storage_keys';

export const CLASSIC_ERROR_QUEUE_MIGRATION_FLAG_KEY = 'classic_error_queue_cleared_v1';

const LOG = '[CLASSIC-ERRQ-MIGRATION]';
const CLASSIC_TARGETS = ['en', 'es', 'fr', 'de', 'it'] as const;
const QUEUE_FIELDS = ['errorReplayQueue', 'errorReplaySince', 'errorReplayOverride'] as const;
const SENTINEL = 'LESSON_ID_SENTINEL';
const WRITE_BATCH = 100;
// зачем: ровно то, что lesson1.persistErrorReplayToStorage пишет при пустой очереди и что loadData читает как «нет очереди»
const EMPTY_VALUE_BY_FIELD: Readonly<Record<string, string>> = { errorReplayQueue: '[]', errorReplaySince: '0', errorReplayOverride: 'null' };

type Matcher = Readonly<{ prefix: string; suffix: string }>;

// Шаблоны ключей берём из ТОГО ЖЕ построителя, что использует экран урока (lessonSessionKey): подстановка маркера вместо номера
// урока даёт «префикс + номер + суффикс» для каждого языка и поля, и построитель с экраном не разойдутся.
const MATCHERS: readonly Matcher[] = CLASSIC_TARGETS.flatMap((target) =>
  QUEUE_FIELDS.map((field): Matcher => {
    const [prefix = '', suffix = ''] = lessonSessionKey(SENTINEL, field, target).split(SENTINEL);
    return { prefix, suffix };
  }),
);

/** Чистая: из списка ключей хранилища выбирает ровно ключи очереди повтора ошибок (номер урока — только цифры). */
export function classicErrorQueueKeysIn(allKeys: readonly string[]): string[] {
  return allKeys.filter((key) =>
    MATCHERS.some(({ prefix, suffix }) => {
      if (!key.startsWith(prefix) || !key.endsWith(suffix)) return false;
      if (key.length <= prefix.length + suffix.length) return false;
      return /^\d+$/.test(key.slice(prefix.length, key.length - suffix.length));
    }),
  );
}

export type ClassicErrorQueueMigrationResult = Readonly<{
  status: 'cleared' | 'already_done' | 'error';
  cleared: number;
  reason?: string;
}>;

type MigrationStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'getAllKeys' | 'multiSet'>;

/** Пустое значение для ключа очереди по его полю (по суффиксу ключа). */
export function emptyValueForClassicErrorQueueKey(key: string): string {
  for (const field of QUEUE_FIELDS) if (key.endsWith(`_${field}`)) return EMPTY_VALUE_BY_FIELD[field] ?? '[]';
  return '[]';
}

export async function runClassicErrorQueueMigration(storage: MigrationStorage = AsyncStorage): Promise<ClassicErrorQueueMigrationResult> {
  const startedAt = Date.now();
  try {
    const flag = await storage.getItem(CLASSIC_ERROR_QUEUE_MIGRATION_FLAG_KEY);
    if (flag) {
      console.log(`${LOG} skip`, JSON.stringify({ reason: 'flag_present', flag })); // guard-ok: ранний выход миграции с причиной
      return { status: 'already_done', cleared: 0 };
    }
    const allKeys = await storage.getAllKeys();
    const targets = classicErrorQueueKeysIn(allKeys);
    console.log(`${LOG} start`, JSON.stringify({ storageKeys: allKeys.length, queueKeys: targets.length, sample: targets.slice(0, 3) })); // guard-ok: вход миграции
    for (let i = 0; i < targets.length; i += WRITE_BATCH) {
      await storage.multiSet(targets.slice(i, i + WRITE_BATCH).map((key): [string, string] => [key, emptyValueForClassicErrorQueueKey(key)]));
    }
    // зачем: флаг ПОСЛЕ чистки — если запись упала, миграция повторится при следующем запуске, а не «потеряется»
    await storage.setItem(CLASSIC_ERROR_QUEUE_MIGRATION_FLAG_KEY, String(Date.now()));
    console.log(`${LOG} done`, JSON.stringify({ cleared: targets.length, ms: Date.now() - startedAt })); // guard-ok: итог миграции
    return { status: 'cleared', cleared: targets.length };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`${LOG} failed`, JSON.stringify({ reason, ms: Date.now() - startedAt })); // guard-ok: сбой миграции не должен ломать урок
    return { status: 'error', cleared: 0, reason };
  }
}

let migrationPromise: Promise<void> | null = null;

/** Один запуск за процесс; вызывается из экрана урока ПЕРЕД чтением очереди. Не бросает. */
export function ensureClassicErrorQueueMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = runClassicErrorQueueMigration().then(() => undefined);
  }
  return migrationPromise;
}

export function __resetClassicErrorQueueMigrationForTest(): void {
  migrationPromise = null;
}
