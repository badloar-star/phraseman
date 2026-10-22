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
 * 8N: перед заменой страниц локальный список объединяется с текущими страницами (тот же
 * col.get() внутри writeFlashcardPages, без лишнего чтения), если облако менял кто-то другой;
 * страницы прочитаны не с сервера → ключ ведёт себя как запертый (никуда не пишется).
 *
 * Логи: префикс [LEGACY-V2-SYNC], без uid и без содержимого карточек (только длины).
 */
import { cloudSyncSnapshotValueMatches, encodeCloudSyncSnapshotRecord } from './cloud_sync_snapshot_codec';
import { DebugLogger } from './debug-logger';
import {
  DEFAULT_PRE_WRITE_STORE,
  decideFlashcardPagesPreWrite,
  defaultFlashcardLocalMerge,
  finishFlashcardPagesPreWrite,
  readFlashcardPagesWriteLocks,
  type FlashcardLocalMerge,
  type FlashcardPagesPreWriteDecision,
  type FlashcardPagesPreWriteStore,
} from './flashcard_pages_read_result';
import { writeFlashcardPages, type FlashcardPagesPreWriteHook } from './flashcards_cloud_pages';
import { buildFlashcardDocFieldMarkers, decideFlashcardDocField } from './flashcards_doc_field_clear';
import type { FutureKeptLocalGroup } from './flashcards_future_kept_stash';
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
  /**
   * S1e (только force): в записанных страницах осталась облачная версия «из будущего», а локальная
   * в облако не ушла. forceSyncToCloud кладёт эти локальные версии в аварийную копию владельца.
   */
  remoteFutureKept: readonly FutureKeptLocalGroup[];
  /**
   * Языки, чьи страницы реально записаны в этот такт. Вызывающий кладёт по ним flashcardPagesRev_<язык> в тот же
   * патч users/{uid} (вопрос 27, app/flashcard_pages_rev.ts).
   */
  pagesWrittenTargets: ReadonlySet<string>;
}>;

export type FlashcardCloudUploadDeps = Readonly<{
  writePages: (
    stableId: string,
    target: StudyTarget,
    cardsJson: string,
    preWrite?: FlashcardPagesPreWriteHook,
  ) => Promise<number | null>;
  readLocks: (knownKeys: Iterable<string>) => Promise<ReadonlySet<string>>;
  /** 8N, только для тестов: отпечатки/журнал и добавление в локальный список. */
  preWriteStore?: FlashcardPagesPreWriteStore;
  mergeLocal?: FlashcardLocalMerge;
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
  /**
   * Только force при выходе: снимок последнего синка ТОГО ЖЕ владельца. Список совпадает со снимком → страницы и
   * ревизию не пишем (облако уже держит этот список). Нет — force снимку не верит, как раньше.
   */
  exitSnapshot?: Readonly<Record<string, string | null>> | null;
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
  // зачем (8N): обёртка подставляет в writePages крючок «объединить с облаком» и хранит
  // его решение по языку — вызов записи и проверки поколения в цикле остаются прежними.
  const deps = withPagesPreWrite(input.deps ?? DEFAULT_DEPS, uid);
  const previousSnapshot = mode === 'force' ? EMPTY_SNAPSHOT : input.previousSnapshot;
  const keys = FLASHCARD_CLOUD_KEYS.map(([key]) => key);
  const offloaded = new Set<string>();
  const clearDocField = new Set<string>();
  const sentToDoc = new Set<string>();
  const lockedNow = new Set<string>();
  const remoteFutureKept: FutureKeptLocalGroup[] = [];
  const pagesWrittenTargets = new Set<string>();

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
    // зачем (координатор 22.10, вопрос 27): выход переписывал страницы всегда, а с ревизией это значило +1 запись документа
    // на каждый выход (ускорение выхода 18.10 пропадало). Список тот же, что в снимке синка этого владельца, — облако уже
    // держит его: ни страниц, ни ревизии. Другой телефон верно видит «не изменилось».
    if (mode === 'force' && input.exitSnapshot) {
      const sameAsSnapshot = cloudSyncSnapshotValueMatches(input.exitSnapshot[key], value);
      console.log('[READ-TTL]', JSON.stringify({ area: 'flashcard_pages_exit', key, reason: sameAsSnapshot ? 'same_as_snapshot' : 'changed', localLen: String(value).length })); // guard-ok: ветка и значение, без uid
      if (sameAsSnapshot) {
        offloaded.add(key);
        continue;
      }
    }
    const pagesWritten = await deps.writePages(uid, target, String(value));
    if (!isCurrent()) {
      console.log(`${LOG} ${mode}_flashcards aborted reason=stale_generation stage=write_pages key=${key}`);
      return null;
    }
    const preWrite = deps.takePreWrite(target);
    if (preWrite?.kind === 'skip') {
      // зачем (8N, п.4): страницы прочитаны не с сервера — правды об облаке нет. Ключ ведёт
      // себя как запертый 8J: ни страниц, ни поля документа, снимок значение не запоминает,
      // перенос (force) отказывает. Следующий синк попробует снова.
      offloaded.add(key);
      lockedNow.add(key);
      console.log(`${LOG} ${mode === 'force' ? 'force_sync ' : ''}pages_write_skipped key=${key} reason=pre_write_${preWrite.reason} local_len=${String(value).length}`);
      if (mode === 'force') console.log(`${LOG} force_sync key=${key} decision=pages_unconfirmed result=refuse`);
      continue;
    }
    await finishFlashcardPagesPreWrite({
      owner: uid,
      key,
      target,
      decision: preWrite,
      pagesWritten,
      mode,
      store: deps.preWriteStore ?? DEFAULT_PRE_WRITE_STORE,
      mergeLocal: deps.mergeLocal ?? defaultFlashcardLocalMerge,
    });
    // зачем (S1e): перенос вот-вот сотрёт телефон, а локальные версии карточек, уступившие облачной
    // «из будущего», в страницы не ушли. Только когда страницы реально записаны: при сбое страниц
    // список целиком уезжает в документ (doc_fallback) — локальные версии и так в облаке.
    const futureKeptPairs = preWrite?.kind === 'write' ? preWrite.remoteFutureKeptPairs ?? [] : [];
    if (mode === 'force' && pagesWritten !== null && futureKeptPairs.length > 0) {
      remoteFutureKept.push({ key, target, versions: futureKeptPairs });
      console.log(`${LOG} force_sync key=${key} remote_future_kept_local=${futureKeptPairs.length}`);
    }
    if (pagesWritten !== null) pagesWrittenTargets.add(target);
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
  return { keys, offloaded, clearDocField, sentToDoc, lockedNow, remoteFutureKept, pagesWrittenTargets };
}

/** 8N: зависимости выгрузки + решения крючка «объединить с облаком» по языку. */
type PreWriteDeps = FlashcardCloudUploadDeps & Readonly<{
  /** Решение крючка для языка (и сброс). null — крючок не вызывался (страницы не читались). */
  takePreWrite: (target: StudyTarget) => FlashcardPagesPreWriteDecision | null;
}>;

/**
 * Обернуть writePages: каждая запись получает крючок, который по тому же снимку страниц,
 * что writeFlashcardPages читает ради хвоста, решает «объединить / писать как есть / не писать».
 * Подменный writePages в тестах крючок может игнорировать — тогда решения нет (как до 8N).
 */
function withPagesPreWrite(base: FlashcardCloudUploadDeps, uid: string): PreWriteDeps {
  const store = base.preWriteStore ?? DEFAULT_PRE_WRITE_STORE;
  const decisions = new Map<StudyTarget, FlashcardPagesPreWriteDecision>();
  const keyFor = (target: StudyTarget): string => FLASHCARD_CLOUD_KEYS.find(([, t]) => t === target)?.[0] ?? `target:${target}`;
  return {
    ...base,
    writePages: (stableId, target, cardsJson) => {
      decisions.delete(target);
      return base.writePages(stableId, target, cardsJson, async (existing) => {
        const decision = await decideFlashcardPagesPreWrite({
          owner: uid,
          key: keyFor(target),
          target,
          localJson: cardsJson,
          existing,
          store,
        });
        decisions.set(target, decision);
        return decision.kind === 'write' ? decision.cardsJson : null;
      });
    },
    takePreWrite: (target) => {
      const decision = decisions.get(target) ?? null;
      decisions.delete(target);
      return decision;
    },
  };
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
  /** Снимок последнего синка того же владельца — только при выходе (см. FlashcardCloudUploadInput.exitSnapshot). */
  exitSnapshot?: Readonly<Record<string, string | null>> | null;
  /** Только для тестов. */
  deps?: FlashcardCloudUploadDeps;
}>;

const PAGES_TIMEOUT = Symbol('pages_timeout');

export type ForceFlashcardFailureRecord = Readonly<{ reason: ForceFlashcardUploadFailure; atMs: number }>;

// зачем (Account V2, Пакет 8L): forceSyncToCloud отдаёт наружу только true/false, а экран смены
// аккаунта должен понять, что отказ был ИМЕННО из-за карточек (замок 8J / потолок страниц),
// чтобы перед «Сменить без сохранения» предупредить, что эти карточки удалятся с телефона.
// Храним только код причины и время — без uid и без содержимого.
let lastForceFlashcardFailure: ForceFlashcardFailureRecord | null = null;

/** Последний отказ выгрузки карточек при принудительной синхронизации (null — последняя прошла). */
export function peekLastForceFlashcardFailure(): ForceFlashcardFailureRecord | null {
  return lastForceFlashcardFailure;
}

function rememberForceFlashcardOutcome(outcome: ForceFlashcardUploadOutcome): ForceFlashcardUploadOutcome {
  lastForceFlashcardFailure = outcome.ok ? null : { reason: outcome.reason, atMs: Date.now() };
  return outcome;
}

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
  return rememberForceFlashcardOutcome(await runForceFlashcardUploadInner(input));
}

async function runForceFlashcardUploadInner(input: ForceFlashcardUploadInput): Promise<ForceFlashcardUploadOutcome> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const upload = uploadFlashcardListsToPages({
    uid: input.uid,
    data: input.data,
    previousSnapshot: EMPTY_SNAPSHOT,
    mode: 'force',
    isCurrent: input.isCurrent,
    exitSnapshot: input.exitSnapshot ?? null,
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
