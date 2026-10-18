// зачем (координатор 18.10, длинные языки): число в текстах моментов не отрывается от слова при переносе; текст копии не меняется.
import { glueNumbers } from '../components/moments/glue_numbers';
import { perfectMomentText } from '../components/lesson_moments/perfect_moment_strings';
import { comboMomentText } from '../components/feedback/combo_moment_strings';

const NBSP = ' ';

describe('glueNumbers — неразрывный пробел рядом с числом', () => {
  it('число + слово, «N.» + слово, слово + число', () => {
    expect(glueNumbers('+10 monet')).toBe(`+10${NBSP}monet`);
    expect(glueNumbers('5. miejsce · 470 monet')).toBe(`5.${NBSP}miejsce ·${NBSP}470${NBSP}monet`);
    expect(glueNumbers('Đến top 5 còn 60')).toBe(`Đến top${NBSP}5${NBSP}còn${NBSP}60`);
  });

  it('строки без чисел не меняются', () => {
    expect(glueNumbers('Um ano. Todos os dias')).toBe('Um ano. Todos os dias');
  });

  it('подключено к текстам моментов', () => {
    expect(comboMomentText('pl', 'inRow', 5)).toBe(`5${NBSP}z rzędu`);
    expect(perfectMomentText('uk', 'noMistakes', { n: 12 })).toContain(`+12${NBSP}`);
  });
});
