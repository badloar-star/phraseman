import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';


const FUNCTIONS_REGION = 'us-central1';
const STUDY_TARGETS = new Set(['en', 'es', 'fr', 'de']);
/** Каталог одинаков для всех (не персональные данные) — ключ на устройство, без uid. */
const CACHE_KEY_PREFIX = 'dialogue_v2_catalogue_cache_v1:';
const CACHE_SCHEMA = 'dialogue-v2-catalogue-cache.v1';
/** зачем (Firebase-экономия, задача 01.10): сеть не чаще раза в 12 ч на язык. */
export const DIALOGUE_V2_CATALOGUE_REFRESH_MS = 12 * 60 * 60 * 1000;
/** Полный каталог — ровно 76 сценариев (shared/dialogue_v2_catalogue_index). */
const FULL_CATALOGUE_SIZE = 76;

export type DialogueV2CatalogueStudyTarget = 'en' | 'es' | 'fr' | 'de';
export type DialogueV2CatalogueSource = 'network' | 'cache' | 'embedded';

/**
 * This envelope is intentionally not trusted content. Callers must pass it
 * through `projectReleasedDialogueV2Catalogue` before displaying any row.
 */
export type DialogueV2CatalogueReleaseEnvelope = Readonly<{
  ok: true;
  packets: readonly unknown[];
}>;

/** Callable failures may disclose release-operational details; do not expose them in UI. */
export class DialogueV2CatalogueUnavailableError extends Error {
  constructor(message = 'catalogue_release_unavailable') {
    super(message);
    this.name = 'DialogueV2CatalogueUnavailableError';
  }
}

type PlainRecord = Record<string, unknown>;

function plainRecord(value: unknown): PlainRecord | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string')) return null;
    for (const descriptor of Object.values(descriptors)) {
      if (!descriptor.enumerable || !('value' in descriptor)) return null;
    }
    return value as PlainRecord;
  } catch {
    return null;
  }
}

function hasExactKeys(value: PlainRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function safeStudyTarget(value: unknown): value is DialogueV2CatalogueStudyTarget {
  return typeof value === 'string' && STUDY_TARGETS.has(value);
}

function safeEnvelope(value: unknown): DialogueV2CatalogueReleaseEnvelope | null {
  const envelope = plainRecord(value);
  if (!envelope || !hasExactKeys(envelope, ['ok', 'packets']) || envelope.ok !== true) {
    return null;
  }
  if (!Array.isArray(envelope.packets) || Object.getPrototypeOf(envelope.packets) !== Array.prototype) {
    return null;
  }
  return Object.freeze({
    ok: true,
    packets: Object.freeze([...envelope.packets]),
  });
}

/**
 * Тот же выпуск по содержимому. Каталог ~95 КБ — сравнение строк занимает миллисекунды.
 * зачем (Сверка cold5a/b 23:30: fetch_apply sameEnvelope=false → проекция 90–122 мс и перерисовка хаба при КАЖДОМ
 * приходе из сети, хотя выпуск не менялся): равный по содержимому конверт отдаём тем же объектом, что уже на экране.
 */
function samePackets(left: DialogueV2CatalogueReleaseEnvelope, right: DialogueV2CatalogueReleaseEnvelope): boolean {
  if (left === right) return true;
  if (left.packets.length !== right.packets.length) return false;
  try {
    return JSON.stringify(left.packets) === JSON.stringify(right.packets);
  } catch (error: unknown) {
    // Несериализуемый пакет — считаем разными: лучше лишняя перерисовка, чем устаревший каталог.
    console.warn('[DIALOGUE-V2] catalogue:compare_failed', error instanceof Error ? error.message : String(error));
    return false;
  }
}

function envelopeFromPackets(packets: unknown): DialogueV2CatalogueReleaseEnvelope | null {
  return Array.isArray(packets) && packets.length === FULL_CATALOGUE_SIZE
    ? Object.freeze({ ok: true as const, packets: Object.freeze([...packets]) })
    : null;
}

/**
 * Встроенный снимок learner-каталога (scripts/dialogue_v2_embedded_release.ts, тот
 * же одобренный кандидат, что и серверный выпуск). Ленивый require по языку:
 * Metro кладёт все четыре файла в бандл, но вычисляется только нужный.
 */
function requireEmbeddedSnapshot(studyTarget: DialogueV2CatalogueStudyTarget): unknown {
  switch (studyTarget) {
    case 'en': return require('../shared/generated/dialogue_v2_learner_catalogue.en.json');
    case 'es': return require('../shared/generated/dialogue_v2_learner_catalogue.es.json');
    case 'fr': return require('../shared/generated/dialogue_v2_learner_catalogue.fr.json');
    case 'de': return require('../shared/generated/dialogue_v2_learner_catalogue.de.json');
    default: return null;
  }
}

const embeddedCache = new Map<DialogueV2CatalogueStudyTarget, DialogueV2CatalogueReleaseEnvelope | null>();

/** Встроенный каталог языка; null — только если снимок повреждён (по сути никогда). */
export function getEmbeddedDialogueV2Catalogue(
  studyTarget: DialogueV2CatalogueStudyTarget,
): DialogueV2CatalogueReleaseEnvelope | null {
  if (!safeStudyTarget(studyTarget)) return null;
  if (embeddedCache.has(studyTarget)) return embeddedCache.get(studyTarget) ?? null;
  let envelope: DialogueV2CatalogueReleaseEnvelope | null = null;
  try {
    const snapshot = plainRecord(requireEmbeddedSnapshot(studyTarget));
    envelope = snapshot?.studyTarget === studyTarget ? envelopeFromPackets(snapshot.packets) : null;
    if (!envelope) {
      console.warn('[DIALOGUE-V2] catalogue:embedded_invalid', JSON.stringify({
        studyTarget, schemaVersion: snapshot?.schemaVersion ?? null,
      }));
    }
  } catch (error) {
    console.warn('[DIALOGUE-V2] catalogue:embedded_load_failed', JSON.stringify({
      studyTarget, message: error instanceof Error ? error.message : String(error),
    }));
  }
  embeddedCache.set(studyTarget, envelope);
  return envelope;
}

/**
 * Raw network call. Fetches only a server-authorized V2 release candidate for one
 * learning language. This request never carries rank, ownership, subscription,
 * usage, transcript or audio data; those concerns cannot alter catalogue release.
 * Throws DialogueV2CatalogueUnavailableError on callable failure.
 */
export async function fetchDialogueV2CatalogueFromNetwork(
  studyTarget: DialogueV2CatalogueStudyTarget,
): Promise<DialogueV2CatalogueReleaseEnvelope | null> {
  if (!safeStudyTarget(studyTarget)) return null;

  try {
    // ВРЕМЕННО ([DIALOGS-OPEN], Сверка cold5b: JS стоит 2605 мс и отпускает ровно к fetch_done 2607 мс): по стадиям —
    // сколько стоит синхронная подготовка вызова и сколько идёт ожидание ответа. Снять после разбора.
    const prepareStart = Date.now();
    const callable = httpsCallable<Readonly<{ studyTarget: DialogueV2CatalogueStudyTarget }>, unknown>(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'dialogueV2Catalogue',
    );
    const startedAt = Date.now();
    console.log('[DIALOGS-OPEN] fetch:callable_ready', JSON.stringify({ studyTarget, prepareMs: startedAt - prepareStart }));
    const response = await callable(Object.freeze({ studyTarget }));
    console.log('[DIALOGS-OPEN] fetch:response', JSON.stringify({ studyTarget, awaitMs: Date.now() - startedAt }));
    const envelope = safeEnvelope(response.data);
    // зачем (правило «сперва логи»): отказ формы ответа раньше молча давал «Диалоги недоступны».
    if (!envelope) {
      const data = plainRecord(response.data);
      console.warn('[DIALOGUE-V2] catalogue:rejected_envelope', JSON.stringify({
        studyTarget, ms: Date.now() - startedAt, keys: data ? Object.keys(data) : null, ok: data?.ok ?? null,
      }));
    }
    return envelope;
  } catch (error: unknown) {
    const code = (error as { code?: unknown } | null)?.code;
    console.warn('[DIALOGUE-V2] catalogue:callable_failed', JSON.stringify({
      studyTarget, code: typeof code === 'string' ? code : null, message: error instanceof Error ? error.message : String(error),
    }));
    throw new DialogueV2CatalogueUnavailableError();
  }
}

type CacheEntry = Readonly<{
  /** Когда последний раз ходили в сеть (успех ИЛИ отказ) — основа 12-часового окна. */
  checkedAtMs: number;
  envelope: DialogueV2CatalogueReleaseEnvelope | null;
}>;

const memoryCache = new Map<DialogueV2CatalogueStudyTarget, CacheEntry>();
const hydrations = new Map<DialogueV2CatalogueStudyTarget, Promise<CacheEntry | null>>();
const refreshes = new Map<DialogueV2CatalogueStudyTarget, Promise<DialogueV2CatalogueReleaseEnvelope | null>>();

function parseCacheEntry(raw: string | null): CacheEntry | null {
  if (!raw) return null;
  try {
    const value = plainRecord(JSON.parse(raw));
    if (!value || value.schemaVersion !== CACHE_SCHEMA
      || typeof value.checkedAtMs !== 'number' || !Number.isFinite(value.checkedAtMs)) return null;
    return Object.freeze({
      checkedAtMs: value.checkedAtMs,
      envelope: value.packets === null ? null : envelopeFromPackets(value.packets),
    });
  } catch (error) {
    console.warn('[DIALOGUE-V2] catalogue:cache_parse_failed', error instanceof Error ? error.message : String(error));
    return null;
  }
}

function hydrateCache(studyTarget: DialogueV2CatalogueStudyTarget): Promise<CacheEntry | null> {
  const existing = memoryCache.get(studyTarget);
  if (existing) return Promise.resolve(existing);
  const pending = hydrations.get(studyTarget);
  if (pending) return pending;
  const hydration = AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${studyTarget}`)
    .then((raw) => {
      const entry = parseCacheEntry(raw);
      // Сеть могла успеть раньше чтения диска — свежее значение не затираем.
      if (entry && !memoryCache.has(studyTarget)) memoryCache.set(studyTarget, entry);
      return memoryCache.get(studyTarget) ?? null;
    })
    .catch((error: unknown) => {
      console.warn('[DIALOGUE-V2] catalogue:cache_read_failed', JSON.stringify({
        studyTarget, message: error instanceof Error ? error.message : String(error),
      }));
      return null;
    })
    .finally(() => { hydrations.delete(studyTarget); });
  hydrations.set(studyTarget, hydration);
  return hydration;
}

function persistCacheEntry(studyTarget: DialogueV2CatalogueStudyTarget, entry: CacheEntry): void {
  memoryCache.set(studyTarget, entry);
  const payload = JSON.stringify({
    schemaVersion: CACHE_SCHEMA,
    checkedAtMs: entry.checkedAtMs,
    packets: entry.envelope ? entry.envelope.packets : null,
  });
  AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${studyTarget}`, payload).catch((error: unknown) => {
    console.warn('[DIALOGUE-V2] catalogue:cache_write_failed', JSON.stringify({
      studyTarget, message: error instanceof Error ? error.message : String(error),
    }));
  });
}

function bestAvailable(
  studyTarget: DialogueV2CatalogueStudyTarget,
): Readonly<{ envelope: DialogueV2CatalogueReleaseEnvelope | null; source: DialogueV2CatalogueSource }> {
  const cached = memoryCache.get(studyTarget)?.envelope;
  if (cached) return { envelope: cached, source: 'cache' };
  return { envelope: getEmbeddedDialogueV2Catalogue(studyTarget), source: 'embedded' };
}

/**
 * Синхронно для первого кадра: кэш этого запуска, иначе встроенный снимок.
 * зачем: экран показывает каталог сразу, без «Загрузка…» и без сети.
 */
export function peekDialogueV2Catalogue(
  studyTarget: DialogueV2CatalogueStudyTarget,
): DialogueV2CatalogueReleaseEnvelope | null {
  return safeStudyTarget(studyTarget) ? bestAvailable(studyTarget).envelope : null;
}

function refreshFromNetwork(
  studyTarget: DialogueV2CatalogueStudyTarget,
  nowMs: number,
): Promise<DialogueV2CatalogueReleaseEnvelope | null> {
  const pending = refreshes.get(studyTarget);
  if (pending) return pending;
  const previous = memoryCache.get(studyTarget)?.envelope ?? null;
  const refresh = fetchDialogueV2CatalogueFromNetwork(studyTarget)
    .then((network) => {
      const fresh = network ? envelopeFromPackets(network.packets) : null;
      // Тот же выпуск — тот же объект, что уже на экране (кэш этого запуска или встроенный снимок): хаб сравнивает
      // конверты по ссылке и не пересчитывает проекцию и не перерисовывается.
      const shown = bestAvailable(studyTarget).envelope;
      const compareStart = Date.now();
      const sameAsShown = Boolean(fresh && shown && samePackets(shown, fresh));
      const envelope = sameAsShown ? shown : fresh;
      console.log('[DIALOGS-OPEN] fetch:compare', JSON.stringify({ studyTarget, sameAsShown, compareMs: Date.now() - compareStart }));
      if (network && !fresh) {
        console.warn('[DIALOGUE-V2] catalogue:network_incomplete', JSON.stringify({
          studyTarget, packets: network.packets.length,
        }));
      }
      persistCacheEntry(studyTarget, { checkedAtMs: nowMs, envelope: envelope ?? previous });
      console.info('[DIALOGUE-V2] catalogue:refresh', JSON.stringify({
        studyTarget, result: envelope ? 'network' : 'kept_previous', hadPrevious: Boolean(previous), sameAsShown,
      }));
      return envelope;
    })
    .catch((error: unknown) => {
      // Причина уже в catalogue:callable_failed; окно 12 ч действует и на отказ —
      // невыложенная функция не должна дёргаться на каждом входе в хаб.
      persistCacheEntry(studyTarget, { checkedAtMs: nowMs, envelope: previous });
      console.warn('[DIALOGUE-V2] catalogue:refresh_failed', JSON.stringify({
        studyTarget, error: error instanceof Error ? error.name : String(error), fallback: previous ? 'cache' : 'embedded',
      }));
      return null;
    })
    .finally(() => { refreshes.delete(studyTarget); });
  refreshes.set(studyTarget, refresh);
  return refresh;
}

export type DialogueV2CatalogueLoadOptions = Readonly<{
  /** true — дождаться фонового обновления (хаб), false — вернуть лучшее сразу. */
  awaitRefresh?: boolean;
  nowMs?: number;
}>;

/**
 * «Кэш → встроенное → фон». НИКОГДА не бросает: любая ошибка — только лог
 * [DIALOGUE-V2]. Сеть — не чаще раза в 12 ч на язык (Firebase-экономия).
 * null — только для неподдержанного языка или повреждённого встроенного снимка.
 */
export async function fetchReleasedDialogueV2Catalogue(
  studyTarget: DialogueV2CatalogueStudyTarget,
  options: DialogueV2CatalogueLoadOptions = {},
): Promise<DialogueV2CatalogueReleaseEnvelope | null> {
  if (!safeStudyTarget(studyTarget)) {
    console.warn('[DIALOGUE-V2] catalogue:unsupported_target', JSON.stringify({ studyTarget }));
    return null;
  }
  const nowMs = options.nowMs ?? Date.now();
  const hydrateStart = Date.now();
  const entry = await hydrateCache(studyTarget);
  // ВРЕМЕННО ([DIALOGS-OPEN]): чтение кэша с диска — одна из стадий до сети.
  console.log('[DIALOGS-OPEN] fetch:hydrated', JSON.stringify({ studyTarget, ms: Date.now() - hydrateStart, cached: Boolean(entry) }));
  const ageMs = entry ? nowMs - entry.checkedAtMs : null;
  const stale = ageMs === null || ageMs < 0 || ageMs >= DIALOGUE_V2_CATALOGUE_REFRESH_MS;
  if (stale) {
    const refresh = refreshFromNetwork(studyTarget, nowMs);
    if (options.awaitRefresh) await refresh;
  }
  const best = bestAvailable(studyTarget);
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.info('[DIALOGUE-V2] catalogue:serve', JSON.stringify({
      studyTarget, source: best.source, stale, ageMs, awaited: Boolean(options.awaitRefresh && stale),
    }));
  }
  return best.envelope;
}

/** Только для тестов. */
export function resetDialogueV2CatalogueClientForTests(): void {
  memoryCache.clear();
  hydrations.clear();
  refreshes.clear();
  embeddedCache.clear();
}
