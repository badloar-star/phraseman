import { ECHO_CONTENT_DAYS } from '../app/plan_content_echo';
import { VOYAZH_CONTENT_DAYS } from '../app/plan_content_voyazh';
import type { PlanContentDay } from '../app/plan_content_schema';

const NAMED_PLACE_TEXT =
  /\b(Ukraine|Russia|Spain|France|Germany|Italy|Poland|Japan|Brazil|Europe|Asia|Africa|America|Greece|Portugal)\b/i;
const PERSONAL_NAME_OPTIONS = new Set([
  'Anna',
  'Maria',
  'Elena',
  'Olga',
  'Iryna',
  'Sofia',
  'Smith',
  'Mary',
  'Jones',
  'Brown',
]);

function learnerFacingEnglish(day: PlanContentDay): string[] {
  const values: string[] = [];

  for (const intro of day.intro) {
    for (const example of intro.examples ?? []) {
      values.push(example.en);
    }
  }

  for (const phrase of day.phrases) {
    values.push(phrase.english);

    for (const word of phrase.words) {
      values.push(word.text, ...word.distractors);
    }
  }

  for (const vocab of day.vocabulary) {
    values.push(vocab.word, vocab.example);
  }

  return values;
}

function expectNoNamedPlacesOrNamePicker(day: PlanContentDay): void {
  const text = learnerFacingEnglish(day).join('\n');
  expect(text).not.toMatch(NAMED_PLACE_TEXT);

  for (const value of learnerFacingEnglish(day)) {
    expect(PERSONAL_NAME_OPTIONS.has(value)).toBe(false);
  }
}

describe('personal plan learner-facing content quality', () => {
  it('keeps echo exercises away from named places and name-picking', () => {
    for (const day of ECHO_CONTENT_DAYS) {
      expectNoNamedPlacesOrNamePicker(day);
    }
  });

  it('keeps voyazh exercises away from named places and name-picking', () => {
    for (const day of VOYAZH_CONTENT_DAYS) {
      expectNoNamedPlacesOrNamePicker(day);
    }
  });
});
