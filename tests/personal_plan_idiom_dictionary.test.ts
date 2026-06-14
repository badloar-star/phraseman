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
    console.log('OWNER TITLE:', e.title.ru);
    console.log('OWNER:', e.correct.ru);
    expect(e.title.ru).toContain('owner');
    expect(e.correct.ru).toContain('ответственный');
    expect(e.correct.ru).toContain('не «владелец»');
  });

  it('idiom wins: follow up', () => {
    const e = buildPhraseExplanation('I will follow up after the call.', 'Я вернусь с ответом после звонка.');
    console.log('FOLLOWUP TITLE:', e.title.ru);
    console.log('FOLLOWUP:', e.correct.ru);
    expect(e.title.ru).toContain('follow up');
    expect(e.correct.ru).toContain('вернуться к вопросу');
  });

  it('idiom branch localizes uk/es without leaking russian', () => {
    const e = buildPhraseExplanation('I will follow up after the call.', 'Я вернусь с ответом после звонка.');
    // English construction name stays; only the russian label is translated.
    expect(e.title.uk).toContain('follow up');
    expect(e.title.es).toContain('follow up');
    expect(e.title.uk).toBe('Фразове дієслово: follow up');
    expect(e.title.es).toBe('Verbo compuesto: follow up');
    // uk/es get a generic-but-correct sentence, not the russian explanation.
    expect(e.correct.uk).toContain('стійкий вислів');
    expect(e.correct.es).toContain('expresión fija');
    expect(e.correct.uk).not.toContain('вернуться к вопросу');
    expect(e.correct.es).not.toContain('вернуться к вопросу');
  });

  it('grammar fallback for plain phrase', () => {
    const e = buildPhraseExplanation('I can answer now.', 'Я могу ответить сейчас.');
    console.log('PLAIN TITLE:', e.title.ru);
    expect(['Намерение или необходимость','Утвердительная фраза']).toContain(e.title.ru);
  });
});
