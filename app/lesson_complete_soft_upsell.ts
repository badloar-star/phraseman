import { FREE_LESSON_LIMIT } from './monetization_policy';
import type { SoftUpsellCandidate, SoftUpsellStudyTarget, SoftUpsellTrigger } from './soft_upsell_core';

export type LessonSoftUpsellIdentity = Readonly<{
  accountScope: string;
  lessonId: number;
  studyTarget: SoftUpsellStudyTarget;
}>;

export function sameLessonSoftUpsellIdentity(
  left: LessonSoftUpsellIdentity,
  right: LessonSoftUpsellIdentity,
): boolean {
  return left.accountScope === right.accountScope
    && left.lessonId === right.lessonId
    && left.studyTarget === right.studyTarget;
}

export function candidateAfterLessonGrant(input: {
  status: 'granted' | 'already_granted' | 'failed';
  captured: LessonSoftUpsellIdentity;
  current: LessonSoftUpsellIdentity;
  mounted: boolean;
  accountGenerationCurrent: boolean;
}): SoftUpsellCandidate | null {
  if (input.status !== 'granted' || !input.mounted || !input.accountGenerationCurrent) return null;
  if (!input.captured.accountScope || !sameLessonSoftUpsellIdentity(input.captured, input.current)) return null;
  if (input.captured.lessonId === 1) {
    return { trigger: 'first_lesson', value: 1, studyTarget: input.captured.studyTarget };
  }
  if (input.captured.lessonId === FREE_LESSON_LIMIT) {
    return {
      trigger: 'free_lessons_complete',
      value: FREE_LESSON_LIMIT,
      studyTarget: input.captured.studyTarget,
    };
  }
  return null;
}

export function shouldRenderLessonSoftUpsell(seqDone: boolean, opportunity: unknown): boolean {
  return seqDone && opportunity != null;
}

export function createLessonSoftUpsellCtaHandler(input: {
  onCta: () => void | Promise<void>;
  navigatePersonal: () => void;
  navigatePaywall: () => void;
}): (trigger: SoftUpsellTrigger) => Promise<void> {
  let inFlight = false;
  return async (trigger) => {
    if (inFlight) return;
    inFlight = true;
    try {
      await input.onCta();
      if (trigger === 'first_lesson') input.navigatePersonal();
      else input.navigatePaywall();
    } finally {
      inFlight = false;
    }
  };
}
