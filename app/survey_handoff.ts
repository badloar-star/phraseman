// ════════════════════════════════════════════════════════════════════════════
// survey_handoff.ts — лёгкая in-memory передача активного опроса на экран опроса
// (как primeLessonScreenFromStorage, но без AsyncStorage — объект живёт только
// на время навигации внутри сессии).
// ════════════════════════════════════════════════════════════════════════════
import type { ActiveSurvey } from './survey_client';

let pendingSurvey: ActiveSurvey | null = null;

export function primeSurvey(survey: ActiveSurvey): void {
  pendingSurvey = survey;
}

export function takePrimedSurvey(surveyId: string): ActiveSurvey | null {
  if (pendingSurvey && pendingSurvey.surveyId === surveyId) {
    const s = pendingSurvey;
    return s;
  }
  return null;
}

export function clearPrimedSurvey(): void {
  pendingSurvey = null;
}
