import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateDailyPhraseBatchStyle } from '../scripts/daily_phrase_style_gate.mjs';

const baseRow = {
  targetText: 'an die',
  text_ru:
    '❤️ На шумной ярмарке покупатель долго сравнивает двух лошадей и внимательно слушает опытного конюха. Он проверяет седло, копыта и спокойствие каждой перед короткой поездкой. Потом он думает an die дорогу через холмы и выбирает выносливую лошадь. Буквальная картина остаётся перед глазами. Вечером разумный выбор приводит его домой без лишнего спектакля.',
  text_uk:
    '❤️ На гомінкому ярмарку покупець довго порівнює двох коней і уважно слухає досвідченого конюха. Він перевіряє сідло, копита та спокій кожного перед короткою поїздкою. Потім він думає an die дорогу через пагорби й обирає витривалого коня. Буквальна картина лишається перед очима. Увечері розумний вибір повертає його додому без зайвої вистави.',
};

test('a target split across sentences cannot make a batch look position-valid', () => {
  const openingsRu = ['На шумной ярмарке', 'У старой ратуши', 'После летнего дождя', 'Перед дальней дорогой', 'Возле тихой конюшни'];
  const openingsUk = ['На гомінкому ярмарку', 'Біля старої ратуші', 'Після літнього дощу', 'Перед далекою дорогою', 'Поряд із тихою стайнею'];
  const rows = openingsRu.map((opening, index) => ({
    ...baseRow,
    id: `de-boundary-${index + 1}`,
    text_ru: baseRow.text_ru
      .replace('На шумной ярмарке', opening)
      .replace('an die', index === 4 ? 'an. Die' : 'an die'),
    text_uk: baseRow.text_uk.replace('На гомінкому ярмарку', openingsUk[index]),
  }));

  const result = evaluateDailyPhraseBatchStyle(rows);
  const codes = result.issues.map((entry) => entry.code);

  assert.equal(result.verdict, 'HOLD');
  assert.ok(codes.includes('ru.target_missing'));
});

test('a legitimate multi-sentence target still participates in the uniform-position batch guard', () => {
  const targetText = '¿Dónde va Vicente? Donde va la gente';
  const openingsRu = ['На шумной ярмарке', 'У старой ратуши', 'После летнего дождя', 'Перед дальней дорогой', 'Возле тихой конюшни'];
  const openingsUk = ['На гомінкому ярмарку', 'Біля старої ратуші', 'Після літнього дощу', 'Перед далекою дорогою', 'Поряд із тихою стайнею'];
  const rows = openingsRu.map((opening, index) => ({
    ...baseRow,
    id: `es-multisentence-${index + 1}`,
    targetText,
    text_ru: baseRow.text_ru.replace('На шумной ярмарке', opening).replace('an die', targetText),
    text_uk: baseRow.text_uk.replace('На гомінкому ярмарку', openingsUk[index]).replace('an die', targetText),
  }));

  const result = evaluateDailyPhraseBatchStyle(rows);
  const codes = result.issues.map((entry) => entry.code);

  assert.ok(codes.includes('batch.uniform_target_position'), JSON.stringify(result.issues, null, 2));
});

test('an earlier declared inflection cannot be hidden by varied later canonical lemma positions', () => {
  const targetText = 'jemandem sein Herz ausschütten';
  const openingsRu = ['После репетиции', 'В тихом кафе', 'Перед поездкой', 'Вечером на кухне', 'После трудного дня'];
  const openingsUk = ['Після репетиції', 'У тихій кав’ярні', 'Перед поїздкою', 'Увечері на кухні', 'Після важкого дня'];
  const laterPositions = [1, 2, 3, 4, 2];
  const rows = openingsRu.map((opening, index) => {
    const ruSentences = [
      `❤️ ${opening} Anna wollte ihrer Schwester ihr Herz ausschütten`,
      'Она долго молчала и собиралась с мыслями',
      'Чай остывал, пока разговор становился честнее',
      'Образ открытого сердца сделал смысл понятным',
      'К вечеру тревога осталась на дне пустой чашки',
    ];
    const ukSentences = [
      `❤️ ${openingsUk[index]} Olena wollte ihrem Bruder ihr Herz ausschütten`,
      'Вона довго мовчала і збиралася з думками',
      'Чай холонув, поки розмова ставала щирішою',
      'Образ відкритого серця зробив сенс зрозумілим',
      'Надвечір тривога лишилася на дні порожньої чашки',
    ];
    ruSentences[laterPositions[index]] += `; ${targetText}`;
    ukSentences[laterPositions[index]] += `; ${targetText}`;
    return {
      id: `de-declared-first-${index + 1}`,
      targetText,
      text_ru: `${ruSentences.join('. ')}.`,
      text_uk: `${ukSentences.join('. ')}.`,
      targetSurfaceForms: {
        text_ru: 'ihrer Schwester ihr Herz ausschütten',
        text_uk: 'ihrem Bruder ihr Herz ausschütten',
      },
    };
  });

  const result = evaluateDailyPhraseBatchStyle(rows);
  const codes = result.issues.map((entry) => entry.code);

  assert.ok(codes.includes('batch.uniform_target_position'), JSON.stringify(result.issues, null, 2));
});

test('leading and consecutive terminal punctuation cannot fake different target sentence positions', () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({
    ...baseRow,
    id: `de-leading-boundaries-${index + 1}`,
    text_ru: baseRow.text_ru.replace('❤️ ', `❤️ ${'. '.repeat(index + 1)}`),
    text_uk: baseRow.text_uk.replace('❤️ ', `❤️ ${'. '.repeat(index + 1)}`),
  }));

  const result = evaluateDailyPhraseBatchStyle(rows);
  const codes = result.issues.map((entry) => entry.code);

  assert.ok(codes.includes('batch.uniform_target_position'), JSON.stringify(result.issues, null, 2));
});
