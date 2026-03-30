/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTIVE RECALL — Модуль интервального повторения для неправильных ответов
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * СТАТУС: STANDALONE — не подключён к приложению. Ожидает одобрения.
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
 * Интеграция (когда получишь одобрение):
 *   1. В lesson1.tsx при неправильном ответе: recordMistake(phrase, lessonId, correct)
 *   2. На главном экране или в отдельном разделе: getDueItems() → показать карточки
 *   3. После ответа пользователя: markReviewed(phrase, gotCorrect)
 *
 * Хранилище: AsyncStorage под ключом 'active_recall_items'
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Типы ────────────────────────────────────────────────────────────────────

export interface RecallItem {
  /** Неправильно введённая/пропущенная фраза (английская часть) */
  phrase:        string;
  /** Правильный перевод/вариант — русский */
  correctAnswer: string;
  /** Правильный перевод/вариант — украинский (опционально) */
  correctAnswerUK?: string;
  /** ID урока, откуда взята фраза */
  lessonId:      number;
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
}

// ─── Константы ───────────────────────────────────────────────────────────────

const STORAGE_KEY         = 'active_recall_items';
const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR     = 1.3;
const MAX_EASE_FACTOR     = 2.5;
/** Минимальный балл «хорошего» ответа (0–5 шкала SM-2, мы используем boolean → 0 / 3) */
const GOOD_QUALITY        = 3;

// ─── Утилиты ─────────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days: number): number {
  return Date.now() + days * MS_PER_DAY;
}

function todayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ─── Загрузка / сохранение ───────────────────────────────────────────────────

async function loadItems(): Promise<RecallItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecallItem[]) : [];
  } catch {
    return [];
  }
}

async function saveItems(items: RecallItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
 */
export async function recordMistake(
  phrase:           string,
  correctAnswer:    string,
  lessonId:         number,
  correctAnswerUK?: string,
): Promise<void> {
  const items = await loadItems();
  const existing = items.find(i => i.phrase === phrase);

  if (existing) {
    // Фраза уже есть — увеличиваем счётчик, снижаем easeFactor, сбрасываем интервал
    existing.errorCount  += 1;
    existing.repetitions  = 0;
    existing.interval     = 1;
    existing.easeFactor   = Math.max(
      MIN_EASE_FACTOR,
      existing.easeFactor - 0.2,
    );
    existing.lastReviewed = Date.now();
    // Обновляем переводы если переданы
    if (correctAnswerUK) existing.correctAnswerUK = correctAnswerUK;
    // Следующее повторение — через 1 день
    existing.nextDue      = daysFromNow(1);
  } else {
    // Новая фраза
    const newItem: RecallItem = {
      phrase,
      correctAnswer,
      correctAnswerUK,
      lessonId,
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

  await saveItems(items);
}

/**
 * Получить фразы, которые нужно повторить сегодня (nextDue ≤ сегодня + конец дня).
 *
 * @param limit Максимальное количество фраз (по умолчанию 20)
 * @returns Список фраз, отсортированных по просроченности (сначала самые давние)
 */
export async function getDueItems(limit = 20): Promise<RecallItem[]> {
  const items = await loadItems();
  const endOfToday = todayStart() + MS_PER_DAY - 1;

  return items
    .filter(i => i.nextDue <= endOfToday)
    .sort((a, b) => a.nextDue - b.nextDue)
    .slice(0, limit);
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
): Promise<void> {
  const items = await loadItems();
  const item  = items.find(i => i.phrase === phrase);
  if (!item) return;

  const quality = gotCorrect ? GOOD_QUALITY : 0; // SM-2: 0–5
  item.lastReviewed = Date.now();

  if (gotCorrect) {
    // SM-2: повышаем repetitions и пересчитываем интервал
    item.repetitions += 1;

    if (item.repetitions === 1) {
      item.interval = 1;
    } else if (item.repetitions === 2) {
      item.interval = 3;
    } else {
      item.interval = Math.round(item.interval * item.easeFactor);
    }

    // Обновляем easeFactor: EF' = EF + (0.1 − (5−q)×(0.08+(5−q)×0.02))
    // При quality=3 это +0 (нейтрально)
    const q = quality;
    item.easeFactor = Math.min(
      MAX_EASE_FACTOR,
      Math.max(
        MIN_EASE_FACTOR,
        item.easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02),
      ),
    );
  } else {
    // Неправильно — сброс
    item.repetitions  = 0;
    item.interval     = 1;
    item.easeFactor   = Math.max(MIN_EASE_FACTOR, item.easeFactor - 0.2);
    item.errorCount  += 1;
  }

  item.nextDue = daysFromNow(item.interval);
  await saveItems(items);
}

/**
 * Получить всё содержимое хранилища (для дебага и статистики).
 */
export async function getAllItems(): Promise<RecallItem[]> {
  return loadItems();
}

/**
 * Удалить конкретную фразу из хранилища (например, если пользователь
 * решил, что уже хорошо её знает).
 */
export async function removeItem(phrase: string): Promise<void> {
  const items  = await loadItems();
  const filtered = items.filter(i => i.phrase !== phrase);
  await saveItems(filtered);
}

/**
 * Сбросить всё хранилище (например, при сбросе прогресса пользователя).
 * ОСТОРОЖНО: необратимо.
 */
export async function clearAllItems(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Статистика: сколько фраз в работе, сколько просрочено, сколько выучено.
 *
 * Считается «выученной» фраза с repetitions ≥ 5 (≈ 30+ дней без ошибок).
 */
export async function getStats(): Promise<{
  total:     number;
  dueTodayCount: number;
  learnedCount:  number;
  hardestPhrases: RecallItem[];
}> {
  const items       = await loadItems();
  const endOfToday  = todayStart() + MS_PER_DAY - 1;
  const dueTodayCount  = items.filter(i => i.nextDue <= endOfToday).length;
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
export async function getItemsByLesson(lessonId: number): Promise<RecallItem[]> {
  const items = await loadItems();
  return items
    .filter(i => i.lessonId === lessonId)
    .sort((a, b) => b.errorCount - a.errorCount);
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
