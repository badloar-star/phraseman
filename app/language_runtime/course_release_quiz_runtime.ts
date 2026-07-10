import type { QuizDifficulty, QuizPhrase } from '../quiz_data';
import type { CourseSurfaceBundleEnvelope } from './course_surface_bundle_client';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function levelForLesson(lessonId: number): QuizPhrase['level'] {
  if (lessonId <= 8) return 'A1';
  if (lessonId <= 16) return 'A2';
  if (lessonId <= 24) return 'B1';
  return 'B2';
}

function difficultyForLesson(lessonId: number): QuizDifficulty {
  if (lessonId <= 8) return 'easy';
  if (lessonId <= 20) return 'medium';
  return 'hard';
}

export function quizRowsFromCourseSurfaceBundle(bundle: CourseSurfaceBundleEnvelope): QuizPhrase[] {
  if (bundle.surface !== 'quiz') throw new Error('course_release_quiz_identity_mismatch');
  const seenIds = new Set<string>();
  return bundle.entries.flatMap((entry) => {
    const payload = entry.payload;
    if (payload.surface !== 'quiz' || Number(payload.lessonId) !== entry.lessonId || !Array.isArray(payload.items) || payload.items.length < 1) throw new Error('course_release_quiz_invalid');
    return payload.items.map((item): QuizPhrase => {
      if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim() || typeof item.prompt !== 'string' || !item.prompt.trim() || typeof item.answer !== 'string' || !item.answer.trim() || !Array.isArray(item.options) || item.options.length < 2 || item.options.length > 8 || item.options.some((option) => typeof option !== 'string' || !option.trim())) throw new Error('course_release_quiz_invalid');
      const id = item.id.trim();
      const prompt = item.prompt.trim();
      const answer = item.answer.trim();
      const choices = item.options.map((option) => String(option).trim());
      if (seenIds.has(id) || new Set(choices).size !== choices.length || choices.filter((choice) => choice === answer).length !== 1) throw new Error('course_release_quiz_invalid');
      seenIds.add(id);
      const correct = choices.indexOf(answer);
      const ruCopy = choices.map((_, index) => index === correct ? 'Правильный ответ.' : 'Неверный вариант.');
      const ukCopy = choices.map((_, index) => index === correct ? 'Правильна відповідь.' : 'Неправильний варіант.');
      const sourceExplanations = bundle.learnerSourceLocale === 'uk' ? ukCopy : ruCopy;
      return {
        ru: bundle.learnerSourceLocale === 'ru' ? prompt : '',
        uk: bundle.learnerSourceLocale === 'uk' ? prompt : '',
        es: '',
        choices,
        correct,
        answer,
        explanations: ruCopy,
        explanationsUK: ukCopy,
        explanationsES: ruCopy,
        sourceLocale: bundle.learnerSourceLocale as QuizPhrase['sourceLocale'],
        sourceText: prompt,
        sourceExplanations,
        lessonNum: entry.lessonId,
        level: levelForLesson(entry.lessonId),
        questionId: `${bundle.releaseId}:${id}`,
        skillTag: `course_release:${difficultyForLesson(entry.lessonId)}`,
        reviewerFlag: null,
        quizItemType: 'course_release',
      };
    });
  });
}

export function selectCourseReleaseQuizRows(
  rows: readonly QuizPhrase[],
  difficulty: QuizDifficulty,
  count: number,
  random: () => number = Math.random,
): QuizPhrase[] {
  const pool = rows.filter((row) => difficultyForLesson(row.lessonNum) === difficulty);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const sample = Math.min(0.999999999, Math.max(0, random()));
    const swapIndex = Math.floor(sample * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex]!, pool[index]!];
  }
  return pool.slice(0, Math.max(0, Math.min(count, pool.length)));
}
