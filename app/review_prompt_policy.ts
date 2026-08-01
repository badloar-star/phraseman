export const REVIEW_PROMPT_COOLDOWN_DAYS = 120;
export const REVIEW_PROMPT_MAX_SHOWS = 3;
export const REVIEW_PROMPT_MIN_ACTIVE_DAYS = 3;
export const REVIEW_PROMPT_MIN_COMPLETED_LESSONS = 3;
export const REVIEW_PROMPT_EXAM_SCORE = 85;

export type ReviewPromptInput = {
  trigger: 'level_exam_pass' | 'perfect_lesson' | 'streak_milestone' | 'ordinary_lesson';
  scorePercent?: number;
  userContinued?: boolean;
  completedLessons?: number;
  activeDays?: number;
  streakDays?: number;
  celebrationClosed?: boolean;
  nowMs: number;
  priorPromptCount: number;
  lastPromptedAtMs: number | null;
  hasRated: boolean;
};

export type ReviewPromptDecision =
  | { eligible: true }
  | { eligible: false; reason: 'already_rated' | 'prompt_limit' | 'cooldown' | 'weak_outcome' | 'not_continued' | 'insufficient_learning_history' | 'unsupported_trigger' };

const DAY_MS = 86_400_000;

export function isReviewMilestone(days: number): boolean {
  return days === 7 || days === 14 || days === 30;
}

export function decideReviewPrompt(input: ReviewPromptInput): ReviewPromptDecision {
  if (input.hasRated) return { eligible: false, reason: 'already_rated' };
  if (input.priorPromptCount >= REVIEW_PROMPT_MAX_SHOWS) return { eligible: false, reason: 'prompt_limit' };
  if (input.lastPromptedAtMs != null && input.nowMs - input.lastPromptedAtMs < REVIEW_PROMPT_COOLDOWN_DAYS * DAY_MS) {
    return { eligible: false, reason: 'cooldown' };
  }

  switch (input.trigger) {
    case 'level_exam_pass':
      if (!input.userContinued) return { eligible: false, reason: 'not_continued' };
      return (input.scorePercent ?? 0) >= REVIEW_PROMPT_EXAM_SCORE
        ? { eligible: true }
        : { eligible: false, reason: 'weak_outcome' };
    case 'perfect_lesson':
      return (input.completedLessons ?? 0) >= REVIEW_PROMPT_MIN_COMPLETED_LESSONS
        && (input.activeDays ?? 0) >= REVIEW_PROMPT_MIN_ACTIVE_DAYS
        ? { eligible: true }
        : { eligible: false, reason: 'insufficient_learning_history' };
    case 'streak_milestone':
      return input.celebrationClosed === true && isReviewMilestone(input.streakDays ?? 0)
        ? { eligible: true }
        : { eligible: false, reason: input.celebrationClosed ? 'weak_outcome' : 'not_continued' };
    default:
      return { eligible: false, reason: 'unsupported_trigger' };
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
