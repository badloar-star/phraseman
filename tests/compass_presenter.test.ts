import type { Lang } from '../constants/i18n';
import { presentCompassRecommendation } from '../app/compass_presenter';
import { COMPASS_RECOMMENDATION_SCHEMA_VERSION, type CompassRecommendation } from '../app/compass_recommendation';

const LANGS: readonly Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

function recommendation(code: CompassRecommendation['reason']['code']): CompassRecommendation {
  if (code === 'trainer_due') return {
    schemaVersion: COMPASS_RECOMMENDATION_SCHEMA_VERSION, recommendationId: 'trainer:phrases', kind: 'review_due_phrases',
    reason: { code, params: { queue: 'phrases', selectedDue: 12, totalDue: 12 } },
    evidence: [{ source: 'trainer', key: 'duePhrases', value: 12 }], expectedMinutes: 6,
    action: { kind: 'trainer_phrases', route: { pathname: '/trainer_phrases_session' } }, confidence: 'high',
  };
  if (code === 'continue_started_lesson') return {
    schemaVersion: COMPASS_RECOMMENDATION_SCHEMA_VERSION, recommendationId: 'lesson:7', kind: 'continue_lesson',
    reason: { code, params: { lessonId: 7, correctCells: 18, totalCells: 45 } },
    evidence: [{ source: 'lesson_progress', key: 'correctCells', value: 18 }], expectedMinutes: 6,
    action: { kind: 'lesson', route: { pathname: '/lesson_menu', params: { id: '7' } } }, confidence: 'high',
  };
  return {
    schemaVersion: COMPASS_RECOMMENDATION_SCHEMA_VERSION, recommendationId: 'diagnosis:articles', kind: 'repair_weak_area',
    reason: { code, params: { microDiagnosisId: 'articles', evidenceCount: 1 } },
    evidence: [{ source: 'weekly_review', key: 'mistakes.last30.mistakes', value: 8 }], expectedMinutes: 5,
    action: { kind: 'problem_coach', route: { pathname: '/problem_coach', params: { microDiagnosisId: 'articles' } } }, confidence: 'high',
  };
}

describe('Compass presenter', () => {
  it.each(LANGS)('uses supplied personalized explanation in %s', lang => {
    for (const code of ['trainer_due', 'continue_started_lesson', 'weekly_weak_area'] as const) {
      const why = `Personal explanation ${lang}.`;
      const result = presentCompassRecommendation(recommendation(code), lang, why);
      expect(result.explanation).toBe(why);
      expect(result.title).toBeTruthy();
      expect(result.actionLabel).toBeTruthy();
      expect(result.expectedMinutes).toBeGreaterThanOrEqual(3);
    }
  });

  it('follows the Russian Bible vocabulary', () => {
    const rendered = [
      presentCompassRecommendation(recommendation('trainer_due'), 'ru', 'Фразы готовы к повтору.'),
      presentCompassRecommendation(recommendation('continue_started_lesson'), 'ru', 'Ты уже прошёл 18 шагов.'),
      presentCompassRecommendation(recommendation('weekly_weak_area'), 'ru', 'Паттерн повторился в попытках.'),
    ].map(item => `${item.title} ${item.actionLabel}`).join(' ');
    expect(rendered).not.toMatch(/урок|ошиб|прогресс|просроч|личн.*маршрут/i);
  });
});
