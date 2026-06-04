import { PERSONAL_PLAN_CATALOG } from '../app/personal_plan_catalog';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import {
  getPersonalPlanQuizCoverage,
  getPersonalPlanQuizPhrases,
  getPersonalPlanQuizTaskCopy,
} from '../app/personal_plan_quizzes';

const REJECTED_GAVAN_CONTENT_IDS = [
  'gavan_identity_day1',
  'gavan_address_day2',
  'gavan_day1_identity',
  'gavan_day2_address',
];

describe('personal plan content reset contract', () => {
  const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;

  it('keeps rejected Gavan content out while allowing the certified replacement day', () => {
    const activePlanJson = JSON.stringify(gavan.days.slice(0, 7));

    for (const rejectedId of REJECTED_GAVAN_CONTENT_IDS) {
      expect(activePlanJson).not.toContain(rejectedId);
    }
    expect(gavan.days[0].status).toBe('certified');
    expect(gavan.days[0].title).toBe('Короткие ответы');
  });

  it('does not expose rejected phrase lessons or quizzes through product APIs', () => {
    expect(getPersonalPlanPhraseLesson('gavan_identity_day1')).toBeNull();
    expect(getPersonalPlanPhraseLesson('gavan_address_day2')).toBeNull();
    expect(getPersonalPlanQuizPhrases('gavan_day1_identity', 'Alex')).toBeNull();
    expect(getPersonalPlanQuizPhrases('gavan_day2_address', 'Alex')).toBeNull();
    expect(getPersonalPlanQuizCoverage('gavan_day1_identity')).toBeNull();
    expect(getPersonalPlanQuizCoverage('gavan_day2_address')).toBeNull();
    expect(getPersonalPlanQuizTaskCopy('gavan_day1_identity', 'ru', 'choice')).toBeNull();
    expect(getPersonalPlanQuizTaskCopy('gavan_day2_address', 'ru', 'choice')).toBeNull();
  });
});
