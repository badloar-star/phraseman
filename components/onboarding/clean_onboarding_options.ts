/**
 * Подписи карточек выбора онбординга (источник, язык, уровень) и реакция на уровень — по языку интерфейса.
 *
 * зачем (координатор 12.10): в CleanOnboarding.tsx эти подписи лежат в константах уровня модуля, где языка ещё нет;
 * на экране карточки получают подпись отсюда. Идентификаторы и порядок карточек не меняются.
 */
import { fill, type OnboardingCopy } from './clean_onboarding_copy';

export type OnboardingStudyTarget = 'fr' | 'es' | 'en' | 'de' | 'it';

/** «Друзья» / «Другое» переведены, остальные источники — названия брендов и остаются как есть. */
export function sourceTitle(c: OnboardingCopy, id: string, brandTitle: string): string {
  if (id === 'friends') return c.sourceFriends;
  if (id === 'other') return c.sourceOther;
  return brandTitle;
}

export function languageNameOf(c: OnboardingCopy, id: OnboardingStudyTarget): string {
  switch (id) {
    case 'fr': return c.langFr;
    case 'es': return c.langEs;
    case 'en': return c.langEn;
    case 'de': return c.langDe;
    case 'it': return c.langIt;
  }
}

/** Название языка внутри фразы «Сколько … ты уже знаешь?» (родительный / строчное / как принято в языке). */
export function languageSentenceName(c: OnboardingCopy, id: OnboardingStudyTarget): string {
  switch (id) {
    case 'fr': return c.langInSentenceFr;
    case 'es': return c.langInSentenceEs;
    case 'en': return c.langInSentenceEn;
    case 'de': return c.langInSentenceDe;
    case 'it': return c.langInSentenceIt;
  }
}
