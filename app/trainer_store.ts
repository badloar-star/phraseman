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

// ── Константы ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'trainer_store_v1';
const MS_PER_DAY  = 24 * 60 * 60 * 1000;

/** Лесенка интервалов в днях. Индекс = кол-во правильных ответов подряд. */
const INTERVALS = [1, 3, 7, 14, 30] as const;

/** После этого кол-ва правильных → слово/фраза уходит в архив. */
const GRADUATE_AT = INTERVALS.length; // 5

// ── Типы ────────────────────────────────────────────────────────────────────

export type TrainerQueue = 'words' | 'phrases' | 'arena';

export interface TrainerItem {
  /** Уникальный ключ: для слов — английское слово/глагол, для фраз — английская фраза */
  key: string;
  queue: TrainerQueue;
  /** Для слов/глаголов: перевод (ru) */
  translationRu: string;
  /** Для слов/глаголов: перевод (uk) */
  translationUk: string;
  /** Для фраз: слово на котором была ошибка (для режима fill-the-gap) */
  errorWord?: string;
  /** Для арены: исходный вопрос в формате арены */
  arenaQuestion?: ArenaQuestion;
  /** Урок из которого взято */
  lessonId: number;
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

function nextInterval(correctStreak: number): number {
  const days = INTERVALS[Math.min(correctStreak, INTERVALS.length - 1)] ?? 30;
  return daysFromNow(days);
}

// ── Storage ──────────────────────────────────────────────────────────────────

async function load(): Promise<TrainerItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TrainerItem[];
  } catch {
    return [];
  }
}

async function save(items: TrainerItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
): Promise<void> {
  const key = wordEn.trim().toLowerCase();
  const items = await load();
  const existing = items.find(i => i.key === key && i.queue === 'words');

  if (existing) {
    existing.mistakeCount += 1;
    existing.translationRu = translationRu;
    existing.translationUk = translationUk;
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
    await save(items);
    return;
  }

  // Первый раз — просто запомним счётчик без добавления в очередь
  const firstHit: TrainerItem = {
    key,
    queue: 'words',
    translationRu,
    translationUk,
    lessonId,
    mistakeCount: 1,
    correctStreak: 0,
    nextDue: 0, // 0 = ещё не в очереди
    createdAt: Date.now(),
    archived: false,
  };
  items.push(firstHit);
  await save(items);
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
): Promise<void> {
  const key = wordEn.trim().toLowerCase();
  const items = await load();
  const existing = items.find(i => i.key === key && i.queue === 'words');

  if (existing) {
    existing.mistakeCount += 1;
    existing.translationRu = translationRu;
    existing.translationUk = translationUk;
    if (existing.nextDue === 0) {
      // Первый раз достиг порога — активируем
      existing.nextDue = tomorrowStart();
    }
    await save(items);
    return;
  }

  const item: TrainerItem = {
    key,
    queue: 'words',
    translationRu,
    translationUk,
    lessonId,
    mistakeCount: 2,
    correctStreak: 0,
    nextDue: tomorrowStart(),
    createdAt: Date.now(),
    archived: false,
  };
  items.push(item);
  await save(items);
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
): Promise<void> {
  const key = phraseEn.trim();
  const items = await load();
  const existing = items.find(i => i.key === key && i.queue === 'phrases');

  if (existing) {
    existing.mistakeCount += 1;
    existing.translationRu = translationRu;
    existing.translationUk = translationUk;
    if (errorWord) existing.errorWord = errorWord;
    if (existing.archived) {
      existing.archived = false;
      existing.correctStreak = 0;
      existing.nextDue = tomorrowStart();
    } else {
      existing.nextDue = tomorrowStart();
    }
    await save(items);
    return;
  }

  const item: TrainerItem = {
    key,
    queue: 'phrases',
    translationRu,
    translationUk,
    errorWord,
    lessonId,
    mistakeCount: 1,
    correctStreak: 0,
    nextDue: tomorrowStart(),
    createdAt: Date.now(),
    archived: false,
  };
  items.push(item);
  await save(items);
}

/**
 * Записать ошибку на вопросе арены.
 * Сразу добавляется в очередь.
 */
export async function recordArenaMistake(
  question: ArenaQuestion,
  lessonId: number,
): Promise<void> {
  const key = question.question.trim();
  const items = await load();
  const existing = items.find(i => i.key === key && i.queue === 'arena');

  if (existing) {
    existing.mistakeCount += 1;
    existing.arenaQuestion = question;
    if (existing.archived) {
      existing.archived = false;
      existing.correctStreak = 0;
    }
    existing.nextDue = tomorrowStart();
    await save(items);
    return;
  }

  const item: TrainerItem = {
    key,
    queue: 'arena',
    translationRu: '',
    translationUk: '',
    arenaQuestion: question,
    lessonId,
    mistakeCount: 1,
    correctStreak: 0,
    nextDue: tomorrowStart(),
    createdAt: Date.now(),
    archived: false,
  };
  items.push(item);
  await save(items);
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
): Promise<void> {
  const items = await load();
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
    item.correctStreak = 0;
    item.nextDue = tomorrowStart();
  }

  await save(items);
}

// ── Чтение для UI ─────────────────────────────────────────────────────────────

/** Кол-во элементов в каждой очереди которые ждут сегодня. */
export async function getTrainerCounts(): Promise<Record<TrainerQueue, number>> {
  const items = await load();
  const end = todayEnd();
  const active = items.filter(i => !i.archived && i.nextDue > 0 && i.nextDue <= end);
  return {
    words:   active.filter(i => i.queue === 'words').length,
    phrases: active.filter(i => i.queue === 'phrases').length,
    arena:   active.filter(i => i.queue === 'arena').length,
  };
}

/** Суммарное кол-во элементов ожидающих сегодня (для бейджа). */
export async function getTrainerTotalDue(): Promise<number> {
  const counts = await getTrainerCounts();
  return counts.words + counts.phrases + counts.arena;
}

/** Элементы конкретной очереди ожидающие сегодня. */
export async function getDueItems(queue: TrainerQueue, limit = 20): Promise<TrainerItem[]> {
  const items = await load();
  const end = todayEnd();
  return items
    .filter(i => i.queue === queue && !i.archived && i.nextDue > 0 && i.nextDue <= end)
    .sort((a, b) => b.mistakeCount - a.mistakeCount || a.nextDue - b.nextDue)
    .slice(0, limit);
}

/** Все слова в хранилище (включая ещё не активированные) — для подбора ложных переводов. */
export async function getAllWordKeys(): Promise<TrainerItem[]> {
  const items = await load();
  return items.filter(i => i.queue === 'words');
}

// ── Сброс / диагностика ───────────────────────────────────────────────────────

export async function clearTrainerStore(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function getTrainerStoreDebug(): Promise<{
  total: number;
  active: number;
  archived: number;
  byQueue: Record<TrainerQueue, number>;
}> {
  const items = await load();
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

const DEV_ARENA = [
  { question: 'She ___ to the store yesterday', correct: 'went',    options: ['go', 'went', 'gone', 'goes'],   rule: 'Past Simple' },
  { question: 'I ___ never seen this before',   correct: 'have',    options: ['have', 'had', 'has', 'having'], rule: 'Present Perfect' },
  { question: 'They ___ waiting for an hour',   correct: 'were',    options: ['are', 'were', 'was', 'be'],     rule: 'Past Continuous' },
  { question: 'He ___ his keys again',          correct: 'lost',    options: ['lose', 'lost', 'loses', 'loss'],rule: 'Past Simple' },
  { question: 'We ___ finish by tomorrow',      correct: 'must',    options: ['must', 'can', 'may', 'might'],  rule: 'Modals' },
];

/**
 * DEV ONLY — заполняет тренер случайным кол-вом элементов в каждый раздел.
 * Nextdue = сегодня (сразу видны в очереди).
 */
export async function devSeedTrainer(): Promise<void> {
  const items = await load();
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

  await save(items);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
