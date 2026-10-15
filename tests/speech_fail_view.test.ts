// зачем (координатор 15.10, «не засчитано» по эталону Макетов 91eee157a): чистые данные блока — какие слова подсветить и что написать под плашкой.
import { buildSpeechFailView, speechFailDisplayWord, speechFailLineParts, speechFailLineText } from '../app/speech_fail_view';

describe('buildSpeechFailView', () => {
  it('пропущенное слово подсвечено, остальные нет; первое названо как написано (эталон: «every»)', () => {
    const view = buildSpeechFailView('She works every day', ['every']);
    expect(view.tokens.map((t) => [t.text, t.missed])).toEqual([['She', false], ['works', false], ['every', true], ['day', false]]);
    expect(view.firstMissed).toBe('every');
    expect(view.missedCount).toBe(1);
  });

  it('несколько пропущенных: подсвечены все, названо первое по порядку фразы', () => {
    const view = buildSpeechFailView('I really like green tea', ['tea', 'really']);
    expect(view.tokens.filter((t) => t.missed).map((t) => t.text)).toEqual(['really', 'tea']);
    expect(view.firstMissed).toBe('really');
    expect(view.missedCount).toBe(2);
  });

  it('пунктуация и регистр: слово на экране как написано, в строке — без знаков по краям', () => {
    const view = buildSpeechFailView('Where are you, Anna?', ['anna']);
    expect(view.tokens.find((t) => t.missed)?.text).toBe('Anna?');
    expect(view.firstMissed).toBe('Anna');
    expect(speechFailDisplayWord('works,')).toBe('works');
    expect(speechFailDisplayWord('...')).toBe('...');
  });

  it('стяжение: «you\'re» подсвечивается, если пропущено любое из нормализованных слов («you are»)', () => {
    const view = buildSpeechFailView("You're late", ['are']);
    expect(view.tokens[0]).toEqual({ text: "You're", missed: true });
    expect(view.tokens[1]!.missed).toBe(false);
  });

  it('повторяющееся слово: пропущено одно вхождение — подсвечено ровно одно, а не оба', () => {
    const view = buildSpeechFailView('the cat and the dog', ['the']);
    expect(view.tokens.filter((t) => t.missed)).toHaveLength(1);
    expect(view.tokens[0]!.missed).toBe(true);
    expect(view.tokens[3]!.missed).toBe(false);
  });

  it('пропущенных нет или данных нет: ничего не подсвечено, firstMissed = null', () => {
    for (const missing of [[], null, undefined, ['']]) {
      const view = buildSpeechFailView('Good morning', missing as string[] | null | undefined);
      expect(view.missedCount).toBe(0);
      expect(view.firstMissed).toBeNull();
      expect(view.tokens.every((t) => !t.missed)).toBe(true);
    }
  });
});

describe('строка под плашкой', () => {
  it('русский: как в эталоне, на «ты»', () => {
    expect(speechFailLineText('ru', 'every')).toBe('Не услышали слово «every» — скажи фразу целиком');
    expect(speechFailLineParts('ru', 'every')).toEqual(['Не услышали слово «', 'every', '» — скажи фразу целиком']);
  });

  it('все девять языков дают строку со словом; язык вне девяти — русский', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      const text = speechFailLineText(lang, 'every');
      expect(text).toContain('every');
      expect(text.length).toBeGreaterThan(12);
    }
    expect(speechFailLineText('xx', 'every')).toBe(speechFailLineText('ru', 'every'));
  });

  it('нет «вы»-форм: ни «скажите», ни «попробуйте» в строках', () => {
    for (const lang of ['ru', 'uk', 'tr']) expect(speechFailLineText(lang, 'x')).not.toMatch(/скажіть|скажите|попробуйте|söyleyin/i);
  });
});
