import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  __resetPremiumPlanPeekForTests,
  peekPremiumPlan,
  rememberPremiumPlan,
} from '../app/premium_plan_peek';

// зачем (PM-214, координатор 13.10): экран «Подписка Plus» без ?plan= берёт план из памяти на первом кадре. Память обязана
// отдавать план только текущему аккаунту и не затираться пустым значением, иначе первый кадр покажет чужой или «никакой» план.
describe('premium plan peek (first frame of «Подписка Plus»)', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    __resetPremiumPlanPeekForTests();
  });

  it('returns the remembered plan for the same account generation, without IO', () => {
    beginAccountGeneration('stable-a');
    expect(peekPremiumPlan()).toBeNull();
    rememberPremiumPlan(' Yearly ', 'phraseman_plus_yearly', 'rc_persist');
    expect(peekPremiumPlan()).toMatchObject({ plan: 'yearly', productId: 'phraseman_plus_yearly', source: 'rc_persist' });
  });

  it('forgets the plan after an account switch (another generation)', () => {
    beginAccountGeneration('stable-a');
    rememberPremiumPlan('monthly', null, 'guard_refresh');
    beginAccountGeneration('stable-b');
    expect(peekPremiumPlan()).toBeNull();
  });

  it('does not overwrite a known plan with an empty value', () => {
    beginAccountGeneration('stable-a');
    rememberPremiumPlan('lifetime', null, 'manage_local');
    rememberPremiumPlan('', null, 'manage_local');
    rememberPremiumPlan(null, null, 'manage_local');
    expect(peekPremiumPlan()?.plan).toBe('lifetime');
  });
});
