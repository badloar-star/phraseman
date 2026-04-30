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
 *   1. recordMistake из урока, квиза, арены и т.д.
 *   2. Бейдж на главной: countDueItemsToday() — без записи в storage
 *   3. Сессия /review: getDueItems(limit, { commitSessionOverflow: true })
 *   4. markReviewed после ответа в сессии
 *
 * Хранилище: AsyncStorage под ключом 'active_recall_items'
 * ═══════════════════════════════════════════════════════════════════════════
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Типы ────────────────────────────────────────────────────────────────────

/** Откуда запись попала в очередь (старые данные без поля = урок). */
export type MistakeSource = 'lesson' | 'quiz' | 'arena' | 'diagnostic' | 'exam';

export interface RecallItem {
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
/** Максимум фраз в одной сессии повторения — не перегружаем пользователя */
export const SESSION_LIMIT = 7;
/** Максимальное кол-во фраз в хранилище — защита от переполнения */
const MAX_ITEMS = 300;
/** Фраза не показывалась N дней → авто-удаление (пользователь всё равно забыл) */
const AUTO_DELETE_DAYS = 60;

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
export async function countDueItemsToday(): Promise<number> {
  const items = await loadItems();
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

async function loadItems(): Promise<RecallItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as RecallItem[];
    return applyCorrections(items);
  } catch {
    return [];
  }
}

/** Исправляет устаревшие фразы в хранилище (однократно при загрузке). */
function applyCorrections(items: RecallItem[]): RecallItem[] {
  let changed = false;
  const fixed = items.map(item => {
    const correct = PHRASE_CORRECTIONS[item.phrase];
    if (correct) {
      changed = true;
      return { ...item, phrase: correct };
    }
    return item;
  });
  // Сохраняем асинхронно только если были изменения
  if (changed) {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fixed)).catch(() => {});
  }
  return fixed;
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
 * @param correctAnswerES  Подсказка на испанском (опционально)
 */
export async function recordMistake(
  phrase:           string,
  correctAnswer:    string,
  lessonId:         number,
  correctAnswerUK?: string,
  source:           MistakeSource = 'lesson',
  correctAnswerES?: string,
): Promise<void> {
  const raw = await loadItems();

  // Авто-удаление: фразы, которые не показывались AUTO_DELETE_DAYS дней
  const cutoff = Date.now() - AUTO_DELETE_DAYS * MS_PER_DAY;
  let items = raw.filter(i => i.lastReviewed >= cutoff);

  // Лимит хранилища: если > MAX_ITEMS, удаляем самые лёгкие и самые старые
  if (items.length >= MAX_ITEMS) {
    items = items
      .sort((a, b) => b.errorCount - a.errorCount || b.createdAt - a.createdAt)
      .slice(0, MAX_ITEMS - 1);
  }

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
    // Актуализируем подсказки и урок/источник
    if (correctAnswer) existing.correctAnswer = correctAnswer;
    if (correctAnswerUK) existing.correctAnswerUK = correctAnswerUK;
    if (correctAnswerES) existing.correctAnswerES = correctAnswerES;
    existing.lessonId  = lessonId;
    existing.source      = source;
    // Следующее повторение — через 1 день
    existing.nextDue      = daysFromNow(1);
  } else {
    // Новая фраза
    const newItem: RecallItem = {
      phrase,
      correctAnswer,
      correctAnswerUK,
      correctAnswerES,
      lessonId,
      source,
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
): Promise<RecallItem[]> {
  const items = await loadItems();
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
    await saveItems(items);
  }

  return selected;
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
export async function getItemsByLesson(lessonId: number): Promise<RecallItem[]> {
  const items = await loadItems();
  return items
    .filter(i => i.lessonId === lessonId)
    .sort((a, b) => b.errorCount - a.errorCount);
}

// ── Запись из арены, зачёта, диагностики (агрегируется в той же очереди SRS) ─

/** Английская цель для повторения по вопросу арены (часто вставка в пропуск). */
export function buildArenaEnglishPhrase(q: {
  question: string;
  correct: string;
  task?: string;
}): string {
  const qu = (q.question || '').trim();
  if (/___+/.test(qu)) {
    return qu.replace(/___+/, q.correct).replace(/\s+/g, ' ').trim();
  }
  return (q.correct || '').trim();
}

/** Подсказка на «лице» карточки: правило с кириллицей или формулировка задания. */
export function buildArenaHintRU(q: {
  rule?: string;
  task?: string;
  question: string;
}): string {
  const rule = (q.rule || '').trim();
  if (/[а-яёіїєґА-ЯЁІЇЄґ]/.test(rule)) return rule;
  const stem = (q.question || '').replace(/___+/, '…');
  return [q.task, stem].filter(Boolean).join(' — ') || stem || (q.task ?? '');
}

export async function recordMistakeFromArena(q: {
  question: string;
  correct: string;
  task?: string;
  rule?: string;
}): Promise<void> {
  const phrase = buildArenaEnglishPhrase(q);
  if (!phrase) return;
  await recordMistake(phrase, buildArenaHintRU(q), 0, undefined, 'arena');
}

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

export async function recordMistakeFromDiagnostic(q: DiagnosticMistakeQ): Promise<void> {
  const phrase = buildDiagnosticEnglishPhrase(q);
  if (!phrase) return;
  await recordMistake(phrase, q.hintRU, 0, q.hintUK, 'diagnostic');
}

/**
 * Только для проверки UI (маршрут admin_review_test): записать 7 фраз, «срочно» в очереди повторения.
 * `lessonId` = 99 зарезервирован под такие сиды: старые тест-фразы с lessonId 99 удаляются.
 * С высоким errorCount записи попадают в сессию раньше обычных.
 */
const ADMIN_BENCH_LESSON_ID = 99;
const ADMIN_TEST_BENCH: { phrase: string; correctAnswer: string; correctAnswerUK: string }[] = [
  { phrase: 'He is in the kitchen', correctAnswer: 'Он на кухне', correctAnswerUK: 'Він на кухні' },
  { phrase: 'She went to the store', correctAnswer: 'Она пошла в магазин', correctAnswerUK: 'Вона пішла в магазин' },
  { phrase: 'We will call you tomorrow', correctAnswer: 'Мы позвоним тебе завтра', correctAnswerUK: 'Ми подзвонимо тобі завтра' },
  { phrase: 'I have never been there', correctAnswer: 'Я никогда не был там', correctAnswerUK: 'Я ніколи не був там' },
  { phrase: 'They are waiting for us', correctAnswer: 'Они ждут нас', correctAnswerUK: 'Вони чекають на нас' },
  { phrase: 'Could you help me please', correctAnswer: 'Не могли бы вы мне помочь', correctAnswerUK: 'Не могли б ви мені допомогти' },
  { phrase: 'The weather is nice today', correctAnswer: 'Сегодня хорошая погода', correctAnswerUK: 'Сьогодні гарна погода' },
];

export async function seedAdminTestReviewSession(): Promise<void> {
  const existing = await loadItems();
  const rest = existing.filter(i => i.lessonId !== ADMIN_BENCH_LESSON_ID);
  const t0 = todayStart() - 1; // наступило «сегодня» для getDueItems
  const now = Date.now();
  const seeded: RecallItem[] = ADMIN_TEST_BENCH.map(t => ({
    phrase: t.phrase,
    correctAnswer: t.correctAnswer,
    correctAnswerUK: t.correctAnswerUK,
    lessonId: ADMIN_BENCH_LESSON_ID,
    errorCount: 9_000,
    repetitions: 0,
    interval: 1,
    easeFactor: INITIAL_EASE_FACTOR,
    createdAt: now,
    lastReviewed: now - 1,
    nextDue: t0,
  }));
  await saveItems([...rest, ...seeded]);
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
