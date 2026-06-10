// ═══════════════════════════════════════════════════════════════════════════
// weekly_review_briefing.ts — сборщик «брифинга» для еженедельного ИИ-разбора.
//
// Принцип фичи: ИИ НЕ видит сырой лог и НЕ выбирает темы. Клиент сам считает
// аналитику (computePhraseAnalytics), сам отбирает ДОСТУПНЫЕ по гейту микро-уроки
// и отправляет на Cloud Function уже готовую структуру. ИИ только пересказывает.
//
// Это тип-источник правды для входа CF weeklyReviewGenerate. На стороне functions/
// лежит структурно совместимая копия (раздельные tsconfig — нельзя импортить app/).
// Совместимость залочена тестом (tests/weekly_review_briefing.test.ts).
// ═══════════════════════════════════════════════════════════════════════════

import { computePhraseAnalytics } from './phrase_analytics';
import type { WordCategoryStat, LessonMistakeStat } from './phrase_analytics';
import { loadResolvedPersonalTrainings } from './diagnosis_training_progress';
import { getDiagnosisTrainingForTarget } from './diagnosis_trainings';
import { chooseAvailableDiagnosisForCategory } from './personal_practice_lesson_router';
import { CATEGORY_LABEL_COPY } from './weekly_review_category_labels';
import { lessonNamesForLang } from '../constants/lessons';
import { triLang, type Lang } from '../constants/i18n';
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';
import { DebugLogger } from './debug-logger';

// ── Контракт: вход Cloud Function ──────────────────────────────────────────────

export interface WeeklyReviewWeakCategory {
  category: string;
  label: string;
  pct: number;
  priorityScore: number;
  topWords: string[];
}

export interface WeeklyReviewRecommendation {
  microDiagnosisId: string;
  label: string;
}

export interface WeeklyReviewBriefing {
  lang: Lang;
  studyTarget: 'en' | 'fr';
  windowDays: 7 | 14;
  totalMistakes: number;
  weakCategories: WeeklyReviewWeakCategory[];
  strongCategories: Array<{ category: string; label: string }>;
  recoveredCategories: Array<{ category: string; label: string; recoveryScore: number }>;
  weakLessons: Array<{ lessonId: number; title: string; pct: number }>;
  topMistakePhrases: Array<{ phrase: string; count: number }>;
  recommendedLessons: WeeklyReviewRecommendation[];
  effort: {
    currentStreak: number;
    longestStreak: number;
    weekXp: number;
    weekMinutes: number;
  };
}

// Слабая категория считается «реально слабой» теми же порогами, что на экране
// аналитики (priorityScore>=55, либо заметная доля при низком recovery).
function isWeakCategory(stat: WordCategoryStat): boolean {
  const priority = stat.priorityScore ?? stat.weaknessScore;
  const recovery = stat.recoveryScore ?? 0;
  return priority >= 55 || (stat.pct >= 15 && recovery < 25);
}

function labelForCategory(category: string, lang: Lang): string {
  const copy = CATEGORY_LABEL_COPY[category] ?? CATEGORY_LABEL_COPY.other;
  return triLang(lang, copy);
}

/** Заглавная для показа (ключи остаются нормализованными — это только presentation). */
function displayWord(word: string): string {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

function recommendationFor(
  stat: WordCategoryStat,
  resolved: Awaited<ReturnType<typeof loadResolvedPersonalTrainings>>,
  studyTarget: RuntimeStudyTarget | undefined,
  lang: Lang,
): WeeklyReviewRecommendation | null {
  const id = chooseAvailableDiagnosisForCategory(
    { category: stat.category, topWords: stat.topWords },
    resolved,
    studyTarget,
  );
  if (!id) return null;
  const training = getDiagnosisTrainingForTarget(id, studyTarget);
  if (!training) return null;
  // training.title is TriText: planned-lang fields are optional, so triLang may
  // widen to string | undefined. Fall back to the guaranteed ru field.
  const label = triLang(lang, training.title) ?? training.title.ru;
  return { microDiagnosisId: id, label };
}

export interface BuildBriefingOptions {
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  isPremium: boolean;
  /**
   * Контекст усилий (streak, XP/время за неделю). Передаётся СНАРУЖИ, а не
   * импортируется — иначе data-слой потянул бы Firebase-граф (daily_analytics_sync
   * → leaderboard → @react-native-firebase). Клиентский слой их и поставляет.
   */
  effort: {
    currentStreak: number;
    longestStreak: number;
    weekXp: number;
    weekMinutes: number;
  };
  /** Сколько слабых категорий и рекомендаций включить. */
  maxWeakCategories?: number;
}

function lessonTitleForBriefing(lessonId: number, lang: Lang): string {
  const names = lessonNamesForLang(lang);
  return names[lessonId - 1] ?? `Lesson ${lessonId}`;
}

/**
 * Собирает брифинг из уже посчитанной аналитики. Возвращает null, если данных
 * слишком мало для осмысленного разбора (CF дёргать не нужно — экономим вызов).
 */
export async function buildWeeklyReviewBriefing(
  options: BuildBriefingOptions,
): Promise<WeeklyReviewBriefing | null> {
  const { lang, isPremium } = options;
  const studyTarget = options.studyTarget;
  const target = storageStudyTarget(studyTarget);
  const windowDays: 7 | 14 = isPremium ? 7 : 14;
  const maxWeak = options.maxWeakCategories ?? 3;

  try {
    const [analytics, resolved] = await Promise.all([
      computePhraseAnalytics(),
      loadResolvedPersonalTrainings({ studyTarget }),
    ]);

    // Недостаточно данных — пусть UI покажет «данные копятся», без вызова ИИ.
    if (analytics.totalMistakes < 5 || analytics.categoryStats.length === 0) {
      return null;
    }

    const weakStats = analytics.categoryStats.filter(isWeakCategory).slice(0, maxWeak);
    const weakCategoryKeys = new Set(weakStats.map((s) => s.category));

    const weakCategories: WeeklyReviewWeakCategory[] = weakStats.map((stat) => ({
      category: stat.category,
      label: labelForCategory(stat.category, lang),
      pct: stat.pct,
      priorityScore: stat.priorityScore ?? stat.weaknessScore,
      // Причёсываем для показа: ключи нормализованы (нижний регистр), но ИИ
      // должен цитировать слова красиво. На матчинг это не влияет.
      topWords: stat.topWords.slice(0, 3).map(displayWord),
    }));

    // Сильные = категории с заметной практикой/recovery и НЕ входящие в слабые.
    const strongCategories = analytics.categoryStats
      .filter((s) => !weakCategoryKeys.has(s.category) && (s.recoveryScore ?? 0) >= 40)
      .slice(0, 2)
      .map((s) => ({ category: s.category, label: labelForCategory(s.category, lang) }));

    // Восстановленные = где была практика, recovery высокий (юзер реально подтянул).
    const recoveredCategories = analytics.categoryStats
      .filter((s) => (s.recoveryScore ?? 0) >= 50 && s.practiceCorrect > 0)
      .slice(0, 2)
      .map((s) => ({
        category: s.category,
        label: labelForCategory(s.category, lang),
        recoveryScore: Math.round(s.recoveryScore ?? 0),
      }));

    const weakLessons = analytics.lessonStats
      .slice(0, 2)
      .map((stat: LessonMistakeStat) => ({
        lessonId: stat.lessonId,
        title: lessonTitleForBriefing(stat.lessonId, lang),
        pct: stat.pct,
      }));

    const topMistakePhrases = analytics.topMistakePhrases
      .slice(0, 3)
      .map(({ phrase, count }) => ({ phrase, count }));

    // Рекомендации — ТОЛЬКО доступные по гейту уроки, дедуп по id.
    const recommendedLessons: WeeklyReviewRecommendation[] = [];
    const seenRecIds = new Set<string>();
    for (const stat of weakStats) {
      const rec = recommendationFor(stat, resolved, studyTarget, lang);
      if (rec && !seenRecIds.has(rec.microDiagnosisId)) {
        seenRecIds.add(rec.microDiagnosisId);
        recommendedLessons.push(rec);
      }
    }

    return {
      lang,
      studyTarget: target,
      windowDays,
      totalMistakes: analytics.totalMistakes,
      weakCategories,
      strongCategories,
      recoveredCategories,
      weakLessons,
      topMistakePhrases,
      recommendedLessons,
      effort: {
        currentStreak: options.effort.currentStreak,
        longestStreak: options.effort.longestStreak,
        weekXp: options.effort.weekXp,
        weekMinutes: options.effort.weekMinutes,
      },
    };
  } catch (err) {
    DebugLogger.error('weekly_review_briefing:build', err, 'warning');
    return null;
  }
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
