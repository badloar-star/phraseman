import {
  GAVAN_WEEK1_AUTHORING_PASSPORT,
  HARBOR_WEEK1_AUTHORING_PASSPORT,
} from '../app/personal_plan_harbor_week1_authoring_passport';
import { HARBOR_WEEK1_BLUEPRINT_DRAFT } from '../app/personal_plan_harbor_week1_blueprint_draft';
import {
  PersonalPlanWeekAuthoringPassport,
  validatePersonalPlanWeekAuthoringPassport,
} from '../app/personal_plan_week_authoring_passport';

const clonePassport = (): PersonalPlanWeekAuthoringPassport =>
  JSON.parse(JSON.stringify(GAVAN_WEEK1_AUTHORING_PASSPORT));

describe('personal plan week authoring passport gate', () => {
  it('accepts the Harbor/Gavan week 1 authoring passport', () => {
    const result = validatePersonalPlanWeekAuthoringPassport(
      HARBOR_WEEK1_AUTHORING_PASSPORT as any,
      HARBOR_WEEK1_BLUEPRINT_DRAFT,
    );

    expect(result.ok).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('fails when a blueprint day is missing', () => {
    const passport = clonePassport();
    passport.days = passport.days.slice(0, 6);

    const result = validatePersonalPlanWeekAuthoringPassport(
      passport,
      HARBOR_WEEK1_BLUEPRINT_DRAFT,
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'day_count_mismatch' })]),
    );
  });

  it('fails when an authoring dayId is not in the content blueprint', () => {
    const passport = clonePassport();
    passport.days[0].dayId = 'gavan-week1-unknown-day';

    const result = validatePersonalPlanWeekAuthoringPassport(
      passport,
      HARBOR_WEEK1_BLUEPRINT_DRAFT,
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unknown_day_id' })]),
    );
  });

  it('fails when load uses a minute choice outside onboarding options', () => {
    const passport = clonePassport() as any;
    passport.days[0].loadByMinutes[30] = [passport.days[0].exerciseMix[0].id];

    const result = validatePersonalPlanWeekAuthoringPassport(
      passport,
      HARBOR_WEEK1_BLUEPRINT_DRAFT,
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid_minute_choice' })]),
    );
  });

  it('fails when one of the minute loads is too thin', () => {
    const passport = clonePassport();
    passport.days[0].loadByMinutes[15] = passport.days[0].loadByMinutes[15].slice(0, 2);

    const result = validatePersonalPlanWeekAuthoringPassport(
      passport,
      HARBOR_WEEK1_BLUEPRINT_DRAFT,
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'load_too_thin' })]),
    );
  });

  it('fails when day 1 starts with a narrow relocation scenario block', () => {
    const passport = clonePassport();
    passport.days[0].exerciseMix[0].focusTags.push('rent');

    const result = validatePersonalPlanWeekAuthoringPassport(
      passport,
      HARBOR_WEEK1_BLUEPRINT_DRAFT,
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'day_one_narrow_scenario_block' }),
      ]),
    );
  });

  it('fails when draft audio or pronunciation placeholders claim to be final', () => {
    const passport = clonePassport();
    passport.days[1].exerciseMix[1].audioStatus = 'final';
    passport.days[3].exerciseMix[3].pronunciationStatus = 'final';

    const result = validatePersonalPlanWeekAuthoringPassport(
      passport,
      HARBOR_WEEK1_BLUEPRINT_DRAFT,
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'final_audio_or_pronunciation_claim' }),
      ]),
    );
  });

  it('fails when load references a block that is not in the same day', () => {
    const passport = clonePassport();
    passport.days[0].loadByMinutes[5] = ['missing-block'];

    const result = validatePersonalPlanWeekAuthoringPassport(
      passport,
      HARBOR_WEEK1_BLUEPRINT_DRAFT,
    );

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unknown_load_block_id' })]),
    );
  });
});
