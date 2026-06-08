import { findIdiomExplanation, idiomEntryCount } from '../app/personal_plan_idiom_dictionary';
import { buildPhraseExplanation } from '../app/personal_plan_phrase_explanation';

describe('idiom dictionary', () => {
  it('has entries', () => { expect(idiomEntryCount()).toBeGreaterThan(10); });

  it('detects follow up', () => {
    expect(findIdiomExplanation('I will follow up today.')?.id).toBe('follow_up');
  });
  it('detects owner', () => {
    expect(findIdiomExplanation('We need one owner.')?.id).toBe('owner');
  });
  it('detects there is', () => {
    expect(findIdiomExplanation('There is a mistake on the form.')?.id).toBe('there_is_are');
  });
  it('returns null for plain phrase', () => {
    expect(findIdiomExplanation('I can answer now.')).toBeNull();
  });
});

describe('priority chain in buildPhraseExplanation', () => {
  it('idiom wins: We need one owner', () => {
    const e = buildPhraseExplanation('We need one owner.', 'Нам нужен один ответственный.');
    console.log('OWNER TITLE:', e.titleRu);
    console.log('OWNER:', e.correctRu);
    expect(e.titleRu).toContain('owner');
    expect(e.correctRu).toContain('ответственный');
    expect(e.correctRu).toContain('не «владелец»');
  });

  it('idiom wins: follow up', () => {
    const e = buildPhraseExplanation('I will follow up after the call.', 'Я вернусь с ответом после звонка.');
    console.log('FOLLOWUP TITLE:', e.titleRu);
    console.log('FOLLOWUP:', e.correctRu);
    expect(e.titleRu).toContain('follow up');
    expect(e.correctRu).toContain('вернуться к вопросу');
  });

  it('grammar fallback for plain phrase', () => {
    const e = buildPhraseExplanation('I can answer now.', 'Я могу ответить сейчас.');
    console.log('PLAIN TITLE:', e.titleRu);
    expect(['Намерение или необходимость','Утвердительная фраза']).toContain(e.titleRu);
  });
});
