import { buildPhraseExplanation, detectPhrasePattern } from '../app/personal_plan_phrase_explanation';

describe('phrase explanation generator', () => {
  it('detects wh-questions', () => {
    expect(detectPhrasePattern('Where is the entrance?').title.ru).toBe('Вопрос со словом-вопросом');
  });
  it('detects yes/no questions', () => {
    expect(detectPhrasePattern('Can you help me?').title.ru).toBe('Да/нет вопрос');
  });
  it('detects negation', () => {
    expect(detectPhrasePattern("It's not clear.").title.ru).toBe('Отрицание');
  });
  it('detects intent/need', () => {
    expect(detectPhrasePattern('I need more time.').title.ru).toBe('Намерение или необходимость');
  });
  it('detects there is/are', () => {
    expect(detectPhrasePattern('There is a mistake on the form.').title.ru).toBe('Есть / имеется');
  });
  it('falls back to plain statement', () => {
    expect(detectPhrasePattern('The deadline is today.').title.ru).toBe('Утвердительная фраза');
  });

  it('builds a phrase-specific explanation with all 3 parts', () => {
    const e = buildPhraseExplanation('I need more time.', 'Мне нужно больше времени.');
    console.log('TITLE:', e.title.ru);
    console.log('CORRECT:', e.correct.ru);
    console.log('WRONG:', e.wrong.ru);
    // must reference the actual phrase + meaning (not a generic stub)
    expect(e.correct.ru).toContain('Мне нужно больше времени');
    expect(e.correct.ru).toContain('I need more time');
    expect(e.correct.ru).toContain('Нужно собрать');
    // wrong hint references the first word to build
    expect(e.wrong.ru).toContain('I');
    // no generic stub language
    expect(e.correct.ru).not.toContain('короткая готовая фраза');
  });

  it('build hint names the correct first word', () => {
    const e = buildPhraseExplanation('Where is the entrance?', 'Где вход?');
    console.log('Q-WRONG:', e.wrong.ru);
    expect(e.wrong.ru).toContain('Where');
  });

  it('produces non-empty uk + es variants (no russian leak to uk/es users)', () => {
    const e = buildPhraseExplanation('I need more time.', 'Мне нужно больше времени.');
    for (const part of [e.title, e.correct, e.wrong] as const) {
      expect(part.uk.trim().length).toBeGreaterThan(0);
      expect(part.es.trim().length).toBeGreaterThan(0);
      // uk/es must differ from ru (real translation, not a russian fallback)
      expect(part.uk).not.toBe(part.ru);
      expect(part.es).not.toBe(part.ru);
    }
    // the assembled phrase + meaning still appears in every language
    expect(e.correct.uk).toContain('I need more time');
    expect(e.correct.es).toContain('I need more time');
  });
});
