import { FREE_LESSON_LIMIT } from './monetization_policy';
import type { AccountGenerationToken } from './account_generation';
import type { SoftUpsellCandidate, SoftUpsellStudyTarget, SoftUpsellTrigger } from './soft_upsell_core';

export type LessonSoftUpsellIdentity = Readonly<{
  accountScope: string;
  generation: number;
  lessonId: number;
  studyTarget: SoftUpsellStudyTarget;
}>;

export function sameLessonSoftUpsellIdentity(
  left: LessonSoftUpsellIdentity,
  right: LessonSoftUpsellIdentity,
): boolean {
  return left.accountScope === right.accountScope
    && left.generation === right.generation
    && left.lessonId === right.lessonId
    && left.studyTarget === right.studyTarget;
}

export function lessonSoftUpsellPersistenceScope(
  token: Pick<AccountGenerationToken, 'phase' | 'stableId' | 'generation'>,
): string {
  if (token.phase !== 'active') return '';
  return token.stableId?.trim() ?? '';
}

export function candidateAfterLessonGrant(input: {
  status: 'granted' | 'already_granted' | 'failed';
  captured: LessonSoftUpsellIdentity;
  current: LessonSoftUpsellIdentity;
  mounted: boolean;
  accountGenerationCurrent: boolean;
  freeLessonLimit?: number;
}): SoftUpsellCandidate | null {
  if (input.status !== 'granted' || !input.mounted || !input.accountGenerationCurrent) return null;
  if (!input.captured.accountScope || !sameLessonSoftUpsellIdentity(input.captured, input.current)) return null;
  if (input.captured.lessonId === 1) {
    return { trigger: 'first_lesson', value: 1, studyTarget: input.captured.studyTarget };
  }
  const freeLessonLimit = input.freeLessonLimit ?? FREE_LESSON_LIMIT;
  if (input.captured.lessonId === freeLessonLimit) {
    return {
      trigger: 'free_lessons_complete',
      value: freeLessonLimit,
      studyTarget: input.captured.studyTarget,
    };
  }
  return null;
}

export function shouldRenderLessonSoftUpsell(seqDone: boolean, opportunity: unknown): boolean {
  return seqDone && opportunity != null;
}

export function createLessonSoftUpsellCtaHandler(input: {
  onCta: () => boolean | Promise<boolean>;
  navigatePaywall: () => void;
}): (trigger: SoftUpsellTrigger) => Promise<void> {
  let inFlight = false;
  return async (trigger) => {
    if (inFlight) return;
    inFlight = true;
    try {
      const authorized = await input.onCta();
      if (!authorized) return;
      input.navigatePaywall();
    } finally {
      inFlight = false;
    }
  };
}
