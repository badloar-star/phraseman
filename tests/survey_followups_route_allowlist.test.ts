// зачем: Q3 (координатор 01.10) — серверный белый список переходов уедет только
// после релиза, а живые опросы ещё могут прислать переход в удалённые Арену/Лигу.
// Клиент обязан сам не показывать такую кнопку.
import { collectSurveyFollowUps } from '../app/survey_followups';
import { isSurveyAppRoute, SURVEY_APP_ROUTES } from '../app/survey_client';
import type { SurveyQuestionClient } from '../app/survey_client';

const question = (route: string): SurveyQuestionClient => ({
  id: 'q1',
  type: 'single_choice',
  text: 'Куда?',
  options: [{ id: 'o1', label: 'Туда', action: { kind: 'app_route', route: route as never, cta: 'Открыть' } }],
} as unknown as SurveyQuestionClient);

describe('survey follow-up routes (Q3)', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('allowlist has no Arena/League routes', () => {
    expect(SURVEY_APP_ROUTES).not.toContain('/(tabs)/arena');
    expect(SURVEY_APP_ROUTES).not.toContain('/club_screen');
    expect(isSurveyAppRoute('/(tabs)/arena')).toBe(false);
    expect(isSurveyAppRoute('/flashcards')).toBe(true);
  });

  it.each(['/(tabs)/arena', '/club_screen', 'https://example.com'])('drops %s with a log', (route) => {
    const out = collectSurveyFollowUps({ questions: [question(route)], answers: { q1: { optionId: 'o1' } } as never });
    expect(out).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith('[SURVEY-FOLLOWUP] dropped app_route outside allowlist', expect.objectContaining({ route }));
  });

  it('keeps allowed routes', () => {
    const out = collectSurveyFollowUps({ questions: [question('/flashcards')], answers: { q1: { optionId: 'o1' } } as never });
    expect(out).toEqual([{ key: 'route:/flashcards', kind: 'app_route', route: '/flashcards', cta: 'Открыть' }]);
  });
});
