// ═══════════════════════════════════════════════════════════════════════════
// trainer_store.ts — хранилище Тренера
//
// Три очереди:
//   words   — слова из словаря и неправильные глаголы (порог: 2+ ошибки)
//   phrases — фразы из уроков (порог: 1 ошибка)
//   arena   — ошибки из арены (порог: 1 ошибка)
//
// Интервалы повторения: 1→3→7→14→30 дней
// После 5 правильных подряд (с нарастающим интервалом) → архив
// Ошибка → сброс интервала к 1 дню
// ═══════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { flushMistakeLog, logMistake } from './mistake_log';
import { computeFrenchPhraseAnalytics } from './french_phrase_analytics';
import { getCachedFrenchRemotePersonalPractice } from './french_personal_practice_remote_runtime';
import { compactPlanMistakeContext, type PersonalPlanMistakeContext } from './personal_plan_mistake_context';
import { computePhraseAnalytics, type PhraseAnalyticsResult } from './phrase_analytics';
import { normalizeWordCategory, type WordCategory } from './pos_taxonomy';
import { getPosMasterySnapshot } from './pos_workout_engine';
import { storageSourceLocale, storageStudyTarget, trainerStoreKey, type RuntimeSourceLocale, type RuntimeStudyTarget } from './target_storage_keys';
import { trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import type { Lang, PlannedInterfaceLang } from '../constants/i18n';

// ── Константы ────────────────────────────────────────────────────────────────

const MS_PER_DAY  = 24 * 60 * 60 * 1000;
const trainerStoreCache = new Map<string, TrainerItem[]>();

/** Лесенка интервалов в днях. Индекс = кол-во правильных ответов подряд. */
const INTERVALS = [1, 3, 7, 14, 30] as const;

/** После этого кол-ва правильных → слово/фраза уходит в архив. */
const GRADUATE_AT = INTERVALS.length; // 5

// ── Типы ────────────────────────────────────────────────────────────────────

export type TrainerQueue = 'words' | 'phrases' | 'arena';
export type TrainerPremiumMode = 'smart_mix' | 'weak' | 'hard';
export type TrainerDevScenario = 'empty' | 'random' | 'weak' | 'hard' | 'overloaded';

export interface TrainerItem {
  /** Уникальный ключ: для слов — английское слово/глагол, для фраз — английская фраза */
  key: string;
  queue: TrainerQueue;
  /** Для слов/глаголов: перевод (ru) */
  translationRu: string;
  /** Для слов/глаголов: перевод (uk) */
  translationUk: string;
  translationEs?: string;
  sourceLocales?: Partial<Record<PlannedInterfaceLang, string>>;
  /** Для фраз: слово на котором была ошибка (для режима fill-the-gap) */
  errorWord?: string;
  /** Для арены: исходный вопрос в формате арены */
  arenaQuestion?: ArenaQuestion;
  /** Урок из которого взято */
  lessonId: number;
  category?: WordCategory;
  grammarTag?: string;
  planId?: string;
  planInstanceId?: string;
  planTaskId?: string;
  planDayIndex?: number;
  planPhraseLessonId?: string;
  /** Суммарное кол-во ошибок при записи (не при отработке) */
  mistakeCount: number;
  /** Кол-во правильных ответов подряд при отработке */
  correctStreak: number;
  /** Unix ms — когда появится в очереди снова */
  nextDue: number;
  /** Unix ms — дата первой записи */
  createdAt: number;
  /** Архивировано (выучено) */
  archived: boolean;
}

export interface ArenaQuestion {
  question: string;
  correct: string;
  options: string[];
  rule?: string;
}

// ── Утилиты ──────────────────────────────────────────────────────────────────

function daysFromNow(days: number): number {
  return Date.now() + days * MS_PER_DAY;
}

function tomorrowStart(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function todayEnd(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function todayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function nextInterval(correctStreak: number): number {
  const days = INTERVALS[Math.min(correctStreak, INTERVALS.length - 1)] ?? 30;
  return daysFromNow(days);
}

// ── Storage ──────────────────────────────────────────────────────────────────

function trainerCategory(word?: string, rawCategory?: string): Pick<TrainerItem, 'category' | 'grammarTag'> {
  const resolved = normalizeWordCategory(rawCategory, word);
  return resolved.category === 'other'
    ? {}
    : { category: resolved.category, grammarTag: resolved.grammarTag };
}

function trainerCategoryForItem(item: Pick<TrainerItem, 'queue' | 'key' | 'category' | 'errorWord' | 'arenaQuestion'>): Pick<TrainerItem, 'category' | 'grammarTag'> {
  const word = item.errorWord || (item.queue === 'words' ? item.key : item.arenaQuestion?.correct);
  return trainerCategory(word, item.category === 'other' ? undefined : item.category);
}

function withTrainerCategory(item: TrainerItem): TrainerItem {
  const meta = trainerCategoryForItem(item);
  return meta.category && item.category !== meta.category
    ? { ...item, ...meta }
    : item;
}

/**
 * Старые записи в AsyncStorage могли попасть туда испорченными (mojibake:
 * кириллица, перекодированная как latin1/cp1251 в старой сборке). Такую
 * строку глазами не починить — только выбросить, чтобы упало на другой
 * доступный перевод/needs-review вместо кракозябр.
 */
const MOJIBAKE_PATTERN = /[ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞß][€™°ˆ]/;

export function isMojibake(text: string | undefined): boolean {
  return !!text && (MOJIBAKE_PATTERN.test(text) || /[\u00c2\u00c3\u00d0\u00d1][\u0080-\u00ff]|\u00e2[\u0080-\u00bf]{2}|\ufffd/.test(text));
}

function withSanitizedTranslations(item: TrainerItem): TrainerItem {
  const fixes: Partial<TrainerItem> = {};
  if (isMojibake(item.translationRu)) fixes.translationRu = '';
  if (isMojibake(item.translationUk)) fixes.translationUk = '';
  if (isMojibake(item.translationEs)) fixes.translationEs = '';
  return Object.keys(fixes).length ? { ...item, ...fixes } : item;
}

const TRAINER_PLANNED_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const satisfies readonly PlannedInterfaceLang[];

const TRAINER_TRANSLATION_NEEDS_REVIEW: Record<PlannedInterfaceLang, string> = {
  'pt-BR': 'needs-review: esta tradução do treinador ainda precisa de revisão para português do Brasil.',
  vi: 'needs-review: bản dịch trong phần luyện tập này vẫn cần được rà soát cho tiếng Việt.',
  id: 'needs-review: terjemahan latihan ini masih perlu ditinjau untuk bahasa Indonesia.',
  tr: 'needs-review: bu antrenman çevirisi Türkçe için hâlâ gözden geçirilmeli.',
  pl: 'needs-review: to tłumaczenie w trenerze nadal wymaga przeglądu po polsku.',
};

function isTrainerPlannedLocale(lang: Lang): lang is PlannedInterfaceLang {
  const plannedLocales = TRAINER_PLANNED_LOCALES as readonly string[];
  return plannedLocales.includes(lang);
}

export function trainerTranslationForLang(
  item: Pick<TrainerItem, 'translationRu' | 'translationUk' | 'translationEs' | 'sourceLocales'>,
  lang: Lang,
): string {
  if (isTrainerPlannedLocale(lang)) {
    const planned = item.sourceLocales?.[lang]?.trim();
    return planned || TRAINER_TRANSLATION_NEEDS_REVIEW[lang];
  }
  if (lang === 'uk') return item.translationUk || item.translationRu || item.translationEs || '';
  if (lang === 'es') return item.translationEs || item.translationRu || item.translationUk || '';
  return item.translationRu || item.translationUk || item.translationEs || '';
}

async function load(studyTarget?: RuntimeStudyTarget): Promise<TrainerItem[]> {
  const key = trainerStoreKey(studyTarget);
  try {
    const raw = await AsyncStorage.getItem(key);
    const items = raw ? (JSON.parse(raw) as TrainerItem[]).map(withTrainerCategory).map(withSanitizedTranslations) : [];
    trainerStoreCache.set(key, items);
    return items;
  } catch {
    trainerStoreCache.set(key, []);
    return [];
  }
}

function mergeFrenchRemotePracticeItems(
  localItems: TrainerItem[],
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): TrainerItem[] {
  if (storageStudyTarget(studyTarget) !== 'fr') return localItems;
  const remoteItems = getCachedFrenchRemotePersonalPractice(storageSourceLocale(sourceLocale));
  if (remoteItems.length === 0) return localItems;
  return uniqueTrainerItems([...localItems, ...remoteItems]);
}

async function loadTrainerItemsForSessions(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): Promise<TrainerItem[]> {
  const items = await load(studyTarget);
  return mergeFrenchRemotePracticeItems(items, studyTarget, sourceLocale);
}

function applyPlanMistakeContext(item: TrainerItem, context?: PersonalPlanMistakeContext): void {
  const compact = compactPlanMistakeContext(context);
  if (compact.planId) item.planId = compact.planId;
  if (compact.planInstanceId) item.planInstanceId = compact.planInstanceId;
  if (compact.planTaskId) item.planTaskId = compact.planTaskId;
  if (compact.planDayIndex) item.planDayIndex = compact.planDayIndex;
  if (compact.planPhraseLessonId) item.planPhraseLessonId = compact.planPhraseLessonId;
}

async function save(items: TrainerItem[], studyTarget?: RuntimeStudyTarget): Promise<void> {
  const key = trainerStoreKey(studyTarget);
  trainerStoreCache.set(key, items.map(withTrainerCategory));
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

// ── Запись ошибок ─────────────────────────────────────────────────────────────

/**
 * Записать ошибку на слове/глаголе.
 * Слово добавляется в очередь только при 2-й ошибке.
 * При последующих ошибках — обновляет счётчик и сбрасывает nextDue к завтра.
 */
export async function recordWordMistake(
  wordEn: string,
  translationRu: string,
  translationUk: string,
  lessonId: number,
  rawCategory?: string,
  translationEs?: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const key = wordEn.trim().toLowerCase();
  const items = await load(studyTarget);
  const existing = items.find(i => i.key === key && i.queue === 'words');

  if (existing) {
    existing.mistakeCount += 1;
    existing.translationRu = translationRu;
    existing.translationUk = translationUk;
    if (translationEs) existing.translationEs = translationEs;
    Object.assign(existing, trainerCategory(wordEn, rawCategory));
    // nextDue === 0 означает "ещё не активировано" — не трогаем, ждём activateWordForTrainer
    if (existing.nextDue !== 0) {
      if (existing.archived) {
        existing.archived = false;
        existing.correctStreak = 0;
        existing.nextDue = tomorrowStart();
      } else if (existing.nextDue > todayEnd()) {
        // Приближаем показ к завтра
        existing.nextDue = tomorrowStart();
      }
    }
    await save(items, studyTarget);
    return;
  }

  // Первый раз — просто запомним счётчик без добавления в очередь
  const firstHit: TrainerItem = {
    key,
    queue: 'words',
    translationRu,
    translationUk,
    translationEs,
    lessonId,
    ...trainerCategory(wordEn, rawCategory),
    mistakeCount: 1,
    correctStreak: 0,
    nextDue: 0, // 0 = ещё не в очереди
    createdAt: Date.now(),
    archived: false,
  };
  items.push(firstHit);
  await save(items, studyTarget);
}

/**
 * Фиксирует достижение порога — добавляет слово в активную очередь.
 * Вызывается из lesson_words / lesson_irregular_verbs при 2-й ошибке.
 */
export async function activateWordForTrainer(
  wordEn: string,
  translationRu: string,
  translationUk: string,
  lessonId: number,
  rawCategory?: string,
  translationEs?: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const key = wordEn.trim().toLowerCase();
  const items = await load(studyTarget);
  const existing = items.find(i => i.key === key && i.queue === 'words');

  if (existing) {
    existing.mistakeCount += 1;
    existing.translationRu = translationRu;
    existing.translationUk = translationUk;
    if (translationEs) existing.translationEs = translationEs;
    Object.assign(existing, trainerCategory(wordEn, rawCategory));
    if (existing.nextDue === 0) {
      // Первый раз достиг порога — активируем
      existing.nextDue = tomorrowStart();
    }
    await save(items, studyTarget);
    return;
  }

  const item: TrainerItem = {
    key,
    queue: 'words',
    translationRu,
    translationUk,
    translationEs,
    lessonId,
    ...trainerCategory(wordEn, rawCategory),
    mistakeCount: 2,
    correctStreak: 0,
    nextDue: tomorrowStart(),
    createdAt: Date.now(),
    archived: false,
  };
  items.push(item);
  await save(items, studyTarget);
}

/**
 * Записать ошибку на фразе.
 * Фраза сразу добавляется в очередь (порог: 1 ошибка).
 * @param errorWord — конкретное слово в фразе где была ошибка (для fill-the-gap)
 */
export async function recordPhraseMistake(
  phraseEn: string,
  translationRu: string,
  translationUk: string,
  lessonId: number,
  errorWord?: string,
  rawCategory?: string,
  translationEs?: string,
  studyTarget?: RuntimeStudyTarget,
  planContext?: PersonalPlanMistakeContext,
): Promise<void> {
  const key = phraseEn.trim();
  const items = await load(studyTarget);
  const existing = items.find(i => i.key === key && i.queue === 'phrases');

  if (existing) {
    existing.mistakeCount += 1;
    existing.translationRu = translationRu;
    existing.translationUk = translationUk;
    if (translationEs) existing.translationEs = translationEs;
    if (errorWord) existing.errorWord = errorWord;
    Object.assign(existing, trainerCategory(errorWord, rawCategory));
    applyPlanMistakeContext(existing, planContext);
    if (existing.archived) {
      existing.archived = false;
      existing.correctStreak = 0;
      existing.nextDue = tomorrowStart();
    } else {
      existing.nextDue = tomorrowStart();
    }
    await save(items, studyTarget);
    return;
  }

  const item: TrainerItem = {
    key,
    queue: 'phrases',
    translationRu,
    translationUk,
    translationEs,
    errorWord,
    lessonId,
    ...(errorWord ? trainerCategory(errorWord, rawCategory) : {}),
    mistakeCount: 1,
    correctStreak: 0,
    nextDue: tomorrowStart(),
    createdAt: Date.now(),
    archived: false,
  };
  applyPlanMistakeContext(item, planContext);
  items.push(item);
  await save(items, studyTarget);
}

/**
 * Записать ошибку на вопросе арены.
 * Сразу добавляется в очередь.
 */
export async function recordArenaMistake(
  question: ArenaQuestion,
  lessonId: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const key = question.question.trim();
  const items = await load(studyTarget);
  const existing = items.find(i => i.key === key && i.queue === 'arena');

  if (existing) {
    existing.mistakeCount += 1;
    existing.arenaQuestion = question;
    Object.assign(existing, trainerCategory(question.correct, question.rule));
    if (existing.archived) {
      existing.archived = false;
      existing.correctStreak = 0;
    }
    existing.nextDue = tomorrowStart();
    await save(items, studyTarget);
    return;
  }

  const item: TrainerItem = {
    key,
    queue: 'arena',
    translationRu: '',
    translationUk: '',
    arenaQuestion: question,
    lessonId,
    ...trainerCategory(question.correct, question.rule),
    mistakeCount: 1,
    correctStreak: 0,
    nextDue: tomorrowStart(),
    createdAt: Date.now(),
    archived: false,
  };
  items.push(item);
  await save(items, studyTarget);
}

// ── Отработка ─────────────────────────────────────────────────────────────────

/**
 * Отметить результат отработки.
 * Правильно → продвигаем по лесенке интервалов.
 * Неправильно → сброс к 1 дню.
 */
export async function markTrainerResult(
  key: string,
  queue: TrainerQueue,
  correct: boolean,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const items = await load(studyTarget);
  const item = items.find(i => i.key === key && i.queue === queue);
  if (!item) return;

  if (correct) {
    item.correctStreak += 1;
    if (item.correctStreak >= GRADUATE_AT) {
      item.archived = true;
      item.nextDue = 0;
    } else {
      item.nextDue = nextInterval(item.correctStreak);
    }
  } else {
    item.mistakeCount += 1;
    item.correctStreak = 0;
    item.nextDue = tomorrowStart();
  }

  await save(items, studyTarget);
}

// ── Чтение для UI ─────────────────────────────────────────────────────────────

/** Кол-во элементов в каждой очереди которые ждут сегодня. */
export async function getTrainerCounts(studyTarget?: RuntimeStudyTarget): Promise<Record<TrainerQueue, number>> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) {
    return { words: 0, phrases: 0, arena: 0 };
  }
  const items = await loadTrainerItemsForSessions(studyTarget);
  const end = todayEnd();
  const active = items.filter(i => !i.archived && i.nextDue > 0 && i.nextDue <= end);
  return {
    words:   active.filter(i => i.queue === 'words').length,
    phrases: active.filter(i => i.queue === 'phrases').length,
    arena:   active.filter(i => i.queue === 'arena').length,
  };
}

/** Суммарное кол-во элементов ожидающих сегодня (для бейджа). */
export async function getTrainerTotalDue(studyTarget?: RuntimeStudyTarget): Promise<number> {
  const counts = await getTrainerCounts(studyTarget);
  return counts.words + counts.phrases + counts.arena;
}

export interface TrainerDashboard {
  due: Record<TrainerQueue, number>;
  totalDue: number;
  overdue: number;
  totalTracked: number;
  active: number;
  future: number;
  archived: number;
  hardestQueue: TrainerQueue | null;
  hardestMistakes: number;
  hardestCategory: WordCategory | null;
  hardestCategoryMistakes: number;
  hardestCategoryPriority: number;
  hardestCategoryRecovery: number;
  memoryScore: number;
  posMasteryXp: number;
  posMasteryTop: Array<{ category: WordCategory; level: number; xp: number; streak: number }>;
  nextQueue: TrainerQueue | null;
}

export async function getTrainerDashboard(
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
  analyticsStatsInput?: PhraseAnalyticsResult | null | Promise<PhraseAnalyticsResult | null>,
): Promise<TrainerDashboard> {
  const target = storageStudyTarget(studyTarget);
  const items = await loadTrainerItemsForSessions(studyTarget, sourceLocale);
  const posMastery = await getPosMasterySnapshot(studyTarget);
  const end = todayEnd();
  const sessionContentEnabled = trainerSessionContentAvailableForTarget(studyTarget);
  const activeItems = sessionContentEnabled
    ? items.filter(i => !i.archived && i.nextDue > 0)
    : [];
  const dueItems = activeItems.filter(i => i.nextDue <= end);
  const archived = sessionContentEnabled ? items.filter(i => i.archived).length : 0;
  const due: Record<TrainerQueue, number> = {
    words: dueItems.filter(i => i.queue === 'words').length,
    phrases: dueItems.filter(i => i.queue === 'phrases').length,
    arena: dueItems.filter(i => i.queue === 'arena').length,
  };

  const queues: TrainerQueue[] = ['phrases', 'words', 'arena'];
  const queueStats = queues.map(queue => {
    const all = activeItems.filter(i => i.queue === queue);
    const dueCount = due[queue];
    const mistakes = all.reduce((sum, item) => sum + item.mistakeCount, 0);
    const avgMistakes = all.length > 0 ? mistakes / all.length : 0;
    return { queue, dueCount, mistakes, avgMistakes, score: dueCount * 10 + avgMistakes * 3 };
  });
  const hardest = [...queueStats].sort((a, b) => b.mistakes - a.mistakes || b.avgMistakes - a.avgMistakes)[0];
  const next = [...queueStats].filter(s => s.dueCount > 0).sort((a, b) => b.score - a.score)[0];
  const categoryStats = new Map<WordCategory, number>();
  for (const item of activeItems) {
    const category = item.category ?? trainerCategoryForItem(item).category;
    if (!category || category === 'other') continue;
    categoryStats.set(category, (categoryStats.get(category) ?? 0) + item.mistakeCount);
  }
  const fallbackHardestCategory = [...categoryStats.entries()].sort((a, b) => b[1] - a[1])[0];
  const analyticsStats = sessionContentEnabled
    ? analyticsStatsInput !== undefined
      ? await Promise.resolve(analyticsStatsInput).catch(() => null)
      : target === 'fr'
        ? await computeFrenchPhraseAnalytics({ sourceLocale })
        : await computePhraseAnalytics()
    : null;
  const analyticsHardestCategory = analyticsStats?.categoryStats[0];
  const fallbackCategoryForTarget = target === 'fr' ? undefined : fallbackHardestCategory;
  const totalTracked = items.length;
  const memoryScore = totalTracked === 0
    ? 100
    : Math.max(0, Math.min(100, Math.round(((archived + activeItems.length * 0.35) / totalTracked) * 100)));

  return {
    due,
    totalDue: due.words + due.phrases + due.arena,
    overdue: dueItems.filter((item) => item.nextDue < todayStart()).length,
    totalTracked,
    active: activeItems.length,
    future: activeItems.filter(i => i.nextDue > end).length,
    archived,
    hardestQueue: hardest && hardest.mistakes > 0 ? hardest.queue : null,
    hardestMistakes: hardest?.mistakes ?? 0,
    hardestCategory: analyticsHardestCategory?.category ?? fallbackCategoryForTarget?.[0] ?? null,
    hardestCategoryMistakes: analyticsHardestCategory?.mistakeCount ?? fallbackCategoryForTarget?.[1] ?? 0,
    hardestCategoryPriority: analyticsHardestCategory?.priorityScore ?? 0,
    hardestCategoryRecovery: analyticsHardestCategory?.recoveryScore ?? 0,
    memoryScore,
    posMasteryXp: posMastery.reduce((sum, entry) => sum + entry.xp, 0),
    posMasteryTop: posMastery.slice(0, 3).map(entry => ({
      category: entry.category,
      level: entry.level,
      xp: entry.xp,
      streak: entry.streak,
    })),
    nextQueue: next?.queue ?? null,
  };
}

/** Элементы конкретной очереди ожидающие сегодня. */
export async function getDueItems(
  queue: TrainerQueue,
  limit = 20,
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): Promise<TrainerItem[]> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return [];
  const items = await loadTrainerItemsForSessions(studyTarget, sourceLocale);
  const end = todayEnd();
  return items
    .filter(i => i.queue === queue && !i.archived && i.nextDue > 0 && i.nextDue <= end)
    .sort((a, b) => b.mistakeCount - a.mistakeCount || a.nextDue - b.nextDue)
    .slice(0, limit);
}

/**
 * Прогрет ли in-memory кэш очереди для этого таргета.
 *
 * зачем: getCachedDueItems на холодном кэше возвращает `[]` — неотличимо от
 * «сегодня нечего повторять». Экранам сессий нужно различать эти два случая,
 * чтобы синхронно отрисовать первую карточку на прогретом кэше и не показать
 * по ошибке экран «всё сделано» на холодном. Map.has различает «не грузили»
 * и «загрузили пустое».
 */
export function hasCachedTrainerItems(studyTarget?: RuntimeStudyTarget): boolean {
  return trainerStoreCache.has(trainerStoreKey(studyTarget));
}

export function getCachedDueItems(
  queue: TrainerQueue,
  limit = 20,
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): TrainerItem[] {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return [];
  const end = todayEnd();
  return mergeFrenchRemotePracticeItems(trainerStoreCache.get(trainerStoreKey(studyTarget)) ?? [], studyTarget, sourceLocale)
    .filter(i => i.queue === queue && !i.archived && i.nextDue > 0 && i.nextDue <= end)
    .sort((a, b) => b.mistakeCount - a.mistakeCount || a.nextDue - b.nextDue)
    .slice(0, limit);
}

function uniqueTrainerItems(items: TrainerItem[]): TrainerItem[] {
  const seen = new Set<string>();
  const result: TrainerItem[] = [];
  for (const item of items) {
    const id = `${item.queue}:${item.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }
  return result;
}

function itemCategoryPriority(item: TrainerItem, categoryPriority: Map<WordCategory, number>): number {
  const category = item.category ?? trainerCategoryForItem(item).category;
  if (!category || category === 'other') return 0;
  return categoryPriority.get(category) ?? 0;
}

async function loadCategoryPriorityScores(studyTarget?: RuntimeStudyTarget): Promise<Map<WordCategory, number>> {
  if (storageStudyTarget(studyTarget) === 'fr') return new Map();
  try {
    const analytics = await computePhraseAnalytics();
    return new Map(analytics.categoryStats.map(stat => [stat.category, stat.priorityScore]));
  } catch {
    return new Map();
  }
}

function trainerPriorityScore(item: TrainerItem, end: number, categoryPriority = 0): number {
  const dueBonus = item.nextDue <= end ? 80 : 0;
  const mistakeScore = item.mistakeCount * 14;
  const weakScore = Math.max(0, 4 - item.correctStreak) * 8;
  const ageScore = Math.max(0, Math.min(20, Math.floor((Date.now() - item.createdAt) / MS_PER_DAY)));
  const posScore = Math.round(categoryPriority * 0.75);
  return dueBonus + mistakeScore + weakScore + ageScore + posScore;
}

export async function getTrainerPremiumItems(
  mode: TrainerPremiumMode,
  limit = 12,
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): Promise<TrainerItem[]> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return [];
  const items = (await loadTrainerItemsForSessions(studyTarget, sourceLocale)).map(withTrainerCategory);
  const end = todayEnd();
  const active = items.filter(i => !i.archived && i.nextDue > 0);
  const categoryPriority = await loadCategoryPriorityScores(studyTarget);
  const score = (item: TrainerItem) => trainerPriorityScore(item, end, itemCategoryPriority(item, categoryPriority));
  const byPriority = () => [...active].sort((a, b) => score(b) - score(a));
  const due = active
    .filter(i => i.nextDue <= end)
    .sort((a, b) => score(b) - score(a));

  if (mode === 'weak') {
    const weak = active
      .filter(i => i.correctStreak <= 1 || i.mistakeCount >= 2)
      .sort((a, b) =>
        itemCategoryPriority(b, categoryPriority) - itemCategoryPriority(a, categoryPriority) ||
        a.correctStreak - b.correctStreak ||
        b.mistakeCount - a.mistakeCount ||
        a.nextDue - b.nextDue
      );
    return uniqueTrainerItems([...weak, ...due, ...byPriority()]).slice(0, limit);
  }

  if (mode === 'hard') {
    const hard = active
      .filter(i => i.mistakeCount >= 3)
      .sort((a, b) =>
        b.mistakeCount - a.mistakeCount ||
        itemCategoryPriority(b, categoryPriority) - itemCategoryPriority(a, categoryPriority) ||
        a.correctStreak - b.correctStreak ||
        a.nextDue - b.nextDue
      );
    return uniqueTrainerItems([...hard, ...due, ...byPriority()]).slice(0, limit);
  }

  const weakPart = active
    .filter(i => i.correctStreak <= 1 || i.mistakeCount >= 2)
    .sort((a, b) =>
      itemCategoryPriority(b, categoryPriority) - itemCategoryPriority(a, categoryPriority) ||
      a.correctStreak - b.correctStreak ||
      b.mistakeCount - a.mistakeCount
    );
  const fresh = active
    .filter(i => i.nextDue > end)
    .sort((a, b) => b.createdAt - a.createdAt);
  const dueCount = Math.ceil(limit * 0.5);
  const weakCount = Math.ceil(limit * 0.3);
  const mixed = uniqueTrainerItems([
    ...due.slice(0, dueCount),
    ...weakPart.slice(0, weakCount),
    ...fresh.slice(0, limit - dueCount),
    ...byPriority(),
  ]);
  return mixed.slice(0, limit);
}

export async function getTrainerPremiumItemsForPlan(
  planInstanceId: string | null | undefined,
  mode: TrainerPremiumMode,
  limit = 12,
  studyTarget?: RuntimeStudyTarget,
): Promise<TrainerItem[]> {
  const instanceId = planInstanceId?.trim();
  if (!instanceId) return [];
  const items = await getTrainerPremiumItems(mode, Math.max(limit, 48), studyTarget);
  return items.filter((item) => item.planInstanceId === instanceId).slice(0, limit);
}

export async function getTrainerPremiumItemsForPlanQueue(
  planInstanceId: string | null | undefined,
  mode: TrainerPremiumMode,
  queue: TrainerQueue,
  limit = 12,
  studyTarget?: RuntimeStudyTarget,
): Promise<TrainerItem[]> {
  const instanceId = planInstanceId?.trim();
  if (!instanceId) return [];
  const items = await getTrainerPremiumItems(mode, Math.max(limit, 48), studyTarget);
  return items
    .filter((item) => item.planInstanceId === instanceId && item.queue === queue)
    .slice(0, limit);
}

export async function getTrainerPlanWeakSpotDueCount(
  planInstanceId: string | null | undefined,
  mode: TrainerPremiumMode = 'weak',
  studyTarget?: RuntimeStudyTarget,
): Promise<number> {
  return (await getTrainerPremiumItemsForPlan(planInstanceId, mode, 48, studyTarget))
    .filter((item) => !item.archived && item.nextDue > 0)
    .length;
}

/** Все слова в хранилище (включая ещё не активированные) — для подбора ложных переводов. */
export async function getAllWordKeys(studyTarget?: RuntimeStudyTarget): Promise<TrainerItem[]> {
  const items = await load(studyTarget);
  return items.filter(i => i.queue === 'words');
}

// ── Сброс / диагностика ───────────────────────────────────────────────────────

export async function clearTrainerStore(studyTarget?: RuntimeStudyTarget): Promise<void> {
  await AsyncStorage.removeItem(trainerStoreKey(studyTarget));
}

export async function getTrainerStoreDebug(studyTarget?: RuntimeStudyTarget): Promise<{
  total: number;
  active: number;
  archived: number;
  byQueue: Record<TrainerQueue, number>;
  posMasteryXp: number;
  posMasteryCount: number;
}> {
  const items = await load(studyTarget);
  const posMastery = await getPosMasterySnapshot(studyTarget);
  const active = items.filter(i => !i.archived && i.nextDue > 0);
  const archived = items.filter(i => i.archived);
  return {
    total: items.length,
    active: active.length,
    archived: archived.length,
    byQueue: {
      words:   items.filter(i => i.queue === 'words').length,
      phrases: items.filter(i => i.queue === 'phrases').length,
      arena:   items.filter(i => i.queue === 'arena').length,
    },
    posMasteryXp: posMastery.reduce((sum, entry) => sum + entry.xp, 0),
    posMasteryCount: posMastery.length,
  };
}

// ── DEV seed ──────────────────────────────────────────────────────────────────

const DEV_WORDS = [
  { key: 'angry',      ru: 'Злой',        uk: 'Злий' },
  { key: 'forest',     ru: 'Лес',         uk: 'Ліс' },
  { key: 'believe',    ru: 'Верить',      uk: 'Вірити' },
  { key: 'careful',    ru: 'Осторожный',  uk: 'Обережний' },
  { key: 'borrow',     ru: 'Брать взаймы',uk: 'Позичати' },
  { key: 'carry',      ru: 'Носить',      uk: 'Носити' },
  { key: 'early',      ru: 'Ранний',      uk: 'Ранній' },
  { key: 'gather',     ru: 'Собирать',    uk: 'Збирати' },
];

const DEV_PHRASES = [
  { key: 'She went to the store',          ru: 'Она пошла в магазин',           uk: 'Вона пішла до магазину',           errorWord: 'went' },
  { key: 'He is in the kitchen',           ru: 'Он на кухне',                   uk: 'Він на кухні',                     errorWord: 'kitchen' },
  { key: 'We will call you tomorrow',      ru: 'Мы позвоним тебе завтра',       uk: 'Ми подзвонимо тобі завтра',        errorWord: 'call' },
  { key: 'I have never been there',        ru: 'Я никогда не был там',          uk: 'Я ніколи не був там',              errorWord: 'never' },
  { key: 'They are waiting for us',        ru: 'Они ждут нас',                  uk: 'Вони чекають на нас',              errorWord: 'waiting' },
  { key: 'Could you help me please',       ru: 'Не могли бы вы помочь',        uk: 'Не могли б ви допомогти',          errorWord: 'help' },
  { key: 'The weather is nice today',      ru: 'Сегодня хорошая погода',        uk: 'Сьогодні гарна погода',            errorWord: 'weather' },
];

const DEV_WORDS_ES_ITEMS = [
  { key: 'angry', es: 'enfadado' },
  { key: 'forest', es: 'bosque' },
  { key: 'believe', es: 'creer' },
  { key: 'careful', es: 'cuidadoso' },
  { key: 'borrow', es: 'pedir prestado' },
  { key: 'carry', es: 'llevar' },
  { key: 'early', es: 'temprano' },
  { key: 'gather', es: 'reunir' },
] as const;

const DEV_PHRASES_ES_ITEMS = [
  { key: 'She went to the store', es: 'Ella fue a la tienda' },
  { key: 'He is in the kitchen', es: 'El esta en la cocina' },
  { key: 'We will call you tomorrow', es: 'Te llamaremos manana' },
  { key: 'I have never been there', es: 'Nunca he estado alli' },
  { key: 'They are waiting for us', es: 'Nos estan esperando' },
  { key: 'Could you help me please', es: 'Podrias ayudarme, por favor' },
  { key: 'The weather is nice today', es: 'Hoy hace buen tiempo' },
] as const;

const DEV_WORDS_ES: Record<string, string> = Object.fromEntries(DEV_WORDS_ES_ITEMS.map(item => [item.key, item.es]));
const DEV_PHRASES_ES: Record<string, string> = Object.fromEntries(DEV_PHRASES_ES_ITEMS.map(item => [item.key, item.es]));

const DEV_ARENA = [
  { question: 'She ___ to the store yesterday', correct: 'went',    options: ['go', 'went', 'gone', 'goes'],   rule: 'Past Simple' },
  { question: 'I ___ never seen this before',   correct: 'have',    options: ['have', 'had', 'has', 'having'], rule: 'Present Perfect' },
  { question: 'They ___ waiting for an hour',   correct: 'were',    options: ['are', 'were', 'was', 'be'],     rule: 'Past Continuous' },
  { question: 'He ___ his keys again',          correct: 'lost',    options: ['lose', 'lost', 'loses', 'loss'],rule: 'Past Simple' },
  { question: 'We ___ finish by tomorrow',      correct: 'must',    options: ['must', 'can', 'may', 'might'],  rule: 'Modals' },
];

const DEV_ANALYTICS_PICKED = ['go', 'in', 'the', 'has', 'wait', 'must to', 'call to', 'a', 'never not'];

function canSeedEnglishDevTrainer(studyTarget?: RuntimeStudyTarget): boolean {
  return storageStudyTarget(studyTarget) !== 'fr';
}

async function devSeedMistakeAnalytics(
  now: number,
  rnd: (min: number, max: number) => number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const eventCount = rnd(12, 24);
  const phrasePool = [...DEV_PHRASES].sort(() => Math.random() - 0.5);
  const wordPool = [...DEV_WORDS].sort(() => Math.random() - 0.5);

  for (let i = 0; i < eventCount; i += 1) {
    const useWord = Math.random() < 0.28;
    const lessonId = rnd(1, 8);
    const picked = DEV_ANALYTICS_PICKED[rnd(0, DEV_ANALYTICS_PICKED.length - 1)];

    if (useWord) {
      const word = wordPool[i % wordPool.length];
      logMistake(word.key, lessonId, 'lesson_words', 'wrong_pick', {
        tokenText: word.key,
        tokenIndex: 0,
        expected: word.key,
        picked,
      }, studyTarget);
      continue;
    }

    const phrase = phrasePool[i % phrasePool.length];
    const tokens = phrase.key.split(/\s+/).filter(Boolean);
    const errorIndex = tokens.findIndex(token => token.toLowerCase() === phrase.errorWord.toLowerCase());
    const fallbackIndex = errorIndex >= 0 ? errorIndex : 0;
    const tokenIndex = Math.random() < 0.65 ? fallbackIndex : rnd(0, Math.max(0, tokens.length - 1));
    const tokenText = tokens[tokenIndex] ?? phrase.errorWord;
    logMistake(phrase.key, lessonId, 'lesson', 'wrong_pick', {
      tokenText,
      tokenIndex,
      expected: tokenText,
      picked,
      phraseId: `dev-${now}-${i}`,
    }, studyTarget);
  }

  await flushMistakeLog();
}

/**
 * DEV ONLY — заполняет тренер случайным кол-вом элементов в каждый раздел.
 * Nextdue = сегодня (сразу видны в очереди).
 */
export async function devSeedTrainer(studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  if (!canSeedEnglishDevTrainer(studyTarget)) {
    return false;
  }

  const items = await load(studyTarget);
  const now = Date.now();
  const todayMs = now; // nextDue в прошлом → сразу в очереди

  function rnd(min: number, max: number) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  // Слова: от 3 до 8
  const wordCount = rnd(3, 8);
  const shuffledWords = [...DEV_WORDS].sort(() => Math.random() - 0.5).slice(0, wordCount);
  for (const w of shuffledWords) {
    const existing = items.find(i => i.key === w.key && i.queue === 'words');
    if (existing) {
      existing.nextDue = todayMs;
      existing.archived = false;
    } else {
      items.push({
        key: w.key, queue: 'words',
        translationRu: w.ru, translationUk: w.uk,
        translationEs: DEV_WORDS_ES[w.key],
        lessonId: 1, mistakeCount: 2, correctStreak: 0,
        nextDue: todayMs, createdAt: now, archived: false,
      });
    }
  }

  // Фразы: от 3 до 7
  const phraseCount = rnd(3, 7);
  const shuffledPhrases = [...DEV_PHRASES].sort(() => Math.random() - 0.5).slice(0, phraseCount);
  for (const p of shuffledPhrases) {
    const existing = items.find(i => i.key === p.key && i.queue === 'phrases');
    if (existing) {
      existing.nextDue = todayMs;
      existing.archived = false;
    } else {
      items.push({
        key: p.key, queue: 'phrases',
        translationRu: p.ru, translationUk: p.uk,
        translationEs: DEV_PHRASES_ES[p.key],
        errorWord: p.errorWord,
        lessonId: 1, mistakeCount: 1, correctStreak: 0,
        nextDue: todayMs, createdAt: now, archived: false,
      });
    }
  }

  // Арена: от 2 до 5
  const arenaCount = rnd(2, 5);
  const shuffledArena = [...DEV_ARENA].sort(() => Math.random() - 0.5).slice(0, arenaCount);
  for (const a of shuffledArena) {
    const existing = items.find(i => i.key === a.question && i.queue === 'arena');
    if (existing) {
      existing.nextDue = todayMs;
      existing.archived = false;
    } else {
      items.push({
        key: a.question, queue: 'arena',
        translationRu: '', translationUk: '',
        arenaQuestion: { question: a.question, correct: a.correct, options: a.options, rule: a.rule },
        lessonId: 0, mistakeCount: 1, correctStreak: 0,
        nextDue: todayMs, createdAt: now, archived: false,
      });
    }
  }

  await save(items, studyTarget);
  await devSeedMistakeAnalytics(now, rnd, studyTarget);
  return true;
}

function devItem(
  item: Omit<TrainerItem, 'nextDue' | 'createdAt' | 'archived'> & Partial<Pick<TrainerItem, 'nextDue' | 'createdAt' | 'archived'>>,
  now: number,
): TrainerItem {
  return {
    nextDue: now,
    createdAt: now,
    archived: false,
    ...item,
  };
}

/** DEV ONLY — deterministic scenarios for admin/maestro visual QA. */
export async function devSeedTrainerScenario(
  scenario: TrainerDevScenario,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> {
  if (scenario === 'empty') {
    await clearTrainerStore(studyTarget);
    return true;
  }
  if (!canSeedEnglishDevTrainer(studyTarget)) {
    return false;
  }
  if (scenario === 'random') {
    await clearTrainerStore(studyTarget);
    await devSeedTrainer(studyTarget);
    return true;
  }

  const now = Date.now();
  const base: TrainerItem[] = [
    ...DEV_PHRASES.map((p, i) => devItem({
      key: p.key,
      queue: 'phrases',
      translationRu: p.ru,
      translationUk: p.uk,
      translationEs: DEV_PHRASES_ES[p.key],
      errorWord: p.errorWord,
      lessonId: 1 + i,
      mistakeCount: scenario === 'hard' ? 4 + (i % 3) : 1 + (i % 2),
      correctStreak: scenario === 'weak' ? 0 : 1,
    }, now)),
    ...DEV_WORDS.map((w, i) => devItem({
      key: w.key,
      queue: 'words',
      translationRu: w.ru,
      translationUk: w.uk,
      translationEs: DEV_WORDS_ES[w.key],
      lessonId: 1 + i,
      mistakeCount: scenario === 'hard' ? 3 + (i % 4) : 2,
      correctStreak: scenario === 'weak' ? (i % 2) : 2,
    }, now)),
    ...DEV_ARENA.map((a, i) => devItem({
      key: a.question,
      queue: 'arena',
      translationRu: '',
      translationUk: '',
      arenaQuestion: a,
      lessonId: 5 + i,
      mistakeCount: scenario === 'hard' ? 5 : 1 + (i % 2),
      correctStreak: scenario === 'weak' ? 0 : 1,
    }, now)),
  ];

  const items = scenario === 'overloaded'
    ? [...base, ...base.map((item, i) => ({ ...item, key: `${item.key} #${i + 1}`, mistakeCount: item.mistakeCount + 1, correctStreak: 0 }))]
    : scenario === 'hard'
      ? base.filter(item => item.mistakeCount >= 3)
      : base;
  await save(items, studyTarget);
  return true;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
