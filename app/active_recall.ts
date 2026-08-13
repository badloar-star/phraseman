/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTIVE RECALL — Модуль интервального повторения для неправильных ответов
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Цель:
 *   Запоминать фразы, которые пользователь вводит НЕПРАВИЛЬНО в уроках,
 *   и предлагать их для повторения в последующие дни по алгоритму SM-2
 *   (Scientific Spaced Repetition). Это то, чего нет в обычных системах —
 *   приложение запоминает именно твои слабые места, а не то, что ты знаешь.
 *
 * Алгоритм SM-2:
 *   • После правильного ответа:  следующий показ = interval * easeFactor
 *   • После неправильного:       interval сбрасывается к 1 дню, easeFactor снижается
 *   • easeFactor ∈ [1.3 … 2.5], начинается с 2.5
 *   • interval начинается с 1 дня, потом 3, потом easeFactor × предыдущий
 *
 * Интеграция:
 *   1. recordMistake из урока, диагностики или зачёта.
 *   2. Бейдж на главной: countDueItemsToday() — без записи в storage
 *   3. Сессия /review: getDueItems(limit, { commitSessionOverflow: true })
 *   4. markReviewed после ответа в сессии
 *
 * Хранилище: AsyncStorage через activeRecallItemsKey(studyTarget).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { englishRecallSurface } from './phrase_target_utils';
import { getTopMistakePhraseDetails, logMistake, type MistakeTokenMeta } from './mistake_log';
import { isCategory, normalizeWordCategory, type WordCategory } from './pos_taxonomy';
import { activeRecallItemsKey, storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { srsReviewContentAvailableForTarget } from './trainer_target_gate';
import {
  classifyActualDelay,
  classifyDueStatus,
  deriveMasteryTransition,
  type ActualDelayBucket,
  type LearningMasteryState,
  type LearningMasteryTransition,
  type ReviewDueStatus,
} from './learning_review_analytics';

// ─── Типы ────────────────────────────────────────────────────────────────────

/**
 * Откуда запись попала в очередь (старые данные без поля = урок).
 * cards-2.0 (E8): +'custom' (своя/сохранённая карточка) и 'pack' (карточка
 * купленного набора) — ошибки deck-сессий тренера попадают в review (§3.7).
 * Обратная совместимость: старые записи без поля читаются как есть, дефолт
 * поведения — 'lesson' (никакой миграции на диске).
 */
export type MistakeSource = 'lesson' | 'quiz' | 'arena' | 'diagnostic' | 'exam' | 'custom' | 'pack';

export interface RecallItem {
  /** Random local identifier used for privacy-safe longitudinal analytics. */
  analyticsItemId?: string;
  /** Неправильно введённая/пропущенная фраза (английская часть) */
  phrase:        string;
  /** Правильный перевод/вариант — русский */
  correctAnswer: string;
  /** Правильный перевод/вариант — украинский (опционально) */
  correctAnswerUK?: string;
  /** Подсказка для локали es (опционально) */
  correctAnswerES?: string;
  /** ID урока, откуда взята фраза */
  lessonId:      number;
  /** Источник ошибки (для подписи на экране повторения) */
  source?:       MistakeSource;
  /** Concrete token that caused the mistake, when known. */
  errorWord?:    string;
  /** Normalized POS category for the mistaken token. */
  category?:     WordCategory;
  /** Raw grammar tag from lesson/exam data for drill generation. */
  grammarTag?:   string;
  /** Token index in the English phrase, when known. */
  tokenIndex?:   number;
  /** Счётчик суммарных ошибок по этой фразе */
  errorCount:    number;
  /** Кол-во правильных повторений подряд (для SM-2) */
  repetitions:   number;
  /** Текущий интервал в днях между повторениями */
  interval:      number;
  /** Фактор лёгкости (ease factor) для алгоритма SM-2: 1.3–2.5 */
  easeFactor:    number;
  /** Unix timestamp (мс) — когда фраза была добавлена впервые */
  createdAt:     number;
  /** Unix timestamp (мс) — дата последнего повторения */
  lastReviewed:  number;
  /** Unix timestamp (мс) — когда показать следующий раз */
  nextDue:       number;
  /** Evidence state based only on observed delayed recall, never on a scheduled interval. */
  masteryState?: LearningMasteryState;
  masteredAtMs?: number;
  durableMasteredAtMs?: number;
  lastLapsedAtMs?: number;
}

export interface ReviewTransition {
  analyticsItemId: string;
  lessonId: number;
  source: MistakeSource;
  correct: boolean;
  reviewedAtMs: number;
  actualDelayBucket: ActualDelayBucket;
  dueStatus: ReviewDueStatus;
  previousRepetitions: number;
  nextRepetitions: number;
  previousIntervalDays: number;
  nextIntervalDays: number;
  previousMasteryState: LearningMasteryState;
  nextMasteryState: LearningMasteryState;
  masteryTransition: LearningMasteryTransition;
}

// ─── Константы ───────────────────────────────────────────────────────────────

const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR     = 1.3;
const MAX_EASE_FACTOR     = 2.5;
/** Минимальный балл «хорошего» ответа (0–5 шкала SM-2, мы используем boolean → 0 / 3) */
const GOOD_QUALITY        = 3;
/** Максимум фраз в одной сессии повторения — не перегружаем пользователя */
export const SESSION_LIMIT = 7;
/** Максимальное кол-во фраз в хранилище — защита от переполнения */
const MAX_ITEMS = 300;
/** Фраза не показывалась N дней → авто-удаление (пользователь всё равно забыл) */
const AUTO_DELETE_DAYS = 60;

const recallStorageTails = new Map<string, Promise<void>>();

function recallStorageQueueKey(studyTarget?: RuntimeStudyTarget): string {
  return activeRecallItemsKey(studyTarget);
}

async function withRecallStorageLock<T>(
  studyTarget: RuntimeStudyTarget | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  const key = recallStorageQueueKey(studyTarget);
  const previous = recallStorageTails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const tail = previous.catch(() => {}).then(() => gate);
  recallStorageTails.set(key, tail);
  await previous.catch(() => {});
  try {
    return await operation();
  } finally {
    release();
    if (recallStorageTails.get(key) === tail) recallStorageTails.delete(key);
  }
}

function makeAnalyticsItemId(): string {
  const runtimeCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined;
  const uuid = runtimeCrypto?.randomUUID?.();
  if (uuid) return uuid;
  return `ri_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

/** Ключ AsyncStorage для EN-фразы: без chunk-маркеров ` — `/` - ` как в тексте lesson 20. */
function recallPhraseKey(phrase: string): string {
  return englishRecallSurface(phrase);
}

function resolveRecallMistakeMeta(
  phraseKey: string,
  meta?: MistakeTokenMeta,
): Pick<RecallItem, 'errorWord' | 'category' | 'grammarTag' | 'tokenIndex'> {
  if (!meta) return {};
  const errorWord = meta?.tokenText?.trim() || meta?.expected?.trim() || undefined;
  if (!errorWord && !meta.category && !meta.rawCategory && !meta.grammarTag) return {};
  const resolved = isCategory(meta?.category)
    ? { category: meta.category, grammarTag: meta.grammarTag }
    : normalizeWordCategory(meta?.rawCategory || meta?.grammarTag, errorWord || phraseKey);
  return {
    errorWord,
    category: resolved.category !== 'other' ? resolved.category : undefined,
    grammarTag: resolved.grammarTag || meta?.grammarTag || meta?.rawCategory,
    tokenIndex: Number.isFinite(meta?.tokenIndex) ? meta?.tokenIndex : undefined,
  };
}

function applyRecallMistakeMeta(
  item: RecallItem,
  meta: Pick<RecallItem, 'errorWord' | 'category' | 'grammarTag' | 'tokenIndex'>,
): void {
  if (meta.errorWord) item.errorWord = meta.errorWord;
  if (meta.category) item.category = meta.category;
  if (meta.grammarTag) item.grammarTag = meta.grammarTag;
  if (Number.isFinite(meta.tokenIndex)) item.tokenIndex = meta.tokenIndex;
}

/** Если после нормализации оказались дубликаты, объединяем — консервативный SM-2. */
function mergeDuplicateRecallItems(a: RecallItem, b: RecallItem): RecallItem {
  const newer = a.lastReviewed >= b.lastReviewed ? a : b;
  const older = newer === a ? b : a;
  const analyticsItemId = [a.analyticsItemId, b.analyticsItemId]
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? makeAnalyticsItemId();
  return {
    analyticsItemId,
    phrase: newer.phrase,
    correctAnswer: newer.correctAnswer || older.correctAnswer,
    correctAnswerUK: newer.correctAnswerUK ?? older.correctAnswerUK,
    correctAnswerES: newer.correctAnswerES ?? older.correctAnswerES,
    lessonId: newer.lessonId,
    source: newer.source ?? older.source,
    errorWord: newer.errorWord ?? older.errorWord,
    category: newer.category ?? older.category,
    grammarTag: newer.grammarTag ?? older.grammarTag,
    tokenIndex: Number.isFinite(newer.tokenIndex) ? newer.tokenIndex : older.tokenIndex,
    errorCount: Math.max(a.errorCount, b.errorCount),
    repetitions: Math.min(a.repetitions, b.repetitions),
    interval: Math.min(a.interval, b.interval),
    easeFactor: Math.min(a.easeFactor, b.easeFactor),
    createdAt: Math.min(a.createdAt, b.createdAt),
    lastReviewed: Math.max(a.lastReviewed, b.lastReviewed),
    nextDue: Math.min(a.nextDue, b.nextDue),
    masteryState: newer.masteryState ?? older.masteryState,
    masteredAtMs: newer.masteredAtMs ?? older.masteredAtMs,
    durableMasteredAtMs: newer.durableMasteredAtMs ?? older.durableMasteredAtMs,
    lastLapsedAtMs: newer.lastLapsedAtMs ?? older.lastLapsedAtMs,
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): number {
  return Date.now() + days * MS_PER_DAY;
}

function todayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfTodayMs(): number {
  return todayStart() + MS_PER_DAY - 1;
}

function countDueInList(items: RecallItem[]): number {
  const end = endOfTodayMs();
  return items.filter(i => i.nextDue <= end).length;
}

/**
 * Сколько фраз просрочено на сегодня (nextDue ≤ конец календарного дня).
 * Без записи в AsyncStorage — для бейджа на главной и табе.
 */
export async function countDueItemsToday(studyTarget?: RuntimeStudyTarget): Promise<number> {
  if (!srsReviewContentAvailableForTarget(studyTarget)) return 0;
  const items = await loadItems(studyTarget);
  return countDueInList(items);
}

// ─── Миграции: таблица исправлений неверных фраз ─────────────────────────────
// Ключ — старая (неверная) фраза, значение — исправленная.
// Добавляй сюда новые записи при обнаружении ошибок в lesson_data_*.ts.
const PHRASE_CORRECTIONS: Record<string, string> = {
  'Our bills are paid by them at end of every month.':
    'Our bills are paid by them at the end of every month.',
  'That important document is signed by them at end of every year.':
    'That important document is signed by them at the end of every year.',
  'The train arrives at seven AM':
    'The train arrives at seven fifteen AM',
};

// ─── Загрузка / сохранение ───────────────────────────────────────────────────

async function loadItemsUnlocked(studyTarget?: RuntimeStudyTarget): Promise<{ items: RecallItem[]; changed: boolean }> {
  try {
    const raw = await AsyncStorage.getItem(activeRecallItemsKey(studyTarget));
    if (!raw) return { items: [], changed: false };
    const items = JSON.parse(raw) as RecallItem[];
    return applyCorrections(items, studyTarget);
  } catch {
    return { items: [], changed: false };
  }
}

async function loadItems(studyTarget?: RuntimeStudyTarget): Promise<RecallItem[]> {
  return withRecallStorageLock(studyTarget, async () => {
    const normalized = await loadItemsUnlocked(studyTarget);
    if (normalized.changed) await saveItems(normalized.items, studyTarget);
    return normalized.items;
  });
}

/** Исправляет устаревшие фразы в хранилище (однократно при загрузке). */
function applyCorrections(items: RecallItem[], studyTarget?: RuntimeStudyTarget): { items: RecallItem[]; changed: boolean } {
  let changed = false;
  const applyEnglishCorrections = storageStudyTarget(studyTarget) !== 'fr';

  const activeItems = items.filter((item) => (
    item.source == null
    || item.source === 'lesson'
    || item.source === 'diagnostic'
    || item.source === 'exam'
  ));
  if (activeItems.length !== items.length) {
    changed = true;
  }

  const afterTable = activeItems.map(item => {
    const correct = applyEnglishCorrections ? PHRASE_CORRECTIONS[item.phrase] : undefined;
    if (correct) {
      changed = true;
      return { ...item, phrase: correct };
    }
    return item;
  });

  const normalized = afterTable.map(item => {
    const key = recallPhraseKey(item.phrase);
    if (key !== item.phrase) changed = true;
    return { ...item, phrase: key };
  });

  const byPhrase = new Map<string, RecallItem>();
  for (const item of normalized) {
    const prev = byPhrase.get(item.phrase);
    if (!prev) {
      byPhrase.set(item.phrase, item);
    } else {
      changed = true;
      byPhrase.set(item.phrase, mergeDuplicateRecallItems(prev, item));
    }
  }

  const fixed = Array.from(byPhrase.values());
  const usedIds = new Set<string>();
  for (const item of fixed) {
    let analyticsItemId = item.analyticsItemId?.trim();
    if (!analyticsItemId || usedIds.has(analyticsItemId)) {
      analyticsItemId = makeAnalyticsItemId();
      item.analyticsItemId = analyticsItemId;
      changed = true;
    }
    usedIds.add(analyticsItemId);
  }
  return { items: fixed, changed };
}

async function saveItems(items: RecallItem[], studyTarget?: RuntimeStudyTarget): Promise<void> {
  await AsyncStorage.setItem(activeRecallItemsKey(studyTarget), JSON.stringify(items));
}

// ─── Публичный API ───────────────────────────────────────────────────────────

/**
 * Записать ошибку пользователя.
 *
 * Вызывать каждый раз, когда пользователь дал неправильный ответ в уроке.
 * Если фраза уже есть — увеличивает счётчик ошибок и пересчитывает дату
 * следующего показа (приближает её, если ошибок много).
 *
 * @param phrase           Английская фраза/предложение (ключ)
 * @param correctAnswer    Правильный перевод — русский
 * @param lessonId         Номер урока (1–32)
 * @param correctAnswerUK  Правильный перевод — украинский (опционально)
 * @param correctAnswerES  Подсказка на испанском (опционально)
 */
export async function recordMistake(
  phrase:           string,
  correctAnswer:    string,
  lessonId:         number,
  correctAnswerUK?: string,
  source:           MistakeSource = 'lesson',
  correctAnswerES?: string,
  meta?:            MistakeTokenMeta,
  studyTarget?:     RuntimeStudyTarget,
): Promise<void> {
  return withRecallStorageLock(studyTarget, async () => {
  const { items: raw } = await loadItemsUnlocked(studyTarget);

  const phraseKey = recallPhraseKey(phrase);
  const mistakeMeta = resolveRecallMistakeMeta(phraseKey, meta);

  // Авто-удаление: фразы, которые не показывались AUTO_DELETE_DAYS дней
  const cutoff = Date.now() - AUTO_DELETE_DAYS * MS_PER_DAY;
  let items = raw.filter(i => i.lastReviewed >= cutoff);

  // Лимит хранилища: если > MAX_ITEMS, удаляем самые лёгкие и самые старые
  if (items.length >= MAX_ITEMS) {
    items = items
      .sort((a, b) => b.errorCount - a.errorCount || b.createdAt - a.createdAt)
      .slice(0, MAX_ITEMS - 1);
  }

  const existing = items.find(i => i.phrase === phraseKey);

  if (existing) {
    const wasMastered = existing.masteryState === 'mastered' || existing.masteryState === 'durable_mastered';
    // Фраза уже есть — увеличиваем счётчик, снижаем easeFactor, сбрасываем интервал
    existing.errorCount  += 1;
    existing.repetitions  = 0;
    existing.interval     = 1;
    existing.easeFactor   = Math.max(
      MIN_EASE_FACTOR,
      existing.easeFactor - 0.2,
    );
    existing.lastReviewed = Date.now();
    if (wasMastered) {
      existing.masteryState = 'learning';
      existing.lastLapsedAtMs = existing.lastReviewed;
    }
    // Актуализируем подсказки и урок/источник
    if (correctAnswer) existing.correctAnswer = correctAnswer;
    if (correctAnswerUK) existing.correctAnswerUK = correctAnswerUK;
    if (correctAnswerES) existing.correctAnswerES = correctAnswerES;
    existing.lessonId  = lessonId;
    existing.source      = source;
    applyRecallMistakeMeta(existing, mistakeMeta);
    // Следующее повторение — через 1 день
    existing.nextDue      = daysFromNow(1);
  } else {
    // Новая фраза
    const newItem: RecallItem = {
      analyticsItemId: makeAnalyticsItemId(),
      phrase: phraseKey,
      correctAnswer,
      correctAnswerUK,
      correctAnswerES,
      lessonId,
      source,
      ...mistakeMeta,
      errorCount:  1,
      repetitions: 0,
      interval:    1,
      easeFactor:  INITIAL_EASE_FACTOR,
      createdAt:   Date.now(),
      lastReviewed: Date.now(),
      nextDue:     daysFromNow(1),
    };
    items.push(newItem);
  }

  await saveItems(items, studyTarget);
  });
}

/** Режимы Тренера — влияют на фильтрацию/сортировку getTrainerItems. */
export type TrainerMode =
  | 'due'        // Срочные: nextDue ≤ сегодня — стандартный SRS (Free)
  | 'fresh'      // Свежие: добавлены за последние 7 дней (Free)
  | 'weak'       // Слабые места: easeFactor ≤ 1.7 (Premium)
  | 'hard'       // Сложные: errorCount ≥ 3 (Premium)
  | 'smart_mix'  // Auto mix: 40% due + 30% weak + 30% fresh (Premium)
  | 'by_topic'   // По теме: filter by lessonId (Premium)
  | 'mistakes';  // По ошибкам: топ фраз из mistake_log за 30 дней (Premium)

export const TRAINER_PREMIUM_MODES: TrainerMode[] = ['weak', 'hard', 'smart_mix', 'by_topic', 'mistakes'];

export type GetDueItemsOptions = {
  /**
   * true — оформить сессию: «лишние» сегодняшние просрочки переносятся на завтра (защита от перегруза).
   * Вызывайте так только при входе в /review. По умолчанию false (без записи в storage).
   */
  commitSessionOverflow?: boolean;
};

/**
 * Фразы к повторению сегодня (nextDue ≤ конец дня), с сортировкой по приоритету.
 * Перегруз (commitSessionOverflow) — только при старте сессии в review.tsx.
 */
export async function getDueItems(
  limit = SESSION_LIMIT,
  options?: GetDueItemsOptions,
  studyTarget?: RuntimeStudyTarget,
): Promise<RecallItem[]> {
  if (!srsReviewContentAvailableForTarget(studyTarget)) return [];
  return withRecallStorageLock(studyTarget, async () => {
  const normalized = await loadItemsUnlocked(studyTarget);
  const items = normalized.items;
  const endOfToday = endOfTodayMs();
  const commit = options?.commitSessionOverflow === true;

  const due = items
    .filter(i => i.nextDue <= endOfToday)
    .sort((a, b) => b.errorCount - a.errorCount || a.nextDue - b.nextDue);

  const selected = due.slice(0, limit);
  const overflow = due.slice(limit);

  if (overflow.length > 0 && commit) {
    const tomorrow = daysFromNow(1);
    const selectedSet = new Set(selected.map(i => i.phrase));
    for (const item of items) {
      if (!selectedSet.has(item.phrase) && item.nextDue <= endOfToday) {
        item.nextDue = tomorrow;
      }
    }
    await saveItems(items, studyTarget);
  } else if (normalized.changed) {
    await saveItems(items, studyTarget);
  }

  return selected;
  });
}

const FRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней
const WEAK_EASE_THRESHOLD = 1.7;
const HARD_ERROR_THRESHOLD = 3;

/**
 * Получить фразы для конкретного режима Тренера.
 *
 * @param mode     Режим Тренера (TrainerMode)
 * @param limit    Максимум фраз в сессии (default SESSION_LIMIT)
 * @param lessonId Только для mode='by_topic' — ID урока для фильтрации
 * @param category Для mode='mistakes' — фильтровать только фразы этой грамматической категории
 */
export async function getTrainerItems(
  mode: TrainerMode = 'due',
  limit = SESSION_LIMIT,
  lessonId?: number,
  category?: string,
  studyTarget?: RuntimeStudyTarget,
): Promise<RecallItem[]> {
  if (!srsReviewContentAvailableForTarget(studyTarget)) return [];
  const all = await loadItems(studyTarget);
  const endOfToday = endOfTodayMs();
  const now = Date.now();

  switch (mode) {
    case 'due': {
      const due = all
        .filter((i) => i.nextDue <= endOfToday)
        .sort((a, b) => b.errorCount - a.errorCount || a.nextDue - b.nextDue);
      return due.slice(0, limit);
    }
    case 'fresh': {
      const freshWindow = now - FRESH_WINDOW_MS;
      const fresh = all
        .filter((i) => i.createdAt >= freshWindow && i.repetitions < 3)
        .sort((a, b) => b.createdAt - a.createdAt);
      return fresh.slice(0, limit);
    }
    case 'weak': {
      const weak = all
        .filter((i) => i.easeFactor <= WEAK_EASE_THRESHOLD)
        .sort((a, b) => a.easeFactor - b.easeFactor);
      return weak.slice(0, limit);
    }
    case 'hard': {
      const hard = all
        .filter((i) => i.errorCount >= HARD_ERROR_THRESHOLD)
        .sort((a, b) => b.errorCount - a.errorCount);
      return hard.slice(0, limit);
    }
    case 'smart_mix': {
      const dueItems = all.filter((i) => i.nextDue <= endOfToday).sort((a, b) => b.errorCount - a.errorCount);
      const weakItems = all.filter((i) => i.easeFactor <= WEAK_EASE_THRESHOLD && i.nextDue > endOfToday).sort((a, b) => a.easeFactor - b.easeFactor);
      const freshWindow = now - FRESH_WINDOW_MS;
      const freshItems = all.filter((i) => i.createdAt >= freshWindow && i.repetitions < 3 && i.nextDue > endOfToday).sort((a, b) => b.createdAt - a.createdAt);
      const duePart = Math.ceil(limit * 0.4);
      const weakPart = Math.ceil(limit * 0.3);
      const freshPart = limit - duePart - weakPart;
      const usedPhrases = new Set<string>();
      const pick = (source: RecallItem[], n: number): RecallItem[] => {
        const result: RecallItem[] = [];
        for (const item of source) {
          if (result.length >= n) break;
          if (!usedPhrases.has(item.phrase)) {
            result.push(item);
            usedPhrases.add(item.phrase);
          }
        }
        return result;
      };
      const mixed = [
        ...pick(dueItems, duePart),
        ...pick(weakItems, weakPart),
        ...pick(freshItems, freshPart),
      ];
      // Если не набрали limit (нехватка в каком-то сегменте) — добираем из due
      const remaining = limit - mixed.length;
      if (remaining > 0) {
        const extra = pick(dueItems, remaining);
        mixed.push(...extra);
      }
      return mixed.slice(0, limit);
    }
    case 'by_topic': {
      if (!Number.isFinite(lessonId) || !lessonId) return getDueItems(limit, undefined, studyTarget);
      const byTopic = all
        .filter((i) => i.lessonId === lessonId)
        .sort((a, b) => b.errorCount - a.errorCount || a.nextDue - b.nextDue);
      return byTopic.slice(0, limit);
    }
    case 'mistakes': {
      // Фразы из mistake_log (топ по ошибкам за 30 дней), отсортированные по частоте.
      // Если фраза есть в SRS-базе — берём её оттуда (чтобы SM-2 метрики сохранялись).
      // Если нет в базе — пропускаем (фраза ещё не добавлена в повторение).
      const weakDetails = await getTopMistakePhraseDetails(limit * 4, 1, studyTarget);
      const weakPhrases = weakDetails.map((detail) => detail.phrase);
      const byPhrase = new Map(all.map((i) => [i.phrase.toLowerCase(), i]));

      // Если передана категория — фильтруем фразы по грамматической категории через phraseIndex
      let categoryFilter: ((phrase: string) => boolean) | null = null;
      let focusCategoryFilter: WordCategory | null = null;
      if (category && isCategory(category) && category !== 'other') {
        const focusCategory = category as WordCategory;
        focusCategoryFilter = focusCategory;
        const detailsByPhrase = new Map(
          weakDetails.map((detail) => [recallPhraseKey(detail.phrase).toLowerCase(), detail]),
        );
        categoryFilter = (phrase: string) => {
          const detail = detailsByPhrase.get(recallPhraseKey(phrase).toLowerCase());
          const categoryCount = detail?.categoryCounts[focusCategory] ?? 0;
          if (categoryCount > 0) return true;
          return false;
        };
      }

      const result: RecallItem[] = [];
      for (const phrase of weakPhrases) {
        if (result.length >= limit) break;
        if (categoryFilter && !categoryFilter(phrase)) continue;
        const item = byPhrase.get(phrase.toLowerCase());
        if (item) result.push(item);
      }
      // Если мало фраз — добираем слабые SRS-фразы (с фильтром по категории если нужно)
      if (result.length < limit) {
        const usedPhrases = new Set(result.map((i) => i.phrase.toLowerCase()));
        const extra = all
          .filter((i) => {
            if (usedPhrases.has(i.phrase.toLowerCase())) return false;
            if (i.easeFactor > WEAK_EASE_THRESHOLD) return false;
            if (focusCategoryFilter && i.category) return i.category === focusCategoryFilter;
            if (categoryFilter && !categoryFilter(i.phrase)) return false;
            return true;
          })
          .sort((a, b) => a.easeFactor - b.easeFactor)
          .slice(0, limit - result.length);
        result.push(...extra);
      }
      return result;
    }
    default:
      return getDueItems(limit, undefined, studyTarget);
  }
}

/**
 * Количество фраз доступных в каждом режиме Тренера (для главного экрана-хаба).
 * Не мутирует storage.
 */
export async function getTrainerModeCounts(studyTarget?: RuntimeStudyTarget): Promise<Record<TrainerMode, number>> {
  if (!srsReviewContentAvailableForTarget(studyTarget)) {
    return { due: 0, fresh: 0, weak: 0, hard: 0, smart_mix: 0, by_topic: 0, mistakes: 0 };
  }
  const all = await loadItems(studyTarget);
  const endOfToday = endOfTodayMs();
  const now = Date.now();
  const freshWindow = now - FRESH_WINDOW_MS;

  const due    = all.filter((i) => i.nextDue <= endOfToday).length;
  const fresh  = all.filter((i) => i.createdAt >= freshWindow && i.repetitions < 3).length;
  const weak   = all.filter((i) => i.easeFactor <= WEAK_EASE_THRESHOLD).length;
  const hard   = all.filter((i) => i.errorCount >= HARD_ERROR_THRESHOLD).length;
  const smart  = Math.min(SESSION_LIMIT, Math.max(due, weak, fresh));
  const topic  = all.length;

  const { getWeakPhrases } = await import('./mistake_log');
  const weakFromLog = await getWeakPhrases(SESSION_LIMIT * 2, 2, studyTarget);
  const byPhrase = new Map(all.map((i) => [i.phrase.toLowerCase(), i]));
  const mistakesCount = weakFromLog.filter((p) => byPhrase.has(p.toLowerCase())).length;

  return { due, fresh, weak, hard, smart_mix: smart, by_topic: topic, mistakes: mistakesCount };
}

/**
 * Отметить результат повторения и пересчитать интервал (SM-2).
 *
 * @param phrase     Английская фраза (ключ)
 * @param gotCorrect true — пользователь ответил правильно, false — нет
 */
export async function markReviewed(
  phrase:      string,
  gotCorrect:  boolean,
  meta?:       MistakeTokenMeta,
  studyTarget?: RuntimeStudyTarget,
): Promise<ReviewTransition | undefined> {
  const transition = await withRecallStorageLock(studyTarget, async () => {
    const { items } = await loadItemsUnlocked(studyTarget);
    const item = items.find(i => i.phrase === phrase);
    if (!item) return undefined;

    const reviewedAtMs = Date.now();
    const previousLastReviewed = item.lastReviewed;
    const previousNextDue = item.nextDue;
    const previousRepetitions = item.repetitions;
    const previousIntervalDays = item.interval;
    const actualDelayBucket = classifyActualDelay(reviewedAtMs - previousLastReviewed);
    const dueStatus = classifyDueStatus(reviewedAtMs - previousNextDue);
    const mastery = deriveMasteryTransition({
      previousState: item.masteryState,
      correct: gotCorrect,
      actualDelayBucket,
    });
    const quality = gotCorrect ? GOOD_QUALITY : 0;
    item.lastReviewed = reviewedAtMs;

    if (gotCorrect) {
      item.repetitions += 1;
      if (item.repetitions === 1) item.interval = 1;
      else if (item.repetitions === 2) item.interval = 3;
      else item.interval = Math.round(item.interval * item.easeFactor);

      const q = quality;
      item.easeFactor = Math.min(
        MAX_EASE_FACTOR,
        Math.max(
          MIN_EASE_FACTOR,
          item.easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02),
        ),
      );
    } else {
      item.repetitions = 0;
      item.interval = 1;
      item.easeFactor = Math.max(MIN_EASE_FACTOR, item.easeFactor - 0.2);
      item.errorCount += 1;
      applyRecallMistakeMeta(item, resolveRecallMistakeMeta(item.phrase, meta));
    }

    item.nextDue = reviewedAtMs + item.interval * MS_PER_DAY;
    item.masteryState = mastery.nextState;
    if (mastery.transition === 'mastered' && !item.masteredAtMs) item.masteredAtMs = reviewedAtMs;
    if (mastery.transition === 'durable_mastered' && !item.durableMasteredAtMs) item.durableMasteredAtMs = reviewedAtMs;
    if (mastery.transition === 'lapsed') item.lastLapsedAtMs = reviewedAtMs;
    await saveItems(items, studyTarget);

    return {
      analyticsItemId: item.analyticsItemId!,
      lessonId: item.lessonId,
      source: item.source ?? 'lesson',
      correct: gotCorrect,
      reviewedAtMs,
      actualDelayBucket,
      dueStatus,
      previousRepetitions,
      nextRepetitions: item.repetitions,
      previousIntervalDays,
      nextIntervalDays: item.interval,
      previousMasteryState: mastery.previousState,
      nextMasteryState: mastery.nextState,
      masteryTransition: mastery.transition,
    } satisfies ReviewTransition;
  });

  if (gotCorrect && transition) {
    const { checkAchievements } = await import('./achievements');
    void checkAchievements({ type: 'trainer_correct', correct: 1, studyTarget });
  }
  return transition;
}

/**
 * Получить всё содержимое хранилища (для дебага и статистики).
 */
export async function getAllItems(studyTarget?: RuntimeStudyTarget): Promise<RecallItem[]> {
  return loadItems(studyTarget);
}

/**
 * Удалить конкретную фразу из хранилища (например, если пользователь
 * решил, что уже хорошо её знает).
 */
export async function removeItem(phrase: string, studyTarget?: RuntimeStudyTarget): Promise<void> {
  await withRecallStorageLock(studyTarget, async () => {
    const { items } = await loadItemsUnlocked(studyTarget);
    const filtered = items.filter(i => i.phrase !== phrase);
    await saveItems(filtered, studyTarget);
  });
}

/**
 * Сбросить всё хранилище (например, при сбросе прогресса пользователя).
 * ОСТОРОЖНО: необратимо.
 */
export async function clearAllItems(studyTarget?: RuntimeStudyTarget): Promise<void> {
  await withRecallStorageLock(studyTarget, () => AsyncStorage.removeItem(activeRecallItemsKey(studyTarget)));
}

/**
 * Статистика: сколько фраз в работе, сколько просрочено, сколько выучено.
 *
 * Считается «выученной» фраза с repetitions ≥ 5 (≈ 30+ дней без ошибок).
 */
export async function getStats(studyTarget?: RuntimeStudyTarget): Promise<{
  total:     number;
  dueTodayCount: number;
  learnedCount:  number;
  hardestPhrases: RecallItem[];
}> {
  const items       = await loadItems(studyTarget);
  if (!srsReviewContentAvailableForTarget(studyTarget)) {
    return {
      total: items.length,
      dueTodayCount: 0,
      learnedCount: 0,
      hardestPhrases: [],
    };
  }
  const dueTodayCount  = countDueInList(items);
  const learnedCount   = items.filter(i => i.repetitions >= 5).length;
  // Самые трудные фразы — те, у которых больше всего ошибок
  const hardestPhrases = [...items]
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 10);

  return {
    total:     items.length,
    dueTodayCount,
    learnedCount,
    hardestPhrases,
  };
}

/**
 * Получить фразы из конкретного урока (для preview в lesson_menu).
 */
export async function getItemsByLesson(lessonId: number, studyTarget?: RuntimeStudyTarget): Promise<RecallItem[]> {
  if (!srsReviewContentAvailableForTarget(studyTarget)) return [];
  const items = await loadItems(studyTarget);
  return items
    .filter(i => i.lessonId === lessonId)
    .sort((a, b) => b.errorCount - a.errorCount);
}

// ── Запись из зачёта и диагностики ────────────────────────────────────────

/** Собранное предложение для зачёта уровня (пропуск или целое MC). */
export function buildLevelExamEnglish(q: {
  q: string;
  opts: string[];
  correct: number;
  type?: string;
}): string {
  if (!q?.opts?.length) return '';
  const c = q.opts[q.correct];
  if (!c) return '';
  if (q.q.includes('___')) return q.q.replace('___', c).replace(/\s+/g, ' ').trim();
  return c.trim();
}

export function buildLevelExamHintPair(q: {
  topic: string;
  topicUK: string;
  q: string;
}): { ru: string; uk: string } {
  return {
    ru: `${q.topic} · ${q.q}`,
    uk: `${q.topicUK} · ${q.q}`,
  };
}

/** Формат вопроса диагностики (без импорта diagnostic_test). */
export type DiagnosticMistakeQ = {
  phrase: string;
  hintRU: string;
  hintUK: string;
  opts: string[];
  correct: number;
  type?: 'fill' | 'build' | 'choice4' | 'type' | 'match';
  words?: string[];
  answer?: string;
};

export function buildDiagnosticEnglishPhrase(q: DiagnosticMistakeQ): string | null {
  if (q.type === 'match') return null;
  if (q.type === 'build' && q.answer) return q.answer.trim();
  if (q.type === 'type' && q.answer) {
    if (q.phrase.includes('___')) return q.phrase.replace('___', q.answer).replace(/\s+/g, ' ').trim();
    return q.answer.trim();
  }
  if (!q.opts?.length) return null;
  const c = q.opts[q.correct];
  if (!c) return null;
  if (q.phrase.includes('___')) return q.phrase.replace('___', c).replace(/\s+/g, ' ').trim();
  return null;
}

export async function recordMistakeFromDiagnostic(
  q: DiagnosticMistakeQ,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  const phrase = buildDiagnosticEnglishPhrase(q);
  if (!phrase) return;
  const expected = q.answer || q.opts?.[q.correct];
  const tokenMeta = q.phrase.includes('___') && expected
    ? { tokenText: expected, expected, rawCategory: q.type }
    : undefined;
  await recordMistake(phrase, q.hintRU, 0, q.hintUK, 'diagnostic', undefined, tokenMeta, studyTarget);
  logMistake(
    phrase,
    0,
    'diagnostic',
    'wrong_pick',
    tokenMeta,
    studyTarget,
  );
}

// ─── Хелпер для интеграции с lesson1.tsx (вызывается при checkAnswer) ────────
//
// Пример использования в lesson1.tsx:
//
//   import { recordMistake } from './active_recall';
//
//   // В handleCheck(), когда ответ неправильный:
//   if (!isCorrect) {
//     recordMistake(
//       currentPhrase.en,   // английская фраза
//       currentPhrase.ru,   // правильный перевод
//       lessonId,           // номер урока
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
