// ═══════════════════════════════════════════════════════════════════════════
// story_events_store.ts — хранение и подписка «историй» Главной (D192, владелец 14.10).
//
// зачем: источники фактов (итог недели Шпиля, рубеж серии, ранг монеты, ачивка, идеальный урок) зовут
// recordStoryEvent одной строкой; Главная через useStoryEvents рисует кольцо у аватарки, пока есть непросмотренное.
//
// Firebase-экономия: ни одного чтения/записи Firestore — только AsyncStorage `story_events_v1:<stableId>`.
// Флаг stories_v1 (remote_config_cache_v1.bools, по умолчанию выкл) читается из уже загруженного кэша конфига.
// Выключен → запись не делается вовсе (исходные места работают ровно как раньше).
// Лог: [STORY-EVENTS] — запись, отказ (повтор/срок/флаг/нет аккаунта), просмотр, загрузка, сбой хранилища.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration } from '../../app/account_generation';
import { DebugLogger } from '../../app/debug-logger';
import { onAppEvent } from '../../app/events';
import { readRemoteConfigCacheRaw } from '../../app/remote_config_client';
import {
  addStoryEvent,
  markStorySeen,
  parseStoryEvents,
  pruneStoryEvents,
  serializeStoryEvents,
  type StoryEventList,
  type StoryEventPayload,
  type StoryEventType,
} from './story_events_core';

const LOG = '[STORY-EVENTS]';
const KEY_PREFIX = 'story_events_v1';
const FLAG_KEY = 'stories_v1';
// зачем: съёмка кольца на эмуляторе без правки remote-конфига; только __DEV__, в релизе значение игнорируется.
const DEV_ENV_ON = process.env.EXPO_PUBLIC_STORIES_DEV === '1';
// зачем: вне сборщика (тесты, node) глобального __DEV__ нет — обращение к нему бросало ReferenceError и срывало каждую запись.
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__ === true;

export type StoryRecordResult =
  | Readonly<{ recorded: true; id: string }>
  | Readonly<{ recorded: false; reason: 'flag_off' | 'no_owner' | 'duplicate' | 'expired' | 'invalid' | 'account_changed' | 'storage_failed' }>;

export type StoryEventsSnapshot = Readonly<{
  enabled: boolean;
  owner: string | null;
  /** Живые истории (7 дней), новые первыми — и просмотренные, и нет. */
  stories: StoryEventList;
  unseenCount: number;
}>;

const EMPTY: StoryEventList = Object.freeze([]);
const OFF_SNAPSHOT: StoryEventsSnapshot = Object.freeze({ enabled: false, owner: null, stories: EMPTY, unseenCount: 0 });

let flagRemote = false;
let flagPromise: Promise<void> | null = null;
let flagSubscribed = false;
const lists = new Map<string, StoryEventList>();
const loads = new Map<string, Promise<StoryEventList>>();
let writeChain: Promise<unknown> = Promise.resolve();
let snapshot: StoryEventsSnapshot = OFF_SNAPSHOT;
const listeners = new Set<() => void>();
let generationSubscribed = false;

const keyOf = (owner: string): string => `${KEY_PREFIX}:${owner}`;
const info = (message: string): void => DebugLogger.info(LOG, message);
const warn = (message: string): void => DebugLogger.warn(LOG, message);

export function isStoriesEnabled(): boolean {
  return flagRemote || (IS_DEV && DEV_ENV_ON);
}

async function readFlag(source: string): Promise<void> {
  const before = flagRemote;
  try {
    const raw = await readRemoteConfigCacheRaw();
    const parsed = raw ? (JSON.parse(raw) as { bools?: Record<string, unknown> }) : null;
    flagRemote = parsed?.bools?.[FLAG_KEY] === true;
    info(`flag: remote=${String(flagRemote)} dev=${String(IS_DEV && DEV_ENV_ON)} source=${source} cache=${raw ? 'present' : 'absent'}`);
  } catch (error) {
    // зачем: битый кэш конфига не должен включить истории — остаёмся выключенными.
    flagRemote = false;
    warn(`flag: кэш конфига не прочитался, истории выключены (${String(error)}) source=${source}`);
  }
  if (before !== flagRemote) recompute(`flag ${String(before)}→${String(flagRemote)}`);
}

/** Прогреть флаг (безопасно звать сколько угодно раз); подписка на смену конфига — один раз. */
export function primeStoriesFlag(): Promise<void> {
  if (!flagSubscribed) {
    flagSubscribed = true;
    onAppEvent('remote_config_changed', () => { flagPromise = readFlag('remote_config_changed'); });
  }
  if (!flagPromise) flagPromise = readFlag('prime');
  return flagPromise;
}

function currentOwner(): Readonly<{ owner: string | null; token: ReturnType<typeof captureAccountGeneration> }> {
  const token = captureAccountGeneration();
  const owner = token.phase === 'active' && token.stableId ? token.stableId : null;
  return { owner, token };
}

function recompute(reason: string): void {
  const { owner } = currentOwner();
  const enabled = isStoriesEnabled();
  let next: StoryEventsSnapshot;
  if (!enabled || !owner) {
    next = enabled ? Object.freeze({ ...OFF_SNAPSHOT, enabled: true }) : OFF_SNAPSHOT;
  } else {
    const stories = pruneStoryEvents(lists.get(owner) ?? EMPTY, Date.now());
    next = Object.freeze({ enabled, owner, stories, unseenCount: stories.filter((event) => !event.seen).length });
  }
  // зачем: тот же набор историй → тот же снимок, без лишних перерисовок Главной.
  if (next.enabled === snapshot.enabled && next.owner === snapshot.owner && next.unseenCount === snapshot.unseenCount
    && next.stories.length === snapshot.stories.length && next.stories.every((event, i) => event === snapshot.stories[i])) return;
  snapshot = next;
  info(`snapshot: reason=${reason} enabled=${String(next.enabled)} owner=${next.owner ? 'set' : 'none'} stories=${next.stories.length} unseen=${next.unseenCount}`);
  for (const listener of listeners) listener();
}

function ensureGenerationSubscription(): void {
  if (generationSubscribed) return;
  generationSubscribed = true;
  // зачем: сменился аккаунт — кольцо обязано показать истории нового владельца, а не прежнего.
  subscribeAccountGeneration(() => {
    recompute('account_generation');
    const { owner } = currentOwner();
    if (owner && isStoriesEnabled()) void loadOwner(owner).then(() => recompute('account_generation_loaded'));
  });
}

function loadOwner(owner: string): Promise<StoryEventList> {
  const cached = lists.get(owner);
  if (cached) return Promise.resolve(cached);
  const pending = loads.get(owner);
  if (pending) return pending;
  const startedAt = Date.now();
  const load = AsyncStorage.getItem(keyOf(owner)).then((raw) => {
    let list: StoryEventList = EMPTY;
    try {
      list = parseStoryEvents(raw);
    } catch (error) {
      warn(`load: запись битая, начинаем с пустого списка (${String(error)})`);
    }
    // Пока читали, могла пройти запись — её не затираем.
    const already = lists.get(owner);
    const result = already ?? list;
    if (!already) lists.set(owner, result);
    info(`load: from=${raw ? 'storage' : 'empty'} events=${result.length} ms=${Date.now() - startedAt}`);
    return result;
  }).catch((error: unknown) => {
    warn(`load: хранилище не ответило (${String(error)}) — пустой список до следующей попытки`);
    return EMPTY;
  }).finally(() => { loads.delete(owner); });
  loads.set(owner, load);
  return load;
}

async function persist(owner: string, list: StoryEventList, what: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(keyOf(owner), serializeStoryEvents(list));
    return true;
  } catch (error) {
    // Память уже обновлена (кольцо отражает факт); на диск не легло — при перезапуске истории не будет. Логируем.
    warn(`persist: ${what} — запись на диск не удалась (${String(error)})`);
    return false;
  }
}

/** Прогрев для Главной: флаг + список текущего аккаунта. */
export async function primeStoryEvents(reason: string): Promise<void> {
  ensureGenerationSubscription();
  await primeStoriesFlag();
  const { owner } = currentOwner();
  if (!isStoriesEnabled() || !owner) {
    info(`prime: reason=${reason} skip enabled=${String(isStoriesEnabled())} owner=${owner ? 'set' : 'none'}`);
    recompute(`prime_${reason}`);
    return;
  }
  await loadOwner(owner);
  recompute(`prime_${reason}`);
}

/**
 * Записать факт. Ничего не бросает и ничего не ждёт от вызывающего: источники зовут `void recordStoryEvent(...)`.
 */
export async function recordStoryEvent(
  type: StoryEventType,
  payload: StoryEventPayload,
  atMs: number = Date.now(),
): Promise<StoryRecordResult> {
  try {
    await primeStoriesFlag();
    if (!isStoriesEnabled()) return { recorded: false, reason: 'flag_off' };
    const { owner, token } = currentOwner();
    if (!owner) {
      info(`record: skip type=${type} reason=no_owner phase=${token.phase}`);
      return { recorded: false, reason: 'no_owner' };
    }
    ensureGenerationSubscription();
    const run = writeChain.then(async (): Promise<StoryRecordResult> => {
      const list = await loadOwner(owner);
      if (!isCurrentAccountGeneration(token, owner)) {
        info(`record: skip type=${type} reason=account_changed`);
        return { recorded: false, reason: 'account_changed' };
      }
      const decision = addStoryEvent(list, { type, payload, atMs }, Date.now());
      if (!decision.added) {
        info(`record: skip type=${type} reason=${decision.reason} payload=${JSON.stringify(payload)}`);
        return { recorded: false, reason: decision.reason };
      }
      lists.set(owner, decision.list);
      recompute(`record_${type}`);
      const saved = await persist(owner, decision.list, `record ${decision.event.id}`);
      info(`record: ok id=${decision.event.id} atMs=${atMs} total=${decision.list.length} evicted=${decision.evicted} saved=${String(saved)}`);
      return saved ? { recorded: true, id: decision.event.id } : { recorded: false, reason: 'storage_failed' };
    });
    writeChain = run.catch(() => undefined);
    return await run;
  } catch (error) {
    warn(`record: сбой type=${type} (${String(error)})`);
    return { recorded: false, reason: 'storage_failed' };
  }
}

/** Непросмотренные истории текущего аккаунта (с загрузкой с диска при первом обращении). */
export async function getUnseenStories(): Promise<StoryEventList> {
  await primeStoryEvents('getUnseenStories');
  return Object.freeze(snapshot.stories.filter((event) => !event.seen));
}

/** Отметить историю просмотренной: кольцо гаснет сразу, диск догоняет. */
export async function markSeen(id: string): Promise<boolean> {
  const { owner, token } = currentOwner();
  if (!owner) {
    info(`seen: skip id=${id} reason=no_owner`);
    return false;
  }
  const run = writeChain.then(async () => {
    const list = await loadOwner(owner);
    if (!isCurrentAccountGeneration(token, owner)) {
      info(`seen: skip id=${id} reason=account_changed`);
      return false;
    }
    const result = markStorySeen(list, id);
    if (!result.changed) {
      info(`seen: skip id=${id} reason=${list.some((event) => event.id === id) ? 'already_seen' : 'not_found'}`);
      return false;
    }
    lists.set(owner, result.list);
    recompute('seen');
    const saved = await persist(owner, result.list, `seen ${id}`);
    info(`seen: ok id=${id} saved=${String(saved)}`);
    return true;
  });
  writeChain = run.catch(() => undefined);
  try {
    return await run;
  } catch (error) {
    warn(`seen: сбой id=${id} (${String(error)})`);
    return false;
  }
}

export function peekStoryEventsSnapshot(): StoryEventsSnapshot {
  return snapshot;
}

export function subscribeStoryEvents(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Только для тестов. */
export function __resetStoryEventsForTests(): void {
  flagRemote = false;
  flagPromise = null;
  lists.clear();
  loads.clear();
  writeChain = Promise.resolve();
  snapshot = OFF_SNAPSHOT;
}
