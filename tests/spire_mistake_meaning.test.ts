// Сверка 24.10: у ошибки из Пика в строке «Моих ошибок» стоял весь вопрос вместо смысла фразы.
import { spireMistakeMeaningV1 } from '../app/spire_mistake_meaning';
import { mistakeDisplayMeaningV1 } from '../app/mistake_practice_insights';

describe('spire mistake meaning', () => {
  it('takes the quoted phrase out of the question, or nothing', () => {
    expect(spireMistakeMeaningV1('Вы хотите сказать: «Я опаздываю». Какую английскую реплику выберете?')).toBe('Я опаздываю');
    expect(spireMistakeMeaningV1('Ви хочете сказати: «Я запізнююся». Яку англійську репліку оберете?')).toBe('Я запізнююся');
    expect(spireMistakeMeaningV1('Какую английскую реплику выберете?')).toBeNull();
    expect(spireMistakeMeaningV1('Я опаздываю')).toBe('Я опаздываю');
    expect(spireMistakeMeaningV1('')).toBeNull();
  });

  it('only Spire mistakes are rewritten, lesson mistakes keep their meaning', () => {
    expect(mistakeDisplayMeaningV1({ sourceKind: 'lesson_phrase', sourceMeaning: 'Что? «нет»?' })).toBe('Что? «нет»?');
    expect(mistakeDisplayMeaningV1({ sourceKind: 'spire_step', sourceMeaning: 'Вы хотите сказать: «Да». Что выберете?' })).toBe('Да');
  });
});
