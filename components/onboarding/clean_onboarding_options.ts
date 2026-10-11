/**
 * Подписи карточек выбора онбординга (источник, язык, уровень) и реакция на уровень — по языку интерфейса.
 *
 * зачем (координатор 12.10): в CleanOnboarding.tsx эти подписи лежат в константах уровня модуля, где языка ещё нет;
 * на экране карточки получают подпись отсюда. Идентификаторы и порядок карточек не меняются.
 */
import { fill, type OnboardingCopy } from './clean_onboarding_copy';

export type OnboardingStudyTarget = 'fr' | 'es' | 'en' | 'de' | 'it';
export type OnboardingLevelId = 'a0' | 'a1' | 'a2' | 'b1' | 'b2';

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

export function levelTitleOf(c: OnboardingCopy, id: OnboardingLevelId): string {
  switch (id) {
    case 'a0': return c.levelA0;
    case 'a1': return c.levelA1;
    case 'a2': return c.levelA2;
    case 'b1': return c.levelB1;
    case 'b2': return c.levelB2;
  }
}

/** Реакция на выбранный уровень (заголовок экрана уровня). */
export function levelReaction(c: OnboardingCopy, level: OnboardingLevelId, target: OnboardingStudyTarget): string {
  switch (level) {
    case 'a0': return fill(c.levelReactionA0, { lang: languageNameOf(c, target) });
    case 'a1': return c.levelReactionA1;
    case 'a2': return c.levelReactionA2;
    case 'b1': return c.levelReactionB1;
    case 'b2': return c.levelReactionB2;
  }
}
