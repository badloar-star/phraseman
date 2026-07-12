import type { CardItem, FlashcardSourceLocaleMap } from '../flashcards/types';
import type { CourseSurfaceBundleEnvelope } from './course_surface_bundle_client';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function flashcardRowsFromCourseSurfaceBundle(bundle: CourseSurfaceBundleEnvelope): CardItem[] {
  if (bundle.surface !== 'flashcard') throw new Error('course_release_flashcard_identity_mismatch');
  const seenIds = new Set<string>();
  return bundle.entries.flatMap((entry) => {
    const payload = entry.payload;
    if (payload.surface !== 'flashcard' || Number(payload.lessonId) !== entry.lessonId || !Array.isArray(payload.items) || payload.items.length < 1) throw new Error('course_release_flashcard_invalid');
    return payload.items.map((item): CardItem => {
      if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim() || typeof item.front !== 'string' || !item.front.trim() || typeof item.back !== 'string' || !item.back.trim()) throw new Error('course_release_flashcard_invalid');
      const id = item.id.trim();
      if (seenIds.has(id)) throw new Error('course_release_flashcard_invalid');
      seenIds.add(id);
      const targetText = item.front.trim();
      const sourceText = item.back.trim();
      const sourceLocales = bundle.learnerSourceLocale === 'ru' || bundle.learnerSourceLocale === 'uk'
        ? undefined
        : ({ [bundle.learnerSourceLocale]: sourceText } as FlashcardSourceLocaleMap);
      return {
        id: `${bundle.releaseId}:${id}`,
        en: targetText,
        ru: bundle.learnerSourceLocale === 'ru' ? sourceText : '',
        uk: bundle.learnerSourceLocale === 'uk' ? sourceText : '',
        sourceLocales,
        categoryId: 'situations',
        isSystem: true,
        source: 'lesson',
        sourceId: `RELEASE:${bundle.releaseId}:${entry.lessonId}`,
      };
    });
  });
}
