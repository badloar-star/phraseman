import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasUserRated } from './review_utils';

/**
 * Окно отзыва после опроса Plus (решение владельца 04.10 — вернуть показ, снятый снимком 95eec1717).
 *
 * зачем: после опроса человек только что получил награду и настроен позитивно — лучший момент попросить отзыв.
 * Но не докучаем: уже оценившему не показываем, и не чаще одного раза на опрос на устройстве.
 * Каждое ветвление пишет [VIP-REVIEW-PROMPT] с причиной.
 */
export const VIP_SURVEY_REVIEW_PROMPT_KEY_PREFIX = 'vip_survey_review_prompt_shown_v1:';

export type VipSurveyReviewPromptDecision =
  | { show: true }
  | { show: false; reason: 'already_rated' | 'already_shown' | 'no_survey_id' | 'storage_failed' };

export interface VipSurveyReviewPromptDeps {
  readonly hasUserRated: () => Promise<boolean>;
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly nowMs: () => number;
}

const defaultDeps: VipSurveyReviewPromptDeps = {
  hasUserRated,
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  nowMs: () => Date.now(),
};

/** Решает, показать ли окно, и при «да» сразу ставит метку (однократность даже при двойном вызове подряд). */
export async function claimVipSurveyReviewPrompt(
  surveyId: string,
  trigger: 'after_celebration' | 'already_granted',
  deps: VipSurveyReviewPromptDeps = defaultDeps,
): Promise<VipSurveyReviewPromptDecision> {
  const log = (decision: VipSurveyReviewPromptDecision, extra: Record<string, unknown> = {}) => {
    console.log('[VIP-REVIEW-PROMPT]', JSON.stringify({ surveyId, trigger, ...decision, ...extra }));
    return decision;
  };
  if (!surveyId) return log({ show: false, reason: 'no_survey_id' });
  try {
    if (await deps.hasUserRated()) return log({ show: false, reason: 'already_rated' });
    const key = `${VIP_SURVEY_REVIEW_PROMPT_KEY_PREFIX}${surveyId}`;
    const shownAt = await deps.getItem(key);
    if (shownAt) return log({ show: false, reason: 'already_shown' }, { shownAt });
    await deps.setItem(key, String(deps.nowMs()));
    return log({ show: true });
  } catch (error) {
    // Не показываем при сбое хранилища: иначе окно могло бы всплывать на каждом опросе. Причина — в лог.
    return log({ show: false, reason: 'storage_failed' }, {
      error: String((error as { message?: unknown })?.message ?? error).slice(0, 160),
    });
  }
}
