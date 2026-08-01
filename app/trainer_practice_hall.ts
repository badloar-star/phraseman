import { getCachedDueItems, getDueItems, hasCachedTrainerItems, type TrainerDashboard, type TrainerItem, type TrainerQueue } from './trainer_store';
import type { RuntimeSourceLocale, RuntimeStudyTarget } from './target_storage_keys';
import { shuffleWordBankTiles, tokenizeRecallPhrase, type WordBankTile } from './review_evaluator';
import { getLessonData } from './lesson_data_all';

const PRACTICE_HALL_FALLBACK_ORDER: readonly TrainerQueue[] = ['phrases', 'words', 'arena'];

/**
 * The hall exposes one start action, but never merges or mutates the underlying
 * queues. We first honour the dashboard's priority calculation; if its target
 * was cleared while the screen was open, use a stable fallback order. This
 * keeps routing deterministic and makes every queued error reachable.
 */
export function selectPracticeHallQueue(dashboard: TrainerDashboard): TrainerQueue | null {
  const recommended = dashboard.nextQueue;
  if (recommended && (dashboard.due[recommended] ?? 0) > 0) return recommended;
  return PRACTICE_HALL_FALLBACK_ORDER.find((queue) => (dashboard.due[queue] ?? 0) > 0) ?? null;
}

/** A short session is one minute for up to three errors, then roughly one minute per three, capped at twelve. */
export function practiceHallDurationMinutes(errorCount: number): number {
  return Math.max(1, Math.min(12, Math.ceil(Math.max(0, errorCount) / 3)));
}

export type PracticeHallTrendDay = {
  date: string;
  active: boolean;
  future?: boolean;
};

export type PracticeHallTrendPoint = { date: string; value: 0 | 1 };

/** Preserve only observed dates: future placeholders must never be presented as user results. */
export function buildPracticeHallTrend(days: readonly PracticeHallTrendDay[]): PracticeHallTrendPoint[] {
  return days
    .filter((day) => !day.future)
    .map((day) => ({ date: day.date, value: day.active ? 1 : 0 }));
}

/** The viewport is always bounded, so a pan cannot create empty chart space. */
export function clampPracticeHallTrendOffset(totalDays: number, rangeDays: number, offset: number): number {
  return Math.max(0, Math.min(Math.max(0, totalDays - rangeDays), Math.round(offset)));
}

/** Returns a stable, contiguous date window for the chart's selected range. */
export function visiblePracticeHallTrendWindow(
  points: readonly PracticeHallTrendPoint[],
  rangeDays: number,
  offset: number,
): PracticeHallTrendPoint[] {
  const start = clampPracticeHallTrendOffset(points.length, rangeDays, offset);
  return points.slice(start, start + rangeDays);
}

/**
 * Сессия фраз обслуживает обе фразовые очереди: уроковые «phrases» и быстрые
 * «arena» (их ключ — тоже фраза, режимы word_bank/fill_gap одинаковы). Это же
 * объединение показывает счётчик «Фразы · n» на экране практики.
 */
export const PHRASE_SESSION_LIMIT = 15;
export const WORD_SESSION_LIMIT = 20;

/** Объединяет фразовые очереди в одну колоду по компаратору getDueItems. */
export function mergePhraseSessionItems(
  phraseItems: readonly TrainerItem[],
  arenaItems: readonly TrainerItem[],
  limit = PHRASE_SESSION_LIMIT,
): TrainerItem[] {
  return [...phraseItems, ...arenaItems]
    .sort((a, b) => b.mistakeCount - a.mistakeCount || a.nextDue - b.nextDue)
    .slice(0, limit);
}

export async function getPhraseSessionItems(
  limit = PHRASE_SESSION_LIMIT,
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): Promise<TrainerItem[]> {
  const [phraseItems, arenaItems] = await Promise.all([
    getDueItems('phrases', limit, studyTarget, sourceLocale),
    getDueItems('arena', limit, studyTarget, sourceLocale),
  ]);
  return mergePhraseSessionItems(phraseItems, arenaItems, limit);
}

export function getCachedPhraseSessionItems(
  limit = PHRASE_SESSION_LIMIT,
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): TrainerItem[] {
  return mergePhraseSessionItems(
    getCachedDueItems('phrases', limit, studyTarget, sourceLocale),
    getCachedDueItems('arena', limit, studyTarget, sourceLocale),
    limit,
  );
}

// ── Фраза айтема для сессии ──────────────────────────────────────────────────
// У арены key — текст вопроса С МАРКЕРОМ пропуска («___», «—», «–», «…», «__»),
// а правильное слово лежит в arenaQuestion.correct. Для слово-банка и fill_gap
// нужна полная естественная фраза — собираем её заменой первого маркера.

/** Маркер пропуска — отдельный токен из подчёркиваний, тире или многоточия. */
const ARENA_GAP_TOKEN = /^(?:_{2,}|[—–]{1,2}|…|\.{3})$/;

export interface TrainerSessionPhrase {
  /** Полная естественная фраза (для арены — с подставленным правильным словом). */
  phrase: string;
  /** Слово-пропуск для fill_gap; '' — режим недоступен (честный word_bank). */
  errorWord: string;
}

function restoreCanonicalTerminalPunctuation(item: Pick<TrainerItem, 'key' | 'queue' | 'lessonId'>): string {
  const stored = item.key.trim();
  if (item.queue !== 'phrases' || /[.?!]+$/.test(stored)) return item.key;

  const canonical = getLessonData(item.lessonId).find((phrase) =>
    phrase.english.trim().replace(/[.?!]+$/, '') === stored,
  )?.english.trim();

  return canonical ?? item.key;
}

export function trainerSessionPhrase(
  item: Pick<TrainerItem, 'key' | 'queue' | 'errorWord' | 'arenaQuestion' | 'lessonId'>,
): TrainerSessionPhrase {
  if (item.queue === 'arena' && item.arenaQuestion) {
    const correct = item.arenaQuestion.correct.trim();
    const tokens = item.key.split(/\s+/).filter(Boolean);
    const markerIndex = tokens.findIndex((token) => ARENA_GAP_TOKEN.test(token));
    if (correct && markerIndex >= 0) {
      const phrase = [...tokens.slice(0, markerIndex), correct, ...tokens.slice(markerIndex + 1)].join(' ');
      return { phrase, errorWord: correct };
    }
    // Маркер не найден — не додумываем: фраза как есть, fill_gap не назначается.
    return { phrase: item.key, errorWord: '' };
  }
  return { phrase: restoreCanonicalTerminalPunctuation(item), errorWord: item.errorWord ?? '' };
}

/** Краевая пунктуация не участвует в сравнении слов; внутренние знаки (don't, mother-in-law) целы. */
export function normalizeGapToken(value?: string): string {
  return (value ?? '').toLowerCase().replace(/^[.!?,;:"()[\]{}]+|[.!?,;:"()[\]{}]+$/g, '').trim();
}

/** Индекс токена-пропуска во фразе; -1 — слово не найдено (fill_gap нельзя назначать). */
export function trainerGapTokenIndex(phrase: string, errorWord: string): number {
  const target = normalizeGapToken(errorWord);
  if (!target) return -1;
  return phrase.split(' ').findIndex((word) => normalizeGapToken(word) === target);
}

/**
 * Плиткой банка становится только токен с буквой или цифрой (unicode-aware):
 * чистая пунктуация («—», «–», «/», «…») остаётся частью фразы-дисплея,
 * но не плитка и не требуется для проверки ответа.
 */
export function isMeaningfulBankToken(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text);
}

/** Токены фразы для проверки сборки; фолбэк — исходный набор, если фильтр выкосил всё. */
export function sessionMeaningfulTokens(phrase: string): string[] {
  const all = tokenizeRecallPhrase(phrase);
  const meaningful = all.filter(isMeaningfulBankToken);
  return meaningful.length > 0 ? meaningful : all;
}

/**
 * Банк плиток фразы: без пунктуационных плиток; слоты переупорядочены 0..n-1,
 * чтобы selected и speaking-autofill совпадали с банком по слотам.
 */
export function buildSessionWordBank(phrase: string): WordBankTile[] {
  const shuffled = shuffleWordBankTiles(phrase);
  const meaningful = shuffled.filter((tile) => isMeaningfulBankToken(tile.text));
  const source = meaningful.length > 0 ? meaningful : shuffled;
  return source.map((tile, index) => ({ ...tile, slot: index }));
}

export type SessionMode = 'word_bank' | 'fill_gap';

export interface SessionCard {
  item: TrainerItem;
  mode: SessionMode;
}

/**
 * Колода сессии: чередуем fill_gap и word_bank. fill_gap назначается ТОЛЬКО
 * когда слово-пропуск реально находится во фразе — иначе честный word_bank
 * полной фразы (никакой тихой поломки слота).
 */
export function buildTrainerSessionDeck(items: TrainerItem[]): SessionCard[] {
  const deck: SessionCard[] = [];
  items.forEach((item, i) => {
    const { phrase, errorWord } = trainerSessionPhrase(item);
    const canFillGap = Boolean(errorWord) && trainerGapTokenIndex(phrase, errorWord) >= 0;
    const mode: SessionMode = canFillGap && i % 2 === 0 ? 'fill_gap' : 'word_bank';
    deck.push({ item, mode });
  });
  return deck;
}

/**
 * Колода фразовой сессии из УЖЕ прогретого кэша — синхронно, без await.
 *
 * зачем: экран практики (trainer.tsx) на каждом фокусе делает
 * prefetchTrainerPracticeSnapshot, поэтому к моменту перехода в сессию все
 * айтемы лежат в памяти. Экран сессии всё равно стартовал с `loading = true`
 * и показывал скелет «Загружаем…» — юзер видел загрузку там, где грузить
 * нечего. Здесь отдаём первую колоду сразу; `null` означает «кэш холодный,
 * нужен полноценный async-путь», и его нельзя путать с пустой колодой.
 */
export function getWarmPhraseSessionDeck(
  limit = PHRASE_SESSION_LIMIT,
  studyTarget?: RuntimeStudyTarget,
  sourceLocale?: RuntimeSourceLocale,
): SessionCard[] | null {
  if (!hasCachedTrainerItems(studyTarget)) return null;
  const items = getCachedPhraseSessionItems(limit, studyTarget, sourceLocale);
  if (items.length === 0) return null;
  return buildTrainerSessionDeck(items);
}
