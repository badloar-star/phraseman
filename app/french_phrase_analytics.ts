import { lessonNameForStudyTarget } from './lesson_titles_for_study_target';
import type {
  PersonalInsight,
  PhraseAnalyticsResult,
  WordCategory,
  WordCategoryStat,
} from './phrase_analytics';
import type { RuntimeSourceLocale } from './target_storage_keys';
import { loadMistakeEventJournal } from './mistake_practice_store';
import { getStableId } from './stable_id';

const FRENCH_ANALYTICS_WINDOW_DAYS = 30;
const FRENCH_ANALYTICS_WINDOW_MS = FRENCH_ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

type FrenchPhraseAnalyticsOptions = {
  sourceLocale?: RuntimeSourceLocale;
};

function emptyFrenchAnalytics(): PhraseAnalyticsResult {
  return {
    categoryStats: [],
    lessonStats: [],
    topMistakePhrases: [],
    insights: [],
    totalMistakes: 0,
    windowDays: FRENCH_ANALYTICS_WINDOW_DAYS,
  };
}

function makeInsight(
  type: PersonalInsight['type'],
  accent: PersonalInsight['accent'],
  copy: Pick<PersonalInsight, 'ru' | 'uk' | 'es' | 'ptBR' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl'>,
): PersonalInsight {
  return {
    type,
    accent,
    ...copy,
  };
}

function frenchLessonTitleCopy(lessonId: number) {
  const ptBR = lessonNameForStudyTarget('pt-BR', 'fr', lessonId) ?? `Lição ${lessonId}`;
  return {
    ru: lessonNameForStudyTarget('ru', 'fr', lessonId) ?? `Урок ${lessonId}`,
    uk: lessonNameForStudyTarget('uk', 'fr', lessonId) ?? `Урок ${lessonId}`,
    es: lessonNameForStudyTarget('es', 'fr', lessonId) ?? `Lesson ${lessonId}`,
    ptBR,
    'pt-BR': ptBR,
    vi: lessonNameForStudyTarget('vi', 'fr', lessonId) ?? `Bài ${lessonId}`,
    id: lessonNameForStudyTarget('id', 'fr', lessonId) ?? `Pelajaran ${lessonId}`,
    tr: lessonNameForStudyTarget('tr', 'fr', lessonId) ?? `Ders ${lessonId}`,
    pl: lessonNameForStudyTarget('pl', 'fr', lessonId) ?? `Lekcja ${lessonId}`,
  };
}

function categoryStat(
  category: WordCategory,
  count: number,
  total: number,
  wordCounts: Map<string, number>,
): WordCategoryStat {
  const priority = Math.min(100, Math.round(count * 24 + (count / Math.max(1, total)) * 35));
  return {
    category,
    mistakeCount: count,
    weaknessScore: priority,
    priorityScore: priority,
    recoveryScore: 0,
    exactMistakeCount: count,
    recentMistakeCount: count,
    masteryLevel: 0,
    masteryXp: 0,
    masteryStreak: 0,
    practiceCorrect: 0,
    practiceWrong: 0,
    pct: total > 0 ? Math.round((count / total) * 100) : 0,
    topWords: [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([word]) => word),
  };
}

export async function computeFrenchPhraseAnalytics(
  options: FrenchPhraseAnalyticsOptions = {},
): Promise<PhraseAnalyticsResult> {
  const now = Date.now();
  const windowStart = now - FRENCH_ANALYTICS_WINDOW_MS;
  const accountScope = await getStableId();
  const journal = await loadMistakeEventJournal({ accountScope, studyTarget: 'fr' });
  const entries = journal.events
    .filter((event) => event.type === 'captured' && event.occurredAtMs >= windowStart)
    .map((event) => ({
      phrase: typeof event.payload.canonicalTarget === 'string' ? event.payload.canonicalTarget : '',
      lessonId: Number.parseInt(String(event.payload.lessonId ?? '0').replace(/^lesson-/, ''), 10) || 0,
      ts: event.occurredAtMs,
    }))
    .filter((entry) => entry.phrase.trim().length > 0);
  if (entries.length === 0) return emptyFrenchAnalytics();
  void options.sourceLocale;

  const categoryCounts = new Map<WordCategory, number>();
  const categoryWords = new Map<WordCategory, Map<string, number>>();
  const lessonCounts = new Map<number, number>();
  const phraseCounts = new Map<string, { lessonId: number; count: number }>();
  let activeMistakeCount = 0;

  for (const entry of entries) {
    activeMistakeCount += 1;
    if (entry.lessonId > 0) {
      lessonCounts.set(entry.lessonId, (lessonCounts.get(entry.lessonId) ?? 0) + 1);
    }
    const phrase = phraseCounts.get(entry.phrase) ?? { lessonId: entry.lessonId, count: 0 };
    phrase.count += 1;
    phraseCounts.set(entry.phrase, phrase);
  }

  if (activeMistakeCount === 0) return emptyFrenchAnalytics();

  const totalCategoryMistakes = [...categoryCounts.values()].reduce((sum, count) => sum + count, 0);
  const categoryStats = [...categoryCounts.entries()]
    .map(([category, count]) => categoryStat(category, count, totalCategoryMistakes, categoryWords.get(category) ?? new Map()))
    .sort((a, b) => b.priorityScore - a.priorityScore || b.mistakeCount - a.mistakeCount);
  const lessonStats = [...lessonCounts.entries()]
    .map(([lessonId, mistakeCount]) => {
      const title = frenchLessonTitleCopy(lessonId);
      return {
        lessonId,
        lessonNameRU: title.ru,
        lessonNameUK: title.uk,
        lessonNameES: title.es,
        mistakeCount,
        pct: Math.round((mistakeCount / activeMistakeCount) * 100),
      };
    })
    .sort((a, b) => b.mistakeCount - a.mistakeCount || a.lessonId - b.lessonId);
  const topMistakePhrases = [...phraseCounts.entries()]
    .map(([phrase, stat]) => ({ phrase, lessonId: stat.lessonId, count: stat.count }))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
    .slice(0, 5);
  const topCategory = categoryStats[0];
  const topLesson = lessonStats[0];
  const topPhrase = topMistakePhrases[0];
  const topLessonTitle = topLesson ? frenchLessonTitleCopy(topLesson.lessonId) : null;
  const insights: PersonalInsight[] = [
    topCategory
      ? makeInsight(
          'weak_category',
          'red',
          {
            ru: `Во французском чаще всего проседает категория ${topCategory.category}: ${topCategory.mistakeCount} ошибок за 30 дней.`,
            uk: `У французькій найчастіше просідає категорія ${topCategory.category}: ${topCategory.mistakeCount} помилок за 30 днів.`,
            es: `En francés, la categoría que más falla es ${topCategory.category}: ${topCategory.mistakeCount} errores en 30 días.`,
            ptBR: `Em francês, a categoria que mais pesa é ${topCategory.category}: ${topCategory.mistakeCount} erros em 30 dias.`,
            'pt-BR': `Em francês, a categoria que mais pesa é ${topCategory.category}: ${topCategory.mistakeCount} erros em 30 dias.`,
            vi: `Trong tiếng Pháp, nhóm yếu nhất là ${topCategory.category}: ${topCategory.mistakeCount} lỗi trong 30 ngày.`,
            id: `Dalam bahasa Prancis, kategori yang paling lemah adalah ${topCategory.category}: ${topCategory.mistakeCount} kesalahan dalam 30 hari.`,
            tr: `Fransızcada en çok zorlayan kategori ${topCategory.category}: 30 günde ${topCategory.mistakeCount} hata.`,
            pl: `We francuskim najsłabsza jest kategoria ${topCategory.category}: ${topCategory.mistakeCount} błędów w 30 dni.`,
          },
        )
      : undefined,
    topLesson
      ? makeInsight(
          'weak_lesson',
          'gold',
          {
            ru: `Самый слабый французский урок сейчас: ${topLesson.lessonNameRU}.`,
            uk: `Найслабший французький урок зараз: ${topLesson.lessonNameUK}.`,
            es: `La lección de francés más débil ahora es ${topLessonTitle?.es ?? topLesson.lessonNameES}.`,
            ptBR: `A lição de francês mais fraca agora é ${topLessonTitle?.ptBR ?? topLesson.lessonNameES}.`,
            'pt-BR': `A lição de francês mais fraca agora é ${topLessonTitle?.['pt-BR'] ?? topLesson.lessonNameES}.`,
            vi: `Bài tiếng Pháp yếu nhất hiện tại là ${topLessonTitle?.vi ?? topLesson.lessonNameES}.`,
            id: `Pelajaran bahasa Prancis terlemah saat ini adalah ${topLessonTitle?.id ?? topLesson.lessonNameES}.`,
            tr: `Şu anda en zayıf Fransızca dersi ${topLessonTitle?.tr ?? topLesson.lessonNameES}.`,
            pl: `Najsłabsza lekcja francuskiego teraz to ${topLessonTitle?.pl ?? topLesson.lessonNameES}.`,
          },
        )
      : undefined,
    topPhrase
      ? makeInsight(
          'top_phrase',
          'blue',
          {
            ru: `Фраза для повторения: ${topPhrase.phrase}.`,
            uk: `Фраза для повторення: ${topPhrase.phrase}.`,
            es: `Frase para repasar: ${topPhrase.phrase}.`,
            ptBR: `Frase para revisar: ${topPhrase.phrase}.`,
            'pt-BR': `Frase para revisar: ${topPhrase.phrase}.`,
            vi: `Cụm cần ôn lại: ${topPhrase.phrase}.`,
            id: `Frasa untuk ditinjau ulang: ${topPhrase.phrase}.`,
            tr: `Tekrar edilecek ifade: ${topPhrase.phrase}.`,
            pl: `Fraza do powtórki: ${topPhrase.phrase}.`,
          },
        )
      : undefined,
  ].filter(Boolean) as PersonalInsight[];

  return {
    categoryStats,
    lessonStats,
    topMistakePhrases,
    insights,
    totalMistakes: activeMistakeCount,
    windowDays: FRENCH_ANALYTICS_WINDOW_DAYS,
  };
}

export default function __FrenchPhraseAnalyticsRouteShim() {
  return null;
}
