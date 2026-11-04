import { readStoredItem } from './storage_snapshot';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { canonicalJsonV1, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';
import type {
  MistakeEvent,
  MistakeStudyTarget,
} from '../modules/mistake-practice/contracts';
import {
  mergeMistakeEventJournals,
  parseMistakeEventJournal,
  planMistakeEventJournalChunks,
  type MistakeEventJournal,
} from './mistake_practice_cloud_merge';
import {
  mistakePracticeEventChunkKey,
  mistakePracticeEventsKey,
  mistakePracticeManifestPageKey,
} from './target_storage_keys';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';
import {
  commitPhoneStatePracticeFact,
  mergePhoneStatePracticeFacts,
} from './phone_state_practice_bridge';
import { DebugLogger } from './debug-logger';

export interface MistakePracticeStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys?(): Promise<readonly string[]>;
}

export type MergeMistakeEventsResult = Readonly<{
  appendedCount: number;
  journal: MistakeEventJournal;
}>;

interface JournalScope {
  readonly accountScope: string;
  readonly studyTarget: MistakeStudyTarget;
  readonly storage?: MistakePracticeStorage;
  readonly onLoadProgress?: (stage: string) => void;
}

const locks = new Map<string, Promise<void>>();
// зачем ([COLD-START-IO], store-release, слабый профиль, 03.10): на холодном старте журнал ошибок читали ~24 раза подряд
// (Главная, статистика, слова, инсайты…) — каждый раз корень + страницы + куски. Одновременные чтения одного ключа
// склеиваются в одно: идущее чтение раздают тем, кто пришёл, пока оно не закончилось. Журнал неизменяем (freeze), делить
// результат безопасно. Любая запись по этому ключу сбрасывает склейку ДО и ПОСЛЕ, поэтому читатель, пришедший после
// записи, никогда не получит чтение, начатое до неё. Склейка только для хранилища по умолчанию (тестовые подмены — как раньше).
const inflightLoads = new Map<string, Promise<MistakeEventJournal>>();
// зачем (load_ceiling): живая сводка последнего чтения журнала для записи о медленной загрузке хаба
type LiveReadStats = { pagesRead: number; chunksRead: number; bytesRead: number; hashMs: number; startedAt: number; done: boolean };
let liveReadStats: LiveReadStats | null = null;
export function mistakeJournalReadSummary(): string {
  const s = liveReadStats;
  if (!s) return 'read=none';
  return `read=pages${s.pagesRead}/chunks${s.chunksRead}/bytes${s.bytesRead}/hashMs${s.hashMs}/runMs${Date.now() - s.startedAt}/done${s.done ? 1 : 0}`;
}
const loadProgress = new WeakMap<Promise<MistakeEventJournal>, { stage: string; startedAt: number; observers: Set<(stage: string) => void> }>();
const readStats = { started: 0, shared: 0 };
// Счётчик записей по журналу ошибок: кэши производных данных (счётчики Главной) сверяют его и сбрасываются на любой записи.
let journalWriteEpoch = 0;
/** Номер «поколения» журнала: растёт на каждой записи через это хранилище. */
export function mistakeJournalWriteEpoch(): number {
  return journalWriteEpoch;
}
/** Только для тестов и диагностики: сколько чтений начато и сколько склеено. */
export function mistakeJournalReadStats(): Readonly<{ started: number; shared: number }> {
  return { started: readStats.started, shared: readStats.shared };
}
/** Только для тестов. */
export function resetMistakeJournalReadStatsForTests(): void {
  readStats.started = 0;
  readStats.shared = 0;
  inflightLoads.clear();
}
const MANIFEST_PAGE_CHUNKS = 64;

async function sweepUnreachableMistakePracticeGraph(input: Readonly<{
  storage: MistakePracticeStorage;
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  reachable: ReadonlySet<string>;
  assertCurrentOwner: () => void;
}>): Promise<void> {
  if (!input.storage.getAllKeys) return;
  const hashTail = '0'.repeat(64);
  const chunkPrefix = mistakePracticeEventChunkKey(
    input.accountScope, input.studyTarget, hashTail,
  ).slice(0, -hashTail.length);
  const pagePrefix = mistakePracticeManifestPageKey(
    input.accountScope, input.studyTarget, hashTail,
  ).slice(0, -hashTail.length);
  let keys: readonly string[];
  try { keys = await input.storage.getAllKeys(); }
  catch { return; }
  input.assertCurrentOwner();
  for (const key of keys) {
    if ((!key.startsWith(chunkPrefix) && !key.startsWith(pagePrefix)) || input.reachable.has(key)) continue;
    input.assertCurrentOwner();
    try { await input.storage.removeItem(key); }
    catch (e) {
      // The committed root remains authoritative; a later sweep retries the orphan.
      DebugLogger.error('mistake_practice_store:pagePrefix', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  input.assertCurrentOwner();
}

type JournalRootV2 = Readonly<{
  version: 2;
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  headPageId: string | null;
  eventCount: number;
}>;

type JournalManifestPageV1 = Readonly<{
  version: 1;
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  chunkIds: readonly string[];
  previousPageId: string | null;
}>;

const emptyJournal = (
  accountScope: string,
  studyTarget: MistakeStudyTarget,
): MistakeEventJournal => Object.freeze({
  version: 1,
  accountScope,
  studyTarget,
  events: Object.freeze([]),
});

async function mergePhoneStateJournal(journal: MistakeEventJournal, onLoadProgress?: (stage: string) => void): Promise<MistakeEventJournal> {
  const facts = await mergePhoneStatePracticeFacts(
    'mistake',
    Object.fromEntries(journal.events.map((event) => [event.eventId, event])),
    journal.accountScope,
    onLoadProgress,
  );
  onLoadProgress?.('journal:merge');
  const merged = mergeMistakeEventJournals(journal, {
    version: 1,
    accountScope: journal.accountScope,
    studyTarget: journal.studyTarget,
    events: Object.freeze(Object.values(facts)),
  });
  // зачем (§142, логи прода 04.10: 188 отказов [MP-SYNC] event_target_mismatch с повторами): факты phone-state общие на аккаунт,
  // без языка, и попадали в журнал КАЖДОГО языка — журнал fr выгружал английские события, сервер их отклонял, клиент повторял.
  // Оставляем только события своего языка (и уже впитанные раньше чужие тоже): каждое живёт в журнале своего языка.
  const own = merged.events.filter((event) => event.studyTarget === journal.studyTarget);
  if (own.length === merged.events.length) return merged;
  const foreignByTarget: Record<string, number> = {};
  for (const event of merged.events) {
    if (event.studyTarget !== journal.studyTarget) foreignByTarget[String(event.studyTarget)] = (foreignByTarget[String(event.studyTarget)] ?? 0) + 1;
  }
  console.warn('[MISTAKE-JOURNAL] foreign_target_facts', JSON.stringify({ studyTarget: journal.studyTarget, kept: own.length, dropped: merged.events.length - own.length, foreignByTarget }));
  return Object.freeze({ ...merged, events: Object.freeze(own) });
}

const normalizedScope = (value: string): string => {
  const scope = String(value ?? '').trim();
  if (!scope) throw new Error('mistake_practice_account_scope_required');
  return scope;
};

async function withJournalLock<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  locks.set(key, queued);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (locks.get(key) === queued) locks.delete(key);
  }
}

// зачем (замер Сверки 21.10, Galaxy A04, «работа над ошибками тормозит»): каждый ответ перечитывал и перехешировал ВЕСЬ журнал,
// перезаписывал ВСЕ куски и делал getAllKeys по всему хранилищу. Кусок и страница адресуются хешем содержимого и неизменяемы,
// а жадное разбиение префикс-устойчиво — при дописывании «позже всех» меняется только хвостовой кусок. Поэтому помним граф,
// который сами записали/прочитали (по значению корня), и дальше: читаем граф только при смене корня, пишем только новое,
// чистим только то, что перестало быть достижимым. Корень в хранилище не совпал с запомненным (стирание аккаунта, чужая запись,
// ошибка) — кэш выбрасывается и работает прежний полный путь. Формат на диске НЕ менялся. Откат: флаг ниже.
export const MISTAKE_JOURNAL_GRAPH_CACHE_ENABLED = true;

type JournalGraphState = {
  rootRaw: string;
  /** Журнал из графа БЕЗ слияния с phone-state (его сливаем заново при каждом чтении). */
  base: MistakeEventJournal;
  /** Ключи кусков и страниц, достижимых из rootRaw (все они физически лежат в хранилище). */
  reachable: ReadonlySet<string>;
  /** Канонический текст кусков по порядку и их id — чтобы не хешировать неизменившееся. */
  chunks: readonly Readonly<{ encoded: string; id: string }>[];
};

const graphCaches = new WeakMap<object, Map<string, JournalGraphState>>();
const graphCacheOf = (storage: MistakePracticeStorage): Map<string, JournalGraphState> => {
  let cache = graphCaches.get(storage);
  if (!cache) {
    cache = new Map();
    graphCaches.set(storage, cache);
  }
  return cache;
};

/** Журналы, у которых в этом запуске уже прошла полная чистка хранилища (сироты после сбоя). */
const fullSweeps = new WeakMap<object, Set<string>>();
const fullSweepDone = (storage: MistakePracticeStorage): Set<string> => {
  let done = fullSweeps.get(storage);
  if (!done) {
    done = new Set();
    fullSweeps.set(storage, done);
  }
  return done;
};

/** Только для тестов: «перезапуск» — сбросить кэш графа и отметки полной чистки. */
export function resetMistakeJournalGraphCacheForTests(storage: MistakePracticeStorage): void {
  graphCaches.delete(storage);
  fullSweeps.delete(storage);
}

async function persistMistakeEventJournal(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  storage: MistakePracticeStorage;
  key: string;
  journal: MistakeEventJournal;
  assertCurrentOwner: () => void;
}>): Promise<void> {
  const cache = graphCacheOf(input.storage);
  const useCache = MISTAKE_JOURNAL_GRAPH_CACHE_ENABLED;
  let previousState = useCache ? cache.get(input.key) : undefined;
  if (previousState) {
    // корень в хранилище обязан совпасть с запомненным, иначе граф могли стереть/заменить — тогда пишем всё и чистим полностью
    let storedRoot: string | null = null;
    try { storedRoot = await input.storage.getItem(input.key); }
    catch (e) {
      DebugLogger.error('mistake_practice_store:persistRootCheck', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    if (storedRoot !== previousState.rootRaw) {
      console.warn('[MISTAKE-JOURNAL] graph_cache_dropped', JSON.stringify({ studyTarget: input.studyTarget, reason: 'root_changed' }));
      previousState = undefined;
    }
  }
  cache.delete(input.key); // на время записи кэш недействителен: при любой ошибке остаётся пустым
  const previousIds = new Map<string, string>();
  previousState?.chunks.forEach((chunk) => previousIds.set(chunk.encoded, chunk.id));
  const knownKeys = previousState?.reachable;

  const chunkIds: string[] = [];
  const plannedChunks: { encoded: string; id: string }[] = [];
  const reachableGraphKeys = new Set<string>();
  let written = 0;
  for (const planned of planMistakeEventJournalChunks(input.journal)) {
    const encoded = planned.encoded;
    const chunkId = previousIds.get(encoded) ?? sha256Utf8(encoded);
    const chunkKey = mistakePracticeEventChunkKey(input.accountScope, input.studyTarget, chunkId);
    if (!knownKeys?.has(chunkKey)) {
      await input.storage.setItem(chunkKey, encoded);
      written += 1;
    }
    reachableGraphKeys.add(chunkKey);
    chunkIds.push(chunkId);
    plannedChunks.push({ encoded, id: chunkId });
  }
  let previousPageId: string | null = null;
  for (let offset = 0; offset < chunkIds.length; offset += MANIFEST_PAGE_CHUNKS) {
    const page: JournalManifestPageV1 = Object.freeze({
      version: 1,
      accountScope: input.accountScope,
      studyTarget: input.studyTarget,
      chunkIds: Object.freeze(chunkIds.slice(offset, offset + MANIFEST_PAGE_CHUNKS)),
      previousPageId,
    });
    const encoded = canonicalJsonV1(page);
    const pageId = sha256Utf8(encoded);
    const pageKey = mistakePracticeManifestPageKey(input.accountScope, input.studyTarget, pageId);
    if (!knownKeys?.has(pageKey)) {
      await input.storage.setItem(pageKey, encoded);
      written += 1;
    }
    reachableGraphKeys.add(pageKey);
    previousPageId = pageId;
  }
  const root: JournalRootV2 = Object.freeze({
    version: 2,
    accountScope: input.accountScope,
    studyTarget: input.studyTarget,
    headPageId: previousPageId,
    eventCount: input.journal.events.length,
  });
  const rootRaw = canonicalJsonV1(root);
  input.assertCurrentOwner();
  await input.storage.setItem(input.key, rootRaw);
  input.assertCurrentOwner();
  // зачем (сторож «crash orphans», 24.10): кэш графа наполняется уже при ЧТЕНИИ журнала, поэтому после перезапуска полная
  // чистка не запускалась никогда — куски, недописанные при сбое, лежали вечно. Полная чистка — один раз за запуск на журнал,
  // дальше точечная (getAllKeys по всему хранилищу на каждый ответ остаётся убранным).
  const fullSweepKey = `${input.key}`;
  const needsFullSweep = previousState !== undefined && !fullSweepDone(input.storage).has(fullSweepKey);
  if (previousState && !needsFullSweep) {
    // точечная чистка: удаляем только ключи, что были достижимы раньше и перестали быть (без getAllKeys по всему хранилищу)
    for (const oldKey of previousState.reachable) {
      if (reachableGraphKeys.has(oldKey)) continue;
      input.assertCurrentOwner();
      try { await input.storage.removeItem(oldKey); }
      catch (e) {
        DebugLogger.error('mistake_practice_store:targetedSweep', e instanceof Error ? e : new Error(String(e)), 'warning');
      }
    }
    input.assertCurrentOwner();
  } else {
    await sweepUnreachableMistakePracticeGraph({
      storage: input.storage,
      accountScope: input.accountScope,
      studyTarget: input.studyTarget,
      reachable: reachableGraphKeys,
      assertCurrentOwner: input.assertCurrentOwner,
    });
    fullSweepDone(input.storage).add(fullSweepKey);
  }
  console.log('[MISTAKE-JOURNAL] persisted', JSON.stringify({
    studyTarget: input.studyTarget, events: input.journal.events.length, chunks: plannedChunks.length,
    written, incremental: Boolean(previousState), fullSweep: !previousState || needsFullSweep,
  }));
  if (useCache) {
    cache.set(input.key, { rootRaw, base: input.journal, reachable: reachableGraphKeys, chunks: plannedChunks });
  }
}

async function loadMistakeEventJournalFresh(
  input: JournalScope,
): Promise<MistakeEventJournal> {
  const accountScope = normalizedScope(input.accountScope);
  const storage = input.storage ?? AsyncStorage;
  // зачем (§122, замер 04.10: чтение корня журнала ×17, страниц ×5, кусков ×5 за старт): для боевого хранилища читаем через снапшот —
  // хранилище один раз, дальше память; любая запись (в т.ч. под замком записи журнала) выбрасывает ключ. Страницы и куски журнала
  // адресуются хешем содержимого, корень меняется только записью. Подставное хранилище (тесты) читается напрямую.
  // зачем (замер fin3): mergeMistakeEvents передаёт сюда уже разрешённое хранилище (то же AsyncStorage) — это боевой путь, не подставное
  const getRaw = input.storage && input.storage !== AsyncStorage
    ? (rawKey: string): Promise<string | null> => storage.getItem(rawKey)
    : readStoredItem;
  const progress = input.onLoadProgress;
  // зачем (load_ceiling 417 за 7 дней, координатор 04.11: «сперва логи»): время каждой фазы, размер журнала и источник.
  // Лог [MISTAKES-HUB] journal:read показывает, ГДЕ уходят секунды (корень/страницы/куски/хеш/слияние), без догадок.
  const readStartedAt = Date.now();
  // зачем: в релизе console.log вырезан — сводку чтения (в т.ч. НЕЗАВЕРШЁННОГО) отдаём функцией для записи о потолке хаба
  const live = { pagesRead: 0, chunksRead: 0, bytesRead: 0, hashMs: 0, startedAt: readStartedAt, done: false };
  liveReadStats = live;
  let pagesRead = 0;
  let chunksRead = 0;
  let bytesRead = 0;
  let hashMs = 0;
  let lastYieldAt = Date.now();
  const readSource0 = getRaw === readStoredItem ? 'snapshot' : 'storage';
  const finishRead = (journal: Promise<MistakeEventJournal>, kind: string): Promise<MistakeEventJournal> => {
    const readyAt = Date.now();
    return journal.then((result) => {
      live.pagesRead = pagesRead; live.chunksRead = chunksRead; live.bytesRead = bytesRead; live.hashMs = hashMs; live.done = true;
      console.log('[MISTAKES-HUB] journal:read', JSON.stringify({ studyTarget: input.studyTarget, kind, source: readSource0, events: result.events.length, pages: pagesRead, chunks: chunksRead, bytes: bytesRead, hashMs, readMs: readyAt - readStartedAt, mergeMs: Date.now() - readyAt, totalMs: Date.now() - readStartedAt })); // guard-ok: итог чтения с фазами
      return result;
    });
  };
  progress?.('journal:root_read');
  const raw = await getRaw(mistakePracticeEventsKey(accountScope, input.studyTarget));
  bytesRead += raw ? raw.length : 0;
  if (!raw) return finishRead(mergePhoneStateJournal(emptyJournal(accountScope, input.studyTarget), progress), 'empty');
  progress?.('journal:root_parse');
  // зачем (§126 п.5, 04.10): «Мои ошибки» не открывались с mistake_practice_events_corrupt, но восемь проверок
  // бросали одну и ту же ошибку молча — неизвестно, какая сработала и не виноват ли снапшот чтения (§122).
  const readSource = getRaw === readStoredItem ? 'snapshot' : 'storage';
  function corruptJournal(reason: string, detail: Record<string, unknown> = {}): never {
    console.warn('[MISTAKE-JOURNAL] corrupt', JSON.stringify({ reason, studyTarget: input.studyTarget, readSource, ...detail }));
    throw new Error('mistake_practice_events_corrupt');
  }
  const short = (id: unknown): string => String(id ?? '').slice(0, 8);
  let rootCandidate: unknown;
  try { rootCandidate = JSON.parse(raw); } catch (e) {
      // v1 parser reports canonical error
      DebugLogger.error('mistake_practice_store:raw', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  if (
    rootCandidate && typeof rootCandidate === 'object' && !Array.isArray(rootCandidate)
    && (rootCandidate as { version?: unknown }).version === 2
  ) {
    const root = rootCandidate as Partial<JournalRootV2>;
    if (root.accountScope !== accountScope || root.studyTarget !== input.studyTarget ||
      !Number.isSafeInteger(root.eventCount) || Number(root.eventCount) < 0 ||
      (root.headPageId !== null && (typeof root.headPageId !== 'string' || !/^[a-f0-9]{64}$/.test(root.headPageId)))) {
      corruptJournal('root_invalid', {
        scopeMatches: root.accountScope === accountScope, targetMatches: root.studyTarget === input.studyTarget,
        eventCount: root.eventCount ?? null, headPage: short(root.headPageId),
      });
    }
    // граф с этим корнем мы уже читали/писали — страницы и куски неизменяемы, перечитывать и хешировать их заново не нужно
    const graphCache = MISTAKE_JOURNAL_GRAPH_CACHE_ENABLED ? graphCacheOf(storage) : null;
    const cacheKey = mistakePracticeEventsKey(accountScope, input.studyTarget);
    const cachedGraph = graphCache?.get(cacheKey);
    if (cachedGraph && cachedGraph.rootRaw === raw) {
      return finishRead(mergePhoneStateJournal(cachedGraph.base, progress), 'graph_cache_hit');
    }
    const reversedPages: JournalManifestPageV1[] = [];
    const visited = new Set<string>();
    let pageId = root.headPageId;
    while (pageId) {
      if (visited.has(pageId) || visited.size > 10_000) corruptJournal('page_cycle', { page: short(pageId), visited: visited.size });
      visited.add(pageId);
      progress?.(`journal:page_read:${visited.size}`);
      const pageRaw = await getRaw(mistakePracticeManifestPageKey(accountScope, input.studyTarget, pageId));
      progress?.('journal:page_validate');
      pagesRead += 1;
      bytesRead += pageRaw ? (pageRaw as string).length : 0;
      live.pagesRead = pagesRead; live.bytesRead = bytesRead;
      if (!pageRaw) corruptJournal('page_missing', { page: short(pageId), pagesRead: visited.size });
      let page: JournalManifestPageV1;
      try { page = JSON.parse(pageRaw as string) as JournalManifestPageV1; } catch { corruptJournal('page_parse', { page: short(pageId), length: (pageRaw as string).length }); }
      if (sha256Utf8(canonicalJsonV1(page)) !== pageId || page.version !== 1 ||
        page.accountScope !== accountScope || page.studyTarget !== input.studyTarget ||
        !Array.isArray(page.chunkIds) || page.chunkIds.length > MANIFEST_PAGE_CHUNKS ||
        !page.chunkIds.every((id) => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id)) ||
        (page.previousPageId !== null && !/^[a-f0-9]{64}$/.test(page.previousPageId))) {
        corruptJournal('page_invalid', {
          page: short(pageId), hashMatches: sha256Utf8(canonicalJsonV1(page)) === pageId, version: page.version ?? null,
          scopeMatches: page.accountScope === accountScope, targetMatches: page.studyTarget === input.studyTarget,
          chunks: Array.isArray(page.chunkIds) ? page.chunkIds.length : null,
        });
      }
      reversedPages.push(page);
      pageId = page.previousPageId;
    }
    let journal = emptyJournal(accountScope, input.studyTarget);
    const graphKeys = new Set<string>();
    const graphChunks: { encoded: string; id: string }[] = [];
    for (const pageId of visited) graphKeys.add(mistakePracticeManifestPageKey(accountScope, input.studyTarget, pageId));
    for (const page of reversedPages.reverse()) {
      for (const chunkId of page.chunkIds) {
        const chunkKey = mistakePracticeEventChunkKey(accountScope, input.studyTarget, chunkId);
        progress?.(`journal:chunk_read:${graphChunks.length + 1}`);
        const chunkRaw = await getRaw(chunkKey);
        progress?.('journal:chunk_validate');
        chunksRead += 1;
        bytesRead += chunkRaw ? (chunkRaw as string).length : 0;
        if (!chunkRaw) corruptJournal('chunk_missing', { chunk: short(chunkId), page: short(page.previousPageId) });
        const hashStartedAt = Date.now();
        const chunkHashOk = sha256Utf8(chunkRaw as string) === chunkId;
        hashMs += Date.now() - hashStartedAt;
        if (!chunkHashOk) corruptJournal('chunk_hash', { chunk: short(chunkId), length: (chunkRaw as string).length });
        journal = mergeMistakeEventJournals(journal, parseMistakeEventJournal(chunkRaw));
        graphKeys.add(chunkKey);
        graphChunks.push({ encoded: chunkRaw as string, id: chunkId });
        // зачем (load_ceiling): хеш/разбор/слияние кусков идут на JS-потоке; на слабом телефоне длинный журнал держал его секундами,
        // и таймер потолка срабатывал с опозданием. Порядок и проверки те же — только уступаем поток каждые ~12 мс работы.
        live.pagesRead = pagesRead; live.chunksRead = chunksRead; live.bytesRead = bytesRead; live.hashMs = hashMs;
        if (Date.now() - lastYieldAt > 12) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          lastYieldAt = Date.now();
        }
      }
    }
    if (journal.events.length !== root.eventCount) {
      corruptJournal('event_count_mismatch', { expected: root.eventCount, actual: journal.events.length, pages: reversedPages.length });
    }
    // кэш графа кладём только для боевого/явного хранилища и только после полной проверки хешей и счёта событий
    graphCache?.set(cacheKey, { rootRaw: raw, base: journal, reachable: graphKeys, chunks: graphChunks });
    return finishRead(mergePhoneStateJournal(journal, progress), 'graph_full_read');
  }
  const parsed = parseMistakeEventJournal(raw);
  if (
    parsed.accountScope !== accountScope
    || parsed.studyTarget !== input.studyTarget
  ) {
    return finishRead(mergePhoneStateJournal(emptyJournal(accountScope, input.studyTarget), progress), 'legacy_scope_mismatch');
  }
  return finishRead(mergePhoneStateJournal(parsed, progress), 'legacy_single_root');
}

export function loadMistakeEventJournal(
  input: JournalScope,
): Promise<MistakeEventJournal> {
  if (input.storage) return loadMistakeEventJournalFresh(input);
  const key = mistakePracticeEventsKey(normalizedScope(input.accountScope), input.studyTarget);
  const running = inflightLoads.get(key);
  if (running) {
    readStats.shared += 1;
    const trace = loadProgress.get(running);
    // зачем (load_ceiling): второе чтение садится на уже идущее — видно, сколько оно идёт и на каком шаге
    console.log('[MISTAKES-HUB] journal:shared', JSON.stringify({ studyTarget: input.studyTarget, stage: trace?.stage ?? null, runningMs: trace ? Date.now() - trace.startedAt : null, shared: readStats.shared })); // guard-ok: ветвление shared
    if (trace && input.onLoadProgress) {
      trace.observers.add(input.onLoadProgress);
      input.onLoadProgress(trace.stage);
    }
    return running;
  }
  readStats.started += 1;
  const trace = { stage: 'journal:root_read', startedAt: Date.now(), observers: new Set<(stage: string) => void>() };
  console.log('[MISTAKES-HUB] journal:started', JSON.stringify({ studyTarget: input.studyTarget, started: readStats.started })); // guard-ok: ветвление started
  if (input.onLoadProgress) trace.observers.add(input.onLoadProgress);
  const started = loadMistakeEventJournalFresh({ ...input, onLoadProgress: (stage) => {
    trace.stage = stage;
    trace.observers.forEach((observer) => observer(stage));
  } });
  loadProgress.set(started, trace);
  inflightLoads.set(key, started);
  const clear = (): void => {
    trace.observers.clear();
    if (inflightLoads.get(key) === started) inflightLoads.delete(key);
  };
  started.then(clear, clear);
  return started;
}

export async function appendMistakeEvent(
  input: JournalScope & { readonly event: MistakeEvent },
): Promise<Readonly<{ appended: boolean; journal: MistakeEventJournal }>> {
  const result = await mergeMistakeEvents({ ...input, events: [input.event] });
  return Object.freeze({ appended: result.appendedCount === 1, journal: result.journal });
}

export async function mergeMistakeEvents(
  input: JournalScope & { readonly events: readonly MistakeEvent[] },
): Promise<MergeMistakeEventsResult> {
  const accountScope = normalizedScope(input.accountScope);
  if (input.events.some((event) => event.studyTarget !== input.studyTarget)) {
    throw new Error('mistake_practice_event_target_mismatch');
  }
  const storage = input.storage ?? AsyncStorage;
  const key = mistakePracticeEventsKey(accountScope, input.studyTarget);
  const generation = captureAccountGeneration();
  const assertCurrentOwner = () => {
    if (
      generation.phase !== 'uninitialized'
      && !isCurrentAccountGeneration(generation, accountScope)
    ) throw new Error('stale_account_generation');
  };
  return withAccountTransitionLock(() => withJournalLock(key, async () => {
    inflightLoads.delete(key);
    try {
    assertCurrentOwner();
    // зачем: под замком записи читаем СВЕЖЕЕ состояние, не склеенное с чужим чтением
    const current = await loadMistakeEventJournalFresh({
      accountScope,
      studyTarget: input.studyTarget,
      storage,
    });
    const currentIds = new Set(current.events.map((event) => event.eventId));
    const journal = mergeMistakeEventJournals(current, {
      version: 1,
      accountScope,
      studyTarget: input.studyTarget,
      events: input.events,
    });
    const appendedCount = journal.events.reduce(
      (count, event) => count + (currentIds.has(event.eventId) ? 0 : 1),
      0,
    );
    if (appendedCount === 0) {
      return Object.freeze({ appendedCount, journal });
    }
    assertCurrentOwner();
    for (const event of journal.events) {
      if (currentIds.has(event.eventId)) continue;
      await commitPhoneStatePracticeFact('mistake', event.eventId, event, accountScope);
      assertCurrentOwner();
    }
    await persistMistakeEventJournal({
      storage,
      accountScope,
      studyTarget: input.studyTarget,
      key,
      journal,
      assertCurrentOwner,
    });
    return Object.freeze({ appendedCount, journal });
    } finally {
      journalWriteEpoch += 1;
      inflightLoads.delete(key);
    }
  }));
}
