import { aiDialogBriefingBody } from '../app/ai_dialog_briefing_copy';
import { getPublicDialogScenarios } from '../app/ai_dialog_scenarios';

describe('aiDialogBriefingBody', () => {
  it('returns the approved Russian coffee briefing', () => {
    expect(aiDialogBriefingBody('coffee', 'ru')).toBe(
      'Закажи капучино, выбери размер и спроси цену. Бариста не читает мысли — зато отлично понимает вежливый английский.',
    );
  });

  it('returns null outside the Russian interface', () => {
    expect(aiDialogBriefingBody('coffee', 'uk')).toBeNull();
  });

  it('returns null for unknown scenarios', () => {
    expect(aiDialogBriefingBody('unknown_scenario', 'ru')).toBeNull();
  });

  it('provides a nonempty Russian briefing for every public scenario', () => {
    for (const scenario of getPublicDialogScenarios()) {
      expect(aiDialogBriefingBody(scenario.id, 'ru')).toEqual(expect.any(String));
      expect(aiDialogBriefingBody(scenario.id, 'ru')).not.toHaveLength(0);
    }
  });
});
