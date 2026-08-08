import { INTERFACE_LANGS } from '../constants/i18n';
import {
  buildServerConfirmedLegacyCompletion,
  buildActiveSurveyDailyChallenge,
  computeSurveyDailyChallengeCounts,
} from '../app/survey_daily_challenge_model';

const survey = { surveyId: 's1' } as any;

describe('survey daily challenge model', () => {
  test.each([0, 1, 3])('keeps %i base tasks unchanged without a survey', (baseTotal) => {
    expect(computeSurveyDailyChallengeCounts({ baseTotal, baseDone: baseTotal, survey: null })).toEqual({
      total: baseTotal, done: baseTotal, rewardThreshold: baseTotal,
    });
  });

  // Порог = весь набор (решение владельца 2026-07-26): активный опрос обязателен,
  // послабления «любые 3 из 4» больше нет — бонус только когда закрыто ВСЁ.
  it('adds an active survey without counting it done, and requires it for the reward', () => {
    expect(computeSurveyDailyChallengeCounts({ baseTotal: 3, baseDone: 2, survey: { survey, phase: 'active' } })).toEqual({ total: 4, done: 2, rewardThreshold: 4 });
  });

  it('keeps five progress indicators for a four-task weekend set with an active survey', () => {
    expect(computeSurveyDailyChallengeCounts({ baseTotal: 4, baseDone: 0, survey: { survey, phase: 'active' } })).toEqual({ total: 5, done: 0, rewardThreshold: 5 });
  });

  it('counts a completed survey toward the full-set threshold', () => {
    expect(computeSurveyDailyChallengeCounts({ baseTotal: 3, baseDone: 2, survey: { survey: null, phase: 'completed' } })).toEqual({ total: 4, done: 3, rewardThreshold: 4 });
  });

  it('opens the reward only when every task including the survey is done', () => {
    const withSurvey = { survey, phase: 'completed' } as const;
    const all = computeSurveyDailyChallengeCounts({ baseTotal: 3, baseDone: 3, survey: withSurvey });
    expect(all.done).toBe(all.rewardThreshold);
    // Все обычные закрыты, но опрос ещё активен → бонус НЕ открыт.
    const surveyPending = computeSurveyDailyChallengeCounts({ baseTotal: 3, baseDone: 3, survey: { survey, phase: 'active' } });
    expect(surveyPending.done).toBeLessThan(surveyPending.rewardThreshold);
  });

  it('clamps counts to non-negative integers', () => {
    expect(computeSurveyDailyChallengeCounts({ baseTotal: -2.4, baseDone: 99.8, survey: null })).toEqual({ total: 0, done: 0, rewardThreshold: 0 });
  });

  test.each(INTERFACE_LANGS)('builds safe localized server completion copy for %s', (lang) => {
    const result = buildServerConfirmedLegacyCompletion(lang);
    expect(result).toMatchObject({ surveyId: 'server-confirmed-completed-survey', questionCount: 0, rewardShards: 0, phase: 'completed', survey: null });
    expect(result.title).toBeTruthy();
    expect(result.description).toBeTruthy();
    expect(`${result.title} ${result.description}`).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  test.each(INTERFACE_LANGS)('builds a complete active snapshot for %s', (lang) => {
    const active = buildActiveSurveyDailyChallenge({
      survey: { surveyId: 's', title: 'Title', subtitle: '', rewardShards: 4, questions: [{ id: 'q', type: 'text', text: 'Q', options: [] }] },
      lang,
    });
    expect(active).toMatchObject({ surveyId: 's', title: 'Title', questionCount: 1, rewardShards: 4, phase: 'active' });
    expect(active.description).toBeTruthy();
    expect(active.survey?.surveyId).toBe('s');
  });

  it('never copies an emoji-bearing server subtitle into the active description', () => {
    const active = buildActiveSurveyDailyChallenge({
      survey: { surveyId: 's', title: 'Title', subtitle: 'Server promo 🚀', rewardShards: 1, questions: [] },
      lang: 'ru',
    });
    expect(active.description).not.toContain('Server promo');
    expect(active.description).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
