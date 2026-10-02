/**
 * Account V2, Пакет 8K — ЕДИНЫЙ путь выгрузки списков карточек в облако для обычной
 * (doSyncToCloud) и принудительной (forceSyncToCloud) синхронизации.
 *
 * зачем: обычный синк после 8H/8H-2/8J пишет карточки в страницы flashcard_pages и
 * обнуляет поле progress.<ключ> в документе, а запертый ключ (8J) не пишет никуда.
 * forceSyncToCloud (перенос при смене устройства) этого не знал и клал список ЦЕЛИКОМ
 * в документ — заново создавал затеняющую копию, которую restore на другом устройстве
 * берёт вместо страниц: удалённые карточки «возвращались», новые пропадали. Логика
 * вынесена сюда, чтобы два пути больше не расходились.
 *
 * Решение по каждому ключу:
 *   locked       — замок 8J: ни страниц, ни поля документа; снимок не запоминает значение;
 *   unchanged    — (только sync) значение совпало со снимком: страниц не пишем;
 *   pages        — страницы записаны → поле документа null (sync — один раз по маркеру);
 *   doc_fallback — страницы не записались → список едет в документ как раньше.
 *
 * Логи: префикс [LEGACY-V2-SYNC], без uid и без содержимого карточек (только длины).
 */
import { cloudSyncSnapshotValueMatches, encodeCloudSyncSnapshotRecord } from './cloud_sync_snapshot_codec';
import { DebugLogger } from './debug-logger';
import { readFlashcardPagesWriteLocks } from './flashcard_pages_read_result';
import { writeFlashcardPages } from './flashcards_cloud_pages';
import { buildFlashcardDocFieldMarkers, decideFlashcardDocField } from './flashcards_doc_field_clear';
import type { StudyTarget } from './study_target';
import { flashcardsSavedKey } from './target_storage_keys';

const LOG = '[LEGACY-V2-SYNC]';

/** Локальные ключи списков карточек, которые живут в страницах, а не в документе. */
export const FLASHCARD_CLOUD_KEYS: ReadonlyArray<readonly [string, StudyTarget]> = [
  ['flashcards_v1', 'en'],
  [flashcardsSavedKey('fr'), 'fr'],
];

export type FlashcardCloudUploadMode = 'sync' | 'force';

export type FlashcardCloudUploadPlan = Readonly<{
  /** Все ключи карточек (для маркеров снимка). */
  keys: readonly string[];
  /** Не класть значение списка в документ (ушёл в страницы / не менялся / заперт). */
  offloaded: ReadonlySet<string>;
  /** Страницы записаны в этот раз — поле документа обнулить (null). */
  clearDocField: ReadonlySet<string>;
  /** Страницы не записались — список уходит в документ как раньше. */
  sentToDoc: ReadonlySet<string>;
  /** Заперт замком 8J — не уходил никуда. */
  lockedNow: ReadonlySet<string>;
}>;

export type FlashcardCloudUploadDeps = Readonly<{
  writePages: (stableId: string, target: StudyTarget, cardsJson: string) => Promise<number | null>;
  readLocks: (knownKeys: Iterable<string>) => Promise<ReadonlySet<string>>;
}>;

const DEFAULT_DEPS: FlashcardCloudUploadDeps = {
  writePages: writeFlashcardPages,
  readLocks: readFlashcardPagesWriteLocks,
};

export type FlashcardCloudUploadInput = Readonly<{
  uid: string;
  data: Readonly<Record<string, string | null | undefined>>;
  previousSnapshot: Readonly<Record<string, string | null>>;
  mode: FlashcardCloudUploadMode;
  isCurrent: () => boolean;
  /** Только для тестов. */
  deps?: FlashcardCloudUploadDeps;
}>;

const EMPTY_SNAPSHOT: Readonly<Record<string, string | null>> = Object.freeze({});

function logLocked(mode: FlashcardCloudUploadMode, key: string, value: string): void {
  if (mode === 'sync') {
    console.log(`${LOG} pages_write_skipped key=${key} reason=pages_unconfirmed local_len=${value.length}`);
    return;
  }
  console.log(`${LOG} force_sync pages_write_skipped key=${key} reason=pages_unconfirmed local_len=${value.length}`);
  // Перенос с запертым ключом отказывает целиком (см. runForceFlashcardUpload, C-2).
  console.log(`${LOG} force_sync key=${key} decision=locked result=refuse`);
}

/**
 * Выгрузить списки карточек в страницы и решить, что с ними делать в документе.
 * null — сменилось поколение аккаунта: вызывающий обязан НЕ писать документ.
 *
 * mode 'force': снимку не доверяем — страницы пишутся всегда, а поле документа
 * обнуляется всегда (перенос редок, лишняя запись дешевле затеняющей копии).
 */
export async function uploadFlashcardListsToPages(
  input: FlashcardCloudUploadInput,
): Promise<FlashcardCloudUploadPlan | null> {
  const { uid, data, mode, isCurrent } = input;
  const deps = input.deps ?? DEFAULT_DEPS;
  const previousSnapshot = mode === 'force' ? EMPTY_SNAPSHOT : input.previousSnapshot;
  const keys = FLASHCARD_CLOUD_KEYS.map(([key]) => key);
  const offloaded = new Set<string>();
  const clearDocField = new Set<string>();
  const sentToDoc = new Set<string>();
  const lockedNow = new Set<string>();

  // зачем (8J): restore не смог прочитать страницы ключа → облачная правда неизвестна.
  // Такой ключ не уходит НИКУДА: ни в страницы (writeFlashcardPages удалил бы хвост),
  // ни в поле документа (restore предпочитает поле страницам — та же потеря).
  const locks = await deps.readLocks(keys);
  if (!isCurrent()) {
    console.log(`${LOG} ${mode}_flashcards aborted reason=stale_generation stage=read_locks`);
    return null;
  }
  for (const [key, target] of FLASHCARD_CLOUD_KEYS) {
    const value = data[key];
    if (value === null || value === undefined) {
      if (mode === 'force') console.log(`${LOG} force_sync key=${key} decision=absent local=${value === null ? 'null' : 'undefined'}`);
      continue;
    }
    if (locks.has(key)) {
      offloaded.add(key);
      lockedNow.add(key);
      logLocked(mode, key, String(value));
      continue;
    }
    // Страницы пишем только когда список реально изменился с прошлого синка —
    // иначе каждый такт стоил бы N записей на ровном месте. Force снимку не верит.
    if (mode === 'sync' && cloudSyncSnapshotValueMatches(previousSnapshot[key], value)) {
      offloaded.add(key);
      continue;
    }
    const pagesWritten = await deps.writePages(uid, target, String(value));
    if (!isCurrent()) {
      console.log(`${LOG} ${mode}_flashcards aborted reason=stale_generation stage=write_pages key=${key}`);
      return null;
    }
    const decision = decideFlashcardDocField(previousSnapshot, key, pagesWritten !== null);
    if (decision !== 'keep_in_doc') {
      offloaded.add(key);
      if (decision === 'clear') clearDocField.add(key);
      else console.log(`${LOG} doc_field_clear_skipped key=${key} reason=already_cleared`);
    } else {
      sentToDoc.add(key);
      // Ранний выход: страницы не записались — ключ НЕ выбрасываем, пусть едет
      // в документе как раньше. Причина уже залогирована в writeFlashcardPages.
      DebugLogger.warn(
        'cloud_sync:flashcards',
        `offload failed key=${key} target=${target} — записываем в документ как раньше`,
      );
    }
    if (mode === 'force') {
      const shown = decision === 'keep_in_doc' ? 'doc_fallback' : 'pages';
      console.log(`${LOG} force_sync key=${key} decision=${shown} pages=${pagesWritten ?? 'failed'}`);
    }
  }
  return { keys, offloaded, clearDocField, sentToDoc, lockedNow };
}

export type ForceFlashcardUploadFailure = 'pages_timeout' | 'stale_generation' | 'pages_locked' | 'upload_error';

export type ForceFlashcardUploadOutcome =
  | Readonly<{ ok: true; plan: FlashcardCloudUploadPlan }>
  | Readonly<{ ok: false; reason: ForceFlashcardUploadFailure }>;

export type ForceFlashcardUploadInput = Readonly<{
  uid: string;
  data: Readonly<Record<string, string | null | undefined>>;
  isCurrent: () => boolean;
  /** Потолок на всю выгрузку страниц (тот же, что у записи документа). */
  timeoutMs: number;
  /** Только для тестов. */
  deps?: FlashcardCloudUploadDeps;
}>;

const PAGES_TIMEOUT = Symbol('pages_timeout');

/**
 * Выгрузка карточек для forceSyncToCloud: тот же путь, плюс два отказа.
 *
 * зачем (ревью 8K, C-1): RN Firebase без связи держит batch.commit сколько угодно.
 * Без потолка `await forceSyncToCloud()` при выходе/смене аккаунта не возвращался бы —
 * экран завис бы. До 8K запись документа шла под тем же потолком. Сработал потолок →
 * отказ: вызывающий пишет аварийную копию и отменяет смену. Начатая запись страниц
 * может завершиться в фоне — она пишет текущий локальный список, это безопасно.
 *
 * зачем (ревью 8K, C-2): true от forceSyncToCloud означает «прогресс в облаке», после
 * него локальное стирается. Запертый ключ (8J) в облако не уходит — карточки, добавленные
 * под замком, пропали бы на других устройствах. Поэтому запертый ключ = отказ всего
 * переноса; список не пишется ни в страницы, ни в документ.
 */
export async function runForceFlashcardUpload(input: ForceFlashcardUploadInput): Promise<ForceFlashcardUploadOutcome> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const upload = uploadFlashcardListsToPages({
    uid: input.uid,
    data: input.data,
    previousSnapshot: EMPTY_SNAPSHOT,
    mode: 'force',
    isCurrent: input.isCurrent,
    deps: input.deps,
  });
  const deadline = new Promise<typeof PAGES_TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(PAGES_TIMEOUT), Math.max(0, input.timeoutMs));
    (timer as { unref?: () => void } | undefined)?.unref?.();
  });
  try {
    const result = await Promise.race([upload, deadline]);
    if (result === PAGES_TIMEOUT) {
      // Поздний отказ фоновой записи не должен стать необработанным — только лог.
      upload.catch((error: unknown) => {
        console.warn(`${LOG} force_sync late_upload_error reason=${String(error).slice(0, 120)}`);
      });
      console.warn(`${LOG} force_sync aborted reason=pages_timeout ms=${Date.now() - started} limit_ms=${input.timeoutMs}`);
      return { ok: false, reason: 'pages_timeout' };
    }
    if (result === null) {
      console.log(`${LOG} force_sync aborted reason=stale_generation stage=flashcards`);
      return { ok: false, reason: 'stale_generation' };
    }
    if (result.lockedNow.size > 0) {
      console.warn(`${LOG} force_sync aborted reason=pages_locked keys=${[...result.lockedNow].join(',')} result=refuse`);
      return { ok: false, reason: 'pages_locked' };
    }
    return { ok: true, plan: result };
  } catch (error) {
    console.warn(`${LOG} force_sync aborted reason=upload_error error=${String(error).slice(0, 120)}`);
    return { ok: false, reason: 'upload_error' };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Прогресс для документа: без вынесенных списков, с null для обнуляемых полей.
 * Новый объект — вход не меняется.
 */
export function buildDocProgressWithoutFlashcardLists(
  data: Readonly<Record<string, string | null>>,
  plan: FlashcardCloudUploadPlan,
): Record<string, string | null> {
  const progress: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!plan.offloaded.has(key)) progress[key] = value;
  }
  for (const key of plan.clearDocField) progress[key] = null;
  return progress;
}

/**
 * Снимок после УСПЕШНОГО force-синка: всё отправленное + маркеры 8H-2.
 * Запертый ключ в облако не уходил — снимок его не запоминает, иначе после снятия
 * замка обычный синк счёл бы список совпавшим и страницы так и не дописал бы.
 */
export function buildForceSyncSnapshot(
  data: Readonly<Record<string, string | null>>,
  plan: FlashcardCloudUploadPlan,
): Record<string, string | null> {
  const sent: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!plan.lockedNow.has(key)) sent[key] = value;
  }
  return {
    ...encodeCloudSyncSnapshotRecord(sent),
    ...buildFlashcardDocFieldMarkers(EMPTY_SNAPSHOT, plan.keys, plan.clearDocField, plan.sentToDoc),
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
