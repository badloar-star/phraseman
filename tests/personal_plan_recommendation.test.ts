import {
  getPlanDefaultMinutes,
  recommendPersonalPlan,
} from '../app/personal_plan_recommendation';

describe('personal plan recommendation', () => {
  it('routes concrete user goals to matching plans', () => {
    expect(recommendPersonalPlan({ goal: 'travel', level: 'a1', focus: 'guided' })).toBe('voyazh');
    expect(recommendPersonalPlan({ goal: 'work', level: 'a1', focus: 'guided' })).toBe('mitap');
    expect(recommendPersonalPlan({ goal: 'move', level: 'a0', focus: 'guided' })).toBe('gavan');
  });

  it('uses the third onboarding-style question when there is no concrete scenario goal', () => {
    expect(recommendPersonalPlan({ goal: 'self', level: 'a1', focus: 'dialog' })).toBe('echo');
    expect(recommendPersonalPlan({ goal: 'self', level: 'a1', focus: 'speak' })).toBe('impuls');
    expect(recommendPersonalPlan({ goal: 'self', level: 'b1', focus: 'guided' })).toBe('impuls');
  });

  it('activates plans with their catalog default rhythm, without showing a time-choice screen', () => {
    expect(getPlanDefaultMinutes('gavan')).toBe(15);
    expect(getPlanDefaultMinutes('echo')).toBe(10);
  });
});
