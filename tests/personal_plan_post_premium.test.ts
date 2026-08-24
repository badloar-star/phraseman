import { personalPlanPostPremiumRoute } from '../app/personal_plan_post_premium';

describe('personal plan post-premium route', () => {
  it('shows thank-you only for an activated or already-existing plan', () => {
    expect(personalPlanPostPremiumRoute(true)).toBe('/personal_plan_thank_you');
    expect(personalPlanPostPremiumRoute(false)).toBe('/lessons_list');
  });
});
