import { personalPlanPromptForLang } from '../app/personal_plan_prompt_locale';

describe('personal plan prompt locale', () => {
  const prompt = {
    promptRu: 'Ты на связи?',
    promptUk: 'Ти на зв’язку?',
    promptEs: '¿Estás ahí?',
  };

  it('uses the Ukrainian prompt for the Ukrainian interface', () => {
    expect(personalPlanPromptForLang(prompt, 'uk')).toBe('Ти на зв’язку?');
  });

  it('uses the Spanish prompt for the Spanish interface', () => {
    expect(personalPlanPromptForLang(prompt, 'es')).toBe('¿Estás ahí?');
  });

  it('falls back safely when a localized prompt is absent', () => {
    expect(personalPlanPromptForLang({ promptRu: 'Видео включено?' }, 'uk')).toBe('Видео включено?');
    expect(personalPlanPromptForLang(prompt, 'ru')).toBe('Ты на связи?');
  });
});
