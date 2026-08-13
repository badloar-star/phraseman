// ════════════════════════════════════════════════════════════════════════════
// survey_handoff.ts — лёгкая in-memory передача активного опроса на экран опроса
// (как primeLessonScreenFromStorage, но без AsyncStorage — объект живёт только
// на время навигации внутри сессии).
// ════════════════════════════════════════════════════════════════════════════
import type { ActiveSurvey } from './survey_client';
import type { Lang } from '../constants/i18n';
import { peekSurveyOffer } from './survey_offer_cache';

type SurveyHandoff = { survey: ActiveSurvey; stableId: string; dayKey: string; lang: Lang };
let pendingSurvey: SurveyHandoff | null = null;

export function primeSurvey(input: SurveyHandoff): void {
  pendingSurvey = input;
}

export function takePrimedSurvey(surveyId: string, scope?: Omit<SurveyHandoff, 'survey'>): ActiveSurvey | null {
  if (!scope) return null;
  if (pendingSurvey
    && pendingSurvey.survey.surveyId === surveyId
    && pendingSurvey.stableId === scope.stableId
    && pendingSurvey.dayKey === scope.dayKey
    && pendingSurvey.lang === scope.lang) {
    return pendingSurvey.survey;
  }
  const cached = peekSurveyOffer(scope);
  return cached?.survey?.surveyId === surveyId ? cached.survey : null;
}

export function clearPrimedSurvey(): void {
  pendingSurvey = null;
}
