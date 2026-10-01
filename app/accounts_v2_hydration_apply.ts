import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  HydratedCard,
  HydratedLesson,
  HydratedLibrary,
  HydrationApplyResult,
  HydrationSnapshot,
} from '../modules/account-session-v2/account_v2_hydration';
import { isStudyTarget, type StudyTarget } from './study_target';
import { flashcardsSwipeMemoryKey, lessonBestScoreKey } from './target_storage_keys';

/*
 * Account V2, Пакет 6G (TG-4CAC183BF512) — применение гидрации в СУЩЕСТВУЮЩИЕ
 * локальные хранилища приложения (уроки, сохранённые и свои карточки, память
 * свайпов, библиотека наборов).
 *
 * зачем: экраны 2.0 читают прежние хранилища; V2 пока только догоняет их.
 * Правила слияния «не затирать более свежее локальное»:
 *   урок      — «лучший из»: пишем, только если оценка сервера выше локальной;
 *   карточка  — добавляем недостающие (по id и по фразе), существующие не трогаем;
 *               удалённые на сервере (tombstone) не добавляем; 7D: локально убираем
 *               только если удаление (tombstone / журнал) свежее последней правки
 *               (accounts_v2_hydration_deletions.ts);
 *   SRS       — по времени правки: сервер, только если его updatedAtMs новее lastSeenAt;
 *   наборы    — объединение живых id без tombstone, локальные не удаляем;
 *   названия  — (7C) только для наборов, что есть локально, и только без локального названия.
 * Модуль грузится лениво (require из accounts_v2_client_runtime) — только при
 * включённом флаге и только когда гидрация дошла до применения. Перед каждым
 * хранилищем — isCurrent(): смена аккаунта обрывает применение.
 * Каждый пропуск — лог [ACCOUNT-V2] с кодом.
 *
 * 7D (закрыт TEMP ремонта №1, P3): журнал локальных удалений карточек
 * (flashcards/card_deletion_journal.ts) + tombstone V2 со временем удаления.
 * Остаток: удаления, сделанные ДО появления журнала, не восстановимы как факт —
 * такая карточка ещё может вернуться из переноса один раз. Наборы: удаления
 * человеком в приложении нет — воскрешать нечего. Урок: окно между чтением и
 * записью оценки узкое (одна пара multiGet/multiSet), сервер хранит лучший.
 */

const LOG = '[ACCOUNT-V2]';
const TRAINING_PREFIX: Readonly<Record<'saved' | 'custom', string>> = Object.freeze({ saved: 'saved:all:', custom: 'custom:all:' });
const MEMORY_FIELDS = ['correct', 'wrong', 'hints', 'seen', 'mastered', 'nextDueAt', 'ease'] as const;
const MEMORY_DEFAULTS: Readonly<Record<string, number>> = Object.freeze({
  correct: 0, wrong: 0, hints: 0, seen: 0, mastered: 0, lastSeenAt: 0, nextDueAt: 0, ease: 2.2,
});

type Counts = Record<string, number>;

class StaleHydration extends Error {
  constructor() {
    super('hydration_stale');
    this.name = 'StaleHydration';
  }
}

function guard(isCurrent: () => boolean): void {
  if (!isCurrent()) throw new StaleHydration();
}

function groupByTarget<T extends { target: string }>(items: readonly T[], counts: Counts, label: string): Map<StudyTarget, T[]> {
  const out = new Map<StudyTarget, T[]>();
  for (const item of items) {
    if (!isStudyTarget(item.target)) {
      // зачем: storageStudyTarget молча подменил бы чужой язык на язык по умолчанию — не пишем вовсе.
      counts[`${label}_target_unsupported`] = (counts[`${label}_target_unsupported`] ?? 0) + 1;
      continue;
    }
    out.set(item.target, [...(out.get(item.target) ?? []), item]);
  }
  return out;
}

/** Урок: «лучший из» — локальную оценку не понижаем. */
export async function applyHydratedLessons(lessons: readonly HydratedLesson[], isCurrent: () => boolean, counts: Counts): Promise<void> {
  let written = 0;
  let keptLocal = 0;
  for (const [target, items] of groupByTarget(lessons, counts, 'lessons')) {
    guard(isCurrent);
    const keys = items.map((lesson) => lessonBestScoreKey(lesson.lessonId, target));
    const stored = await AsyncStorage.multiGet(keys);
    const writes: [string, string][] = [];
    items.forEach((lesson, index) => {
      const local = parseFloat(String(stored[index]?.[1] ?? '0'));
      if (Number.isFinite(local) && local >= lesson.score) { keptLocal += 1; return; }
      writes.push([keys[index], String(lesson.score)]);
    });
    guard(isCurrent);
    if (writes.length > 0) await AsyncStorage.multiSet(writes);
    written += writes.length;
  }
  if (written > 0) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./medal_utils') as typeof import('./medal_utils')).invalidateMedalsCache();
  }
  counts.lessons_written = written;
  counts.lessons_kept_local = keptLocal;
}

function cardObject(card: HydratedCard): Record<string, unknown> | null {
  const fields = { ...card.fields };
  if (typeof fields.id !== 'string' || fields.id.length === 0) fields.id = card.id;
  return fields.id === card.id ? fields : null;
}

/** Ключ сущности карточки V2 (`<язык>:<список>:<id>`) — общий с журналом удалений (7D). */
function cardKey(card: HydratedCard): string {
  return `${card.target}:${card.list}:${card.id}`;
}

/**
 * Сохранённые и свои карточки: добавляем только недостающие живые.
 * 7D: `blocked` — живые карточки сервера, удалённые здесь позже их последней правки
 * (журнал удалений) — не добавляем.
 */
export async function applyHydratedCards(
  cards: readonly HydratedCard[], isCurrent: () => boolean, counts: Counts, blocked: ReadonlySet<string> = new Set(),
): Promise<void> {
  const live = cards.filter((card) => !card.deleted && !blocked.has(cardKey(card)));
  counts.cards_blocked_by_journal = cards.filter((card) => !card.deleted && blocked.has(cardKey(card))).length;
  counts.cards_tombstoned_skipped = cards.length - live.length;
  let added = 0;
  let invalid = 0;
  for (const [target, items] of groupByTarget(live, counts, 'cards')) {
    const saved = items.filter((card) => card.list === 'saved').map(cardObject);
    const custom = items.filter((card) => card.list === 'custom').map(cardObject);
    const validSaved = saved.filter((card): card is Record<string, unknown> => card !== null && typeof card.en === 'string');
    const validCustom = custom.filter((card): card is Record<string, unknown> => card !== null);
    invalid += saved.length - validSaved.length + custom.length - validCustom.length;
    if (validSaved.length > 0) {
      guard(isCurrent);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const store = require('../hooks/use-flashcards') as typeof import('../hooks/use-flashcards');
      const result = await store.mergeSavedFlashcardsFromAccountsV2(target, validSaved as unknown as import('../hooks/use-flashcards').Flashcard[]);
      if (result < 0) throw new StaleHydration();
      added += result;
    }
    if (validCustom.length > 0) {
      guard(isCurrent);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const store = require('./flashcards/custom_cards_store') as typeof import('./flashcards/custom_cards_store');
      let customAdded = 0;
      await store.updateCustomCards((current) => {
        if (!isCurrent()) return current;
        const ids = new Set(current.map((item) => item.id));
        const additions = validCustom.filter((card) => !ids.has(card.id as string));
        customAdded = additions.length;
        return additions.length === 0 ? current : [...current, ...(additions as unknown as typeof current)];
      }, target);
      added += customAdded;
    }
  }
  counts.cards_added = added;
  counts.cards_invalid = invalid;
}

type SrsTally = { written: number; keptLocal: number };

/** Слить SRS сервера в строки памяти: только где время правки сервера новее. */
function mergeSrsRows(
  memory: Readonly<Record<string, Record<string, number>>>, items: readonly HydratedCard[], tally: SrsTally,
): Record<string, Record<string, number>> | null {
  let changed = false;
  const next: Record<string, Record<string, number>> = { ...memory };
  for (const card of items) {
    const srs = card.srs as Readonly<Record<string, unknown>>;
    const time = srs.updatedAtMs;
    if (typeof time !== 'number' || !Number.isSafeInteger(time) || time <= 0) continue;
    const memoryKey = `${TRAINING_PREFIX[card.list]}${card.id}`;
    const local = next[memoryKey];
    const localTime = typeof local?.lastSeenAt === 'number' ? local.lastSeenAt : 0;
    if (localTime >= time) { tally.keptLocal += 1; continue; }
    const row: Record<string, number> = { ...MEMORY_DEFAULTS, lastSeenAt: time };
    for (const name of MEMORY_FIELDS) {
      const value = srs[name];
      if (typeof value === 'number' && Number.isFinite(value)) row[name] = value;
    }
    next[memoryKey] = row;
    changed = true;
    tally.written += 1;
  }
  return changed ? next : null;
}

/** SRS → память свайпов: сервер только если его время правки новее локального lastSeenAt. */
export async function applyHydratedSrs(
  cards: readonly HydratedCard[], isCurrent: () => boolean, counts: Counts, blocked: ReadonlySet<string> = new Set(),
): Promise<void> {
  const tally: SrsTally = { written: 0, keptLocal: 0 };
  // зачем (7D): память удалённой здесь карточки не дописываем — карточки нет и не будет.
  const withSrs = cards.filter((card) => !card.deleted && card.srs !== null && !blocked.has(cardKey(card)));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const writer = require('./flashcards/swipe_memory_write') as typeof import('./flashcards/swipe_memory_write');
  for (const [target, items] of groupByTarget(withSrs, counts, 'srs')) {
    guard(isCurrent);
    const key = flashcardsSwipeMemoryKey(target);
    // зачем (ремонт №1, P3): чтение-слияние-запись под той же очередью, что сохранение
    // свайпов (swipe_memory_write) — свайп между нашим чтением и записью не теряется,
    // а снимок экрана при своей записи сливается с диском по времени правки.
    await writer.withSwipeMemoryLock(key, async () => {
      const disk = await writer.readSwipeMemoryRows(key);
      if (disk === null) {
        // зачем: битую память не перезаписываем вслепую — пропуск языка с логом.
        console.warn(`${LOG} hydrate srs memory_unreadable`);
        counts.srs_memory_unreadable = (counts.srs_memory_unreadable ?? 0) + 1;
        return;
      }
      const next = mergeSrsRows(disk as Record<string, Record<string, number>>, items, tally);
      guard(isCurrent);
      if (next !== null) await AsyncStorage.setItem(key, JSON.stringify(next));
    });
  }
  counts.srs_written = tally.written;
  counts.srs_kept_local = tally.keptLocal;
}

/** Библиотека наборов: объединение живых id сервера без tombstone. */
export async function applyHydratedLibraries(libraries: readonly HydratedLibrary[], isCurrent: () => boolean, counts: Counts): Promise<void> {
  let added = 0;
  let titled = 0;
  for (const [target, items] of groupByTarget(libraries, counts, 'library')) {
    guard(isCurrent);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const store = require('./community_packs/communityOwnedStorage') as typeof import('./community_packs/communityOwnedStorage');
    for (const library of items) {
      const result = library.items.length === 0 && library.removed.length === 0
        ? 0 : await store.mergeCommunityOwnedPackIdsFromAccountsV2(library.items, library.removed, target);
      if (result < 0) {
        counts.library_skipped = (counts.library_skipped ?? 0) + 1;
        continue;
      }
      added += result;
      // зачем (7C): названия — после id (пишутся только для наборов, что уже есть локально),
      // локальные названия не затираются.
      if (library.titles === undefined) continue;
      guard(isCurrent);
      const named = await store.mergeCommunityOwnedPackTitlesFromAccountsV2(library.titles, target);
      if (named < 0) counts.library_titles_skipped = (counts.library_titles_skipped ?? 0) + 1;
      else titled += named;
    }
  }
  counts.library_added = added;
  counts.library_titles_written = titled;
}

/**
 * Применение снимка гидрации. Бросает только «сменился аккаунт» (вызывающий не
 * ставит отметку и повторит при следующем старте); остальное — счётчики в итоге.
 */
export async function applyAccountsV2HydrationLocally(
  snapshot: HydrationSnapshot,
  isCurrent: () => boolean,
): Promise<HydrationApplyResult> {
  const counts: Counts = {};
  // зачем (8E): «чья версия свежее» для карточек, уже лежащих на телефоне — ПЕРВЫМ, до любых
  // записей (каждая запись карточек запускает снимок производителя, который сравнивает с зеркалом).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const conflicts = require('./accounts_v2_hydration_conflicts') as typeof import('./accounts_v2_hydration_conflicts');
  await conflicts.applyHydratedCardConflicts(snapshot, isCurrent, counts);
  await applyHydratedLessons(snapshot.lessons, isCurrent, counts);
  // зачем (7D): удаления — ДО добавления: tombstone V2 / журнал убирают «воскресшее» и
  // запрещают добавить удалённое здесь (только если удаление свежее последней правки).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const deletions = require('./accounts_v2_hydration_deletions') as typeof import('./accounts_v2_hydration_deletions');
  const blocked = await deletions.applyHydratedCardDeletions(snapshot.cards, isCurrent, counts);
  await applyHydratedCards(snapshot.cards, isCurrent, counts, blocked);
  await applyHydratedSrs(snapshot.cards, isCurrent, counts, blocked);
  await applyHydratedLibraries(snapshot.libraries, isCurrent, counts);
  console.log(`${LOG} hydrate applied ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(' ')}`);
  return Object.freeze(counts);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
