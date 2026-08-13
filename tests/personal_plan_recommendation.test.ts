import {
  getPlanDefaultMinutes,
  recommendPersonalPlan,
  resolvePersonalPlanForGoal,
} from '../app/personal_plan_recommendation';

describe('personal plan recommendation', () => {
  it('maps each of the 5 themes to its plan one-to-one', () => {
    expect(resolvePersonalPlanForGoal('series')).toBe('echo');
    expect(resolvePersonalPlanForGoal('everyday')).toBe('impuls');
    expect(resolvePersonalPlanForGoal('travel')).toBe('voyazh');
    expect(resolvePersonalPlanForGoal('words')).toBe('gavan');
    expect(resolvePersonalPlanForGoal('mind')).toBe('mitap');
  });

  it('recommendPersonalPlan delegates to the same theme resolver regardless of level', () => {
    expect(recommendPersonalPlan({ goal: 'series', level: 'a0' })).toBe('echo');
    expect(recommendPersonalPlan({ goal: 'series', level: 'b1' })).toBe('echo');
    expect(recommendPersonalPlan({ goal: 'words', level: 'a0' })).toBe('gavan');
    expect(recommendPersonalPlan({ goal: 'mind', level: 'a2' })).toBe('mitap');
  });

  it('activates plans with their catalog default rhythm, without showing a time-choice screen', () => {
    expect(getPlanDefaultMinutes('gavan')).toBe(15);
    expect(getPlanDefaultMinutes('echo')).toBe(10);
  });
});
