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

  it('adds an active survey without counting it done', () => {
    expect(computeSurveyDailyChallengeCounts({ baseTotal: 3, baseDone: 2, survey: { survey, phase: 'active' } })).toEqual({ total: 4, done: 2, rewardThreshold: 3 });
  });

  it('counts a completed survey while retaining the three-task threshold', () => {
    expect(computeSurveyDailyChallengeCounts({ baseTotal: 3, baseDone: 2, survey: { survey: null, phase: 'completed' } })).toEqual({ total: 4, done: 3, rewardThreshold: 3 });
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
