// ═══════════════════════════════════════════════════════════════════════════
// phrase_analytics.ts — движок персональной аналитики ошибок
//
// Агрегирует mistake_log → данные уроков → категории слов → инсайты юзера.
// Используется в: Statistics (premium), Trainer 2.0 (умный выбор фраз).
//
// Архитектура:
//   loadMistakeLog() → для каждой фразы-ошибки → ищем LessonPhrase →
//   берём words[].category → считаем WordCategoryStats →
//   генерируем PersonalInsights с живыми текстами
// ═══════════════════════════════════════════════════════════════════════════

import { loadMistakeLog } from './mistake_log';
import { getLessonData } from './lesson_data_all';
import { LESSON_NAMES_RU, LESSON_NAMES_UK, LESSON_NAMES_ES } from '../constants/lessons';
import { DebugLogger } from './debug-logger';

// ── Типы ─────────────────────────────────────────────────────────────────────

export type WordCategory =
  | 'verb'
  | 'noun'
  | 'pronoun'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'article'
  | 'to-be'
  | 'conjunction'
  | 'modal'
  | 'phrasal_particle'
  | 'other';

export interface WordCategoryStat {
  category: WordCategory;
  /** Сколько раз ошибался в словах этой категории */
  mistakeCount: number;
  /** Процент от всех ошибок по категориям (0–100) */
  pct: number;
  /** Топ-3 конкретных слова этой категории где чаще всего ошибается */
  topWords: string[];
}

export interface LessonMistakeStat {
  lessonId: number;
  lessonNameRU: string;
  lessonNameUK: string;
  lessonNameES: string;
  mistakeCount: number;
  pct: number;
}

export interface PersonalInsight {
  type: 'weak_category' | 'strong_category' | 'weak_lesson' | 'strong_lesson' | 'top_phrase' | 'general';
  ru: string;
  uk: string;
  es: string;
  /** Для визуального акцента */
  accent: 'red' | 'green' | 'gold' | 'blue';
}

export interface PhraseAnalyticsResult {
  /** Статистика по категориям слов, sorted by mistakeCount DESC */
  categoryStats: WordCategoryStat[];
  /** Статистика по урокам, sorted by mistakeCount DESC */
  lessonStats: LessonMistakeStat[];
  /** Топ-5 конкретных фраз с наибольшим числом ошибок */
  topMistakePhrases: Array<{ phrase: string; lessonId: number; count: number }>;
  /** Живые инсайты для отображения юзеру */
  insights: PersonalInsight[];
  /** Всего ошибок за период */
  totalMistakes: number;
  /** Период аналитики в днях */
  windowDays: number;
}

// ── Словари для автовывода категории когда нет явного поля ─────────────────

const ARTICLES = new Set(['a', 'an', 'the']);
const TO_BE = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
const MODALS = new Set(['can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'need', 'dare', 'ought']);
const PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves', 'who', 'which', 'that', 'what', 'this', 'these', 'those']);
const CONJUNCTIONS = new Set(['and', 'but', 'or', 'nor', 'so', 'yet', 'for', 'because', 'although', 'though', 'while', 'when', 'if', 'unless', 'until', 'since', 'after', 'before', 'as', 'than', 'that', 'whether']);
// phrasal_particle checked BEFORE preposition so 'up/down/out/off' in phrasal context aren't swallowed by the preposition set
const PHRASAL_PARTICLES = new Set(['up', 'down', 'out', 'in', 'on', 'off', 'away', 'back', 'over', 'through', 'around', 'along', 'ahead', 'forward', 'together', 'apart']);
const COMMON_PREPOSITIONS = new Set(['in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'into', 'onto', 'about', 'above', 'below', 'between', 'behind', 'beside', 'under', 'over', 'through', 'during', 'before', 'after', 'near', 'without', 'against', 'around', 'among', 'along', 'across', 'off', 'out', 'up', 'down', 'inside', 'outside', 'opposite', 'past']);
const ADVERBS = new Set(['there', 'here', 'now', 'then', 'not', 'never', 'always', 'often', 'still', 'already', 'just', 'very', 'really', 'quite', 'soon', 'today', 'yesterday', 'tomorrow', 'right', 'again', 'also', 'too', 'well', 'loudly', 'slowly', 'quickly', 'carefully', 'finally', 'suddenly', 'recently', 'often', 'sometimes', 'usually', 'immediately']);

function inferCategory(word: string, knownCategory?: string): WordCategory {
  if (knownCategory) {
    const normalized = knownCategory.toLowerCase().trim();
    if (normalized === 'verb') return 'verb';
    if (normalized === 'noun') return 'noun';
    if (normalized === 'pronoun') return 'pronoun';
    if (normalized === 'adjective') return 'adjective';
    if (normalized === 'adverb') return 'adverb';
    if (normalized === 'preposition') return 'preposition';
    if (normalized === 'article') return 'article';
    if (normalized === 'to-be') return 'to-be';
    if (normalized === 'conjunction') return 'conjunction';
    if (normalized === 'modal') return 'modal';
    if (normalized === 'phrasal_particle' || normalized === 'particle') return 'phrasal_particle';
  }
  const w = word.toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return 'other';
  if (TO_BE.has(w)) return 'to-be';
  if (MODALS.has(w)) return 'modal';
  if (ARTICLES.has(w)) return 'article';
  if (PRONOUNS.has(w)) return 'pronoun';
  if (CONJUNCTIONS.has(w)) return 'conjunction';
  if (ADVERBS.has(w)) return 'adverb';
  if (COMMON_PREPOSITIONS.has(w)) return 'preposition';
  return 'other';
}

// ── Русские/украинские/испанские подписи для категорий ─────────────────────

const CATEGORY_LABELS: Record<WordCategory, { ru: string; uk: string; es: string }> = {
  'verb':           { ru: 'Глаголы',           uk: 'Дієслова',           es: 'Verbos' },
  'noun':           { ru: 'Существительные',    uk: 'Іменники',           es: 'Sustantivos' },
  'pronoun':        { ru: 'Местоимения',        uk: 'Займенники',         es: 'Pronombres' },
  'adjective':      { ru: 'Прилагательные',     uk: 'Прикметники',        es: 'Adjetivos' },
  'adverb':         { ru: 'Наречия',            uk: 'Прислівники',        es: 'Adverbios' },
  'preposition':    { ru: 'Предлоги',           uk: 'Прийменники',        es: 'Preposiciones' },
  'article':        { ru: 'Артикли',            uk: 'Артиклі',            es: 'Artículos' },
  'to-be':          { ru: 'Глагол to be',       uk: 'Дієслово to be',     es: 'Verbo to be' },
  'conjunction':    { ru: 'Союзы',              uk: 'Сполучники',         es: 'Conjunciones' },
  'modal':          { ru: 'Модальные глаголы',  uk: 'Модальні дієслова',  es: 'Verbos modales' },
  'phrasal_particle':{ ru: 'Частицы (phrasal)', uk: 'Частки (phrasal)',   es: 'Partículas' },
  'other':          { ru: 'Другое',             uk: 'Інше',               es: 'Otros' },
};

// ── Кэш фраз: phrase → categories[], tokens[], lessonId ─────────────────────

interface PhraseIndexEntry {
  categories: WordCategory[];
  /** text → category для быстрого перебора при сборке topWords */
  tokenCategories: Array<{ text: string; category: WordCategory }>;
  lessonId: number;
}

let phraseIndex: Map<string, PhraseIndexEntry> | null = null;

function buildPhraseIndex(): void {
  if (phraseIndex) return;
  phraseIndex = new Map();
  for (let lessonId = 1; lessonId <= 32; lessonId++) {
    try {
      const phrases = getLessonData(lessonId);
      for (const phrase of phrases) {
        if (!phrase.english) continue;
        const key = phrase.english.trim().replace(/[.!?,;¿¡]+$/, '').toLowerCase();
        if (!key) continue;
        // wordsEn предпочтительнее для EN-аналитики
        const tokens = (phrase.wordsEn ?? phrase.words) ?? [];
        const cats: WordCategory[] = [];
        const tokenCategories: Array<{ text: string; category: WordCategory }> = [];
        for (const word of tokens) {
          if (!word.text || word.text === '.') continue;
          const cat = inferCategory(word.text, word.category);
          cats.push(cat);
          tokenCategories.push({ text: word.text.toLowerCase(), category: cat });
        }
        if (cats.length > 0) {
          phraseIndex!.set(key, { categories: cats, tokenCategories, lessonId });
        }
      }
    } catch (err) {
      DebugLogger.error('phrase_analytics:buildIndex', err, 'warning');
    }
  }
}

function invalidatePhraseIndex(): void {
  phraseIndex = null;
}

// ── Основной движок ──────────────────────────────────────────────────────────

const ANALYTICS_WINDOW_DAYS = 30;
const ANALYTICS_WINDOW_MS = ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export async function computePhraseAnalytics(): Promise<PhraseAnalyticsResult> {
  try {
    const entries = await loadMistakeLog();
    const windowStart = Date.now() - ANALYTICS_WINDOW_MS;
    const recent = entries.filter((e) => e.ts >= windowStart);

    if (recent.length === 0) {
      return emptyResult();
    }

    // Build index lazily — only when there are actual mistakes to process
    buildPhraseIndex();

    // ── Счётчики по категориям ────────────────────────────────────────────
    const catCount = new Map<WordCategory, number>();
    const catWords = new Map<WordCategory, Map<string, number>>();

    // ── Счётчики по урокам ────────────────────────────────────────────────
    const lessonCount = new Map<number, number>();

    // ── Топ фраз ──────────────────────────────────────────────────────────
    const phraseCount = new Map<string, { count: number; lessonId: number }>();

    for (const entry of recent) {
      // Normalize key same way as phraseIndex (strip trailing punctuation)
      const key = entry.phrase.trim().replace(/[.!?,;¿¡]+$/, '').toLowerCase();

      // Фразы
      const existing = phraseCount.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        phraseCount.set(key, { count: 1, lessonId: entry.lessonId });
      }

      // Уроки
      lessonCount.set(entry.lessonId, (lessonCount.get(entry.lessonId) ?? 0) + 1);

      // Категории: одна запись = один vote per уникальной категории фразы
      // (не per token) — иначе pct != "% ошибок", а "% токенов-в-ошибках"
      const indexEntry = phraseIndex?.get(key);
      if (indexEntry && indexEntry.categories.length > 0) {
        for (const cat of new Set(indexEntry.categories)) {
          catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
          if (!catWords.has(cat)) catWords.set(cat, new Map());
        }
        for (const { text, category } of indexEntry.tokenCategories) {
          const wordMap = catWords.get(category);
          if (wordMap) {
            wordMap.set(text, (wordMap.get(text) ?? 0) + 1);
          }
        }
      }
    }

    const totalMistakes = recent.length;

    // ── Сборка categoryStats ─────────────────────────────────────────────
    const categoryStats: WordCategoryStat[] = Array.from(catCount.entries())
      .filter(([cat]) => cat !== 'other')
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => {
        const wordMap = catWords.get(cat);
        const topWords = wordMap
          ? Array.from(wordMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([w]) => w)
          : [];
        return {
          category: cat,
          mistakeCount: count,
          pct: Math.round((count / totalMistakes) * 100),
          topWords,
        };
      });

    // ── Сборка lessonStats ────────────────────────────────────────────────
    const lessonStats: LessonMistakeStat[] = Array.from(lessonCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([lessonId, count]) => ({
        lessonId,
        lessonNameRU: LESSON_NAMES_RU[lessonId - 1] ?? `Урок ${lessonId}`,
        lessonNameUK: LESSON_NAMES_UK[lessonId - 1] ?? `Урок ${lessonId}`,
        lessonNameES: LESSON_NAMES_ES[lessonId - 1] ?? `Lesson ${lessonId}`,
        mistakeCount: count,
        pct: Math.round((count / totalMistakes) * 100),
      }));

    // ── Топ фраз ──────────────────────────────────────────────────────────
    const topMistakePhrases = Array.from(phraseCount.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([phrase, { count, lessonId }]) => ({ phrase, lessonId, count }));

    // ── Инсайты ──────────────────────────────────────────────────────────
    const insights = buildInsights(categoryStats, lessonStats, totalMistakes);

    return {
      categoryStats,
      lessonStats,
      topMistakePhrases,
      insights,
      totalMistakes,
      windowDays: ANALYTICS_WINDOW_DAYS,
    };
  } catch (err) {
    DebugLogger.error('phrase_analytics:compute', err, 'warning');
    return emptyResult();
  }
}

// ── Генератор живых инсайтов ──────────────────────────────────────────────────

function buildInsights(
  catStats: WordCategoryStat[],
  lessonStats: LessonMistakeStat[],
  total: number,
): PersonalInsight[] {
  const insights: PersonalInsight[] = [];
  if (total < 5) return insights;

  // Топ-1 слабая категория
  const weak = catStats[0];
  if (weak && weak.pct >= 20) {
    const label = CATEGORY_LABELS[weak.category];
    const topWord = weak.topWords[0] ? ` («${weak.topWords[0]}»)` : '';
    insights.push({
      type: 'weak_category',
      ru: `${label.ru} — ${weak.pct}% ошибок${topWord}. Стоит повторить.`,
      uk: `${label.uk} — ${weak.pct}% помилок${topWord}. Варто повторити.`,
      es: `${label.es} — ${weak.pct}% de errores${topWord}. Vale la pena repasar.`,
      accent: 'red',
    });
  }

  // Топ-1 слабый урок
  const weakLesson = lessonStats[0];
  if (weakLesson && weakLesson.pct >= 20) {
    insights.push({
      type: 'weak_lesson',
      ru: `«${weakLesson.lessonNameRU}» — ${weakLesson.pct}% ошибок. Рекомендуем перепройти.`,
      uk: `«${weakLesson.lessonNameUK}» — ${weakLesson.pct}% помилок. Рекомендуємо повторити.`,
      es: `«${weakLesson.lessonNameES}» — ${weakLesson.pct}% de errores. Recomendamos repasar.`,
      accent: 'red',
    });
  }

  // Сильная категория — только если есть хотя бы 3 разные слабых категории
  // (иначе мы просто выбираем первую из ALL_CATEGORIES, о которой нет данных)
  if (catStats.length >= 3) {
    const weakCats = new Set(catStats.slice(0, 3).map((c) => c.category));
    const ALL_CATEGORIES: WordCategory[] = ['verb', 'noun', 'pronoun', 'adjective', 'adverb', 'preposition', 'article', 'to-be', 'modal'];
    const strongCat = ALL_CATEGORIES.find((c) => !weakCats.has(c));
    if (strongCat) {
      const label = CATEGORY_LABELS[strongCat];
      insights.push({
        type: 'strong_category',
        ru: `${label.ru} — ты знаешь хорошо. Ошибки здесь редки.`,
        uk: `${label.uk} — ти знаєш добре. Помилки тут рідкісні.`,
        es: `${label.es} — los conoces bien. Los errores aquí son raros.`,
        accent: 'green',
      });
    }
  }

  // Сильный урок (нет в топ ошибок)
  const weakLessons = new Set(lessonStats.slice(0, 3).map((l) => l.lessonId));
  for (let id = 1; id <= 32; id++) {
    if (!weakLessons.has(id)) {
      const name = LESSON_NAMES_RU[id - 1];
      const nameUK = LESSON_NAMES_UK[id - 1];
      const nameES = LESSON_NAMES_ES[id - 1];
      if (name) {
        insights.push({
          type: 'strong_lesson',
          ru: `«${name}» — ошибок почти нет. Твоя сильная сторона.`,
          uk: `«${nameUK}» — помилок майже немає. Твоя сильна сторона.`,
          es: `«${nameES ?? name}» — casi sin errores. Tu punto fuerte.`,
          accent: 'green',
        });
        break;
      }
    }
  }

  // Топ-фраза с наибольшим числом ошибок
  if (catStats.length > 0 && catStats[0].topWords.length > 0) {
    const word = catStats[0].topWords[0];
    const label = CATEGORY_LABELS[catStats[0].category];
    insights.push({
      type: 'top_phrase',
      ru: `Слово «${word}» (${label.ru.toLowerCase()}) — чаще всего вызывает затруднение.`,
      uk: `Слово «${word}» (${label.uk.toLowerCase()}) — найчастіше викликає труднощі.`,
      es: `La palabra «${word}» (${label.es.toLowerCase()}) — es la más problemática.`,
      accent: 'gold',
    });
  }

  return insights.slice(0, 4);
}

function emptyResult(): PhraseAnalyticsResult {
  return {
    categoryStats: [],
    lessonStats: [],
    topMistakePhrases: [],
    insights: [],
    totalMistakes: 0,
    windowDays: ANALYTICS_WINDOW_DAYS,
  };
}

export { invalidatePhraseIndex };

/**
 * Для набора английских фраз (ошибки одной сессии) возвращает топ-категорию
 * и количество фраз этой категории. Используется тостом Problem Coach.
 * Возвращает null если данных недостаточно (< minCount фраз в топ-категории).
 */
export function getTopCategoryForPhrases(
  phrases: string[],
  minCount = 2,
): { category: WordCategory; count: number } | null {
  buildPhraseIndex();
  const catCount = new Map<WordCategory, number>();

  for (const phrase of phrases) {
    const key = phrase.trim().replace(/[.!?,;¿¡]+$/, '').toLowerCase();
    const entry = phraseIndex?.get(key);
    if (!entry) continue;

    const seen = new Set<WordCategory>();
    for (const cat of entry.categories) {
      if (cat === 'other') continue;
      if (!seen.has(cat)) {
        seen.add(cat);
        catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
      }
    }
  }

  let topCat: WordCategory | null = null;
  let topCount = 0;
  for (const [cat, count] of catCount) {
    if (count > topCount) { topCount = count; topCat = cat; }
  }

  if (!topCat || topCount < minCount) return null;
  return { category: topCat, count: topCount };
}

/**
 * Возвращает грамматические категории для одной фразы.
 * Используется фильтрацией фраз по категории в active_recall (Problem Coach).
 */
export function getPhraseCategories(phrase: string): WordCategory[] {
  buildPhraseIndex();
  const key = phrase.trim().replace(/[.!?,;¿¡]+$/, '').toLowerCase();
  const entry = phraseIndex?.get(key);
  return entry ? entry.categories : [];
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
