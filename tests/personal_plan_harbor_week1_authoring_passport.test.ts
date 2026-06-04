import { GAVAN_WEEK1_BLUEPRINT_DRAFT } from '../app/personal_plan_harbor_week1_blueprint_draft';
import {
  GAVAN_WEEK1_AUTHORING_PASSPORT,
  validatePersonalPlanWeekAuthoringPassport,
  type PersonalPlanWeekAuthoringPassport,
} from '../app/personal_plan_harbor_week1_authoring_passport';

function validate(passport: PersonalPlanWeekAuthoringPassport = GAVAN_WEEK1_AUTHORING_PASSPORT) {
  return validatePersonalPlanWeekAuthoringPassport(passport, GAVAN_WEEK1_BLUEPRINT_DRAFT);
}

function clonePassport(): PersonalPlanWeekAuthoringPassport {
  return JSON.parse(JSON.stringify(GAVAN_WEEK1_AUTHORING_PASSPORT));
}

describe('Gavan week 1 authoring passport', () => {
  it('passes against the current non-production week blueprint', () => {
    const result = validate();

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('fails when a passport day is missing', () => {
    const passport = clonePassport();
    passport.days = passport.days.slice(0, 6);

    expect(validate(passport).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'day_count_mismatch' }),
    ]));
  });

  it('fails when a passport references an unknown day id', () => {
    const passport = clonePassport();
    passport.days[0] = {
      ...passport.days[0],
      dayId: 'gavan-week1-day99',
    };

    expect(validate(passport).issues).toContainEqual(
      expect.objectContaining({ code: 'unknown_day_id', dayId: 'gavan-week1-day99' }),
    );
  });

  it('fails invalid minute choices and too-thin loads', () => {
    const passport = clonePassport();
    passport.days[0].loadByMinutes = {
      ...passport.days[0].loadByMinutes,
      10: [passport.days[0].exerciseMix[0].id],
      30: [passport.days[0].exerciseMix[0].id],
    } as any;

    expect(validate(passport).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_minute_choice', dayId: 'gavan-week1-day1' }),
      expect.objectContaining({ code: 'load_too_thin', dayId: 'gavan-week1-day1' }),
    ]));
  });

  it('fails missing outcomes and unsupported exercise types', () => {
    const passport = clonePassport();
    passport.days[1] = {
      ...passport.days[1],
      learningOutcome: ' ',
      exerciseMix: [
        ...passport.days[1].exerciseMix,
        {
          id: 'unsupported',
          type: 'plan_open_conversation' as any,
          weight: 'light',
          title: 'Unsupported block',
          focusTags: ['repeat_request'],
        },
      ],
    };

    expect(validate(passport).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_learning_outcome', dayId: 'gavan-week1-day2' }),
      expect.objectContaining({ code: 'unsupported_exercise_type', dayId: 'gavan-week1-day2', blockId: 'unsupported' }),
    ]));
  });

  it('fails narrow scenario blocks on day one', () => {
    const passport = clonePassport();
    passport.days[0].exerciseMix[0] = {
      ...passport.days[0].exerciseMix[0],
      focusTags: ['rent'],
    };

    expect(validate(passport).issues).toContainEqual(
      expect.objectContaining({ code: 'day_one_narrow_scenario_block', dayId: 'gavan-week1-day1' }),
    );
  });

  it('fails fake final audio or pronunciation claims while placeholders are still placeholders', () => {
    const passport = clonePassport();
    passport.days[2].exerciseMix.push({
      id: 'fake-final-audio',
      type: 'listen_choose',
      weight: 'medium',
      title: 'Fake final audio',
      focusTags: ['listening'],
      audioStatus: 'final',
    });
    passport.days[2].exerciseMix.push({
      id: 'fake-final-pronunciation',
      type: 'pronunciation_placeholder',
      weight: 'medium',
      title: 'Fake final pronunciation',
      focusTags: ['pronunciation'],
      pronunciationStatus: 'final',
    });

    expect(validate(passport).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'final_audio_or_pronunciation_claim', dayId: 'gavan-week1-day3', blockId: 'fake-final-audio' }),
      expect.objectContaining({ code: 'final_audio_or_pronunciation_claim', dayId: 'gavan-week1-day3', blockId: 'fake-final-pronunciation' }),
    ]));
  });
});
