// ═══════════════════════════════════════════════════════════════════════════
// story_ignore_nudge_store.ts — локальные факты для правила «истории игнорируют два дня захода» (волны от кольца аватара).
//
// зачем (владелец 11.11, выбор «Волны»): дни захода и день последнего просмотра истории хранятся на устройстве по владельцу аккаунта.
// Firebase-экономия: ни одного чтения и записи Firestore, в профиль ничего не уходит — только AsyncStorage, ключ в стираемом семействе
// `story_events_v1:` (чистится вместе с остальным при выходе и удалении аккаунта). Память процесса — источник первого кадра после загрузки;
// пока запись не прочитана, фактов нет и сигнала нет (волны добавляются позже без сдвига вёрстки). Лог: [STORY-NUDGE].
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from '../../app/debug-logger';
import {
  STORY_IGNORE_EMPTY,
  recordStoryViewed,
  recordStoryVisit,
  serializeStoryIgnoreFacts,
  storyIgnoreDayKey,
  storyIgnoreFactsFromJson,
  storyIgnoredStreak,
  type StoryIgnoreFacts,
} from './story_ignore_nudge';

const LOG = '[STORY-NUDGE]';
export const STORY_IGNORE_KEY_PREFIX = 'story_events_v1:story_ignore_days';
export const storyIgnoreKey = (owner: string): string => `${STORY_IGNORE_KEY_PREFIX}:${owner}`;

const facts = new Map<string, StoryIgnoreFacts>();
const loads = new Map<string, Promise<StoryIgnoreFacts>>();
/** Что сейчас лежит на диске (сериализованно) — чтобы не писать одно и то же и не пропустить запись после мгновенной отметки. */
const persisted = new Map<string, string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeStoryIgnoreFacts(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Факты владельца из памяти; null — запись ещё не прочитана (сигнала пока нет). */
export function peekStoryIgnoreFacts(owner: string | null): StoryIgnoreFacts | null {
  return owner ? facts.get(owner) ?? null : null;
}

function loadOwner(owner: string): Promise<StoryIgnoreFacts> {
  const cached = facts.get(owner);
  if (cached) return Promise.resolve(cached);
  const pending = loads.get(owner);
  if (pending) return pending;
  const load = AsyncStorage.getItem(storyIgnoreKey(owner)).then((raw) => {
    let parsed: StoryIgnoreFacts = STORY_IGNORE_EMPTY;
    if (raw) {
      try {
        parsed = storyIgnoreFactsFromJson(JSON.parse(raw));
      } catch (error: unknown) {
        DebugLogger.warn(LOG, `запись не разобрана — счёт начинается заново: ${String(error)}`);
      }
    }
    return parsed;
  }).catch((error: unknown) => {
    DebugLogger.warn(LOG, `чтение не удалось — счёт в памяти с нуля: ${String(error)}`);
    return STORY_IGNORE_EMPTY;
  }).then((parsed) => {
    // зачем: пока шло чтение, память могла получить факт (запись визита ждёт загрузку, но защищаемся от гонки) — свежее не затираем
    persisted.set(owner, serializeStoryIgnoreFacts(parsed)); // guard-ok: Map в памяти процесса
    const already = facts.get(owner);
    if (already) return already;
    facts.set(owner, parsed); // guard-ok: Map в памяти процесса
    return parsed;
  }).finally(() => { loads.delete(owner); });
  loads.set(owner, load);
  return load;
}

async function update(owner: string, what: string, change: (current: StoryIgnoreFacts) => StoryIgnoreFacts): Promise<void> {
  const current = await loadOwner(owner);
  const next = change(facts.get(owner) ?? current);
  facts.set(owner, next); // guard-ok: Map в памяти процесса, не документ Firestore
  // зачем: оповещаем и при первом чтении без изменений — хук должен узнать, что факты прочитаны
  emit();
  const body = serializeStoryIgnoreFacts(next);
  // зачем: сверка с тем, что лежит на диске, а не с памятью — мгновенная отметка просмотра уже поменяла память до этой точки
  if (persisted.get(owner) === body) return;
  DebugLogger.info(LOG, `${what}: дней=${next.days.length} просмотр=${next.lastViewedDay ?? 'нет'} подряд=${storyIgnoredStreak(next, storyIgnoreDayKey(Date.now()))}`);
  try {
    await AsyncStorage.setItem(storyIgnoreKey(owner), body);
    persisted.set(owner, body); // guard-ok: Map в памяти процесса
  } catch (error: unknown) {
    DebugLogger.warn(LOG, `${what}: запись на диск не удалась — факт живёт до перезапуска: ${String(error)}`);
  }
}

/** Заход на Главную: день засчитывается; hasUnseen — было ли в этот момент кольцо историй. */
export function noteStoryVisit(owner: string | null, hasUnseen: boolean, nowMs: number = Date.now()): Promise<void> {
  if (!owner) { DebugLogger.info(LOG, 'заход не записан: аккаунт не активен'); return Promise.resolve(); }
  const today = storyIgnoreDayKey(nowMs);
  return update(owner, `заход ${today} кольцо=${String(hasUnseen)}`, (current) => recordStoryVisit(current, { today, hasUnseen }));
}

/** Человек открыл историю: счёт игнора обнуляется сразу (память), диск — фоном. */
export function noteStoryViewed(owner: string | null, nowMs: number = Date.now()): Promise<void> {
  if (!owner) { DebugLogger.info(LOG, 'просмотр не записан: аккаунт не активен'); return Promise.resolve(); }
  const today = storyIgnoreDayKey(nowMs);
  const known = facts.get(owner);
  // зачем (Optimistic UI): волны гаснут в тот же кадр, не дожидаясь чтения диска
  if (known) {
    const next = recordStoryViewed(known, today);
    if (next !== known) { facts.set(owner, next); emit(); } // guard-ok: Map в памяти процесса
  }
  return update(owner, `просмотр ${today}`, (current) => recordStoryViewed(current, today));
}

/** Только для тестов: забыть память процесса (как после перезапуска приложения). */
export function resetStoryIgnoreMemoryForTests(): void {
  facts.clear();
  loads.clear();
  persisted.clear();
}
