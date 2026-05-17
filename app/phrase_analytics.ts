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
import { isUserFacingCategory, normalizeTokenKey, normalizeWordCategory, type WordCategory } from './pos_taxonomy';
import { getPosMasterySnapshot, type PosMasteryEntry } from './pos_workout_engine';
import {
  getPersonalTrainingResolvedAt,
  loadResolvedPersonalTrainings,
} from './diagnosis_training_progress';

// ── Типы ─────────────────────────────────────────────────────────────────────

export type { WordCategory } from './pos_taxonomy';

export interface WordCategoryStat {
  category: WordCategory;
  /** Сколько раз ошибался в словах этой категории */
  mistakeCount: number;
  /** Raw weakness from mistakes only. */
  weaknessScore: number;
  /** Final queue priority after successful POS practice gives recovery credit. */
  priorityScore: number;
  /** Practice credit from POS mastery, streak, accuracy, and recency. */
  recoveryScore: number;
  exactMistakeCount: number;
  recentMistakeCount: number;
  masteryLevel: number;
  masteryXp: number;
  masteryStreak: number;
  practiceCorrect: number;
  practiceWrong: number;
  lastPracticed?: number;
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

export interface AnalyticsLocaleCopy {
  ru: string;
  uk: string;
  es: string;
  ptBR: string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}

export interface PersonalInsight extends AnalyticsLocaleCopy {
  type: 'weak_category' | 'strong_category' | 'weak_lesson' | 'strong_lesson' | 'top_phrase' | 'general';
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

export interface PosCoverageSample {
  lessonId: number;
  phrase: string;
  word: string;
  rawCategory?: string;
  category?: WordCategory;
  source?: string;
  confidence?: number;
  issue?: 'unresolved' | 'unknown_source' | 'low_confidence';
}

export interface PosCoverageAudit {
  totalTokens: number;
  resolvedTokens: number;
  unresolvedTokens: number;
  unknownSourceTokens: number;
  lowConfidenceTokens: number;
  resolvedPct: number;
  minConfidence: number;
  unresolvedSamples: PosCoverageSample[];
  unknownSourceSamples: PosCoverageSample[];
  lowConfidenceSamples: PosCoverageSample[];
  unresolvedWordCounts: Array<{ word: string; count: number; rawCategory?: string }>;
  rawCategoryCounts: Array<{ rawCategory: string; count: number }>;
  categoryCounts: Array<{ category: WordCategory; count: number }>;
  sourceCounts: Array<{ source: string; count: number }>;
  releaseReady: boolean;
}

export interface PhraseMistakeSignal {
  phrase: string;
  tokenText?: string;
  tokenIndex?: number;
  expected?: string;
  picked?: string;
  rawCategory?: string;
  category?: WordCategory;
  grammarTag?: string;
  mode?: string;
}

export type PhraseMistakeInput = string | PhraseMistakeSignal;

export interface CategoryWeaknessCandidate {
  category: WordCategory;
  count: number;
  exactCount: number;
  weaknessScore: number;
}

// ── Словари для автовывода категории когда нет явного поля ─────────────────

const ARTICLES = new Set(['a', 'an', 'the']);
const TO_BE = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
const MODALS = new Set(['can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'need', 'dare', 'ought']);
const PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves', 'who', 'which', 'that', 'what', 'this', 'these', 'those']);
const CONJUNCTIONS = new Set(['and', 'but', 'or', 'nor', 'so', 'yet', 'for', 'because', 'although', 'though', 'while', 'when', 'if', 'unless', 'until', 'since', 'after', 'before', 'as', 'than', 'that', 'whether']);
// phrasal_particle checked BEFORE preposition so 'up/down/out/off' in phrasal context aren\'t swallowed by the preposition set
const PHRASAL_PARTICLES = new Set(['up', 'down', 'out', 'in', 'on', 'off', 'away', 'back', 'over', 'through', 'around', 'along', 'ahead', 'forward', 'together', 'apart']);
const COMMON_PREPOSITIONS = new Set(['in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'into', 'onto', 'about', 'above', 'below', 'between', 'behind', 'beside', 'under', 'over', 'through', 'during', 'before', 'after', 'near', 'without', 'against', 'around', 'among', 'along', 'across', 'off', 'out', 'up', 'down', 'inside', 'outside', 'opposite', 'past']);
const ADVERBS = new Set(['there', 'here', 'now', 'then', 'not', 'never', 'always', 'often', 'still', 'already', 'just', 'very', 'really', 'quite', 'soon', 'today', 'yesterday', 'tomorrow', 'right', 'again', 'also', 'too', 'well', 'loudly', 'slowly', 'quickly', 'carefully', 'finally', 'suddenly', 'recently', 'often', 'sometimes', 'usually', 'immediately']);

function inferCategory(word: string, knownCategory?: string): WordCategory {
  return normalizeWordCategory(knownCategory, word).category;
}

// ── Подписи категорий для интерфейсных языков ───────────────────────────────

const CATEGORY_LABELS: Record<string, AnalyticsLocaleCopy> = {
  'verb': { ru: 'Глаголы', uk: 'Дієслова', es: 'Verbos', ptBR: 'Verbos', vi: 'Động từ', id: 'Kata kerja', tr: 'Fiiller', pl: 'Czasowniki' },
  'noun': { ru: 'Существительные', uk: 'Іменники', es: 'Sustantivos', ptBR: 'Substantivos', vi: 'Danh từ', id: 'Kata benda', tr: 'İsimler', pl: 'Rzeczowniki' },
  'pronoun': { ru: 'Местоимения', uk: 'Займенники', es: 'Pronombres', ptBR: 'Pronomes', vi: 'Đại từ', id: 'Kata ganti', tr: 'Zamirler', pl: 'Zaimki' },
  'adjective': { ru: 'Прилагательные', uk: 'Прикметники', es: 'Adjetivos', ptBR: 'Adjetivos', vi: 'Tính từ', id: 'Kata sifat', tr: 'Sıfatlar', pl: 'Przymiotniki' },
  'adverb': { ru: 'Наречия', uk: 'Прислівники', es: 'Adverbios', ptBR: 'Advérbios', vi: 'Trạng từ', id: 'Kata keterangan', tr: 'Zarflar', pl: 'Przysłówki' },
  'preposition': { ru: 'Предлоги', uk: 'Прийменники', es: 'Preposiciones', ptBR: 'Preposições', vi: 'Giới từ', id: 'Preposisi', tr: 'Edatlar', pl: 'Przyimki' },
  'syntax': { ru: 'Syntax', uk: 'Syntax', es: 'Sintaxis', ptBR: 'Sintaxe', vi: 'Cú pháp', id: 'Sintaksis', tr: 'Söz dizimi', pl: 'Składnia' },
  'article': { ru: 'Артикли', uk: 'Артиклі', es: 'Artículos', ptBR: 'Artigos', vi: 'Mạo từ', id: 'Artikel', tr: 'Artikeller', pl: 'Przedimki' },
  'existential': { ru: 'There is / There are', uk: 'There is / There are', es: 'There is / There are', ptBR: 'There is / There are', vi: 'There is / There are', id: 'There is / There are', tr: 'There is / There are', pl: 'There is / There are' },
  'to-be': { ru: 'Глагол to be', uk: 'Дієслово to be', es: 'Verbo to be', ptBR: 'Verbo to be', vi: 'Động từ to be', id: 'Kata kerja to be', tr: 'to be fiili', pl: 'Czasownik to be' },
  'conjunction': { ru: 'Союзы', uk: 'Сполучники', es: 'Conjunciones', ptBR: 'Conjunções', vi: 'Liên từ', id: 'Konjungsi', tr: 'Bağlaçlar', pl: 'Spójniki' },
  'modal': { ru: 'Модальные глаголы', uk: 'Модальні дієслова', es: 'Verbos modales', ptBR: 'Verbos modais', vi: 'Động từ khuyết thiếu', id: 'Kata kerja modal', tr: 'Modal fiiller', pl: 'Czasowniki modalne' },
  'phrasal_particle': { ru: 'Частицы (phrasal)', uk: 'Частки (phrasal)', es: 'Partículas', ptBR: 'Partículas de phrasal verbs', vi: 'Tiểu từ trong phrasal verb', id: 'Partikel phrasal verb', tr: 'Phrasal verb parçacıkları', pl: 'Partykuły phrasal verbs' },
  'modifier': { ru: 'Modifiers', uk: 'Modifiers', es: 'Modificadores', ptBR: 'Modificadores', vi: 'Từ bổ nghĩa', id: 'Modifier', tr: 'Niteleyiciler', pl: 'Modyfikatory' },
  'determiner': { ru: 'Determiners', uk: 'Determiners', es: 'Determinantes', ptBR: 'Determinantes', vi: 'Từ hạn định', id: 'Determiner', tr: 'Belirleyiciler', pl: 'Określniki' },
  'other': { ru: 'Другое', uk: 'Інше', es: 'Otros', ptBR: 'Outros', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' },
};

// ── Кэш фраз: phrase → categories[], tokens[], lessonId ─────────────────────

interface PhraseIndexEntry {
  categories: WordCategory[];
  /** text → category для быстрого перебора при сборке topWords */
  tokenCategories: Array<{ text: string; category: WordCategory }>;
  lessonId: number;
}

let phraseIndex: Map<string, PhraseIndexEntry> | null = null;

function normalizePhraseKey(value: string): string {
  return value.trim().replace(/[.!?,;¿¡]+$/, '').replace(/\s+/g, ' ').toLowerCase();
}

function addPhraseIndexEntry(key: string, entry: PhraseIndexEntry): void {
  const normalized = normalizePhraseKey(key);
  if (!normalized || phraseIndex?.has(normalized)) return;
  phraseIndex!.set(normalized, entry);
}

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
          const tokenText = word.correct || word.text;
          const cat = inferCategory(tokenText, word.category);
          cats.push(cat);
          tokenCategories.push({ text: normalizeTokenKey(tokenText), category: cat });
        }
        if (cats.length > 0) {
          const entry = { categories: cats, tokenCategories, lessonId };
          phraseIndex!.set(key, entry);
          addPhraseIndexEntry(phrase.english, entry);
          addPhraseIndexEntry(tokenCategories.map((t) => t.text).join(' '), entry);
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

export function auditPhrasePosCoverage(): PosCoverageAudit {
  let totalTokens = 0;
  let resolvedTokens = 0;
  let unknownSourceTokens = 0;
  let lowConfidenceTokens = 0;
  let minConfidence = 1;
  const unresolvedSamples: PosCoverageSample[] = [];
  const unknownSourceSamples: PosCoverageSample[] = [];
  const lowConfidenceSamples: PosCoverageSample[] = [];
  const unresolvedWordCounter = new Map<string, { word: string; count: number; rawCategory?: string }>();
  const rawCategoryCounter = new Map<string, number>();
  const categoryCounter = new Map<WordCategory, number>();
  const sourceCounter = new Map<string, number>();

  for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
    try {
      const phrases = getLessonData(lessonId);
      for (const phrase of phrases) {
        const tokens = (phrase.wordsEn ?? phrase.words) ?? [];
        for (const word of tokens) {
          const tokenText = word.correct || word.text;
          const tokenKey = normalizeTokenKey(tokenText);
          if (!tokenKey) continue;
          totalTokens += 1;
          const rawCategory = word.category || '';
          if (rawCategory) rawCategoryCounter.set(rawCategory, (rawCategoryCounter.get(rawCategory) ?? 0) + 1);
          const resolved = normalizeWordCategory(rawCategory, tokenText);
          minConfidence = Math.min(minConfidence, resolved.confidence);
          categoryCounter.set(resolved.category, (categoryCounter.get(resolved.category) ?? 0) + 1);
          sourceCounter.set(resolved.source, (sourceCounter.get(resolved.source) ?? 0) + 1);
          if (isUserFacingCategory(resolved.category)) {
            resolvedTokens += 1;
            if (resolved.source === 'unknown') {
              unknownSourceTokens += 1;
              if (unknownSourceSamples.length < 25) {
                unknownSourceSamples.push({
                  lessonId,
                  phrase: phrase.english,
                  word: tokenText,
                  rawCategory: rawCategory || undefined,
                  category: resolved.category,
                  source: resolved.source,
                  confidence: resolved.confidence,
                  issue: 'unknown_source',
                });
              }
            }
            if (resolved.confidence < 0.5) {
              lowConfidenceTokens += 1;
              if (lowConfidenceSamples.length < 25) {
                lowConfidenceSamples.push({
                  lessonId,
                  phrase: phrase.english,
                  word: tokenText,
                  rawCategory: rawCategory || undefined,
                  category: resolved.category,
                  source: resolved.source,
                  confidence: resolved.confidence,
                  issue: 'low_confidence',
                });
              }
            }
          } else {
            const issueKey = `${tokenKey}::${rawCategory}`;
            const issueExisting = unresolvedWordCounter.get(issueKey);
            if (issueExisting) {
              issueExisting.count += 1;
            } else {
              unresolvedWordCounter.set(issueKey, {
                word: tokenText,
                count: 1,
                rawCategory: rawCategory || undefined,
              });
            }
            if (unresolvedSamples.length < 25) {
              unresolvedSamples.push({
                lessonId,
                phrase: phrase.english,
                word: tokenText,
                rawCategory: rawCategory || undefined,
                category: resolved.category,
                source: resolved.source,
                confidence: resolved.confidence,
                issue: 'unresolved',
              });
            }
            if (resolved.source === 'unknown') {
              unknownSourceTokens += 1;
              if (unknownSourceSamples.length < 25) {
                unknownSourceSamples.push({
                  lessonId,
                  phrase: phrase.english,
                  word: tokenText,
                  rawCategory: rawCategory || undefined,
                  category: resolved.category,
                  source: resolved.source,
                  confidence: resolved.confidence,
                  issue: 'unknown_source',
                });
              }
            }
            lowConfidenceTokens += 1;
            if (lowConfidenceSamples.length < 25) {
              lowConfidenceSamples.push({
              lessonId,
              phrase: phrase.english,
              word: tokenText,
              rawCategory: rawCategory || undefined,
                category: resolved.category,
                source: resolved.source,
                confidence: resolved.confidence,
                issue: 'low_confidence',
              });
            }
          }
        }
      }
    } catch (err) {
      DebugLogger.error('phrase_analytics:auditPosCoverage', err, 'warning');
    }
  }

  return {
    totalTokens,
    resolvedTokens,
    unresolvedTokens: Math.max(0, totalTokens - resolvedTokens),
    unknownSourceTokens,
    lowConfidenceTokens,
    resolvedPct: totalTokens > 0 ? Math.round((resolvedTokens / totalTokens) * 100) : 100,
    minConfidence: totalTokens > 0 ? minConfidence : 1,
    unresolvedSamples,
    unknownSourceSamples,
    lowConfidenceSamples,
    unresolvedWordCounts: Array.from(unresolvedWordCounter.values())
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)),
    rawCategoryCounts: Array.from(rawCategoryCounter.entries())
      .map(([rawCategory, count]) => ({ rawCategory, count }))
      .sort((a, b) => b.count - a.count || a.rawCategory.localeCompare(b.rawCategory)),
    categoryCounts: Array.from(categoryCounter.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
    sourceCounts: Array.from(sourceCounter.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
    releaseReady: resolvedTokens === totalTokens && unknownSourceTokens === 0 && lowConfidenceTokens === 0,
  };
}

export function buildPosCoverageAuditFailure(audit: PosCoverageAudit): string {
  if (audit.releaseReady) return '';
  return JSON.stringify({
    totalTokens: audit.totalTokens,
    resolvedPct: audit.resolvedPct,
    unresolvedTokens: audit.unresolvedTokens,
    unknownSourceTokens: audit.unknownSourceTokens,
    lowConfidenceTokens: audit.lowConfidenceTokens,
    minConfidence: audit.minConfidence,
    unresolvedSamples: audit.unresolvedSamples.slice(0, 12),
    unknownSourceSamples: audit.unknownSourceSamples.slice(0, 12),
    lowConfidenceSamples: audit.lowConfidenceSamples.slice(0, 12),
    unresolvedWordCounts: audit.unresolvedWordCounts.slice(0, 200),
    sourceCounts: audit.sourceCounts,
    categoryCounts: audit.categoryCounts,
    rawCategoryCounts: audit.rawCategoryCounts.slice(0, 30),
  }, null, 2);
}

function countWord(catWords: Map<WordCategory, Map<string, number>>, category: WordCategory, word?: string): void {
  if (!isUserFacingCategory(category)) return;
  const key = normalizeTokenKey(word);
  if (!key) return;
  if (!catWords.has(category)) catWords.set(category, new Map());
  const wordMap = catWords.get(category)!;
  wordMap.set(key, (wordMap.get(key) ?? 0) + 1);
}

function resolveEntryCategories(
  entry: PhraseMistakeSignal,
  indexEntry?: PhraseIndexEntry,
): { categories: WordCategory[]; exact: boolean; tokenText?: string } {
  const tokenText = entry.tokenText || entry.expected || (entry.mode === 'lesson_words' ? entry.phrase : undefined);
  if (entry.category && isUserFacingCategory(entry.category)) {
    return { categories: [entry.category], exact: true, tokenText };
  }

  const tokenKey = normalizeTokenKey(tokenText);
  if (tokenKey && indexEntry) {
    const token = indexEntry.tokenCategories.find((t) => t.text === tokenKey);
    if (token && isUserFacingCategory(token.category)) {
      return { categories: [token.category], exact: true, tokenText: token.text };
    }
  }

  if (tokenKey) {
    const inferred = normalizeWordCategory(entry.rawCategory, tokenKey).category;
    if (isUserFacingCategory(inferred)) {
      return { categories: [inferred], exact: true, tokenText: tokenKey };
    }
  }

  return { categories: [], exact: false };
}

function mistakeRecencyWeight(ts: number, now: number): number {
  const ageDays = Math.max(0, (now - ts) / (24 * 60 * 60 * 1000));
  if (ageDays <= 1) return 1.5;
  if (ageDays <= 7) return 1.25;
  if (ageDays <= 14) return 1.1;
  return 1;
}

function computeCategoryWeaknessScore(input: {
  count: number;
  pct: number;
  exactCount: number;
  recentCount: number;
  weighted: number;
}): number {
  const countScore = Math.min(30, input.count * 8);
  const shareScore = Math.min(35, input.pct * 0.35);
  const recencyScore = Math.min(20, input.recentCount * 7);
  const exactScore = input.count > 0 ? Math.round((input.exactCount / input.count) * 15) : 0;
  const weightScore = Math.min(15, Math.round(input.weighted * 3));
  return Math.min(100, Math.round(countScore + shareScore + recencyScore + exactScore + weightScore));
}

function computePracticeRecoveryScore(entry: PosMasteryEntry | undefined, now: number): number {
  if (!entry) return 0;
  const attempts = entry.correct + entry.wrong;
  const accuracy = attempts > 0 ? entry.correct / attempts : 0;
  const ageDays = Math.max(0, (now - entry.lastPracticed) / (24 * 60 * 60 * 1000));
  const levelScore = Math.min(24, Math.max(0, entry.level - 1) * 8);
  const streakScore = Math.min(30, entry.streak * 6);
  const accuracyScore = Math.round(accuracy * 22);
  const recencyScore = ageDays <= 1 ? 18 : ageDays <= 7 ? 14 : ageDays <= 30 ? 8 : 0;
  return Math.min(100, Math.round(levelScore + streakScore + accuracyScore + recencyScore));
}

function computePriorityScore(weaknessScore: number, recoveryScore: number): number {
  const recoveryCredit = Math.min(55, Math.round(recoveryScore * 0.55));
  return Math.max(0, Math.round(weaknessScore - recoveryCredit));
}

function computeSessionWeaknessScore(count: number, exactCount: number, totalSignals: number): number {
  const dominance = totalSignals > 0 ? count / totalSignals : 0;
  const exactRatio = count > 0 ? exactCount / count : 0;
  return Math.min(100, Math.round(count * 24 + dominance * 35 + exactRatio * 31));
}

const ANALYTICS_WINDOW_DAYS = 30;
const ANALYTICS_WINDOW_MS = ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export async function computePhraseAnalytics(): Promise<PhraseAnalyticsResult> {
  try {
    const entries = await loadMistakeLog();
    const now = Date.now();
    const windowStart = now - ANALYTICS_WINDOW_MS;
    const recent = entries.filter((e) => e.ts >= windowStart);

    if (recent.length === 0) {
      return emptyResult();
    }

    // Build index lazily — only when there are actual mistakes to process
    buildPhraseIndex();
    const masteryByCategory = new Map<WordCategory, PosMasteryEntry>();
    for (const entry of await getPosMasterySnapshot()) {
      masteryByCategory.set(entry.category, entry);
    }
    const resolvedPersonalTrainings = await loadResolvedPersonalTrainings();

    // ── Счётчики по категориям ────────────────────────────────────────────
    const catCount = new Map<WordCategory, number>();
    const catWords = new Map<WordCategory, Map<string, number>>();
    const catWeighted = new Map<WordCategory, number>();
    const catExactCount = new Map<WordCategory, number>();
    const catRecentCount = new Map<WordCategory, number>();

    // ── Счётчики по урокам ────────────────────────────────────────────────
    const lessonCount = new Map<number, number>();

    // ── Топ фраз ──────────────────────────────────────────────────────────
    const phraseCount = new Map<string, { count: number; lessonId: number }>();
    let totalCategoryMistakes = 0;
    let activeMistakeCount = 0;

    for (const entry of recent) {
      // Normalize key same way as phraseIndex (strip trailing punctuation)
      const key = entry.phrase.trim().replace(/[.!?,;¿¡]+$/, '').toLowerCase();
      const indexEntry = phraseIndex?.get(key) ?? phraseIndex?.get(normalizePhraseKey(entry.phrase));
      const resolved = resolveEntryCategories(entry, indexEntry);
      const activeCategories = resolved.categories.filter((cat) => {
        const resolvedAt = getPersonalTrainingResolvedAt(resolvedPersonalTrainings, {
          category: cat,
          microDiagnosisId: entry.grammarTag,
        });
        return entry.ts > resolvedAt;
      });

      if (resolved.categories.length > 0 && activeCategories.length === 0) {
        continue;
      }
      activeMistakeCount += 1;

      // Фразы
      const existing = phraseCount.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        phraseCount.set(key, { count: 1, lessonId: entry.lessonId });
      }

      // Уроки. Diagnostic entries can use lessonId=0: они влияют на POS/phrase
      // analytics, but should not render as "Урок 0".
      if (entry.lessonId > 0) {
        lessonCount.set(entry.lessonId, (lessonCount.get(entry.lessonId) ?? 0) + 1);
      }

      // Categories: only exact token/category signals are allowed into user-facing
      // POS percentages. Legacy phrase-only logs still count for totals/phrases,
      // but they no longer vote for every category inside the whole phrase.
      if (activeCategories.length > 0) {
        for (const cat of activeCategories) {
          catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
          const weight = mistakeRecencyWeight(entry.ts, now) * (resolved.exact ? 1.15 : 0.85);
          catWeighted.set(cat, (catWeighted.get(cat) ?? 0) + weight);
          if (resolved.exact) catExactCount.set(cat, (catExactCount.get(cat) ?? 0) + 1);
          if (now - entry.ts <= 7 * 24 * 60 * 60 * 1000) {
            catRecentCount.set(cat, (catRecentCount.get(cat) ?? 0) + 1);
          }
          totalCategoryMistakes += 1;
          if (resolved.exact) {
            countWord(catWords, cat, resolved.tokenText || entry.phrase);
          } else if (indexEntry) {
            for (const token of indexEntry.tokenCategories.filter((t) => t.category === cat)) {
              countWord(catWords, cat, token.text);
            }
          }
        }
      }
    }

    const totalMistakes = activeMistakeCount;

    // ── Сборка categoryStats ─────────────────────────────────────────────
    const categoryTotal = Math.max(1, totalCategoryMistakes);
    const categoryStats: WordCategoryStat[] = Array.from(catCount.entries())
      .filter(([cat]) => isUserFacingCategory(cat))
      .map(([cat, count]) => {
        const pct = Math.round((count / categoryTotal) * 100);
        const exactMistakeCount = catExactCount.get(cat) ?? 0;
        const recentMistakeCount = catRecentCount.get(cat) ?? 0;
        const weighted = catWeighted.get(cat) ?? count;
        const mastery = masteryByCategory.get(cat);
        const weaknessScore = computeCategoryWeaknessScore({
          count,
          pct,
          exactCount: exactMistakeCount,
          recentCount: recentMistakeCount,
          weighted,
        });
        const recoveryScore = computePracticeRecoveryScore(mastery, now);
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
          weaknessScore,
          priorityScore: computePriorityScore(weaknessScore, recoveryScore),
          recoveryScore,
          exactMistakeCount,
          recentMistakeCount,
          masteryLevel: mastery?.level ?? 1,
          masteryXp: mastery?.xp ?? 0,
          masteryStreak: mastery?.streak ?? 0,
          practiceCorrect: mastery?.correct ?? 0,
          practiceWrong: mastery?.wrong ?? 0,
          lastPracticed: mastery?.lastPracticed,
          pct,
          topWords,
        };
      })
      .sort((a, b) =>
        b.priorityScore - a.priorityScore ||
        b.weaknessScore - a.weaknessScore ||
        b.mistakeCount - a.mistakeCount
      );

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
  if (weak && weak.priorityScore >= 55 && weak.pct >= 10) {
    const label = CATEGORY_LABELS[weak.category];
    const topWord = weak.topWords[0] ? ` («${weak.topWords[0]}»)` : '';
    insights.push({
      type: 'weak_category',
      ru: `${label.ru} — ${weak.pct}% ошибок${topWord}. Стоит повторить.`,
      uk: `${label.uk} — ${weak.pct}% помилок${topWord}. Варто повторити.`,
      es: `${label.es} — ${weak.pct}% de errores${topWord}. Vale la pena repasar.`,
      ptBR: `${label.ptBR} — ${weak.pct}% de erros${topWord}. Vale a pena revisar.`,
      vi: `${label.vi} — ${weak.pct}% lỗi${topWord}. Nên ôn lại.`,
      id: `${label.id} — ${weak.pct}% kesalahan${topWord}. Sebaiknya diulang.`,
      tr: `${label.tr} — %${weak.pct} hata${topWord}. Tekrar etmek iyi olur.`,
      pl: `${label.pl} — ${weak.pct}% błędów${topWord}. Warto powtórzyć.`,
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
      ptBR: `Lição ${weakLesson.lessonId} — ${weakLesson.pct}% de erros. Recomendamos revisar.`,
      vi: `Bài ${weakLesson.lessonId} — ${weakLesson.pct}% lỗi. Bạn nên ôn lại.`,
      id: `Pelajaran ${weakLesson.lessonId} — ${weakLesson.pct}% kesalahan. Sebaiknya diulang.`,
      tr: `Ders ${weakLesson.lessonId} — %${weakLesson.pct} hata. Tekrar etmeni öneririz.`,
      pl: `Lekcja ${weakLesson.lessonId} — ${weakLesson.pct}% błędów. Warto powtórzyć.`,
      accent: 'red',
    });
  }

  // Сильная категория — только если есть хотя бы 3 разные слабых категории
  // (иначе мы просто выбираем первую из ALL_CATEGORIES, о которой нет данных)
  if (catStats.length >= 3) {
    const weakCats = new Set(catStats.slice(0, 3).map((c) => c.category));
    const ALL_CATEGORIES: WordCategory[] = ['verb', 'noun', 'pronoun', 'adjective', 'adverb', 'modifier', 'preposition', 'article', 'determiner', 'existential', 'to-be', 'modal'];
    const strongCat = ALL_CATEGORIES.find((c) => !weakCats.has(c));
    if (strongCat) {
      const label = CATEGORY_LABELS[strongCat];
      insights.push({
        type: 'strong_category',
        ru: `${label.ru} — ты знаешь хорошо. Ошибки здесь редки.`,
        uk: `${label.uk} — ти знаєш добре. Помилки тут рідкісні.`,
        es: `${label.es} — los conoces bien. Los errores aquí son raros.`,
        ptBR: `${label.ptBR} — você conhece bem. Erros aqui são raros.`,
        vi: `${label.vi} — bạn nắm khá tốt. Lỗi ở đây khá hiếm.`,
        id: `${label.id} — kamu sudah cukup menguasainya. Kesalahan di sini jarang.`,
        tr: `${label.tr} — bunu iyi biliyorsun. Buradaki hatalar nadir.`,
        pl: `${label.pl} — dobrze to znasz. Błędy tutaj są rzadkie.`,
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
          ptBR: `Lição ${id} — quase sem erros. Um dos seus pontos fortes.`,
          vi: `Bài ${id} — gần như không có lỗi. Đây là điểm mạnh của bạn.`,
          id: `Pelajaran ${id} — hampir tidak ada kesalahan. Ini salah satu kekuatanmu.`,
          tr: `Ders ${id} — neredeyse hiç hata yok. Güçlü olduğun yerlerden biri.`,
          pl: `Lekcja ${id} — prawie bez błędów. To twoja mocna strona.`,
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
      ptBR: `A palavra «${word}» (${label.ptBR.toLowerCase()}) é a que mais causa dificuldade.`,
      vi: `Từ «${word}» (${label.vi.toLowerCase()}) đang gây khó khăn nhiều nhất.`,
      id: `Kata «${word}» (${label.id.toLowerCase()}) paling sering membuatmu kesulitan.`,
      tr: `«${word}» kelimesi (${label.tr.toLowerCase()}) en çok zorlandığın yer.`,
      pl: `Słowo «${word}» (${label.pl.toLowerCase()}) sprawia najwięcej trudności.`,
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
 * и количество фраз этой категории. Используется тостом точного диагноза.
 * Возвращает null если данных недостаточно (< minCount фраз в топ-категории).
 */
export function getTopCategoryForPhrases(
  phrases: PhraseMistakeInput[],
  minCount = 2,
): CategoryWeaknessCandidate | null {
  buildPhraseIndex();
  const catCount = new Map<WordCategory, number>();
  const catExactCount = new Map<WordCategory, number>();

  for (const input of phrases) {
    const signal: PhraseMistakeSignal = typeof input === 'string' ? { phrase: input } : input;
    const phrase = signal.phrase;
    const key = phrase.trim().replace(/[.!?,;¿¡]+$/, '').toLowerCase();
    const entry = phraseIndex?.get(key);
    const seen = new Set<WordCategory>();
    const resolved = resolveEntryCategories(signal, entry);
    for (const cat of resolved.categories) {
      if (!isUserFacingCategory(cat)) continue;
      if (!seen.has(cat)) {
        seen.add(cat);
        catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
        if (resolved.exact) catExactCount.set(cat, (catExactCount.get(cat) ?? 0) + 1);
      }
    }
  }

  let top: CategoryWeaknessCandidate | null = null;
  let topCount = 0;
  for (const [cat, count] of catCount) {
    const exactCount = catExactCount.get(cat) ?? 0;
    const candidate = {
      category: cat,
      count,
      exactCount,
      weaknessScore: computeSessionWeaknessScore(count, exactCount, phrases.length),
    };
    if (
      !top ||
      candidate.weaknessScore > top.weaknessScore ||
      (candidate.weaknessScore === top.weaknessScore && candidate.count > top.count)
    ) {
      top = candidate;
      topCount = count;
    }
  }

  if (!top || topCount < minCount) return null;
  return top;
}

/**
 * Возвращает грамматические категории для одной фразы.
 * Используется фильтрацией фраз по категории в active_recall.
 */
export function getPhraseCategories(phrase: string): WordCategory[] {
  buildPhraseIndex();
  const key = phrase.trim().replace(/[.!?,;¿¡]+$/, '').toLowerCase();
  const entry = phraseIndex?.get(key);
  return entry ? entry.categories : [];
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
