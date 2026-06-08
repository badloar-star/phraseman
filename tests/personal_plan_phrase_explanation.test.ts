import { buildPhraseExplanation, detectPhrasePattern } from '../app/personal_plan_phrase_explanation';

describe('phrase explanation generator', () => {
  it('detects wh-questions', () => {
    expect(detectPhrasePattern('Where is the entrance?').title).toBe('Вопрос со словом-вопросом');
  });
  it('detects yes/no questions', () => {
    expect(detectPhrasePattern('Can you help me?').title).toBe('Да/нет вопрос');
  });
  it('detects negation', () => {
    expect(detectPhrasePattern("It's not clear.").title).toBe('Отрицание');
  });
  it('detects intent/need', () => {
    expect(detectPhrasePattern('I need more time.').title).toBe('Намерение или необходимость');
  });
  it('detects there is/are', () => {
    expect(detectPhrasePattern('There is a mistake on the form.').title).toBe('Есть / имеется');
  });
  it('falls back to plain statement', () => {
    expect(detectPhrasePattern('The deadline is today.').title).toBe('Утвердительная фраза');
  });

  it('builds a phrase-specific explanation with all 3 parts', () => {
    const e = buildPhraseExplanation('I need more time.', 'Мне нужно больше времени.');
    console.log('TITLE:', e.titleRu);
    console.log('CORRECT:', e.correctRu);
    console.log('WRONG:', e.wrongRu);
    // must reference the actual phrase + meaning (not a generic stub)
    expect(e.correctRu).toContain('Мне нужно больше времени');
    expect(e.correctRu).toContain('I need more time');
    expect(e.correctRu).toContain('Нужно собрать');
    // wrong hint references the first word to build
    expect(e.wrongRu).toContain('I');
    // no generic stub language
    expect(e.correctRu).not.toContain('короткая готовая фраза');
  });

  it('build hint names the correct first word', () => {
    const e = buildPhraseExplanation('Where is the entrance?', 'Где вход?');
    console.log('Q-WRONG:', e.wrongRu);
    expect(e.wrongRu).toContain('Where');
  });
});
